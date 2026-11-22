// Lightweight content moderation. Deliberately simple and transparent:
//  - a configurable word list (BLOCKED_WORDS="word1,word2,...") — empty by default
//    so each community decides its own standards,
//  - basic spam heuristics (link floods, shouting, character repeats).
// Returns null when the text is fine, or a short human-readable reason.

function blockedWords() {
  return (process.env.BLOCKED_WORDS || "")
    .split(",")
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
}

export function checkContent(text = "") {
  const t = String(text);

  const lower = t.toLowerCase();
  for (const w of blockedWords()) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "iu");
    if (re.test(lower)) return "Your message contains language that isn't allowed in this community.";
  }

  const links = (t.match(/https?:\/\/\S+/gi) || []).length;
  if (links > 5) return "Too many links in one message — this looks like spam.";

  if (/(.)\1{14,}/.test(t)) return "Please avoid repeating the same character over and over.";

  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 40 && letters === letters.toUpperCase()) return "Please avoid writing everything in capital letters.";

  return null;
}

// Express middleware factory: checks the given body fields and rejects with 400.
export function moderateBody(...fields) {
  return (req, res, next) => {
    for (const f of fields) {
      const reason = checkContent(req.body?.[f]);
      if (reason) return res.status(400).json({ error: reason });
    }
    next();
  };
}

// "#Hello #web_dev" -> ["hello", "web_dev"]
export function extractHashtags(text = "") {
  const found = new Set();
  for (const m of String(text).matchAll(/(?:^|\s)#([\p{L}\p{N}_]{2,40})/gu)) found.add(m[1].toLowerCase());
  return [...found].slice(0, 10);
}
