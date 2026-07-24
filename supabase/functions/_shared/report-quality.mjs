export const REPORT_CONFIDENCE = Object.freeze({
  1: { level: 'CALCULATED', label: 'Calculated fact', note: 'Directly derived from the supplied Four Pillars.' },
  2: { level: 'SUPPORTED', label: 'Structural reading', note: 'Supported by season, roots, support, drains, and controls; school weighting may differ.' },
  3: { level: 'CALCULATED', label: 'Calculated fact', note: 'Directly derived from visible elements and canonical hidden stems.' },
  4: { level: 'CALCULATED', label: 'Calculated profile', note: 'Ten Gods are mapped from the Day Master and weighted visible and hidden stems.' },
  5: { level: 'SUPPORTED', label: 'Structural reading', note: 'A balancing interpretation; useful-element schools may weigh the same evidence differently.' },
  6: { level: 'CALCULATED', label: 'Calculated contacts', note: 'Only canonical stem and branch relations found in the supplied natal chart are included.' },
  7: { level: 'CONTEXTUAL', label: 'Secondary symbol', note: 'Shen Sha adds context and never overrides the main chart structure.' },
  8: { level: 'CONTEXTUAL', label: 'Contextual interpretation', note: 'Career expression depends on education, location, opportunity, and chosen field.' },
  9: { level: 'CONTEXTUAL', label: 'Contextual interpretation', note: 'Wealth symbolism describes structure and operating style, not financial outcomes.' },
  10: { level: 'CONTEXTUAL', label: 'Contextual interpretation', note: 'Relationship symbolism is not a verified biography or event prediction.' },
  11: { level: 'CONTEXTUAL', label: 'Traditional correspondence', note: 'Five-Element associations are non-diagnostic and are not medical findings.' },
  12: { level: 'CALCULATED', label: 'Calculated timing', note: 'Direction and starting age are supplied by the calculator and define cycle sequence only.' },
  13: { level: 'SUPPORTED', label: 'Structural timing', note: 'Luck Pillars are calculated; their interpretation remains conditional.' },
  14: { level: 'SUPPORTED', label: 'Structural timing', note: 'Annual contacts are calculated; practical outcomes depend on real-world context.' },
  15: { level: 'CONTEXTUAL', label: 'Planning synthesis', note: 'A practical summary of preceding evidence, not a guaranteed forecast.' },
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
