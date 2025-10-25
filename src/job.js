// src/job.js
import dotenv from "dotenv";
dotenv.config();

import { generatePost } from "./ai.js";
import { postToX } from "./xClient.js";

async function main() {
  console.log("=== softment-x-bot job start ===");

  let text = await generatePost();

  if (!text || typeof text !== "string") {
    console.warn("generatePost() returned invalid text, using fallback.");
    text = "Shipping fixes and watching Solidity try to break my day.";
  }

  console.log("Tweet content (final):", text);

  try {
    await postToX(text);
  } catch (err) {
    console.error("Tweet failed:", err.message);
  }

  console.log("=== softment-x-bot job end ===");
}

main();
