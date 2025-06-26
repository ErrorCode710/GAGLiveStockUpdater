const { sendMessage } = require("../handles/sendMessage");
const WebSocket = require("ws");
const axios = require("axios");
const { Pool } = require("pg");

const activeSessions = new Map();
const lastSentCache = new Map();
const PH_TIMEZONE = "Asia/Manila";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Add connection test
pool.on("error", (err) => {
  console.error("PostgreSQL error:", err);
});

app.post("/register-token", async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token?.startsWith("ExponentPushToken[")) {
    return res.status(400).json({ error: "Invalid token or missing userId" });
  }

  try {
    await saveToken(userId, token);
    return res.status(200).json({ message: "✅ Token saved" });
  } catch (err) {
    console.error("Token save failed:", err);
    return res.status(500).json({ error: "❌ Failed to save token" });
  }
});
// Create tokens table (run once)
async function initDB() {
  console.log("Connecting to DB at:", process.env.DATABASE_URL);
  try {
    await pool.query("SELECT NOW()");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tokens (
        user_id TEXT PRIMARY KEY,
        expo_token TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("✅ Database ready");
  } catch (err) {
    console.error("❌ DB Connection failed:", {
      error: err.message,
      connectionString: process.env.DATABASE_URL,
      host: new URL(process.env.DATABASE_URL).hostname,
    });
    throw err;
  }
}
initDB();
async function getToken(userId) {
  const res = await pool.query("SELECT expo_token FROM tokens WHERE user_id = $1", [userId]);
  return res.rows[0]?.expo_token;
}

async function saveToken(userId, token) {
  await pool.query(
    `
    INSERT INTO tokens (user_id, expo_token)
    VALUES ($1, $2)
    ON CONFLICT (user_id) 
    DO UPDATE SET expo_token = $2, created_at = NOW()
  `,
    [userId, token]
  );
}

// For My App
async function sendExpoPushNotification(token, message) {
  try {
    await axios.post("https://exp.host/--/api/v2/push/send", {
      to: token,
      title: "🌱 GAG Stock Update",
      body: message,
      sound: "default",
    });
  } catch (err) {
    console.error("Failed to send Expo push notification:", err);
  }
}

function pad(n) {
  return n < 10 ? "0" + n : n;
}

function getPHTime() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: PH_TIMEZONE }));
}

