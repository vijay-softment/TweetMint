// src/job.js
import { postToX } from "./xClient.js";

async function main() {
  console.log("=== softment-x-bot job start ===");

  const topicIdea = "Devs debating EVM static typing — again.";
  const text =
    "Every few months someone suggests static typing for EVM.\n\nAnd every time, Twitter burns for 48 hours straight.";

  console.log("Tweet content:", text);

  try {
    await postToX(text);
  } catch (err) {
    console.error("Tweet failed:", err.message);
  }

  console.log("=== softment-x-bot job end ===");
}

main();
