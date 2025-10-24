import dotenv from "dotenv";
dotenv.config();

import fetch from "node-fetch";
import readline from "node:readline";

// 1. Load env
const CLIENT_ID = process.env.X_CLIENT_ID;
const CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const REDIRECT_URI = process.env.X_REDIRECT_URI;

// The scopes we want for the user token:
// tweet.read tweet.write users.read offline.access
const SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
].join(" ");

const STATE = "softment-state-" + Date.now(); // random string for safety

// 2. Build authorization URL for X OAuth 2.0 Authorization Code Flow
// Docs: X expects /i/oauth2/authorize with these params for confidential clients.
// We'll request a code we can exchange for an access_token with tweet.write.
const authUrl = new URL("https://twitter.com/i/oauth2/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", SCOPES);
authUrl.searchParams.set("state", STATE);
authUrl.searchParams.set("code_challenge", "challenge"); // simple (not PKCE best practice, but allowed with confidential clients using client_secret)
authUrl.searchParams.set("code_challenge_method", "plain");

// 3. Ask user to open the URL and paste back the `code` param
console.log("------------------------------------------------");
console.log("1) Open this URL in your browser, login, and authorize:");
console.log(authUrl.toString());
console.log("");
console.log("2) After you authorize, X will redirect to:");
console.log(REDIRECT_URI + "?code=XXXX&state=YYYY");
console.log("Copy the `code` value from that URL.");
console.log("------------------------------------------------");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Paste the code here: ", async (authCode) => {
  rl.close();

  try {
    // 4. Exchange auth code for access token
    // We'll call the OAuth2 token endpoint.
    // X supports Basic auth with client_id:client_secret for confidential clients.
    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString(
      "base64"
    );

    const tokenResp = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: authCode,
        redirect_uri: REDIRECT_URI,
        code_verifier: "challenge",
      }),
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      console.error("Token exchange failed:", tokenResp.status, tokenData);
      process.exit(1);
    }

    console.log("------------------------------------------------");
    console.log("Success! Here is your access token info:");
    console.log(tokenData);
    console.log("------------------------------------------------");
    console.log("Use tokenData.access_token as X_BEARER_TOKEN in your .env");
    console.log("Then run: node src/job.js");
    console.log("That should tweet for real.");
    console.log("------------------------------------------------");
  } catch (err) {
    console.error("Error exchanging code:", err);
  }
});
