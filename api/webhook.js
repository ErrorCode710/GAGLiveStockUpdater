// api/webhook.js
const { gagstock } = require("../gagstock/gagstock");
const { sendMessage } = require("../handles/sendMessage");

const VERIFY_TOKEN = "your_verify_token";
const PAGE_ACCESS_TOKEN = "your_page_access_token";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Facebook token:", token);
    console.log("Server token:", process.env.VERIFY_TOKEN);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    } else {
      return res.status(403).send("Verification failed");
    }
  }

  // Handle POST for real messages later
  res.status(405).send("Method Not Allowed");
}
