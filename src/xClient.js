// src/xClient.js
import fetch from "node-fetch";
import { getValidAccessToken } from "./xAuth_static.js";

export async function postToX(statusText) {
  // get token (refresh if needed)
  const token = await getValidAccessToken();

  const resp = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: statusText }),
  });

  const json = await resp.json();

  if (resp.status === 429) {
    console.error("Rate limited (429). Will back off. Response:", json);
    throw new Error("RATE_LIMIT");
  }

  if (!resp.ok) {
    console.error("X API error:", resp.status, json);
    throw new Error("TWEET_FAILED");
  }

  console.log("✅ Tweet posted:", json);
  return json;
}
