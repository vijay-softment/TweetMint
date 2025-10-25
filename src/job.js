// src/job.js
import dotenv from "dotenv";
dotenv.config();

import { generatePost } from "./ai.js";
import { postToX } from "./xClient.js";

async function main() {
  console.log("=== softment-x-bot job start ===");

  // pick some trending idea (you can plug back pickTopicIdea() if you want)
  const topicIdea = "...maybe read from hot_topics.txt here...";
  const tweetText = await generatePost(topicIdea);

  console.log("Tweet content:", tweetText);

  if (!tweetText || tweetText.length === 0) {
    console.log("No tweet generated, skipping.");
    console.log("=== softment-x-bot job end ===");
    return;
  }

  try {
    await postToX(tweetText);
  } catch (err) {
    console.error("Tweet failed:", err.message);
  }

  console.log("=== softment-x-bot job end ===");
}

main();
