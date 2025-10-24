import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { generatePost } from "./ai.js";
import { postToX } from "./xClient.js";

const app = express();
app.use(express.json());

// Health check / sanity route
app.get("/", (req, res) => {
  res.send("softment-x-bot is running ✅");
});

// Manual trigger route (auth is not added here; do NOT expose publicly in production without some secret check)
app.post("/manual-run", async (req, res) => {
  try {
    const text = await generatePost();
    const result = await postToX(text);

    res.json({
      ok: true,
      generated: text,
      posted: result,
    });
  } catch (err) {
    console.error("manual-run error:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`softment-x-bot listening on port ${PORT}`);
});
