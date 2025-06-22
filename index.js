// index.js
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const gagstock = require("./gagstock/gagstock");
const { sendMessage } = require("./handles/sendMessage");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Facebook webhook verification (GET)
app.get("/api/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  } else {
    return res.sendStatus(403);
  }
});

// Handle Facebook messages (POST)
app.post("/api/webhook", async (req, res) => {
  try {
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
            await gagstock.execute(senderId, args.slice(1), process.env.PAGE_ACCESS_TOKEN);
          } else {
            await sendMessage(senderId, { text: "❓ Unknown command." }, process.env.PAGE_ACCESS_TOKEN);
          }
        }
      }

      return res.status(200).send("EVENT_RECEIVED");
    } else {
      return res.sendStatus(404);
    }
  } catch (err) {
    console.error("❌ Error handling POST:", err);
    return res.sendStatus(500);
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is live on port ${PORT}`);
});
