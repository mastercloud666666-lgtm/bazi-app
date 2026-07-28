export const REPORT_CONFIDENCE = Object.freeze({
  1: { level: 'SUPPORTED', label: 'Chart verdict', note: 'The pillars are calculated; the governing pattern is established from season, roots, Ten Gods, and exact structure.' },
  2: { level: 'SUPPORTED', label: 'Pattern judgment', note: 'Favorable and unfavorable elements follow the stated structural method and any qualifying classical special pattern.' },
  3: { level: 'CALCULATED', label: 'Calculated energy profile', note: 'Five Elements and Ten Gods are mapped from visible stems and canonical hidden stems using the stated weighting method.' },
  4: { level: 'CALCULATED', label: 'Calculated contacts', note: 'Only canonical stem-branch relations, exact repeats, transformation status, and Xun Kong from the supplied chart are included.' },
  5: { level: 'SUPPORTED', label: 'Traditional interpretation', note: 'Capability and life-direction symbolism is derived from the established pattern and Ten-God structure.' },
  6: { level: 'CONTEXTUAL', label: 'Traditional family reading', note: 'Pillar-position symbolism is not verified family biography and must not be presented as a guaranteed fact.' },
  7: { level: 'CONTEXTUAL', label: 'Career structure', note: 'The chart identifies favorable work functions and unsuitable structural routes, not a guaranteed occupation or title.' },
  8: { level: 'CONTEXTUAL', label: 'Wealth structure', note: 'Wealth symbolism describes earning pathways and conditions, not guaranteed income or investment results.' },
  9: { level: 'CONTEXTUAL', label: 'Relationship structure', note: 'Partner-star and Spouse-Palace symbolism does not guarantee marriage, separation, or a partner biography.' },
  10: { level: 'CONTEXTUAL', label: 'Traditional correspondence', note: 'Five-Element bodily associations are non-diagnostic and separate from pattern favorability.' },
  11: { level: 'SUPPORTED', label: 'Luck-Cycle judgment', note: 'Direction, starting age, and pillars are calculated; favorable-neutral-unfavorable ratings follow the same structural verdict.' },
  12: { level: 'SUPPORTED', label: 'Annual judgment', note: 'Annual contacts are calculated and rated through the established pattern without guaranteeing a specific event.' },
  13: { level: 'SUPPORTED', label: 'Final synthesis', note: 'A concise restatement of the preceding evidence, not a separate coaching or planning chapter.' },
});

export function confidenceForSection(number) {
  return REPORT_CONFIDENCE[number] || {
    level: 'CONTEXTUAL',
    label: 'Contextual interpretation',
    note: 'Interpretation should be compared with lived context.',
  };
}

function words(value) {
  return String(value || '').toLowerCase().match(/[a-z0-9\u4e00-\u9fff]+/g) || [];
}

function similarity(left, right) {
  const a = new Set(words(left));
  const b = new Set(words(right));
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

export function splitReportSentences(value) {
  const decimalMarker = '\uE000';
  const protectedText = String(value || '')
    .replace(/(\d)\.(\d)/g, `$1${decimalMarker}$2`)
    .replace(/\s+/g, ' ')
    .trim();
  return (protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.replaceAll(decimalMarker, '.'));
}

function evidenceSignature(value) {
  const matches = String(value || '').toLowerCase().match(
    /[\u4e00-\u9fff]+|\b(?:year|month|day|hour|natal|annual|luck|spouse)\b|\b\d+(?:\.\d+)?%?\b/g,
  ) || [];
  return [...new Set(matches)].sort().join('|');
}

export function deduplicateReportSections(input, options = {}) {
  const threshold = Number(options.threshold || 0.9);
  const minWords = Number(options.minWords || 18);
  const text = String(input || '').replace(/\r\n?/g, '\n').trim();
  const chunks = text.split(/(?=^(?:Section\s+\d+\s*:|第[0-9一二三四五六七八九十零〇两]{1,4}段：))/gim).map((part) => part.trim()).filter(Boolean);
  const seen = [];
  const removed = [];
  const output = chunks.map((chunk) => {
    const [heading, ...bodyLines] = chunk.split('\n');
    const bodySentences = splitReportSentences(bodyLines.join(' '));
    const kept = [];
    bodySentences.forEach((sentence) => {
      const tokenCount = words(sentence).length;
      const duplicate = tokenCount >= minWords && seen.some((prior) => {
        const lengthRatio = Math.min(prior.length, tokenCount) / Math.max(prior.length, tokenCount);
        return prior.evidence === evidenceSignature(sentence)
          && lengthRatio >= 0.78
          && similarity(prior.text, sentence) >= threshold;
      });
      if (duplicate) removed.push({ heading, sentence: sentence.trim() });
      else kept.push(sentence.trim());
      if (!duplicate && tokenCount >= minWords) seen.push({
        text: sentence,
        length: tokenCount,
        evidence: evidenceSignature(sentence),
      });
    });
    return `${heading}\n${kept.join(' ')}`.trim();
  });
  return { text: output.join('\n\n'), removed };
}
