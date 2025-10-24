// src/xAuth_static.js
import fetch from "node-fetch";
import { tokenState } from "./tokensRuntime.js";

const CLIENT_ID = process.env.X_CLIENT_ID;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT_URI = process.env.X_REDIRECT_URI;

let currentAccessToken = tokenState.access_token;
let currentRefreshToken = tokenState.refresh_token;
let currentExpiry = tokenState.access_token_expires_at;

function isAccessTokenFresh() {
  if (!currentAccessToken || !currentExpiry) return false;
  const now = Date.now();
  return now + 30000 < currentExpiry;
}

export async function getValidAccessToken() {
  if (isAccessTokenFresh()) return currentAccessToken;

  console.log("Access token expired or missing. Refreshing...");

  const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
    "base64"
  );

  const resp = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: currentRefreshToken,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("Refresh failed:", resp.status, data);
    throw new Error("Could not refresh X access token");
  }

  currentAccessToken = data.access_token;
  currentRefreshToken = data.refresh_token || currentRefreshToken;
  currentExpiry = Date.now() + data.expires_in * 1000;

  console.log("✅ Token refreshed successfully");
  console.log("Access token starts:", currentAccessToken.slice(0, 10));
  console.log("Refresh token starts:", currentRefreshToken.slice(0, 10));
  console.log("Expires at:", new Date(currentExpiry).toISOString());

  return currentAccessToken;
}
