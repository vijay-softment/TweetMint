import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MEMORY: keep last ~10 posts so we don't repeat the same idea ---
function readRecentPosts() {
  try {
    const logPath = path.join(__dirname, "..", "recent_posts.log");
    if (!fs.existsSync(logPath)) {
      return "";
    }
    const raw = fs.readFileSync(logPath, "utf8");
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const lastTen = lines.slice(-10);
    return lastTen.join("\n---\n");
  } catch (e) {
    console.error("readRecentPosts error:", e);
    return "";
  }
}

// --- STYLE PICKER: 1-line, 2-line, ..., 5-line ---
function buildStyleInstruction() {
  // We ask for short, simple, direct English.
  // We also force it to actually end, not trail off.
  const styles = [
    // 1 line
    "Write ONE short line only. One thought. Under 200 characters. End with a full stop or a question mark. Do not start another idea after that.",
    // 2 lines
    "Write TWO short lines. Line 1 is one thought. Line 2 is a second thought. Put ONE blank line (\\n\\n) between them. Each line must end with a full stop or a question mark. Do not add more lines.",
    // 3 lines
    "Write THREE short lines. Each line is its own small thought about my work. Put a blank line (\\n\\n) between each line. Each line must end clean. Do not add a fourth line.",
    // 4 lines
    "Write FOUR short lines. Treat it like a mini log of today. Put blank lines (\\n\\n) between lines. Each line must end clean. Do not add a fifth line.",
    // 5 lines
    "Write FIVE short lines max. Each line is one clear point. Put blank lines (\\n\\n) between lines. Each line must end clean. Stop after five lines.",
  ];

  const choice = Math.floor(Math.random() * styles.length);
  return styles[choice];
}

// --- SMART TRIM: always end on a clean boundary, never mid-sentence ---
function smartTrim(tweet, maxLen = 270) {
  // Always cut to maxLen window
  let cut = tweet.slice(0, maxLen);

  // Prefer to end on a full stop / question / exclamation
  const lastStrongStop = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf("!"),
    cut.lastIndexOf("?")
  );

  if (lastStrongStop > 0) {
    return cut.slice(0, lastStrongStop + 1).trim();
  }

  // Next best: end before the last unfinished chunk / next paragraph
  const lastNL = cut.lastIndexOf("\n");
  if (lastNL > 0) {
    return cut.slice(0, lastNL).trim();
  }

  // Last fallback: cut at last space (so we don't slice a word in half)
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0) {
    return cut.slice(0, lastSpace).trim();
  }

  return cut.trim();
}

// --- CLEANUP / HUMANIZER: makes output look like you, not a bot ---
function postProcessTweet(text) {
  let t = text.trim();

  // If the model returned something like:
  // {'text': '...'} or {"text": "..."} or {'Code': '', 'text': '...'}
  // pull out that "text" content only.
  const objStyleMatchSingleQuotes = t.match(/'text'\s*:\s*'([^']+)'/i);
  const objStyleMatchDoubleQuotes = t.match(/"text"\s*:\s*"([^"]+)"/i);
  if (objStyleMatchSingleQuotes) {
    t = objStyleMatchSingleQuotes[1];
  } else if (objStyleMatchDoubleQuotes) {
    t = objStyleMatchDoubleQuotes[1];
  }

  // Remove bullet / asterisk formatting everywhere

  // 1. Kill any line that's only bullets like "*" or "**" or "----" or "••"
  t = t.replace(/^[\*\-\•]+?\s*$/gm, "");

  // 2. If a line starts with bullets + space, like "** something" or "- something", drop the bullets
  t = t.replace(/^[\*\-\•]+?\s+/gm, "");

  // 3. If a line starts with bullets stuck to text, like "**Still fixing", drop the bullets
  t = t.replace(/^[\*\-\•]+?(?=\S)/gm, "");
  // Remove weird placeholders, markdown fences, brackets headers, etc.
  t = t
    .replace(/<BLANKLINE>/gi, "") // kill literal "<BLANKLINE>"
    .replace(/```+/g, "") // kill ``` fences
    .replace(/`+/g, "") // kill stray `
    .replace(/^\[ ?quick update:? ?\]\s*/im, "Quick update: ")
    .replace(/^\[ ?update:? ?\]\s*/im, "Update: ")
    .replace(/^\[ ?brain[^\]]*\]\s*/im, "")
    .replace(/^\[ ?[^\]]+\]\s*/im, "");

  // Kill leading labels like "Text:" / "Post:" / "Update:"
  t = t.replace(/^(text|post|update)\s*[\n:]+/i, "");

  // Kill platform prefix like "twitter ..." or "x ..."
  t = t.replace(/^(twitter|x)\s*/i, "");

  // Kill hashtag spam. Remove " #word"
  t = t.replace(/\s#[^\s#]+/g, "");

  // Fix common hallucination: "NFT royals" -> "NFT royalties"
  t = t.replace(/\bNFT royals?\b/gi, "NFT royalties");
  t = t.replace(/\bNFT royal\b/gi, "NFT royalty");

  // Normalize double spaces before "?" (". ?" -> ".?")
  t = t.replace(/ \?/g, "?");

  // Collapse repeated identical emojis: 🤔🤔🤔 -> 🤔
  t = t.replace(/([\p{Emoji_Presentation}\p{Emoji}\u200d])\1+/gu, "$1");

  // Capitalize first alphabetic character in the tweet (so we don't start with "i fixed")
  const firstAlphaIndex = t.search(/[a-z]/i);
  if (firstAlphaIndex >= 0) {
    t =
      t.slice(0, firstAlphaIndex) +
      t[firstAlphaIndex].toUpperCase() +
      t.slice(firstAlphaIndex + 1);
  }

  return t.trim();
}

