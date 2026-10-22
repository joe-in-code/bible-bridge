// Constants shared by the browser and the server (imported by lib/prompt.js).

export const ERA_LABELS = ["Ancient", "Kings", "1900s", "Modern", "Future"];
export const ERA_SNAP_POINTS = [0, 10, 20, 30, 40];
export const ERA_MAX = 40;

export function eraIndex(era) {
  const n = Number.isFinite(Number(era)) ? Number(era) : 0;
  return Math.max(0, Math.min(ERA_LABELS.length - 1, Math.round(n / 10)));
}

export function eraLabel(era) {
  return ERA_LABELS[eraIndex(era)];
}

export const IMPERATIVES = [
  { value: 1, name: "Strict Doctrine", directive: "remain faithful to historic confessional boundaries; avoid speculation." },
  { value: 2, name: "Faithful Interpretation", directive: "honor the text's plain sense while allowing pastoral application." },
  { value: 3, name: "Inspired Reflection", directive: "draw thoughtful, devotional insight rooted in the text." },
  { value: 4, name: "Symbolic Expansion", directive: "freely explore metaphor, allegory, and layered meaning." },
];
export const DEFAULT_IMPERATIVE = 2;

export const METAPHOR_LABELS = ["Low", "Moderate", "High"];
export const METAPHOR_DIRECTIVES = [
  "Low - lean on plain narration.",
  "Moderate - occasional figurative language.",
  "High - rich in metaphor and layered symbol.",
];

export const USER_PROMPT_MAX = 2000;

// Canonical Bible books with common abbreviations, used to recognize a
// scripture reference typed in chat (e.g. "John 3:16", "Gen 4", "1 Cor 13").
// Shared by public/storyMatch.js (client) and lib/validate.js + lib/bibleApi.js
// (server) so a reference is validated the same way everywhere.
export const BIBLE_BOOKS = [
  { name: "Genesis", aliases: ["gen", "gn"] },
  { name: "Exodus", aliases: ["ex", "exod"] },
  { name: "Leviticus", aliases: ["lev", "lv"] },
  { name: "Numbers", aliases: ["num", "nm", "numb"] },
  { name: "Deuteronomy", aliases: ["deut", "dt"] },
  { name: "Joshua", aliases: ["josh", "jos"] },
  { name: "Judges", aliases: ["judg", "jdg"] },
  { name: "Ruth", aliases: ["ru"] },
  { name: "1 Samuel", aliases: ["1 sam", "1sam", "1st samuel", "first samuel"] },
  { name: "2 Samuel", aliases: ["2 sam", "2sam", "2nd samuel", "second samuel"] },
  { name: "1 Kings", aliases: ["1 kgs", "1kgs", "1st kings", "first kings"] },
  { name: "2 Kings", aliases: ["2 kgs", "2kgs", "2nd kings", "second kings"] },
  { name: "1 Chronicles", aliases: ["1 chr", "1chr", "1st chronicles", "first chronicles"] },
  { name: "2 Chronicles", aliases: ["2 chr", "2chr", "2nd chronicles", "second chronicles"] },
  { name: "Ezra", aliases: ["ezr"] },
  { name: "Nehemiah", aliases: ["neh"] },
  { name: "Esther", aliases: ["esth", "est"] },
  { name: "Job", aliases: ["jb"] },
  { name: "Psalms", aliases: ["psalm", "ps", "psa", "pslm"] },
  { name: "Proverbs", aliases: ["prov", "prv"] },
  { name: "Ecclesiastes", aliases: ["eccl", "eccles", "qoheleth"] },
  { name: "Song of Solomon", aliases: ["song of songs", "song", "sos", "canticles"] },
  { name: "Isaiah", aliases: ["isa"] },
  { name: "Jeremiah", aliases: ["jer"] },
  { name: "Lamentations", aliases: ["lam"] },
  { name: "Ezekiel", aliases: ["ezek", "eze"] },
  { name: "Daniel", aliases: ["dan", "dn"] },
  { name: "Hosea", aliases: ["hos"] },
  { name: "Joel", aliases: ["jl"] },
  { name: "Amos", aliases: ["am"] },
  { name: "Obadiah", aliases: ["obad", "ob"] },
  { name: "Jonah", aliases: ["jnh"] },
  { name: "Micah", aliases: ["mic"] },
  { name: "Nahum", aliases: ["nah"] },
  { name: "Habakkuk", aliases: ["hab"] },
  { name: "Zephaniah", aliases: ["zeph", "zep"] },
  { name: "Haggai", aliases: ["hag"] },
  { name: "Zechariah", aliases: ["zech", "zec"] },
  { name: "Malachi", aliases: ["mal"] },
  { name: "Matthew", aliases: ["matt", "mt"] },
  { name: "Mark", aliases: ["mk", "mrk"] },
  { name: "Luke", aliases: ["lk", "luk"] },
  { name: "John", aliases: ["jn", "jhn"] },
  { name: "Acts", aliases: ["act"] },
  { name: "Romans", aliases: ["rom", "rm"] },
  { name: "1 Corinthians", aliases: ["1 cor", "1cor", "1st corinthians", "first corinthians"] },
  { name: "2 Corinthians", aliases: ["2 cor", "2cor", "2nd corinthians", "second corinthians"] },
  { name: "Galatians", aliases: ["gal"] },
  { name: "Ephesians", aliases: ["eph"] },
  { name: "Philippians", aliases: ["phil", "php"] },
  { name: "Colossians", aliases: ["col"] },
  { name: "1 Thessalonians", aliases: ["1 thess", "1thess", "1st thessalonians", "first thessalonians"] },
  { name: "2 Thessalonians", aliases: ["2 thess", "2thess", "2nd thessalonians", "second thessalonians"] },
  { name: "1 Timothy", aliases: ["1 tim", "1tim", "1st timothy", "first timothy"] },
  { name: "2 Timothy", aliases: ["2 tim", "2tim", "2nd timothy", "second timothy"] },
  { name: "Titus", aliases: ["tit"] },
  { name: "Philemon", aliases: ["phlm", "phm"] },
  { name: "Hebrews", aliases: ["heb"] },
  { name: "James", aliases: ["jas", "jam"] },
  { name: "1 Peter", aliases: ["1 pet", "1pet", "1st peter", "first peter"] },
  { name: "2 Peter", aliases: ["2 pet", "2pet", "2nd peter", "second peter"] },
  { name: "1 John", aliases: ["1 jn", "1jn", "1st john", "first john"] },
  { name: "2 John", aliases: ["2 jn", "2jn", "2nd john", "second john"] },
  { name: "3 John", aliases: ["3 jn", "3jn", "3rd john", "third john"] },
  { name: "Jude", aliases: ["jud"] },
  { name: "Revelation", aliases: ["rev", "revelations", "apocalypse"] },
];
