# 🧠 TweetMint

**TweetMint** is an AI-powered Twitter (X) automation bot built by [Vijay Rathore](https://www.softment.com).  
It automatically posts human-like developer tweets every 2 hours — about **Web3**, **Solidity**, **DeFi**, **Foundry**, **Flutter**, **AWS**, and more — in a realistic, sarcastic, and personal tone.

---

## 🚀 Features

- 🤖 **AI-Generated Posts** — Uses Hugging Face models (TinyLlama / Arch-Router) to create tweets in your real voice.
- 🔁 **Automatic Posting to X** — Tweets every 2 hours via X API (OAuth 2.0).
- 💬 **Memory System** — Remembers last 10 posts to avoid repetition.
- 🧩 **Token Refreshing** — Automatically refreshes access tokens; no need to reauthorize.
- 🩵 **Easy Deployment** — Fully ready for [Railway](https://railway.app) deployment.

---

## 📦 Project Structure

```
TweetMint/
│
├── src/
│   ├── ai.js             # AI text generation using Hugging Face
│   ├── job.js            # Cron job entry – runs every 2 hours
│   ├── server.js         # Express app for manual runs / health check
│   ├── xClient.js        # Handles X API posting logic
│   ├── xAuth.js          # Handles access/refresh token management
│
├── hot_topics.txt        # List of trending developer topics
├── recent_posts.log      # Keeps memory of last few tweets
├── .env                  # Environment variables (ignored in git)
├── .gitignore
└── package.json
```

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/SoftmentXBot.git
cd SoftmentXBot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create `.env` file

Copy this example:

```bash
HF_BASE_URL=https://router.huggingface.co/v1
HF_MODEL=katanemo/Arch-Router-1.5B:hf-inference
HUGGINGFACE_API_TOKEN=hf_xxx_your_token_here

AI_SYSTEM_PROMPT="You are Vijay Rathore... (keep as-is or modify)"

X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
X_REDIRECT_URI=https://127.0.0.1/callback
X_ACCESS_TOKEN=your_access_token_here
X_REFRESH_TOKEN=your_refresh_token_here

PORT=3000
```

> **Note:** Don’t commit `.env` — it’s ignored in `.gitignore`.

---

## 🔑 Authentication (One-time)

To get your `access_token` and `refresh_token`:

```bash
node auth.js
```

- Open the URL printed in console → Log in and authorize the app.
- Copy the `code` from the redirect URL → Paste it back.
- Copy the printed tokens into `.env`.

You’ll **never need to do this again**, unless you revoke the app.

---

## 🚀 Local Testing

Run once manually:

```bash
node src/job.js
```

You’ll see:

```
Tweet posted: { id: '1234567890', text: "..." }
```

---

## 🌐 Deploy to Railway

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2 — Deploy on Railway

1. Go to [https://railway.app](https://railway.app)
2. Click **“New Project” → “Deploy from GitHub”**
3. Add all environment variables from your `.env`
4. In **Deploy Settings**, set:
   ```
   Start Command: node src/server.js
   ```

### Step 3 — Add Cron Job

In Railway **Cron Jobs**, schedule:

```
node src/job.js
```

Set schedule: `0 */2 * * *` → runs every 2 hours.

---

## 🧠 How It Works

1. Reads memory from `recent_posts.log` (last 10 posts).
2. Picks a trending dev topic from `hot_topics.txt`.
3. Generates a tweet using Hugging Face.
4. Posts to X with your tone and auto-refreshes tokens.
5. Logs tweet text for future memory.

---

## 🩶 Author

**Vijay Rathore**  
Founder of [Softment](https://www.softment.com)  
📧 vijay@softment.com  
🐦 [@vijay_softment](https://x.com/vijay_softment)

---

### License

MIT © 2025 Softment Solutions Pvt Ltd
