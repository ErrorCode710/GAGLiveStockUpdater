// handles/sendMessage.js
const axios = require("axios");

async function sendMessage(senderId, message, pageAccessToken) {
  await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`, {
    recipient: { id: senderId },
    message: message,
  });
  console.log(`[BOT]: ${message.text}`);
}

module.exports = { sendMessage };
