# Feng Shui What's Inside Design QA

## Comparison target

- Source visual truth: `output/fengshui-whats-inside/reference-bazi-desktop-viewport.jpg` and `output/fengshui-whats-inside/reference-bazi-mobile-viewport.jpg` (the existing BaZi What's Inside page requested as the product reference).
- Implementation: `output/fengshui-whats-inside/implementation-desktop-viewport.jpg`, `output/fengshui-whats-inside/implementation-mobile-viewport.jpg`, `output/fengshui-whats-inside/implementation-desktop-cards.jpg`, and `output/fengshui-whats-inside/implementation-desktop-comparison.jpg`.
- Combined comparison evidence: `output/fengshui-whats-inside/qa-comparison-desktop.jpg` and `output/fengshui-whats-inside/qa-comparison-mobile.jpg`.
- State: page opening, signed out, English locale; comparison panel captured in its default state.
- Desktop viewport: 1440 × 1000 CSS px; source and implementation captures are 1425 × 990 px. The Browser reports a device pixel ratio of 2 but returns normalized CSS-density screenshots at 1425 × 990, so no additional resampling was applied.
- Mobile viewport: 390 × 844 CSS px; source and implementation captures are 375 × 829 px at 1× density after scrollbar normalization.

## Full-view comparison evidence

The implementation preserves the reference page's core information architecture: a focused page title, a short scope statement, a numbered two-column chapter grid on desktop, a single-column grid on mobile, and a final conversion section. The Feng Shui version intentionally adopts the existing product's dark navy Feng Shui hero, turquoise accent, serif display typography, and report-fact ledger instead of reproducing the BaZi page's light hero and sans-serif title.

After the initial capture, the hero and section introduction were tightened so the first chapter row begins in the desktop opening viewport. The final desktop comparison shows comparable hierarchy and density while clearly belonging to the Feng Shui service. The mobile comparison shows the same readable single-column hierarchy, with the report facts placed before the ten sections.

## Focused comparison evidence

- `implementation-desktop-cards.jpg` confirms the numbered card system, heading scale, border treatment, and long-copy wrapping in the report section.
- `implementation-desktop-comparison.jpg` confirms the US$49.90 and US$149 service cards, delivery distinctions, aligned action rows, and the bottom navigation links.
- Focused evidence was required because the report cards and final service comparison are below the opening viewport and cannot be judged legibly from the full-view comparison alone.

## Required fidelity surfaces

- Fonts and typography: the existing Noto Serif/Noto Sans product pairing is retained. The Feng Shui page uses Noto Serif for display hierarchy and Noto Sans for labels and body copy, matching the current Feng Shui service page. Weight, line height, wrapping, and optical scale remain readable at desktop and mobile sizes.
- Spacing and layout rhythm: the desktop chapter grid uses equal two-column tracks with consistent 16 px gaps; mobile collapses to one column. The tightened hero brings the report grid into the first desktop viewport. No horizontal overflow is present at 1440 or 390 CSS px.
- Colors and visual tokens: the existing Feng Shui deep navy, blue, cyan, mist, line, ink, muted, and warm-gold tokens are used. The contrast between white text and the hero, and between dark text and the light report cards, is clear.
- Image quality and asset fidelity: neither the source nor the implementation requires illustrative imagery or custom icons. No placeholder, CSS-drawn icon, emoji, generated image, or substituted logo is present.
- Copy and content: the page is English-only. Ten connected sections accurately mirror the implemented rule engine and distinguish the US$49.90 rule-based report from the US$149 personal review without promising external Feng Shui in the AI scope.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: the mobile opening viewport prioritizes the four report facts before the first chapter card, whereas the BaZi reference reaches the first card sooner. This is an intentional product difference because price, scope, method, and delivery are essential to the new two-tier Feng Shui purchase decision.

## Comparison history

1. Initial implementation: the dark hero and four-column fact ledger pushed the first report card below the desktop opening viewport, creating a moderate density difference from the BaZi reference.
2. Fix: reduced hero vertical padding, headline scale, introduction spacing, fact-ledger spacing, section padding, and the gap before the chapter grid.
3. Post-fix evidence: `implementation-desktop-viewport.jpg` and `qa-comparison-desktop.jpg` show the first chapter row beginning in the opening viewport while keeping the Feng Shui fact ledger legible. No P0/P1/P2 issue remains.

## Primary interactions tested

- The AI service card's unique What's inside link navigates to `tengyunzi-feng-shui-whats-inside.html#ai-report` and exposes the ten-section heading.
- The mobile Menu control opens the full navigation and changes `aria-expanded` to `true`.
- The page's Choose a Report CTA remains preserved by the shared navigation script on desktop and mobile.
- Desktop and mobile browser consoles contain no warnings or errors.
- The Feng Shui integration test suite passes, including the English-only contents page, both service prices, both entry links, delivery claims, and sitemap entry.

## Implementation checklist

- [x] Match the BaZi What's Inside information hierarchy.
- [x] Adapt the page to the existing Feng Shui visual system.
- [x] Describe ten rule-engine-backed report sections in English.
- [x] Compare AI and personal service scope, delivery, and price.
- [x] Add entry links from both Feng Shui service cards.
- [x] Add the page to the sitemap.
- [x] Verify desktop, mobile, navigation, console, and integration tests.

final result: passed