// --- MAIN GENERATOR ---
// contextIdea comes from trending topics list (hot_topics.txt), or "".
export async function generatePost(contextIdea = "") {
  const HF_BASE_URL = process.env.HF_BASE_URL; // e.g. https://router.huggingface.co/v1
  const HF_MODEL = process.env.HF_MODEL; // e.g. katanemo/Arch-Router-1.5B:hf-inference
  const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN; // Bearer for Hugging Face router
  const SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT; // from .env

  // memory = last ~10 tweets you already posted
  const recentMemory = readRecentPosts();

  // random style (1 line, 2 lines, ..., 5 lines)
  const styleInstruction = buildStyleInstruction();

  // Build the instruction for THIS tweet.
  // We are forcing normal, simple, direct English.
  // We are forcing it to end each line, not trail off.
  // We forbid cringe "future of blockchain is bright" style hype.
  const userInstruction = `
You are tweeting as me, Vijay.

WHO I AM:
- I build smart contracts, DeFi stuff, stablecoins, audits, security fixes.
- I work with Solidity, Foundry, Hardhat, Ethereum.
- I also ship mobile apps (Flutter, native iOS/Android), web apps (React/Next.js), backend (Node.js), and deal with AWS.
- I am not learning. I already do this daily.

WHAT PEOPLE ARE TALKING ABOUT RIGHT NOW:
${contextIdea || "[no external topic this run]"}

RECENT THINGS I'VE ALREADY SAID (do not repeat the same idea or same wording):
${recentMemory || "[no recent memory yet]"}

VOICE / STYLE RULES:
- Use plain simple English. Casual. Like I'm texting from my phone.
- Short sentences. Direct. A little tired, a little sarcastic is ok.
- First person only ("I", "I'm", "I did", "I fixed").
- You can be annoyed. You can say it's boring, painful, or slow.
- You can mention Ethereum gas, audits, NFTs, royalties, mobile scroll bugs, AWS costs, etc.
- Do not sound formal or corporate. Do not say stuff like "functionality", "frustrating across platforms", "ensure proper behavior", "tangled up", "therefore", "moreover".
- No fake hustle lines. No "grinding 24/7". No "the future of blockchain is bright".
- Do NOT talk like a report. Talk like a person.
- Max 1 emoji if it fits. Many posts should have 0 emojis.
- Do NOT use hashtags unless it feels natural inside the sentence. Never put hashtags at the end.
- NEVER mention other users or accounts. No @. No links.

FORMAT RULES:
${styleInstruction}
- Each line must be complete and end with a full stop or a question mark.
- Do NOT leave thoughts hanging like "and now I'm..." or "still working on".
- No bullet points. No "*" lines. No "-" lines. No "•".
- No headers like "[Update:]".
- No code fences like \`\`\`.
- No "<BLANKLINE>" text. Just real newlines (\\n\\n).
- Total output must stay under 250 characters.
- Output ONLY the tweet text. No quotes around it, no JSON, no labels.
`;

  // Debug logging so you can see what's happening
  console.log("HF_BASE_URL:", HF_BASE_URL);
  console.log("HF_MODEL:", HF_MODEL);
  console.log("styleInstruction:", styleInstruction);
  console.log("contextIdea:", contextIdea);

  // Build request to Hugging Face Router in OpenAI-style /chat/completions format
  const body = {
    model: HF_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userInstruction },
    ],
    max_tokens: 120,
    temperature: 0.9,
    top_p: 0.95,
  };

  const resp = await fetch(`${HF_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("HuggingFace router error:", resp.status, errText);
    throw new Error("AI generation failed");
  }

  const data = await resp.json();

  let raw = data?.choices?.[0]?.message?.content || "";
  let cleaned = raw.trim();

  // Strip wrapping quotes/backticks if model tried to wrap the tweet
  cleaned = cleaned
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .trim();

  // Clean / humanize (removes bullets, placeholders, hashtags, etc.)
  cleaned = postProcessTweet(cleaned);

  // NOW trim to a clean stop, always.
  // This prevents half-sentences like "The latest chaos is still"
  cleaned = smartTrim(cleaned, 270);

  return cleaned;
}
