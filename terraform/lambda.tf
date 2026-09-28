# El script prepara dependencias Linux; archive_file conserva el despliegue ZIP.
locals {
  lambda_build_dir = "${path.module}/../build/lambda"
  lambda_source_hash = sha256(join("\n", concat(
    [filesha256("${path.module}/../requirements.txt"), filesha256("${path.module}/../requirements-lambda.lock")],
    [for name in sort(tolist(fileset("${path.module}/${var.lambda_path}", "*.py"))) : "${name}:${filesha256("${path.module}/${var.lambda_path}/${name}")}"]
  )))
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.lambda_build_dir
  output_path = "${path.module}/POC-chatbot-lambda.zip"
}

# Definir función Lambda

resource "aws_lambda_function" "chatbot" {
  function_name = "POC-chatbot"

  runtime = "python3.11"
  handler = "lambda_function.lambda_handler"

  role = aws_iam_role.lambda_role.arn

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = 28
  memory_size = 512
  publish     = true

  environment {
    variables = {
      BEDROCK_MODEL_ID      = var.bedrock_model_id
      STATE_BUCKET          = aws_s3_bucket.frontend.id
      STATE_KEY             = local.simulation_state_key
      INCIDENT_TEMPLATE_KEY = local.incident_template_key
      INCIDENTS_PREFIX      = local.incidents_prefix
    }
  }

  lifecycle {
    precondition {
      condition     = try(trimspace(file("${local.lambda_build_dir}/.source-hash")) == local.lambda_source_hash, false)
      error_message = "Falta construir el ZIP o el código cambió: ejecutá python scripts/build_lambda.py antes de plan."
    }
  }
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
