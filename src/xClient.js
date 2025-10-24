// src/xClient.js
import fetch from "node-fetch";
import { getValidAccessToken } from "./xAuth_static.js";

export async function postToX(statusText) {
  const token = await getValidAccessToken();
  const body = { text: statusText };

  const resp = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json();

  if (!resp.ok) {
    console.error("X API error:", resp.status, json);
    throw new Error("Tweet failed");
  }

  console.log("✅ Tweet posted successfully");
  return json;
}
