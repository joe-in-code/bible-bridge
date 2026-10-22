// Resolves what the retelling is actually about — either one of the curated
// stories (with its pre-fetched passage) or a reference the reader typed in
// chat that isn't in the curated list (fetched live via lib/bibleApi.js).
// buildPrompt() consumes the result uniformly either way.

import { fetchPassage } from "./bibleApi.js";

/** @returns {{ title, book, reference, summary, passageText, excerpted, translation, custom }} */
export function resolveCuratedSubject(story, data) {
  const passage = data.passages?.passages?.[story.id];
  return {
    title: story.title,
    book: story.book,
    reference: story.reference,
    summary: story.summary,
    passageText: passage?.text ?? null,
    excerpted: Boolean(passage?.excerpted),
    translation: data.passages?.translation || "WEB",
    custom: false,
  };
}

/**
 * @param {object} metadata sanitized metadata: either `story` (curated id) or
 *   `customReference: { book, reference }` is set, never both.
 * @returns {Promise<object|null>} null only if neither was set (sanitizeMetadata
 *   should already prevent that, but callers should still check).
 */
export async function resolveSubject(metadata, data) {
  if (metadata.story) {
    const story = data.stories.stories.find((s) => s.id === metadata.story);
    return story ? resolveCuratedSubject(story, data) : null;
  }
  if (metadata.customReference) {
    const { book, reference } = metadata.customReference;
    const fetched = await fetchPassage(book, reference);
    return {
      title: `${book} ${reference}`,
      book,
      reference,
      summary: null,
      passageText: fetched.text,
      excerpted: false,
      translation: "WEB",
      custom: true,
    };
  }
  return null;
}
