/**
 * Google Service Account authentication helper.
 *
 * Uses the GCP_SA_EMAIL and GCP_SA_PRIVATE_KEY env vars (from .env.local)
 * to mint a short-lived OAuth2 access token via the JWT bearer flow.
 * No OAuth consent screen required.
 */

import crypto from "crypto";

let cachedToken   = null;
let tokenExpiresAt = 0;

export async function getAccessToken() {
  // Re-use cached token if it has >5 min left
  if (cachedToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedToken;
  }

  const email      = process.env.GCP_SA_EMAIL;
  const privateKey = process.env.GCP_SA_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error(
      "Missing GCP_SA_EMAIL or GCP_SA_PRIVATE_KEY in environment. " +
      "Add these to your .env.local file."
    );
  }

  const now    = Math.floor(Date.now() / 1000);
  const header  = toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = toBase64Url(JSON.stringify({
    iss:   email,
    scope: "https://www.googleapis.com/auth/bigquery",
    aud:   "https://oauth2.googleapis.com/token",
    exp:   now + 3600,
    iat:   now,
  }));

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");

  const jwt = `${signingInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion:  jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Service account token error: ${body}`);
  }

  const data  = await res.json();
  cachedToken    = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return cachedToken;
}

function toBase64Url(str) {
  return Buffer.from(str).toString("base64url");
}