function getCountdown(target) {
  const now = getPHTime();
  const msLeft = target - now;
  if (msLeft <= 0) return "00h 00m 00s";
  const h = Math.floor(msLeft / 3.6e6);
  const m = Math.floor((msLeft % 3.6e6) / 6e4);
  const s = Math.floor((msLeft % 6e4) / 1000);
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

function getNextRestocks() {
  const now = getPHTime();
  const timers = {};

  const nextEgg = new Date(now);
  nextEgg.setMinutes(now.getMinutes() < 30 ? 30 : 0);
  if (now.getMinutes() >= 30) nextEgg.setHours(now.getHours() + 1);
  nextEgg.setSeconds(0, 0);
  timers.egg = getCountdown(nextEgg);

  const next5 = new Date(now);
  const nextM = Math.ceil((now.getMinutes() + (now.getSeconds() > 0 ? 1 : 0)) / 5) * 5;
  next5.setMinutes(nextM === 60 ? 0 : nextM, 0, 0);
  if (nextM === 60) next5.setHours(now.getHours() + 1);
  timers.gear = timers.seed = getCountdown(next5);

  const nextHoney = new Date(now);
  nextHoney.setMinutes(now.getMinutes() < 30 ? 30 : 0);
  if (now.getMinutes() >= 30) nextHoney.setHours(now.getHours() + 1);
  nextHoney.setSeconds(0, 0);
  timers.honey = getCountdown(nextHoney);

  const next7 = new Date(now);
  const totalHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const next7h = Math.ceil(totalHours / 7) * 7;
  next7.setHours(next7h, 0, 0, 0);
  timers.cosmetics = getCountdown(next7);

  return timers;
}

function formatValue(val) {
  if (val >= 1_000_000) return `x${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `x${(val / 1_000).toFixed(1)}K`;
  return `x${val}`;
}

function addEmoji(name) {
  const emojis = {
    "Common Egg": "🥚",
    "Uncommon Egg": "🐣",
    "Rare Egg": "🍳",
    "Legendary Egg": "🪺",
    "Mythical Egg": "🔮",
    "Bug Egg": "🪲",
    "Cleaning Spray": "🧴",
    "Friendship Pot": "🪴",
    "Watering Can": "🚿",
    Trowel: "🛠️",
    "Recall Wrench": "🔧",
    "Basic Sprinkler": "💧",
    "Advanced Sprinkler": "💦",
    "Godly Sprinkler": "⛲",
    "Lightning Rod": "⚡",
    "Master Sprinkler": "🌊",
    "Favorite Tool": "❤️",
    "Harvest Tool": "🌾",
    Carrot: "🥕",
    Strawberry: "🍓",
    Blueberry: "🫐",
    "Orange Tulip": "🌷",
    Tomato: "🍅",
    Corn: "🌽",
    Daffodil: "🌼",
    Watermelon: "🍉",
    Pumpkin: "🎃",
    Apple: "🍎",
    Bamboo: "🎍",
    Coconut: "🥥",
    Cactus: "🌵",
    "Dragon Fruit": "🍈",
    Mango: "🥭",
    Grape: "🍇",
    Mushroom: "🍄",
    Pepper: "🌶️",
    Cacao: "🍫",
    Beanstalk: "🌱",
    "Ember Lily": "🏵️",
    "Sugar Apple": "🍏",
  };
  return `${emojis[name] || ""} ${name}`;
}

module.exports = {
  name: "gagstock",
  description: "Track Grow A Garden stock using WebSocket live updates.",
  usage: "gagstock on | gagstock on Sunflower | Watering Can | gagstock off",
  category: "Tools ⚒️",

  async execute(senderId, args, pageAccessToken) {
    const action = args[0]?.toLowerCase();

    if (action === "register-token") {
      const token = args[1];
      if (!token?.startsWith("ExponentPushToken[")) {
        return await sendMessage(
          senderId,
          { text: "⚠️ Invalid token format! Get a new one from the app." },
          pageAccessToken
        );
      }
      try {
        await saveToken(senderId, token);
        return await sendMessage(senderId, { text: "✅ Token saved! You'll get app notifications." }, pageAccessToken);
      } catch (err) {
        console.error("Database save failed:", err);
        return await sendMessage(senderId, { text: "⚠️ Failed to save token. Try again later." }, pageAccessToken);
      }
    }

    const filters = args
      .slice(1)
      .join(" ")
      .split("|")
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean);

    if (action === "off") {
      const session = activeSessions.get(senderId);
      if (session) {
        clearInterval(session.keepAlive);
        session.closed = true;
        session.ws?.terminate();
        activeSessions.delete(senderId);
        lastSentCache.delete(senderId);
        return await sendMessage(senderId, { text: "🛑 Gagstock tracking stopped." }, pageAccessToken);
      } else {
        return await sendMessage(senderId, { text: "⚠️ You don't have an active gagstock session." }, pageAccessToken);
      }
    }

    if (action !== "on") {
      return await sendMessage(
        senderId,
        {
          text: "📌 Usage:\n• gagstock on\n• gagstock on Sunflower | Watering Can\n• gagstock off",
        },
        pageAccessToken
      );
    }

    if (activeSessions.has(senderId)) {
      return await sendMessage(
        senderId,
        {
          text: "📡 You're already tracking Gagstock. Use gagstock off to stop.",
        },
        pageAccessToken
      );
    }

    await sendMessage(senderId, { text: "✅ Gagstock tracking started via WebSocket!" }, pageAccessToken);

    let ws;
    let keepAliveInterval;

    function connectWebSocket() {
      ws = new WebSocket("wss://gagstock.gleeze.com");

      ws.on("open", () => {
        console.log(`✅ WebSocket connected for ${senderId}`);
        keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send("ping");
          }
        }, 10000);
      });

      ws.on("message", async (data) => {
        try {
          const dataTest = data.toString();

          const payload = JSON.parse(data);
          if (payload.status !== "success") return;

          const backup = payload.data;
          const stockData = {
            gearStock: backup.gear.items.map((i) => ({ name: i.name, value: Number(i.quantity) })),
            seedsStock: backup.seed.items.map((i) => ({ name: i.name, value: Number(i.quantity) })),
            eggStock: backup.egg.items.map((i) => ({ name: i.name, value: Number(i.quantity) })),
            cosmeticsStock: backup.cosmetics.items.map((i) => ({ name: i.name, value: Number(i.quantity) })),
            honeyStock: backup.honey.items.map((i) => ({ name: i.name, value: Number(i.quantity) })),
          };
          console.log("Parsed stock data:", JSON.stringify(stockData, null, 2));

          const currentKey = JSON.stringify({
            gearStock: stockData.gearStock,
            seedsStock: stockData.seedsStock,
          });

          const lastSent = lastSentCache.get(senderId);
          if (lastSent === currentKey) return;
          lastSentCache.set(senderId, currentKey);

          // For My app push
          const expoToken = await getToken(senderId);
          if (expoToken) {
            await sendExpoPushNotification(expoToken, "New GAG stock update! Check your app.");
          }

          const restocks = getNextRestocks();
          const formatList = (arr) => arr.map((i) => `- ${addEmoji(i.name)}: ${formatValue(i.value)}`).join("\n");

          let filteredContent = "";
          let matched = 0;

          const addSection = (label, items, restock) => {
            const filtered = filters.length
              ? items.filter((i) => filters.some((f) => i.name.toLowerCase().includes(f)))
              : items;
            if (label === "🛠️ 𝗚𝗲𝗮𝗿" || label === "🌱 𝗦𝗲𝗲𝗱𝘀") {
              if (filtered.length > 0) {
                matched += filtered.length;
                filteredContent += `${label}:\n${formatList(filtered)}\n⏳ Restock In: ${restock}\n\n`;
              }
            } else {
              filteredContent += `${label}:\n${formatList(items)}\n⏳ Restock In: ${restock}\n\n`;
            }
          };

          addSection("🛠️ 𝗚𝗲𝗮𝗿", stockData.gearStock, restocks.gear);
          addSection("🌱 𝗦𝗲𝗲𝗱𝘀", stockData.seedsStock, restocks.seed);
          addSection("🥚 𝗘𝗴𝗴𝘀", stockData.eggStock, restocks.egg);
          addSection("🎨 𝗖𝗼𝘀𝗺𝗲𝘁𝗶𝗰𝘀", stockData.cosmeticsStock, restocks.cosmetics);
          addSection("🍯 𝗛𝗼𝗻𝗲𝘆", stockData.honeyStock, restocks.honey);

          if (matched === 0 && filters.length > 0) return;

          const updatedAtPH = getPHTime().toLocaleString("en-PH", {
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
            hour12: true,
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

          const weather = await axios
            .get("https://growagardenstock.com/api/stock/weather")
            .then((res) => res.data)
            .catch(() => null);
          const weatherInfo = weather
            ? `🌤️ 𝗪𝗲𝗮𝘁𝗵𝗲𝗿: ${weather.icon} ${weather.weatherType}\n📋 ${weather.description}\n🎯 ${weather.cropBonuses}\n`
            : "";
          console.log("Weather info:", weatherInfo);
          const message = `🌾 𝗚𝗿𝗼𝘄 𝗔 𝗚𝗮𝗿𝗱𝗲𝗻 — 𝗧𝗿𝗮𝗰𝗸𝗲𝗿\n\n${filteredContent}${weatherInfo}📅 Updated at (PH): ${updatedAtPH}`;

          if (!activeSessions.has(senderId)) return;
          await sendMessage(senderId, { text: message }, pageAccessToken);
        } catch (e) {}
      });

      ws.on("close", () => {
        clearInterval(keepAliveInterval);
        const session = activeSessions.get(senderId);
        if (session && !session.closed) setTimeout(connectWebSocket, 3000);
      });

      ws.on("error", () => {
        ws.close();
      });

      activeSessions.set(senderId, { ws, keepAlive: keepAliveInterval, closed: false });
    }

    connectWebSocket();
  },
};
