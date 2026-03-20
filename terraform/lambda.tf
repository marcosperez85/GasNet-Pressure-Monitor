# Comprimir archivo de Lambda

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/${var.lambda_path}"
  output_path = "${path.module}/lambda.zip"
}

# Definir función Lambda

resource "aws_lambda_function" "chatbot" {
  function_name = "ophub-chatbot"

  runtime = "python3.11"
  handler = "lambda_function.lambda_handler"

  role = aws_iam_role.lambda_role.arn

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout = 30
  publish = true
}

###########################################################################

# Invocar a API Gateway

resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

###########################################################################