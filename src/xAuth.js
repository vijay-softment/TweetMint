import fetch from "node-fetch";

/**
 * getAccessToken() returns a valid access token to call X.
 * Strategy:
 *   1. Try the current process.env.X_ACCESS_TOKEN first.
 *   2. If posting fails (handled in xClient), we call refreshAccessToken()
 *      to get a new one for that run.
 *
 * NOTE:
 *   Railway env vars are static per deploy, so we can't
 *   permanently overwrite them here. We just hold the new access
 *   token in memory for this process run.
 */

let inMemoryAccessToken = null;

export function getAccessTokenFromMemoryOrEnv() {
  if (inMemoryAccessToken) {
    return inMemoryAccessToken;
  }
  // fallback to whatever we booted with
  return process.env.X_ACCESS_TOKEN;
}

// This calls X's OAuth2 token endpoint with grant_type=refresh_token
// to mint a fresh short-lived access_token using your long-lived refresh_token.
// Requires: offline.access scope in original auth.
export async function refreshAccessToken() {
  const CLIENT_ID = process.env.X_CLIENT_ID;
  const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
  const REFRESH_TOKEN = process.env.X_REFRESH_TOKEN;
  const REDIRECT_URI = process.env.X_REDIRECT_URI;

  console.log("DEBUG refreshAccessToken()");
  console.log("CLIENT_ID prefix:", CLIENT_ID?.slice(0, 6));
  console.log("REFRESH_TOKEN prefix:", REFRESH_TOKEN?.slice(0, 10));
  console.log("REDIRECT_URI:", REDIRECT_URI);

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
      refresh_token: REFRESH_TOKEN,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    console.error("Failed to refresh access token:", resp.status, data);
    // extra debug:
    console.error("USED REFRESH_TOKEN prefix:", REFRESH_TOKEN?.slice(0, 10));
    throw new Error("Could not refresh X access token");
  }

  inMemoryAccessToken = data.access_token;

  if (
    data.refresh_token &&
    data.refresh_token !== process.env.X_REFRESH_TOKEN
  ) {
    console.warn(
      "X gave us a new refresh_token. Update Railway env X_REFRESH_TOKEN manually."
    );
    console.warn(
      "NEW_REFRESH_TOKEN_STARTS_WITH:",
      data.refresh_token.slice(0, 10)
    );
  }

  return inMemoryAccessToken;
}
