import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

import { generatePost } from "./ai.js";
import { postToX } from "./xClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// write posted tweet to memory log so AI doesn't repeat itself
function appendToRecentLog(text) {
  try {
    const logPath = path.join(__dirname, "..", "recent_posts.log");
    fs.appendFileSync(logPath, text.trim() + "\n");
  } catch (e) {
    console.error("appendToRecentLog error:", e);
  }
}

// pick one hot topic from hot_topics.txt
function pickTopicIdea() {
  try {
    const topicsPath = path.join(__dirname, "..", "hot_topics.txt");
    if (!fs.existsSync(topicsPath)) {
      console.warn("No hot_topics.txt found");
      return "";
    }
    const raw = fs.readFileSync(topicsPath, "utf8");
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return "";
    const choice = Math.floor(Math.random() * lines.length);
    return lines[choice];
  } catch (e) {
    console.error("pickTopicIdea error:", e);
    return "";
  }
}

async function main() {
  console.log("=== softment-x-bot job start ===");

  // choose current “topic vibe” for this tweet
  const topicIdea = pickTopicIdea();
  console.log("topicIdea chosen");

  // ask AI to generate tweet text in your voice
  const text = await generatePost(topicIdea);
  console.log("tweet length:", text.length);

  // sanity guard
  if (!text || text.length === 0) {
    console.log("No tweet text generated, skipping post.");
    return;
  }

  // DO NOT log the full text here if you're paranoid about leaks. Optional:
  console.log("posting to X…");

  // post to X
  const result = await postToX(text);
  console.log("Tweet posted:", result);

  // store final tweet in recent_posts.log for memory
  appendToRecentLog(text);

  console.log("=== softment-x-bot job end ===");
}

// run once
main().catch((err) => {
  console.error("Job crashed:", err);
  process.exit(1);
});
