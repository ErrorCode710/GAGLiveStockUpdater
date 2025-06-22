// launcher.js

const gagstock = require("./gagstock/gagstock");

// Dummy sendMessage function to simulate Messenger replies
const sendMessage = async (senderId, message, token) => {
  console.log(`[Message to ${senderId}]:\n${message.text}\n`);
};

// Override sendMessage in gagstock for local testing
require.cache[require.resolve("./handles/sendMessage")].exports.sendMessage = sendMessage;

// Simulate an incoming command
const testSenderId = "local_user_123";
const testArgs = ["on", "Watering Can"]; // simulate "gagstock on Watering Can"
const testPageAccessToken = "dummy_token"; // token isn't needed locally

(async () => {
  await gagstock.execute(testSenderId, testArgs, testPageAccessToken);
})();
