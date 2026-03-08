const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE || "Customers";

exports.handler = async (event) => {
  console.log("connect-greeting event:", JSON.stringify(event, null, 2));

  try {
    const phoneNumber = event?.Details?.ContactData?.CustomerEndpoint?.Address;

    if (!phoneNumber) {
      console.warn("No phone number found in event, using generic greeting");
      return { firstName: "there" };
    }

    const result = await docClient.send(
      new QueryCommand({
        TableName: CUSTOMERS_TABLE,
        IndexName: "PhoneIndex",
        KeyConditionExpression: "phoneNumber = :phone",
        ExpressionAttributeValues: {
          ":phone": phoneNumber,
        },
        Limit: 1,
      })
    );

    if (result.Items && result.Items.length > 0) {
      const customer = result.Items[0];
      console.log("Customer found:", customer.customerId);
      return { firstName: customer.firstName };
    }

    console.warn("No customer found for phone number:", phoneNumber);
    return { firstName: "there" };

  } catch (error) {
    console.error("Error looking up customer:", error);
    return { firstName: "there" };
  }
};
