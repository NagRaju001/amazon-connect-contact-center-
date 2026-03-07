const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const customers = [
  {
    customerId: "CUST1001",
    firstName: "Nagaraju",
    lastName: "Mahesh",
    email: "nagaraju@example.com",
    phoneNumber: "+15513281882"
  },
  {
    customerId: "CUST1002",
    firstName: "Priya",
    lastName: "Sharma",
    email: "priya@example.com",
    phoneNumber: "+15513281883"
  },
  {
    customerId: "CUST1003",
    firstName: "Ravi",
    lastName: "Kumar",
    email: "ravi@example.com",
    phoneNumber: "+15513281884"
  }
];

const orders = [
  {
    orderId: "ORD10001",
    customerId: "CUST1001",
    status: "SHIPPED",
    trackingNumber: "TRK10001",
    expectedDelivery: "2026-03-15",
    createdAt: "2026-02-20T12:00:00Z"
  },
  {
    orderId: "ORD10002",
    customerId: "CUST1002",
    status: "PROCESSING",
    trackingNumber: "TRK10002",
    expectedDelivery: "2026-03-20",
    createdAt: "2026-03-01T09:00:00Z"
  },
  {
    orderId: "ORD10003",
    customerId: "CUST1003",
    status: "DELIVERED",
    trackingNumber: "TRK10003",
    expectedDelivery: "2026-03-05",
    createdAt: "2026-02-18T15:00:00Z"
  }
];

async function seed() {
  console.log("Starting seed...");

  console.log("Seeding customers...");
  for (const customer of customers) {
    await docClient.send(new PutCommand({
      TableName: "Customers",
      Item: customer
    }));
    console.log("✅ Inserted customer:", customer.customerId, customer.firstName);
  }

  console.log("Seeding orders...");
  for (const order of orders) {
    await docClient.send(new PutCommand({
      TableName: "Orders",
      Item: order
    }));
    console.log("✅ Inserted order:", order.orderId, order.status);
  }

  console.log("Seed complete! ✅");
}

seed().catch(console.error);