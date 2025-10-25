// src/xClient.js
import fetch from "node-fetch";
import { buildOAuthHeader } from "./signOAuth1.js";

/**
 * postToX(statusText)
 * - Uses OAuth 1.0a user context with Access Token + Secret
 * - Calls POST https://api.x.com/2/tweets
 * - No refresh, no expiry handling
 */

export async function postToX(statusText) {
  const url = "https://api.x.com/2/tweets";

  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;

  const accessToken = process.env.X_ACCESS_TOKEN_KEY;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("Missing X API creds in env.");
  }

  // Body we will send to X
  const bodyObj = { text: statusText };
  const bodyStr = JSON.stringify(bodyObj);

  // For OAuth1 signing:
  // you MUST include request body params in the signature IF the body is
  // application/x-www-form-urlencoded.
  //
  // BUT here we are sending JSON.
  // Twitter's v2 user-context tweet endpoint signs only oauth_* params
  // (and no JSON keys) for HMAC-SHA1.
  //
  // => So extraParams is EMPTY.
  //
  // If X ever rejects this with "signature invalid", fallback to v1.1 endpoint
  // or we rework to x-www-form-urlencoded. In practice, this works with /2/tweets.

  const authHeader = buildOAuthHeader({
    method: "POST",
    url,
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
    extraParams: {}, // no body params included for JSON
  });

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: bodyStr,
  });

  let json;
  try {
    json = await resp.json();
  } catch {
    json = { parse_error: true, raw: await resp.text() };
  }

  if (!resp.ok) {
    console.error("X API error:", resp.status, json);
    throw new Error("Tweet failed");
  }

  console.log("✅ Tweet posted successfully");
  console.log("Tweet id:", json?.data?.id, "text:", json?.data?.text);
  return json;
}
