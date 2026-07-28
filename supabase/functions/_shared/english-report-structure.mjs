export const ENGLISH_BAZI_REPORT_SECTIONS = Object.freeze([
  { number: 1, group: 'Chart Verdict', title: 'Chart Structure and General Verdict', promise: 'The calculated Four Pillars, Day Master, seasonal command, governing pattern, and the book\'s central traditional judgment.' },
  { number: 2, group: 'Pattern and Use', title: 'Day Master, Pattern, and Favorable Elements', promise: 'Ordinary strength, special-pattern priority, explicit favorable and unfavorable Five Elements, and the evidence for each conclusion.' },
  { number: 3, group: 'Energy Structure', title: 'Five Elements, Ten Gods, and Energy Structure', promise: 'Visible and hidden elements, weighted Ten-God shares, dominant functions, and the Output-Wealth-Officer-Resource chain.' },
  { number: 4, group: 'Natal Structure', title: 'Stem-Branch Relations, Repetition, and Void', promise: 'Exact combinations, clashes, harms, breaks, punishments, meetings, Fu Yin, Xun Kong, and transformation status.' },
  { number: 5, group: 'Life Direction', title: 'Temperament, Capability, and Life Direction', promise: 'Traditional character and capability indications derived from the governing pattern, Ten Gods, interactions, and supported symbolic stars.' },
  { number: 6, group: 'Life Domains', title: 'Family and Kinship', promise: 'Parents, siblings, spouse, children, and family dynamics read through pillar positions and Ten Gods without presenting symbolism as verified biography.' },
  { number: 7, group: 'Life Domains', title: 'Career and Best Modes of Development', promise: 'Suitable work functions, industries, operating models, and unsuitable routes derived from the favorable and unfavorable elements.' },
  { number: 8, group: 'Life Domains', title: 'Wealth Structure and Financial Path', promise: 'Wealth-star locations, Output-to-Wealth pathways, income forms, and explicit favorable and unfavorable financial conditions.' },
  { number: 9, group: 'Life Domains', title: 'Marriage and Intimate Relationships', promise: 'Partner star, Spouse Palace, relationship structure, and timing contacts without guaranteed marriage or separation events.' },
  { number: 10, group: 'Five-Element Correspondence', title: 'Traditional Five-Element Body Correspondences', promise: 'Exact weighted element percentages, excess and deficiency, generating-controlling relations, and non-diagnostic traditional bodily correspondences.' },
  { number: 11, group: 'Timing', title: 'Ten-Year Luck Cycles', promise: 'Direction, starting age, each Da Yun pillar, explicit favorable-neutral-unfavorable rating, and its structural reason.' },
  { number: 12, group: 'Timing', title: 'Annual Reading: Next Five Years', promise: 'Each annual Ganzhi, active Luck Cycle, exact contacts, explicit rating, and evidence tied to the same favorable-element verdict.' },
  { number: 13, group: 'Final Verdict', title: 'Final Synthesis', promise: 'A concise restatement of the governing pattern, favorable and unfavorable elements, and the main career, wealth, relationship, and timing conclusions.' },
]);

export const ENGLISH_BAZI_REPORT_SECTION_COUNT = ENGLISH_BAZI_REPORT_SECTIONS.length;
export const ENGLISH_BAZI_REPORT_WORD_RANGE = Object.freeze({ min: 6000, max: 8000 });
export const ENGLISH_BAZI_REPORT_READING_MINUTES = Object.freeze({ min: 35, max: 45 });

export function englishBaziBlueprint() {
  return ENGLISH_BAZI_REPORT_SECTIONS
    .map((section) => `Section ${section.number}: ${section.title}. ${section.promise}`)
    .join('\n');
}
