output "api_url" {
  value = aws_api_gateway_stage.dev.invoke_url
}

output "api_key" {
  value     = aws_api_gateway_api_key.api_key.value
  sensitive = true
}