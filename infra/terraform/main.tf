provider "aws" {
  region = "us-east-1"
}

# Orders table
resource "aws_dynamodb_table" "orders" {
  name         = "Orders"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"

  attribute {
    name = "orderId"
    type = "S"
  }

  tags = {
    Project     = "AmazonConnectContactCenter"
    Environment = "dev"
  }
}

# Customers table
resource "aws_dynamodb_table" "customers" {
  name         = "Customers"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "customerId"

  attribute {
    name = "customerId"
    type = "S"
  }

  attribute {
    name = "email"
    type = "S"
  }

  global_secondary_index {
    name            = "EmailIndex"
    hash_key        = "email"
    projection_type = "ALL"
  }

  attribute {
    name = "phoneNumber"
    type = "S"
  }

  global_secondary_index {
    name            = "PhoneIndex"
    hash_key        = "phoneNumber"
    projection_type = "ALL"
  }

  lifecycle {
    ignore_changes = [read_capacity, write_capacity]
  }

  tags = {
    Project     = "AmazonConnectContactCenter"
    Environment = "dev"
  }
}

# Returns table
resource "aws_dynamodb_table" "returns_table" {
  name         = "Returns"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "returnId"

  attribute {
    name = "returnId"
    type = "S"
  }

  attribute {
    name = "orderId"
    type = "S"
  }

  global_secondary_index {
    name            = "OrderIndex"
    hash_key        = "orderId"
    projection_type = "ALL"
  }

  tags = {
    Environment = "dev"
    Project     = "contact-center"
  }
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
      ORDERS_TABLE    = aws_dynamodb_table.orders.name
      CUSTOMERS_TABLE = aws_dynamodb_table.customers.name
      RETURNS_TABLE   = aws_dynamodb_table.returns_table.name
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
      API_BASE_URL = "https://i3kzrvrdq0.execute-api.us-east-1.amazonaws.com"
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
