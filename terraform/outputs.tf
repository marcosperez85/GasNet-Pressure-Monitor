output "api_url" {
  value = aws_api_gateway_stage.dev.invoke_url
}

output "api_key" {
  value     = aws_api_gateway_api_key.api_key.value
  sensitive = true
}

output "frontend_url" {
  value = "https://${aws_cloudfront_distribution.frontend.domain_name}"
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.frontend.id
}
