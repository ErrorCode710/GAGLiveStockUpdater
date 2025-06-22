// api/webhook.js
const { gagstock } = require("../gagstock/gagstock");
const { sendMessage } = require("../handles/sendMessage");

const VERIFY_TOKEN = "your_verify_token";
const PAGE_ACCESS_TOKEN = "your_page_access_token";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    console.log("Facebook token:", req.query["hub.verify_token"]);
    console.log("Server token:", VERIFY_TOKEN);
    // ...
  }
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification failed");
    }
  }

  if (req.method === "POST") {
    const body = req.body;

    if (body.object === "page") {
      for (const entry of body.entry) {
        for (const event of entry.messaging) {
          const senderId = event.sender.id;

          if (event.message?.text) {
            const msgText = event.message.text.toLowerCase();
            const args = msgText.split(" ");

            if (args[0] === "gagstock") {
              await gagstock.execute(senderId, args.slice(1), PAGE_ACCESS_TOKEN);
            } else {
              await sendMessage(senderId, { text: "Unknown command." }, PAGE_ACCESS_TOKEN);
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    } else {
      return res.sendStatus(404);
    }
  }

  return res.status(405).send("Method Not Allowed");
}
