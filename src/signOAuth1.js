// src/signOAuth1.js
import crypto from "crypto";

/**
 * Build OAuth 1.0a Authorization header for Twitter/X v1.1-style auth.
 * This works with X API v2 user-context endpoints like POST /2/tweets.
 *
 * We sign using HMAC-SHA1.
 */

function encodeRFC3986(str) {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function buildSignatureBaseString(method, url, allParams) {
  // 1. Sort by key then value
  const sorted = Object.keys(allParams)
    .sort()
    .map((key) => `${encodeRFC3986(key)}=${encodeRFC3986(allParams[key])}`)
    .join("&");

  // 2. Create base string
  const baseString = [
    method.toUpperCase(),
    encodeRFC3986(url),
    encodeRFC3986(sorted),
  ].join("&");

  return baseString;
}

function buildSigningKey(consumerSecret, tokenSecret) {
  return `${encodeRFC3986(consumerSecret)}&${encodeRFC3986(tokenSecret)}`;
}

function hmacSha1(baseString, signingKey) {
  return crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
}

export function buildOAuthHeader({
  method,
  url,
  apiKey,
  apiSecret,
  accessToken,
  accessTokenSecret,
  extraParams = {},
}) {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: "1.0",
  };

  // Params to sign = oauth params + request body/query params (extraParams)
  const signatureParams = {
    ...oauthParams,
    ...extraParams,
  };

  const baseString = buildSignatureBaseString(method, url, signatureParams);
  const signingKey = buildSigningKey(apiSecret, accessTokenSecret);
  const signature = hmacSha1(baseString, signingKey);

  const finalOAuth = {
    ...oauthParams,
    oauth_signature: signature,
  };

  // Build `Authorization: OAuth ...`
  const authHeader =
    "OAuth " +
    Object.keys(finalOAuth)
      .sort()
      .map((key) => `${encodeRFC3986(key)}="${encodeRFC3986(finalOAuth[key])}"`)
      .join(", ");

  return authHeader;
}
