// src/xAuth_static.js
import fetch from "node-fetch";
import { getTokenBundle, setTokenBundle } from "./tokensRuntime.js";

const CLIENT_ID = process.env.X_CLIENT_ID;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT_URI = process.env.X_REDIRECT_URI;

// how early we refresh before expiry (30s safety)
const SAFETY_MS = 30_000;

function isAccessTokenFresh() {
  const { access_token, access_token_expires_at } = getTokenBundle();
  if (!access_token || !access_token_expires_at) return false;
  const now = Date.now();
  return now + SAFETY_MS < access_token_expires_at;
}

// actually call X to refresh
async function doRefresh() {
  const { refresh_token } = getTokenBundle();

  console.log("Access token expired / missing. Refreshing…");

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
      refresh_token,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("❌ Refresh failed:", resp.status, data);
    throw new Error("Could not refresh X access token");
  }

  // X returns:
  // {
  //   access_token: "...",
  //   refresh_token: "...", // may rotate
  //   expires_in: 7200,
  //   ...
  // }

  const newAccessToken = data.access_token;
  const newRefreshToken = data.refresh_token || refresh_token;
  const newExpiry = Date.now() + data.expires_in * 1000;

  setTokenBundle({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
    access_token_expires_at: newExpiry,
  });

  console.log("✅ Token refreshed");
  console.log("   access_token starts:", newAccessToken.slice(0, 10));
  console.log("   refresh_token starts:", newRefreshToken.slice(0, 10));
  console.log("   expires_at:", new Date(newExpiry).toISOString());

  return newAccessToken;
}

// public fn the rest of the bot calls
export async function getValidAccessToken() {
  if (isAccessTokenFresh()) {
    return getTokenBundle().access_token;
  }
  return doRefresh();
}
