const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const ORDERS_TABLE    = process.env.ORDERS_TABLE;
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE;
const RETURNS_TABLE   = process.env.RETURNS_TABLE;

exports.handler = async (event) => {
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;
  const rawPath    = event.rawPath || event.path || "";

  console.log("routeKey:", event.routeKey);
  console.log("rawPath:", rawPath);
  console.log("httpMethod:", httpMethod);

  // GET /customers/phone/{phoneNumber}
  if (httpMethod === "GET" && rawPath.startsWith("/customers/phone/")) {
    const phoneNumber = decodeURIComponent(
      rawPath.replace("/customers/phone/", "")
    );

    console.log("GET customer by phone:", phoneNumber);

    try {
      const result = await docClient.send(new QueryCommand({
        TableName: CUSTOMERS_TABLE,
        IndexName: "PhoneIndex",
        KeyConditionExpression: "phoneNumber = :phone",
        ExpressionAttributeValues: { ":phone": phoneNumber }
      }));

      if (!result.Items || result.Items.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Customer not found" })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.Items[0])
      };

    } catch (error) {
      console.error("GET customer error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal server error" })
      };
    }
  }

  // GET /returns/{orderId}
  if (httpMethod === "GET" && rawPath.startsWith("/returns/")) {
    const orderId = rawPath.replace("/returns/", "");

    console.log("GET returns by orderId:", orderId);

    try {
      const result = await docClient.send(new QueryCommand({
        TableName: RETURNS_TABLE,
        IndexName: "OrderIndex",
        KeyConditionExpression: "orderId = :orderId",
        ExpressionAttributeValues: { ":orderId": orderId }
      }));

      return {
        statusCode: 200,
        body: JSON.stringify(result.Items || [])
      };

    } catch (error) {
      console.error("GET returns error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal server error" })
      };
    }
  }

  // GET /orders/{orderId}
  if (httpMethod === "GET" && rawPath.startsWith("/orders/")) {
    const orderId = rawPath.replace("/orders/", "");

    console.log("GET order:", orderId);

    try {
      const result = await docClient.send(new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId }
      }));

      if (!result.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Order not found" })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify(result.Item)
      };

    } catch (error) {
      console.error("GET order error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal server error" })
      };
    }
  }

  // POST /returns
  if (httpMethod === "POST" && rawPath === "/returns") {
    const rawBody = typeof event.body === "string"
      ? event.body
      : JSON.stringify(event.body || {});

    const body = JSON.parse(rawBody);
    const { orderId, reason, customerId } = body;

    console.log("POST return:", orderId, reason);

    if (!orderId || !reason) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "orderId and reason required" })
      };
    }

    const returnId  = `RET${Date.now()}`;
    const createdAt = new Date().toISOString();

    const returnItem = {
      returnId,
      orderId,
      reason,
      customerId: customerId || "unknown",
      status: "PENDING",
      createdAt
    };

    try {
      await docClient.send(new PutCommand({
        TableName: RETURNS_TABLE,
        Item: returnItem
      }));

      console.log("Return saved:", returnId);

      return {
        statusCode: 201,
        body: JSON.stringify({
          returnId,
          orderId,
          status: "PENDING",
          message: "Return request created successfully"
        })
      };

    } catch (error) {
      console.error("POST return error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal server error" })
      };
    }
  }

  // POST /auth
  if (httpMethod === "POST" && rawPath === "/auth") {
    const rawBody = typeof event.body === "string"
      ? event.body
      : JSON.stringify(event.body || {});

    const body = JSON.parse(rawBody);
    const { orderId, email } = body;

    console.log("POST auth:", orderId, email);

    if (!orderId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "orderId and email required" })
      };
    }

    try {
      const orderResult = await docClient.send(new GetCommand({
        TableName: ORDERS_TABLE,
        Key: { orderId }
      }));

      if (!orderResult.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Order not found" })
        };
      }

      const customerId = orderResult.Item.customerId;

      const customerResult = await docClient.send(new GetCommand({
        TableName: CUSTOMERS_TABLE,
        Key: { customerId }
      }));

      if (!customerResult.Item) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Customer not found" })
        };
      }

      if (customerResult.Item.email.toLowerCase() !== email.toLowerCase()) {
        return {
          statusCode: 401,
          body: JSON.stringify({ message: "Authentication failed" })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Authentication successful",
          customerId
        })
      };

    } catch (error) {
      console.error("POST auth error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Internal server error" })
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({ message: "Unsupported method or path" })
  };
};