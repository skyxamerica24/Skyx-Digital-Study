// Keep Bengali combining marks and fold Bengali digits for mixed-script queries.
function normalize(value: string) {
  return value.normalize("NFC").toLowerCase().replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/[০-৯]/g, digit => String(digit.charCodeAt(0) - 0x09e6))
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

export function createSearchIndex<T>(items: T[], fields: (item: T) => [string, string]) {
  const postings = new Map<string, Map<number, number>>();
  const titles = items.map((item, id) => {
    const [title, body] = fields(item);
    const normalizedTitle = normalize(title);
    for (const [words, weight] of [[normalize(body), 1], [normalizedTitle, 4]] as const) {
      for (const word of new Set(words.split(" "))) {
        if (!word) continue;
        let matches = postings.get(word);
        if (!matches) postings.set(word, matches = new Map());
        matches.set(id, weight);
      }
    }
    return normalizedTitle;
  });
  const vocabulary = [...postings.keys()].sort();

  return function search(query: string, limit = items.length): T[] {
    if (!query.trim()) return items.slice(0, limit);
    const phrase = normalize(query);
    if (!phrase) return [];
    let scores: Map<number, number> | undefined;
    for (const term of new Set(phrase.split(" "))) {
      let lo = 0, hi = vocabulary.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (vocabulary[mid] < term) lo = mid + 1;
        else hi = mid;
      }
      const hits = new Map<number, number>();
      for (let i = lo; i < vocabulary.length && vocabulary[i].startsWith(term); i++) {
        const word = vocabulary[i];
        for (const [id, weight] of postings.get(word)!) {
          const score = weight * (word === term ? 2 : 1);
          hits.set(id, Math.max(score, hits.get(id) || 0));
        }
      }
      // Retain substring lookup for names and technical terms typed mid-word.
      if (!hits.size) {
        for (const word of vocabulary) {
          if (word.includes(term)) for (const [id, weight] of postings.get(word)!) {
            hits.set(id, Math.max(weight, hits.get(id) || 0));
          }
        }
      }
      if (!scores) scores = hits;
      else for (const [id, score] of scores) {
        if (hits.has(id)) scores.set(id, score + hits.get(id)!);
        else scores.delete(id);
      }
      if (!scores.size) return [];
    }
    const ranked = [...scores!].map(([id, score]) =>
      ({ id, score: score + (titles[id] === phrase ? 100 : titles[id].includes(phrase) ? 8 : 0) }));
    return ranked.sort((a,b) => b.score-a.score || a.id-b.id).slice(0,limit).map(r=>items[r.id]);
  };
}
