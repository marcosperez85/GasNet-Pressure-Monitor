# =====================================================
# REST API
# =====================================================
resource "aws_api_gateway_rest_api" "api" {
  name = "POC-chatbot-api"
}

# =====================================================
# RESOURCE: /chat
# =====================================================
resource "aws_api_gateway_resource" "chat" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "chat"
}

# =====================================================
# METHOD: POST
# =====================================================
resource "aws_api_gateway_method" "post" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.chat.id
  http_method   = "POST"
  authorization = "NONE"

  api_key_required = true
}

# =====================================================
# INTEGRATION: POST → Lambda
# =====================================================
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.chat.id
  http_method = aws_api_gateway_method.post.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.chatbot.invoke_arn
}

# =====================================================
# METHOD: OPTIONS (CORS)
# =====================================================
resource "aws_api_gateway_method" "options" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.chat.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# =====================================================
# INTEGRATION: OPTIONS (MOCK)
# =====================================================
resource "aws_api_gateway_integration" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.chat.id
  http_method = aws_api_gateway_method.options.http_method

  type = "MOCK"

  request_templates = {
    "application/json" = "{ \"statusCode\": 200 }"
  }
}

# =====================================================
# METHOD RESPONSE: OPTIONS (CORS)
# =====================================================
resource "aws_api_gateway_method_response" "options" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.chat.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# =====================================================
# INTEGRATION RESPONSE: OPTIONS (CORS)
# =====================================================
resource "aws_api_gateway_integration_response" "options" {
  depends_on = [
    aws_api_gateway_integration.options
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.chat.id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_templates = {
    "application/json" = ""
  }

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-api-key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}
# =====================================================
# DEPLOYMENT
# =====================================================
resource "aws_api_gateway_deployment" "deployment" {
  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.options,
    aws_api_gateway_integration_response.options,
    aws_lambda_permission.apigw
  ]

  rest_api_id = aws_api_gateway_rest_api.api.id

  triggers = {
    # No serializar recursos completos: incluyen atributos calculados por AWS
    # (por ejemplo cache_namespace) que pueden cambiar entre plan y apply.
    redeployment = sha1(jsonencode({
      path = aws_api_gateway_resource.chat.path_part
      post = {
        method           = aws_api_gateway_method.post.http_method
        authorization    = aws_api_gateway_method.post.authorization
        api_key_required = aws_api_gateway_method.post.api_key_required
        integration = {
          method = aws_api_gateway_integration.lambda.integration_http_method
          type   = aws_api_gateway_integration.lambda.type
          uri    = aws_api_gateway_integration.lambda.uri
        }
      }
      options = {
        method        = aws_api_gateway_method.options.http_method
        authorization = aws_api_gateway_method.options.authorization
        integration = {
          type              = aws_api_gateway_integration.options.type
          request_templates = aws_api_gateway_integration.options.request_templates
        }
        method_response = {
          status_code = aws_api_gateway_method_response.options.status_code
          parameters  = aws_api_gateway_method_response.options.response_parameters
        }
        integration_response = {
          status_code = aws_api_gateway_integration_response.options.status_code
          parameters  = aws_api_gateway_integration_response.options.response_parameters
          templates   = aws_api_gateway_integration_response.options.response_templates
        }
      }
      gateway_responses = {
        default_4xx = {
          type       = aws_api_gateway_gateway_response.default_4xx.response_type
          parameters = aws_api_gateway_gateway_response.default_4xx.response_parameters
        }
        default_5xx = {
          type       = aws_api_gateway_gateway_response.default_5xx.response_type
          parameters = aws_api_gateway_gateway_response.default_5xx.response_parameters
        }
      }
    }))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# =====================================================
# STAGE: DEV
# =====================================================
resource "aws_api_gateway_stage" "dev" {
  stage_name    = "dev"
  rest_api_id   = aws_api_gateway_rest_api.api.id
  deployment_id = aws_api_gateway_deployment.deployment.id
}


# =====================================================
# API GATEWAY RESPONSES
# =====================================================

resource "aws_api_gateway_gateway_response" "default_4xx" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  response_type = "DEFAULT_4XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,x-api-key'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
}

resource "aws_api_gateway_gateway_response" "default_5xx" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  response_type = "DEFAULT_5XX"

  response_parameters = {
    "gatewayresponse.header.Access-Control-Allow-Origin"  = "'*'"
    "gatewayresponse.header.Access-Control-Allow-Headers" = "'Content-Type,x-api-key'"
    "gatewayresponse.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
  }
}

# =====================================================
# ACTIVAR LOGS PARA API GATEWAY
# =====================================================

resource "aws_api_gateway_method_settings" "settings" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = aws_api_gateway_stage.dev.stage_name
  method_path = "*/*"

  settings {
    logging_level      = "INFO"
    data_trace_enabled = true
    metrics_enabled    = true
  }
}
