export interface FuzzyMatchResult {
  match: boolean;
  score: number;
}

export function fuzzyMatch(query: string, text: string): FuzzyMatchResult {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedText = text.toLowerCase();

  if (!normalizedQuery) return { match: true, score: 1 };
  if (normalizedText === normalizedQuery) return { match: true, score: 1 };
  if (normalizedText.startsWith(normalizedQuery)) return { match: true, score: 0.98 };
  if (normalizedText.includes(normalizedQuery)) return { match: true, score: 0.95 };

  let queryIndex = 0;
  let consecutiveMatches = 0;
  let maxConsecutive = 0;
  let matchedChars = 0;
  let firstMatchIndex = -1;

  for (
    let i = 0;
    i < normalizedText.length && queryIndex < normalizedQuery.length;
    i++
  ) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      if (firstMatchIndex === -1) firstMatchIndex = i;
      matchedChars++;
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  const allCharsMatched = queryIndex === normalizedQuery.length;

  if (!allCharsMatched) return { match: false, score: 0 };

  const matchRatio = matchedChars / normalizedQuery.length;
  const consecutiveBonus = maxConsecutive / normalizedQuery.length;
  const positionPenalty = firstMatchIndex > 0 ? 0.1 : 0;

  const score = matchRatio * 0.4 + consecutiveBonus * 0.5 - positionPenalty;

  return { match: score >= 0.3, score };
}

export function filterAndSortByFuzzy<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string
): T[] {
  if (!query.trim()) return items;

  const results = items
    .map((item) => ({
      item,
      result: fuzzyMatch(query, getSearchText(item)),
    }))
    .filter(({ result }) => result.match)
    .sort((a, b) => b.result.score - a.result.score);

  return results.map(({ item }) => item);
}
