terraform {
  backend "s3" {
    bucket = "nagaraju-terraform-state"
    key    = "contact-center/terraform.tfstate"
    region = "us-east-1"
  }
}
provider "aws" {
  region = "us-east-1"
}
variable "api_base_url" {
  description = "API Gateway base URL"
  type        = string
}
# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "lambda-dynamodb-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
}

# api-services Lambda
resource "aws_lambda_function" "api_service" {
  function_name = "api-orders-service"
  role          = aws_iam_role.lambda_role.arn
  handler       = "src/handler.handler"
  runtime       = "nodejs20.x"

  filename         = "../../services/lambdas/api-services/function.zip"
  source_code_hash = filebase64sha256("../../services/lambdas/api-services/function.zip")

  timeout = 10

  environment {
    variables = {
      ORDERS_TABLE    = "Orders"
      CUSTOMERS_TABLE = "Customers"
      RETURNS_TABLE   = "Returns"
    }
  }
}

# lex-hook Lambda
resource "aws_lambda_function" "lex_hook" {
  function_name = "lex-hook"
  role          = aws_iam_role.lambda_role.arn
  handler       = "src/handler.handler"
  runtime       = "nodejs20.x"

  filename         = "../../services/lambdas/lex-hook/function.zip"
  source_code_hash = filebase64sha256("../../services/lambdas/lex-hook/function.zip")

  timeout = 15

  environment {
  variables = {
    API_BASE_URL = var.api_base_url
  }
}
}

# API Gateway
resource "aws_apigatewayv2_api" "http_api" {
  name          = "orders-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api_service.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# API Gateway routes
resource "aws_apigatewayv2_route" "get_order" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /orders/{orderId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "get_customer_by_phone" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /customers/phone/{phoneNumber}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "post_auth" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /auth"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "post_returns" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /returns"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "get_returns" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET /returns/{orderId}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_service.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

output "api_url" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}
