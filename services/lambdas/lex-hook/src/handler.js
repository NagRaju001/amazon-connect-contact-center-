const axios = require("axios");

const API_BASE_URL = process.env.API_BASE_URL;

async function getCustomerByPhone(phoneNumber) {
  try {
    const encodedPhone = encodeURIComponent(phoneNumber);
    const response = await axios.get(
      `${API_BASE_URL}/customers/phone/${encodedPhone}`
    );
    return response.data;
  } catch (error) {
    console.log("Customer lookup error:", error.message);
    return null;
  }
}

exports.handler = async (event) => {
  console.log("Lex event v3:", JSON.stringify(event, null, 2));

  const intentName = event.sessionState.intent.name;
  const slots = event.sessionState.intent.slots;

if (intentName === "GoodbyeIntent") {
  return {
    sessionState: {
      dialogAction: { type: "Close" },
      intent: { name: "GoodbyeIntent", state: "Fulfilled" }
    },
    messages: [{
      contentType: "PlainText",
      content: "Thank you for calling. Have a great day!"
    }]
  };
}

if (intentName === "FallbackIntent") {
  return buildElicitIntent(
    "I'm sorry, I didn't understand that. " +
    "I can help you with order status, returns, " +
    "or transfer you to an agent. Which would you like?"
  );
}

  const phoneNumber = event.sessionState.sessionAttributes?.customerPhone;

  console.log("Customer phone:", phoneNumber);

  let customer = null;
  if (phoneNumber) {
    customer = await getCustomerByPhone(phoneNumber);
    console.log("Customer found:", JSON.stringify(customer));
  }

  const customerName = customer?.firstName || "there";

  if (intentName === "CheckOrderStatus") {
    return await handleCheckOrderStatus(event, slots, customerName);
  }
  if (intentName === "ReturnOrder") {
    return await handleReturnOrder(event, slots, customerName, customer);
  }
  
  if (intentName === "SpeakToAgent") {
    return await handleSpeakToAgent(event);
  }
  return await handleFallback(event);
  
};


function buildClose(event, message) {
  return {
    sessionState: {
      dialogAction: { type: "Close" },
      intent: {
        name: event.sessionState.intent.name,
        state: "Fulfilled"
      }
    },
    messages: [{ contentType: "PlainText", content: message }]
  };
}

function buildElicitSlot(event, slotName, message) {
  
  return {
    sessionState: {
      dialogAction: {
        type: "ElicitSlot",
        slotToElicit: slotName
      },
      intent: {
        name: event.sessionState.intent.name,
        state: "InProgress",
        slots: event.sessionState.intent.slots
      }
    },
    messages: [{ contentType: "PlainText", content: message }]
  };
}
function buildElicitIntent(message) {
  return {
    sessionState: {
      dialogAction: {
        type: "ElicitIntent"
      }
    },
    messages: [
      {
        contentType: "PlainText",
        content: message
      }
    ]
  };
}

