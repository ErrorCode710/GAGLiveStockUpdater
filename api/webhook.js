import { parse } from "url"; // built-in Node.js module

const { gagstock } = require("../gagstock/gagstock");
const { sendMessage } = require("../handles/sendMessage");

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { query } = parse(req.url, true);
    const mode = query["hub.mode"];
    const token = query["hub.verify_token"];
    const challenge = query["hub.challenge"];

    console.log("Facebook token:", token);
    console.log("Server token:", process.env.VERIFY_TOKEN);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      res.end(challenge);
    } else {
      res.status(403).send("Verification failed");
    }
  } else if (req.method === "POST") {
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

        res.status(200).send("EVENT_RECEIVED");
      } else {
        res.status(404).send("Not a page object");
      }
    } catch (error) {
      console.error("POST error:", error);
      res.status(500).send("Server error");
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
