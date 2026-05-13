const axios = require('axios');

const BASE_URL = "http://localhost:5000";
const TEST_BAP_URI = "http://localhost:5001"; // mock BAP
const TRANSACTION_ID = require('uuid').v4();

// Test 1: Health check
async function testHealth() {
  const res = await axios.get(BASE_URL + "/ondc/health");
  console.assert(res.data.status === "UP", "Health check failed");
  console.log("✅ Health check passed");
}

// Test 2: Well-known endpoint
async function testWellKnown() {
  const res = await axios.get(BASE_URL + "/.well-known/beckn.json");
  console.assert(res.data.subscriber_id, "Missing subscriber_id");
  console.assert(res.data.signing_public_key, "Missing signing_public_key");
  console.assert(res.data.type === "BPP", "Wrong type");
  console.log("✅ Well-known endpoint passed");
}

// Test 3: Search returns ACK
async function testSearch() {
  const payload = {
    context: {
      domain: "ONDC:RET12",
      action: "search",
      country: "IND",
      city: "std:011",
      core_version: "1.2.0",
      bap_id: "test-bap.example.com",
      bap_uri: TEST_BAP_URI,
      transaction_id: TRANSACTION_ID,
      message_id: require('uuid').v4(),
      timestamp: new Date().toISOString(),
      ttl: "PT30S"
    },
    message: {
      intent: {
        item: { descriptor: { name: "" } },
        fulfillment: { type: "Delivery", end: { location: { gps: "28.6448,77.2167", address: { area_code: "110001" } } } },
        payment: { "@ondc/org/buyer_app_finder_fee_type": "percent", "@ondc/org/buyer_app_finder_fee_amount": "3" }
      }
    }
  };
  const res = await axios.post(BASE_URL + "/ondc/search", payload);
  console.assert(res.data.message.ack.status === "ACK", "Search did not return ACK");
  console.log("✅ Search ACK passed");
}

// Run all tests
(async () => {
  try {
    await testHealth();
    await testWellKnown();
    await testSearch();
    console.log("\n✅✅✅ All self-tests passed. Ready for ONDC sandbox submission.");
  } catch (err) {
    console.error("❌ Test failed:", err.message);
    if (err.response) console.error("Response:", JSON.stringify(err.response.data, null, 2));
  }
})();
