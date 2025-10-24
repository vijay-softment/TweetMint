import fetch from "node-fetch";
import { getAccessTokenFromMemoryOrEnv, refreshAccessToken } from "./xAuth.js";

async function tryPost(statusText, bearerToken) {
  const body = { text: statusText };

  const resp = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await resp.json();

  return { ok: resp.ok, status: resp.status, json };
}

export async function postToX(statusText) {
  // 1st attempt with current token
  let token = getAccessTokenFromMemoryOrEnv();
  let result = await tryPost(statusText, token);

  if (result.ok) {
    return result.json;
  }

  // If we got unauthorized / forbidden / expired situation, try refresh & retry once
  if (result.status === 401 || result.status === 403) {
    console.warn("Access token might be expired. Refreshing token...");
    token = await refreshAccessToken();
    result = await tryPost(statusText, token);

    if (result.ok) {
      return result.json;
    }
  }

  console.error("X API error:", result.status, result.json);
  throw new Error("Tweet failed");
}
