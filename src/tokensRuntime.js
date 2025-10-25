// src/tokensRuntime.js
// Update this file manually when you get new tokens from auth.js

export const tokenState = {
  access_token:
    "M3p1S2VoUDkzUTlGZXVNRTRjUWg1UjhKUmNZQmN2cEFvb0pDZTQwM0JGa25LOjE3NjEzOTk0MDM0MzU6MTowOmF0OjE",
  refresh_token:
    "TXRZNXUxSzU0LUVScGRteFAwak1XOTFwQ094cl9PdTBCT0V1WkxaeVhmZ3RhOjE3NjEzOTk0MDM0MzU6MTowOnJ0OjE",
  // Example expiry: Date.now() + 2 hours (in ms)
  access_token_expires_at: 1761406462233,
};

export function getTokenBundle() {
  return {
    access_token: tokenState.access_token,
    refresh_token: tokenState.refresh_token,
    access_token_expires_at: tokenState.access_token_expires_at,
  };
}

export function setTokenBundle({
  access_token,
  refresh_token,
  access_token_expires_at,
}) {
  if (access_token) tokenState.access_token = access_token;
  if (refresh_token) tokenState.refresh_token = refresh_token;
  if (access_token_expires_at)
    tokenState.access_token_expires_at = access_token_expires_at;
}
