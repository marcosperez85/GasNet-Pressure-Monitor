# Terraform >= 1.7. Proveedores simulados: no se accede a AWS ni al state remoto.
mock_provider "aws" {
  mock_resource "aws_iam_role" {
    defaults = {
      arn = "arn:aws:iam::123456789012:role/test-lambda"
    }
  }
  mock_resource "aws_api_gateway_rest_api" {
    defaults = {
      execution_arn = "arn:aws:execute-api:us-east-1:123456789012:test-api"
    }
  }
  mock_resource "aws_lambda_function" {
    defaults = {
      invoke_arn = "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:123456789012:function:test/invocations"
    }
  }
}
mock_provider "archive" {}

variables {
  google_maps_api_key = "test-maps-key-not-real"
}

run "frontend_configuration" {
  command = apply

  assert {
    condition     = aws_s3_bucket.frontend.bucket == "tecnet-dashboard" && aws_s3_bucket_public_access_block.frontend.block_public_policy && aws_s3_bucket_public_access_block.frontend.restrict_public_buckets
    error_message = "El bucket debe ser tecnet-dashboard y permanecer privado."
  }

  assert {
    condition     = aws_cloudfront_distribution.frontend.default_root_object == "index.html" && aws_cloudfront_origin_access_control.frontend.signing_behavior == "always"
    error_message = "CloudFront debe servir index.html con acceso firmado a S3."
  }

  assert {
    condition     = !contains(keys(aws_s3_object.frontend), "config.js") && !contains(keys(aws_s3_object.frontend), "js/config.js") && !contains(keys(aws_s3_object.frontend), "terraform/terraform.tfvars")
    error_message = "La publicación no debe copiar configuración local ni archivos privados."
  }

  assert {
    condition     = !strcontains(nonsensitive(aws_s3_object.frontend_config.content), "API_GATEWAY_KEY") && strcontains(nonsensitive(aws_s3_object.frontend_config.content), "\"API_GATEWAY_URL\":\"/chat\"")
    error_message = "config.js debe usar /chat y no incluir la clave de API Gateway."
  }

  assert {
    condition     = aws_cloudfront_cache_policy.chat.max_ttl == 0 && aws_cloudfront_distribution.frontend.ordered_cache_behavior[0].target_origin_id == "chat-api"
    error_message = "El chatbot debe usar el origen API sin caché."
  }

  assert {
    condition = length([
      for origin in aws_cloudfront_distribution.frontend.origin : origin
      if origin.origin_id == "chat-api" && anytrue([
        for header in origin.custom_header : header.name == "x-api-key"
      ])
    ]) == 1
    error_message = "CloudFront debe inyectar x-api-key en el origen API."
  }

  assert {
    condition     = aws_s3_object.frontend["chatbot/widget.css"].content_type == "text/css; charset=utf-8" && aws_s3_object.frontend["data/Gasoductos_y_ramales_CGP_05per.json"].content_type == "application/json; charset=utf-8"
    error_message = "Los estilos y el GeoJSON deben publicarse con sus tipos correctos."
  }
}
