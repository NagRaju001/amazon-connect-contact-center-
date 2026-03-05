const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  const orderId = event.pathParameters?.orderId;

  if (!orderId) {
    return {
      statusCode: 400,
      body: "orderId required"
    };
  }

  try {
    const command = new GetCommand({
      TableName: "Orders",
      Key: { orderId }
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return {
        statusCode: 404,
        body: "Order not found"
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item)
    };

  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: "Internal server error"
    };
  }
};