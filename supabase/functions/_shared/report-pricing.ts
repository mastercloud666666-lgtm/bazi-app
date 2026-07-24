export const REPORT_PRICING_EXPERIMENT = 'report_pricing_v1';
export const AI_PRICES = ['9.99', '19.99', '49.00'] as const;
export const MANUAL_PRICES = ['99.00', '149.00'] as const;

export type ReportPricingVariant = {
  experiment_key: string;
  variant_id: string;
  visitor_id: string;
  ai_price: string;
  manual_price: string;
};

export function sanitizePricingVisitor(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 80)
    : '';
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function resolveReportPricing(value: unknown): ReportPricingVariant | null {
  const visitorId = sanitizePricingVisitor(value);
  if (!visitorId) return null;
  const cell = fnv1a(`${REPORT_PRICING_EXPERIMENT}:${visitorId}`) % 6;
  const aiPrice = AI_PRICES[cell % AI_PRICES.length];
  const manualPrice = MANUAL_PRICES[Math.floor(cell / AI_PRICES.length) % MANUAL_PRICES.length];
  return {
    experiment_key: REPORT_PRICING_EXPERIMENT,
    variant_id: `ai_${aiPrice.replace('.', '')}__manual_${manualPrice.replace('.', '')}`,
    visitor_id: visitorId,
    ai_price: aiPrice,
    manual_price: manualPrice,
  };
}

export function experimentVisitorFromBirth(birth: Record<string, unknown>): string {
  const experiment = birth?.price_experiment && typeof birth.price_experiment === 'object' && !Array.isArray(birth.price_experiment)
    ? birth.price_experiment as Record<string, unknown>
    : {};
  return sanitizePricingVisitor(experiment.visitor_id || birth.visitor_id);
}

export function reportPriceForBirth(birth: Record<string, unknown>, product: 'ai_report' | 'personal_reading'): string | null {
  const pricing = resolveReportPricing(experimentVisitorFromBirth(birth));
  if (!pricing) return null;
  return product === 'ai_report' ? pricing.ai_price : pricing.manual_price;
}

