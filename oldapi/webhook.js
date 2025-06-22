// index.js

const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const gagstock = require("./gagstock/gagstock");
const { sendMessage } = require("./handles/sendMessage");

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// Webhook verification
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.status(403).send("Verification failed");
  }
});

// Handle messages
app.post("/api/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      for (const event of entry.messaging) {
        const senderId = event.sender.id;
        const message = event.message?.text;
        if (!message) continue;

        const args = message.trim().split(" ");
        const command = args[0].toLowerCase();

        if (command === "gagstock") {
          await gagstock.execute(senderId, args.slice(1), PAGE_ACCESS_TOKEN);
        } else {
          await sendMessage(senderId, { text: "❓ Unknown command." }, PAGE_ACCESS_TOKEN);
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
