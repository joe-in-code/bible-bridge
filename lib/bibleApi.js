// Live Bible text lookup for references outside the curated story list.
// Uses the same public-domain WEB translation and endpoint as
// scripts/fetch-passages.mjs, but at request time, with a short in-memory
// cache so the same reference isn't re-fetched every time within a session.

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map();

const apiBookName = (b) => (b === "Psalms" ? "Psalm" : b);

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

/**
 * @param {string} book canonical book name (e.g. "John")
 * @param {string} reference chapter[:verse[-verse]] or chapter[-chapter], e.g. "3:16-18"
 * @returns {Promise<{ text: string }>}
 */
export async function fetchPassage(book, reference, { timeoutMs = 8000 } = {}) {
  const key = `${book}|${reference}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const url = `https://bible-api.com/${encodeURIComponent(`${apiBookName(book)} ${reference}`)}?translation=web`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    throw new Error(`Could not reach the Bible text service for "${book} ${reference}": ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    throw new Error(`"${book} ${reference}" could not be found (HTTP ${res.status}). Check the reference and try again.`);
  }
  const json = await res.json().catch(() => null);
  if (!json?.text?.trim()) {
    throw new Error(`"${book} ${reference}" returned no text. Check the reference and try again.`);
  }
  const value = { text: json.text.trim() };
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Test-only: clear the in-memory cache between test files. */
export function _clearCache() {
  cache.clear();
}
