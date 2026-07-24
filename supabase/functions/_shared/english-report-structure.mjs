export const ENGLISH_BAZI_REPORT_SECTIONS = Object.freeze([
  { number: 1, group: 'Chart Foundation', title: 'Four Pillars and Day Master', promise: 'Your calculated pillars, the Day Master stem, Yin-Yang polarity, and the role of each pillar in the chart.' },
  { number: 2, group: 'Chart Foundation', title: 'Seasonal Qi and Day Master Strength', promise: 'How the Month Branch, season, roots, support, drains, and controls are used to assess the Day Master.' },
  { number: 3, group: 'Chart Foundation', title: 'Five Elements and Hidden Stems', promise: 'Visible and hidden Wood, Fire, Earth, Metal, and Water, with hidden-only elements kept distinct from truly absent elements.' },
  { number: 4, group: 'Chart Foundation', title: 'Ten Gods in the Natal Chart', promise: 'The Ten Gods shown by pillar and hidden stem, translated into clear English without replacing the traditional structure.' },
  { number: 5, group: 'Structure', title: 'Chart Structure, Useful Elements, and Unfavorable Elements', promise: 'The chart pattern, balancing logic, useful elements, favorable support, and elements that require caution, with the reasoning stated.' },
  { number: 6, group: 'Structure', title: 'Stems, Branches, and Natal Interactions', promise: 'Combinations, clashes, harms, breaks, punishments, meetings, and repeated pillars found in the natal chart.' },
  { number: 7, group: 'Structure', title: 'Shen Sha: Secondary Symbolic Stars', promise: 'A table of supported Shen Sha markers, their locations and derivation, followed by restrained secondary interpretation.' },
  { number: 8, group: 'Life Topics', title: 'Career and Suitable Work Environments', promise: 'Career functions derived from the Officer, Output, Resource, Wealth, and Companion structures, with the chart evidence and limits stated.' },
  { number: 9, group: 'Life Topics', title: 'Wealth Pattern and Resource Management', promise: 'Wealth-star locations, the Day Master\'s capacity to carry Wealth activity, and the support required by the chart structure.' },
  { number: 10, group: 'Life Topics', title: 'Relationships, Partner Star, and Spouse Palace', promise: 'Relationship indications from the partner star, Day Branch, relevant interactions, and gender convention, without promising events.' },
  { number: 11, group: 'Life Topics', title: 'Health Tendencies Through the Five Elements', promise: 'Traditional Five-Element bodily correspondences, presented as historical categories rather than medical findings.' },
  { number: 12, group: 'Timing', title: 'Luck Pillar Direction and Starting Age', promise: 'Forward or reverse direction, the gender and Yin-Yang rule used, and the starting age supplied by the calculator. Do not reconstruct, explain, or name the solar-term calculation.' },
  { number: 13, group: 'Timing', title: 'Ten-Year Luck Pillars', promise: 'Each Da Yun pillar read against the natal chart, including the active cycle and the structural reason for its emphasis.' },
  { number: 14, group: 'Timing', title: 'Annual Outlook for the Next Five Years', promise: 'Year-by-year stems, branches, Ten Gods, and exact contacts with the natal chart and active Luck Pillar.' },
  { number: 15, group: 'Timing', title: 'Timing Priorities and Practical Summary', promise: 'A concise synthesis of when to advance, stay steady, or protect resources, tied to the preceding chart evidence.' },
]);

export const ENGLISH_BAZI_REPORT_SECTION_COUNT = ENGLISH_BAZI_REPORT_SECTIONS.length;
export const ENGLISH_BAZI_REPORT_WORD_RANGE = Object.freeze({ min: 3600, max: 4800 });
export const ENGLISH_BAZI_REPORT_READING_MINUTES = Object.freeze({ min: 30, max: 35 });

export function englishBaziBlueprint() {
  return ENGLISH_BAZI_REPORT_SECTIONS
    .map((section) => `Section ${section.number}: ${section.title}. ${section.promise}`)
    .join('\n');
}
