// src/xAuth_static.js
import fetch from "node-fetch";
import { tokenState } from "./tokensRuntime.js";

const CLIENT_ID = process.env.X_CLIENT_ID;
// We keep CLIENT_SECRET around, but we will NOT send it in refresh (PKCE style).
// const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT_URI = process.env.X_REDIRECT_URI;

let currentAccessToken = tokenState.access_token;
let currentRefreshToken = tokenState.refresh_token;
let currentExpiry = tokenState.access_token_expires_at;

// helper: is access token still valid for at least 30s?
function isAccessTokenFresh() {
  if (!currentAccessToken || !currentExpiry) return false;
  const now = Date.now();
  return now + 30000 < currentExpiry;
}

export async function getValidAccessToken() {
  if (isAccessTokenFresh()) {
    return currentAccessToken;
  }

  console.log("Access token expired or missing. Refreshing...");

  // ---- REFRESH CALL (PKCE-style) ----
  // We DO NOT send Basic auth header.
  // We DO send client_id in the body.
  const bodyParams = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: currentRefreshToken,
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
  });

  const resp = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyParams,
  });

  const dataText = await resp.text();
  let data;
  try {
    data = JSON.parse(dataText);
  } catch (e) {
    console.error("❌ Refresh response was not JSON:", dataText);
    throw new Error("Could not refresh X access token");
  }

  if (!resp.ok) {
    console.error("❌ Refresh failed:", resp.status, data);
    throw new Error("Could not refresh X access token");
  }

  // X should return:
  // {
  //   access_token: "...",
  //   refresh_token: "...",        (sometimes rotated)
  //   expires_in: 7200,            (seconds)
  //   token_type: "bearer",
  //   scope: "tweet.read tweet.write users.read offline.access"
  // }

  currentAccessToken = data.access_token || currentAccessToken;

  if (data.refresh_token) {
    currentRefreshToken = data.refresh_token;
  }

  if (data.expires_in) {
    currentExpiry = Date.now() + data.expires_in * 1000;
  } else {
    // fallback: assume 1 hour if not provided
    currentExpiry = Date.now() + 60 * 60 * 1000;
  }

  console.log("✅ Token refreshed successfully");
  console.log("Access token starts:", currentAccessToken.slice(0, 10));
  console.log("Refresh token starts:", currentRefreshToken.slice(0, 10));
  console.log("Expires at:", new Date(currentExpiry).toISOString());

  return currentAccessToken;
}
