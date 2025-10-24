import dotenv from "dotenv";
dotenv.config();

import { generatePost } from "./ai.js";
import { postToX } from "./xClient.js";

async function main() {
  console.log("=== softment-x-bot job start ===");

  const topicIdea = "...maybe read from hot_topics.txt here...";
  const text = await generatePost(topicIdea);

  console.log("Tweet content:", text);

  try {
    await postToX(text);
  } catch (err) {
    console.error("Tweet failed:", err.message);
  }

  console.log("=== softment-x-bot job end ===");
}

main();