async function handleCheckOrderStatus(event, slots, customerName) {
  const rawOrderNumber = slots?.orderNumber?.value?.interpretedValue;

  let orderNumber;
  if (!rawOrderNumber) {
    orderNumber = null;
  } else if (rawOrderNumber.toUpperCase().startsWith("ORD")) {
    orderNumber = rawOrderNumber.toUpperCase();
  } else if (/^\d+$/.test(rawOrderNumber)) {
    orderNumber = `ORD1${rawOrderNumber}`;
  } else {
    orderNumber = rawOrderNumber.toUpperCase();
  }

  console.log("rawOrderNumber:", rawOrderNumber);
  console.log("final orderNumber:", orderNumber);
  console.log("API_BASE_URL:", API_BASE_URL);

  if (!orderNumber) {
    return buildElicitSlot(event, "orderNumber",
      "Please say your order number or enter the last 4 digits using your keypad.");
  }
  // Validate order number looks like a real order
const isValidOrderNumber = orderNumber.startsWith("ORD") || 
                           /^\d+$/.test(rawOrderNumber);

if (!isValidOrderNumber) {
  return buildElicitSlot(event, "orderNumber",
    "That doesn't look like a valid order number. " +
    "Please enter the last 4 digits using your keypad " +
    "or say your full order number."
  );
}

  try {
    console.log("Calling API:", `${API_BASE_URL}/orders/${orderNumber}`);
    const response = await axios.get(
      `${API_BASE_URL}/orders/${orderNumber}`
    );
    console.log("API response:", JSON.stringify(response.data));
    const order = response.data;
    return buildElicitIntent(
  `Your order ${order.orderId} is currently ${order.status}. ` +
  `Expected delivery is ${order.expectedDelivery}. ` +
  `Your tracking number is ${order.trackingNumber}. ` +
  `Is there anything else I can help you with?`
);
  } catch (error) {
    console.log("API error:", error.message);
    if (error.response?.status === 404) {
      return buildElicitSlot(event, "orderNumber",
        `I could not find that order. ` +
        `Please try again by saying your order number ` +
        `or enter the last 4 digits using your keypad.`
      );
    }
    return buildClose(event,
      "I'm sorry, I could not retrieve your order details right now. " +
      "Please try again later."
    );
  }
}

async function handleReturnOrder(event, slots, customerName, customer) {
  const rawOrderNumber = slots?.orderNumber?.value?.interpretedValue;

  let orderNumber;
  if (!rawOrderNumber) {
    orderNumber = null;
  } else if (rawOrderNumber.toUpperCase().startsWith("ORD")) {
    orderNumber = rawOrderNumber.toUpperCase();
  } else if (/^\d+$/.test(rawOrderNumber)) {
    orderNumber = `ORD1${rawOrderNumber}`;
  } else {
    orderNumber = rawOrderNumber.toUpperCase();
  }

  console.log("rawOrderNumber:", rawOrderNumber);
  console.log("final orderNumber:", orderNumber);

  const returnReason = slots?.returnReason?.value?.interpretedValue;

  if (!orderNumber) {
    return buildElicitSlot(event, "orderNumber",
      "Please say your order number or enter the last 4 digits using your keypad for the return.");
  }
  // Validate order number looks like a real order
const isValidOrderNumber = orderNumber.startsWith("ORD") || 
                           /^\d+$/.test(rawOrderNumber);

if (!isValidOrderNumber) {
  return buildElicitSlot(event, "orderNumber",
    "That doesn't look like a valid order number. " +
    "Please enter the last 4 digits using your keypad " +
    "or say your full order number."
  );
}
  if (!returnReason) {
    return buildElicitSlot(event, "returnReason",
      "What is the reason for your return? " +
      "For example damaged, wrong item, or changed mind.");
  }
  try {
    const customerId = customer?.customerId || "UNKNOWN";
    await axios.post(`${API_BASE_URL}/returns`, {
      orderId: orderNumber,
      reason: returnReason,
      customerId: customerId
    });
    console.log("Return saved successfully for order:", orderNumber);
  } catch (error) {
    console.log("Failed to save return:", error.message);
    return buildClose(event,
      "I'm sorry, I was unable to submit your return request right now. " +
      "Please try again later or speak to an agent."
    );
  }

  return buildElicitIntent(
    `Your return request for order ${orderNumber} ` +
    `with reason ${returnReason} has been submitted. ` +
    `Our team will contact you within 24 hours with return instructions. ` +
    `Is there anything else I can help you with?`
  );
}

async function handleSpeakToAgent(event) {
  return buildClose(event,
    "Please hold while I transfer you to the next available agent.");
}

async function handleFallback(event) {
  return buildElicitIntent(
    "I'm sorry, I didn't understand that. " +
    "I can help you with order status, returns, " +
    "or transfer you to an agent. Which would you like?"
  );
}