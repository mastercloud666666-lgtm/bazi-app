# Feng Shui Service Layout Design QA

## Comparison target

- Source visual truth: `output/fengshui-service-redesign/before-desktop.png` and `output/fengshui-service-redesign/before-mobile.png` (the previous production layout, captured at the top of the Feng Shui page).
- Implementation: `output/fengshui-service-redesign/after-desktop.png` and `output/fengshui-service-redesign/after-mobile.png`.
- Combined comparison evidence: `output/fengshui-service-redesign/compare-desktop.png` and `output/fengshui-service-redesign/compare-mobile.png`.
- State: page top, signed-out, empty forms, English locale.
- Desktop viewport: 1440 × 1000 CSS px; browser capture 1425 × 990 px for both source and implementation; 1× density.
- Mobile viewport: 390 × 844 CSS px; browser capture 375 × 812 px for both source and implementation; 1× density.

## Full-view comparison evidence

The previous layout used the entire first screen for the US$149 personal review and pushed the AI report below the manual requirements, explanation, and order form. The implementation replaces that hierarchy with a shared service-selection hero. On desktop, the US$49.90 AI report and US$149 personal review are visible side by side in the first viewport. On mobile, the AI option is the first service card and its price, deliverable, key coverage, and primary action are visible without passing through manual-report content.

The new layout preserves the existing navy, cyan, white, and warm-gold palette, the Tengyunzi serif/sans type pairing, square report-card geometry, and the existing button language. The AI intake now follows the chooser immediately; the personal review requirements and form follow the AI workflow.

## Focused comparison evidence

Separate focused crops were not required. Both service cards, their prices, delivery timing, primary actions, and the mobile first-screen hierarchy are readable in the full-view comparisons at native capture size.

## Required fidelity surfaces

- Fonts and typography: Noto Serif is used for the hero and report names; Noto Sans is retained for controls and supporting copy. Heading scale, weight, line height, and wrapping are consistent across desktop and mobile.
- Spacing and layout rhythm: the desktop two-column service grid aligns both cards and actions; mobile collapses to one column with the AI option first. There is no horizontal overflow.
- Colors and visual tokens: the implementation uses the existing Feng Shui navy, cyan, blue, warm gold, line, ink, and muted tokens. Contrast remains clear on both dark and light surfaces.
- Image and asset quality: the redesigned chooser introduces no new illustrative assets or placeholder imagery. Existing brand typography and UI styling remain intact.
- Copy and content: both products clearly state price, delivery mode, timing, and scope. The CTA labels distinguish the AI report from the personal review.

## Findings

- No actionable P0, P1, or P2 findings remain.
- P3: on a 390 × 844 viewport, the personal-review card begins just below the first viewport. This is acceptable because the requested correction prioritizes immediate AI visibility, while the page heading and “Choose a Report” navigation make the two-option structure explicit.

## Comparison history

1. Initial implementation pass: the desktop service heading and card titles rendered at fallback body size because the Feng Shui stylesheet referenced an undefined `--font-serif` token.
2. Fix: replaced the invalid token with the product’s existing `--display-font` token across the Feng Shui report UI.
3. Post-fix evidence: `after-desktop.png` and `after-mobile.png` show the intended serif hierarchy; computed desktop hero size is 70 px with Noto Serif. No P0/P1/P2 issues remain.

## Primary interactions tested

- “Start AI Report” resolves uniquely and scrolls to `#audit` with the section positioned below the fixed navigation.
- “Order Personal Review” resolves uniquely and scrolls to `#order` with the section positioned below the fixed navigation.
- Mobile and desktop layouts load with no browser console errors.
- All 6 Feng Shui integration tests pass. The full 77-test suite has one pre-existing, unrelated homepage BaZi-book wording failure in `tests/english-report-structure.test.mjs`; this redesign does not change the homepage.

## Implementation checklist

- [x] Put both report choices in the first desktop viewport.
- [x] Put the AI report first on mobile.
- [x] Move the AI intake directly below the chooser.
- [x] Keep the personal report requirements and order form intact.
- [x] Preserve existing prices and payment behavior.
- [x] Verify anchors, responsive layout, console, and tests.

final result: passed
