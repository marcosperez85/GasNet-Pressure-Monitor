locals {
  frontend_root = "${path.module}/.."
  # Lista explícita: nunca subir config.js local, Terraform, tests o archivos privados.
  frontend_files = toset([
    "index.html", "style_landing.css", "data/Gasoductos_y_ramales_CGP_05per.json",
    "js/state.js", "js/dom.js", "js/data.js", "js/config-check.js", "js/main.js",
    "js/map.js", "js/sidebar.js", "js/chart.js", "js/navigation.js",
    "chatbot/chatbot.js", "chatbot/widget.css", "chatbot/index.html"
  ])
  content_types = {
    html = "text/html; charset=utf-8"
    css  = "text/css; charset=utf-8"
    js   = "application/javascript; charset=utf-8"
    json = "application/json; charset=utf-8"
  }
  # Solo configuración pública. La clave de API Gateway queda en el origen de CloudFront.
  frontend_config = "const CONFIG = ${jsonencode({ GOOGLE_MAPS_API_KEY = var.google_maps_api_key, API_GATEWAY_URL = "/chat" })};\n"
}

resource "aws_s3_bucket" "frontend" {
  bucket = "tecnet-dashboard"
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "tecnet-dashboard-s3"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_cache_policy" "frontend" {
  name        = "tecnet-dashboard-static"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 86400
  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = true
    enable_accept_encoding_brotli = true
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "all"
    }
  }
}

resource "aws_cloudfront_cache_policy" "chat" {
  name        = "tecnet-dashboard-chat-no-cache"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0
  parameters_in_cache_key_and_forwarded_to_origin {
    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

resource "aws_cloudfront_origin_request_policy" "chat" {
  name = "tecnet-dashboard-chat"
  cookies_config {
    cookie_behavior = "none"
  }
  headers_config {
    header_behavior = "whitelist"
    headers {
      items = ["Content-Type"]
    }
  }
  query_strings_config {
    query_string_behavior = "none"
  }
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "TecNet dashboard y proxy del chatbot"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "frontend-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    domain_name = "${aws_api_gateway_rest_api.api.id}.execute-api.us-east-1.amazonaws.com"
    origin_id   = "chat-api"
    origin_path = "/${aws_api_gateway_stage.dev.stage_name}"
    custom_header {
      name  = "x-api-key"
      value = aws_api_gateway_api_key.api_key.value
    }
    custom_origin_config {
      http_port                = 80
      https_port               = 443
      origin_protocol_policy   = "https-only"
      origin_ssl_protocols     = ["TLSv1.2"]
      origin_read_timeout      = 60
      origin_keepalive_timeout = 5
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend-s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = aws_cloudfront_cache_policy.frontend.id
  }

  ordered_cache_behavior {
    path_pattern             = "/chat"
    target_origin_id         = "chat-api"
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = aws_cloudfront_cache_policy.chat.id
    origin_request_policy_id = aws_cloudfront_origin_request_policy.chat.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn } }
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

resource "aws_s3_object" "frontend" {
  for_each     = local.frontend_files
  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "${local.frontend_root}/${each.value}"
  source_hash  = filemd5("${local.frontend_root}/${each.value}")
  content_type = local.content_types[reverse(split(".", each.value))[0]]
  # Revalidar para que apply publique cambios sin invalidaciones manuales.
  cache_control = "no-cache, max-age=0, must-revalidate"
}

resource "aws_s3_object" "frontend_config" {
  bucket        = aws_s3_bucket.frontend.id
  key           = "config.js"
  content       = local.frontend_config
  content_type  = "application/javascript; charset=utf-8"
  cache_control = "no-store, max-age=0"
}
