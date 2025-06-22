const { gagstock } = require("../gagstock/gagstock");
const { sendMessage } = require("../handles/sendMessage");

export default async function handler(req, res) {
  if (req.method === "GET") {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Facebook token:", token);
    console.log("Server token:", process.env.VERIFY_TOKEN);

    if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain");
      res.end(challenge); // ✅ send raw challenge string
    } else {
      res.status(403).send("Verification failed");
    }
  } else {
    res.status(405).send("Method Not Allowed");
  }
}
