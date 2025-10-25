import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// read last ~10 posts so we don't repeat ideas
function readRecentPosts() {
  try {
    const logPath = path.join(__dirname, "..", "recent_posts.log");
    if (!fs.existsSync(logPath)) return "";
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

// pick style (1..5 lines)
function buildStyleInstruction() {
  const styles = [
    "Write ONE short line only. One thought. Under 200 characters. End with a full stop or a question mark. Do not start another idea after that.",
    "Write TWO short lines. Line 1 is one thought. Line 2 is a second thought. Put ONE blank line (\\n\\n) between them. Each line must end with a full stop or a question mark. Do not add more lines.",
    "Write THREE short lines. Each line is its own thought about my work. Put a blank line (\\n\\n) between each line. Each line must end clean. Do not add a fourth line.",
    "Write FOUR short lines. Treat it like a mini log of today. Put blank lines (\\n\\n) between lines. Each line must end clean. Do not add a fifth line.",
    "Write FIVE short lines max. Each line is one clear point. Put blank lines (\\n\\n) between lines. Each line must end clean. Stop after five lines.",
  ];
  const choice = Math.floor(Math.random() * styles.length);
  return styles[choice];
}

// trim safely, never mid-sentence
function smartTrim(tweet, maxLen = 250) {
  let cut = tweet.slice(0, maxLen);

  const lastStrongStop = Math.max(
    cut.lastIndexOf("."),
    cut.lastIndexOf("!"),
    cut.lastIndexOf("?")
  );
  if (lastStrongStop > 0) {
    return cut.slice(0, lastStrongStop + 1).trim();
  }

  const lastNL = cut.lastIndexOf("\n");
  if (lastNL > 0) {
    return cut.slice(0, lastNL).trim();
  }

  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > 0) {
    return cut.slice(0, lastSpace).trim();
  }

  return cut.trim();
}

// capitalize first visible letter
function capitalizeFirstAlpha(str) {
  const idx = str.search(/[a-z]/i);
  if (idx === -1) return str;
  return str.slice(0, idx) + str[idx].toUpperCase() + str.slice(idx + 1);
}

// clean & humanize
function postProcessTweet(text) {
  let t = text.trim();

  // unwrap {"text":"..."} etc
  const m1 = t.match(/"text"\s*:\s*"([^"]+)"/i);
  const m2 = t.match(/'text'\s*:\s*'([^']+)'/i);
  if (m1) t = m1[1];
  else if (m2) t = m2[1];

  // kill bullets / code fences / junk
  t = t.replace(/^[\*\-\•]+?\s*$/gm, "");
  t = t.replace(/^[\*\-\•]+?\s+/gm, "");
  t = t.replace(/^[\*\-\•]+?(?=\S)/gm, "");
  t = t.replace(/```+/g, "");
  t = t.replace(/`+/g, "");
  t = t.replace(/<BLANKLINE>/gi, "");

  // strip fake headers
  t = t.replace(/^(text|post|update)\s*[\n:]+/i, "");
  t = t.replace(/^\[.*?\]\s*/gm, "");
  t = t.replace(/^plaintext\s*/i, "");

  // collapse too many newlines
  t = t.replace(/\n{3,}/g, "\n\n");

  // nuke boring/opening boilerplate we hate
  t = t
    .replace(
      /^(shipping and debugging again|still stuck|i finally fixed|still fighting|spent [0-9]+ (hours|hrs) on|tests passing locally|gm[\s,.-]|good morning[\s,.-])/i,
      ""
    )
    .trimStart();

  // kill fake-humble prod flex
  t = t.replace(/pretending (it('|’)s|it's) production[- ]ready\.?/i, "");
  t = t.replace(/acting like it's production[- ]ready\.?/i, "");

  // ban "anyone else seeing this"
  t = t.replace(/anyone else seeing this\??$/i, "").trim();

  // normalize \n\n literals into real blank lines
  t = t.replace(/\\n\\n/g, "\n\n");

  // per-line cleanup of stray quotes
  t = t
    .split("\n")
    .map((line) =>
      line
        .trimStart()
        .replace(/^["'`]+/, "")
        .replace(/["'`]+$/, "")
    )
    .join("\n");

  // kill common cringe phrases
  t = t.replace(
    /gas fees? (are )?(insane|crazy|killing me)[^\.!?]*[\.!?]?/gi,
    "gas math is dumb."
  );
  t = t.replace(
    /nft (floor )?prices? (are )?(a joke|dead|tanking)[^\.!?]*[\.!?]?/gi,
    "nft stuff is sliding."
  );
  t = t.replace(
    /royalty math (is )?(broken|wrong|off)( again)?/gi,
    "payout math was wrong."
  );
  t = t.replace(
    /overflow( in)? (the )?(reward|royalty|payout) math( again)?/gi,
    "found a payout calc bug."
  );

  // collapse duplicate emojis
  t = t.replace(/([\p{Emoji_Presentation}\p{Emoji}\u200d])\1+/gu, "$1");

  // trim leftover double spaces
  t = t.replace(/\s{2,}/g, " ");

  // remove leading punctuation if we deleted the opener
  t = t.replace(/^(\.|,|\-|\|)+\s*/, "");

  // Capitalize first letter now
  t = capitalizeFirstAlpha(t);

  return t.trim();
}

// pick a hot topic
function pickHotTopic() {
  const topics = [
    // realtime pain / crypto drama
    "People are complaining gas fees are insane again today and blaming auditors and 'overengineered' Solidity.",
    "Someone almost shipped a staking contract with a reward math bug that could leak funds. Devs arguing if audits are too slow or actually saving TVL.",
    "Everyone is mad at stablecoin teams again because one change in collateral logic could have nuked peg.",
    "Foundry fuzz tests catching edge cases that normal tests miss and nobody wants to admit it.",
    "Flutter devs fighting about scroll jank on Android vs iOS again and who’s to blame.",
    "AWS bills jump-scared people and everyone is pretending that's 'just startup life'.",
    "Someone bragged they shipped a DeFi contract without Hardhat tests and crypto Twitter is roasting them.",
    "People arguing if NFTs are 'dead' again but the real pain is on-chain royalty logic and marketplaces ignoring creator fees.",
    "Another day, another Solidity upgrade that quietly breaks half the old repos.",
    "New debate: Foundry vs Hardhat performance benchmarks — 'who compiles faster' wars all over dev Twitter.",
    "Smart contract auditors are complaining they’re treated like villains whenever they reject code for security issues.",
    "Flutter 3.24 just broke some animations again — devs posting side-by-side lag clips on iOS vs Android.",
    "Everyone’s talking about AI tools writing Solidity tests but missing obvious reentrancy issues.",
    "Devs on X fighting about whether DeFi yield is 'real revenue' or just fancy dilution.",
    "People realizing gas refunds changed again and some MEV bots are failing silently.",
    "Solidity devs arguing if modifiers are outdated and should be replaced with internal helper functions.",
    "Foundry’s new coverage report feature exposing half-baked tests people thought were perfect.",
    "People are revisiting the OpenZeppelin library debate again — too heavy or still the gold standard?",
    "Another exploit on a 'verified' contract — everyone pointing fingers at bad test coverage.",
    "NFT floor prices tanking again, devs joking that the only thing up is gas fees.",
    "Flutter devs complaining Cupertino widgets still don’t feel native enough on iOS 18.",
    "Devs arguing if EVM should get optional static typing in future forks.",
    "Auditors calling out payout / reward math bugs in staking contracts that could leak funds on mainnet.",
    "People panicking about collateral safety in 'decentralized' stablecoins after someone almost nuked peg with one config change.",
    "Security people saying 'unit tests are not audits' and nobody wants to hear it.",
    "Someone shipped without rate limiting and got botted instantly.",
    "Foundry fuzzing caught a payout overflow in production code and now teams are pretending they 'already saw it'.",
    "Hardhat fans saying Foundry is hype, Foundry fans saying Hardhat is slow. Same fight, new day.",
    "People still deploying contracts without thinking about reentrancy and acting shocked when it gets farmed.",
    "Teams arguing about whether you should even allow flash loans in your protocol or ban them at the contract level.",
    "DeFi dashboards broke because a Chainlink feed stalled and everyone instantly screamed 'oracle centralization'.",
    "Gas optimizers flexing about saving 5k gas while their code readability is now actual horror.",
    "People deploying 'governance' and calling it a DAO even though it’s literally multisig + vibes.",
    "Somebody copied an OpenZeppelin contract and removed the one safety check that mattered.",
    "Everyone farming points on testnet again pretending it's 'beta testing'.",

    // core stack / tech identity anchors
    "Smart Contract devs doing security review on staking rewards, trying to not leak TVL.",
    "Foundry maxis telling everyone to stop using Hardhat scripts like it's 2021.",
    "Hardhat enjoyers saying Foundry scripts are unreadable for juniors.",
    "People arguing if Uniswap style 'immutable core + upgradeable periphery' is still the cleanest pattern.",
    "Ethereum people debating new EIPs and ERCs like it's politics.",
    "People yelling about ERC token standards again — ERC20 vs ERC777 vs custom 'gas-optimized' Frankenstein code.",
    "Someone tried to 'optimize' an ERC721 royalty payout and broke creator fees.",
    "Chainlink oracles showing up in literally every design doc whether you like it or not.",
    "People pretending their project is L2 neutral but it's all on Arbitrum anyway.",
    "Everybody wants account abstraction now but nobody wants to read EIP-4337.",
    "Dev twitter arguing about whether proxy upgradability is 'good engineering' or 'centralized backdoor'.",
    "Somebody almost shipped a contract without a proper access control check on the withdraw function and called it 'MVP'.",

    // builder grind / course culture / cyfrin energy
    "Half of crypto twitter is 'learning Solidity' and pushing SimpleStorage while saying 'we're early'.",
    "Beginners discovering Foundry's cheatcodes and acting like they just rooted the EVM.",
    "New devs flexing 'deployed to Sepolia' screenshots like it's mainnet TVL.",
    "People arguing if you should even touch Solidity before you understand how the EVM actually moves storage slots.",
    "Everyone is suddenly talking about 'fuzzing' after watching one security video.",
    "Somebody said 'tests are the audit' and every auditor on earth took psychic damage.",
    "People coping with AWS bills by saying 'decentralized infra eventually'.",
    "Developers are discovering how painful cross-chain messaging actually is once you leave marketing slides.",
    "Someone is building a stablecoin and acting like liquidation math is easy.",
    "People are shipping Foundry scripts that deploy across chains and thinking that means they have 'multi-chain governance' now.",
    "New people finally learning what a merkle airdrop actually is and realizing it's just math and a list.",
    "Dev discord drama about whether you should even allow upgradeable proxies in anything that touches user funds.",
    "Somebody is trying to do account abstraction + cross-chain + points + yield in one weekend hackathon.",
    "People still act surprised when an unchecked external call in Solidity becomes a $2M hole.",
    "Security folks yelling 'READ THE STORAGE LAYOUT BEFORE YOU UPGRADE' like it's a fire alarm.",
    "Someone learned about Chainlink Automation and now every function in their dapp is 'trustless scheduled'.",
    "Folks finding out DAOs are mostly multisigs and vibes instead of on-chain governance logic.",
    "Everyone is discovering how annoying it is to make Flutter look native on both iOS and Android at the same time.",
    "People trying to do gas optimization before even passing basic tests.",
    "Beginners shocked that Foundry coverage is roasting their code way harder than they expected.",
  ];

  const hourSeed = new Date().getHours();
  const idx = hourSeed % topics.length;
  return topics[idx];
}

// MAIN
export async function generatePost() {
  try {
    const GROQ_BASE_URL = process.env.GROQ_BASE_URL;
    const GROQ_MODEL = process.env.GROQ_MODEL;
    const GROQ_TOKEN = process.env.GROQ_API_KEY;

    const recentMemory = readRecentPosts();
    const styleInstruction = buildStyleInstruction();
    const hotTopic = pickHotTopic();

    const userInstruction = `
You are tweeting as me, Vijay.

Write ONE tweet that sounds like I'm mid-work and sometime sharing my view, typing from my phone right now.

Pick ONE idea, not all of them:
- ${hotTopic}

Do NOT repeat the same story or wording I've already said:
${recentMemory || "[fresh slate]"}

WHO I AM:
- I write Solidity (DeFi payouts, staking logic, audits, security review, gas cost fixes, smart contract, ethereum, blockchain, foundry, hardhat, ERC, EIP, NFT).
- I build Flutter apps, Next.js/Node backends, AWS infra.
- I'm not learning. This is daily work.

TONE:
- Talk like I'm DM’ing another dev and peoples on Twitter.
- Short, specific, a little annoyed.
- Assume the reader codes. No teaching.

BANS:
- "GM", "good morning", "anyone else seeing this", "gas fees are insane", "NFT floor prices are a joke".
- "I finally fixed", "still stuck", "again", "spent two hours".
- No brag like "my audit skills are on point".
- No advice to others like "code reviews are not optional".
- No corporate words like "mitigate", "ensure proper behavior".

FORMAT RULES:
- You can write 1 to 5 short lines total. The style is:
  ${styleInstruction}
- If there are multiple lines, put ONE blank line (\\n\\n) between lines.
- Each line must end with "." or "?".

GLOBAL RULES:
- Under 250 characters total.
- Max one emoji.
- No hashtags.
- No @mentions.
- No links.
- Output ONLY the tweet text. No labels.
`;

    console.log("GROQ_MODEL:", GROQ_MODEL);
    console.log("styleInstruction:", styleInstruction);
    console.log("hotTopic:", hotTopic);

    const body = {
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You tweet as a real human Solidity + Web3 + Foundry + Smart Contract + Blockchain + Website + mobile dev. Be blunt, specific, slightly annoyed, never corporate.",
        },
        {
          role: "user",
          content: userInstruction,
        },
      ],
      max_tokens: 160,
      temperature: 1.0,
      top_p: 0.95,
    };

    const resp = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Groq error:", resp.status, errText);
      // fallback tweet if Groq dies
      return "Shipping fixes and watching Solidity try to break my day.";
    }

    const data = await resp.json();

    let raw = data?.choices?.[0]?.message?.content || "";
    let cleaned = raw.trim();

    cleaned = cleaned
      .replace(/^["'`]+/, "")
      .replace(/["'`]+$/, "")
      .trim();

    cleaned = postProcessTweet(cleaned);

    if (!cleaned || cleaned.length < 5) {
      cleaned = "Shipping fixes and watching Solidity try to break my day.";
    }

    cleaned = smartTrim(cleaned, 250);

    cleaned = cleaned.replace(/anyone else seeing this\??$/i, "").trim();

    return cleaned;
  } catch (err) {
    console.error("generatePost() crashed:", err);
    return "Shipping fixes and watching Solidity try to break my day.";
  }
}

function stripBoringOpeners(str) {
  return str
    .replace(
      /^(shipping and debugging again|still stuck|i finally fixed|still fighting|spent [0-9]+ (hours|hrs) on|tests passing locally)/i,
      ""
    )
    .trimStart();
}
