resource "aws_api_gateway_api_key" "api_key" {
  name = "ophub-api-key"
}

resource "aws_api_gateway_usage_plan" "usage_plan" {
  name = "ophub-usage-plan"

  api_stages {
    api_id = aws_api_gateway_rest_api.api.id
    stage  = aws_api_gateway_stage.dev.stage_name
  }

  throttle_settings {
    rate_limit  = 10 # requests por segundo
    burst_limit = 20
  }
}

resource "aws_api_gateway_usage_plan_key" "key" {
  key_id        = aws_api_gateway_api_key.api_key.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.usage_plan.id
}
###########################################################################

# IAM Roles

resource "aws_iam_role" "lambda_role" {
  name = "lambda-bedrock-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

###########################################################################

# Permiso para bedrock

resource "aws_iam_role_policy" "bedrock_policy" {
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Action = [
        "bedrock:InvokeModel"
      ],
      # Por ahora dejo que Lambda pueda invocar cualquier modelo.
      # Luego de evaluar la performance voy a restringirlo a uno especifico
      Resource = "*"
    }]
  })
}

###########################################################################

# Permiso para crear logs de CloudWatch

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

###########################################################################

# Alojamiento del Terraform State

terraform {
  backend "s3" {
    bucket         = "terraform-state-mdp"
    key            = "bedrock-app/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-lock"
  }
}