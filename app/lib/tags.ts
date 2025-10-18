const hashtagRegex = /#([\p{L}\p{N}_]+)/gu;

export function extractHashtagsWithOriginalCasing(
  comment?: string
): Array<{ lowercase: string; original: string }> {
  if (!comment) {
    return [];
  }

  const matches = comment.matchAll(hashtagRegex);

  const tagsMap = new Map<string, string>();
  for (const match of matches) {
    const lowercase = match[1].toLowerCase();
    if (!tagsMap.has(lowercase)) {
      tagsMap.set(lowercase, match[1]);
    }
  }

  return Array.from(tagsMap.entries()).map(([lowercase, original]) => ({
    lowercase,
    original,
  }));
}
