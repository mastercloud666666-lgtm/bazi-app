import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildRateLimitIdentifier,
  consumeRateLimit,
  corsHeaders,
  isAllowedRequestOrigin,
  json,
  resolveAllowedOrigins,
  tooManyRequestsResponse,
} from '../_shared/security.ts';
import {
  buildFengShuiAudit,
  normalizeDirection,
  toEnglishDeliveryAudit,
} from '../_shared/fengshui-rules.mjs';
import { resolveModelRole } from '../_shared/model-roles.mjs';

const MAX_IMAGE_DATA_URL_LENGTH = 6_500_000;
const MAX_ROOMS = 24;
const MAX_FACILITIES = 40;
const MAX_WINDOWS_PER_ROOM = 12;
const RATE_WINDOW_SECONDS = 3600;
const RATE_MAX_REQUESTS = 4;

function asString(value: unknown, max = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function asInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function asArea(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1_000_000) : 0;
}

function asDirection(value: unknown): string {
  return normalizeDirection(asString(value, 40));
}

function asRole(value: unknown): string {
  const normalized = asString(value, 80).toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set([
    'father', 'married_man', 'husband',
    'eldest_son', 'middle_son', 'youngest_son',
    'mother', 'married_woman', 'wife',
    'eldest_daughter', 'middle_daughter', 'youngest_daughter',
  ]);
  return allowed.has(normalized) ? normalized : '';
}

function asFacilityType(value: unknown): string {
  const normalized = asString(value, 50).toLowerCase().replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    bathroom: 'toilet',
    wc: 'toilet',
    washroom: 'toilet',
    wash_basin: 'sink',
    washbasin: 'sink',
    basin: 'sink',
  };
  const resolved = aliases[normalized] || normalized;
  return ['kitchen', 'toilet', 'sink', 'entrance', 'balcony'].includes(resolved) ? resolved : '';
}

function stripJsonFence(value: string): string {
  return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  const normalized = stripJsonFence(value);
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      const parsed = JSON.parse(normalized.slice(start, end + 1));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }
}

function sanitizeWindows(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_WINDOWS_PER_ROOM).map((window) => {
    const source = window && typeof window === 'object' && !Array.isArray(window)
      ? window as Record<string, unknown>
      : {};
    return {
      direction: asDirection(source.direction),
      area: asArea(source.area),
    };
  }).filter((window) => window.direction);
}

function sanitizeRooms(value: unknown, fallbackFloor: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_ROOMS).map((room, index) => {
    const source = room && typeof room === 'object' && !Array.isArray(room)
      ? room as Record<string, unknown>
      : {};
    const occupantRoles = Array.isArray(source.occupantRoles || source.occupant_roles)
      ? source.occupantRoles || source.occupant_roles
      : [];
    return {
      id: asString(source.id, 80) || `room-${index + 1}`,
      name: asString(source.name, 120) || `Room ${index + 1}`,
      roomType: asString(source.roomType || source.room_type, 60).toLowerCase(),
      sector: asDirection(source.sector),
      floor: asInteger(source.floor, 1, 200, fallbackFloor),
      bedHead: asDirection(source.bedHead || source.bed_head),
      bedFoot: asDirection(source.bedFoot || source.bed_foot),
      mainWindow: asDirection(source.mainWindow || source.main_window),
      windows: sanitizeWindows(source.windows),
      door: asDirection(source.door || source.mainDoor || source.main_door),
      occupantRoles: [...new Set((occupantRoles as unknown[]).map(asRole).filter(Boolean))],
      evidence: asString(source.evidence, 500),
      confidence: Math.max(0, Math.min(1, Number(source.confidence) || 0)),
    };
  }).filter((room) => room.sector || room.bedHead || room.mainWindow || room.windows.length || room.door);
}

function sanitizeFacilities(value: unknown, fallbackFloor: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, MAX_FACILITIES).map((facility, index) => {
    const source = facility && typeof facility === 'object' && !Array.isArray(facility)
      ? facility as Record<string, unknown>
      : {};
    return {
      id: asString(source.id, 80) || `facility-${index + 1}`,
      type: asFacilityType(source.type),
      sector: asDirection(source.sector),
      floor: asInteger(source.floor, 1, 200, fallbackFloor),
      evidence: asString(source.evidence, 500),
      confidence: Math.max(0, Math.min(1, Number(source.confidence) || 0)),
    };
  }).filter((facility) => facility.type && facility.sector);
}

function sanitizeHousehold(value: unknown) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    marriedMen: asInteger(source.marriedMen || source.married_men, 0, 12, 0),
    marriedWomen: asInteger(source.marriedWomen || source.married_women, 0, 12, 0),
    sons: asInteger(source.sons, 0, 12, 0),
    daughters: asInteger(source.daughters, 0, 12, 0),
  };
}

function sanitizeOccupants(value: unknown, fallbackFloor: number) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map((occupant, index) => {
    const source = occupant && typeof occupant === 'object' && !Array.isArray(occupant)
      ? occupant as Record<string, unknown>
      : {};
    const role = asRole(source.role);
    return {
      id: asString(source.id, 80) || `occupant-${index + 1}`,
      role,
      floor: asInteger(source.floor, 1, 200, fallbackFloor),
      married: source.married === true || ['married_man', 'married_woman', 'mother', 'husband', 'wife'].includes(role),
    };
  }).filter((occupant) => occupant.role);
}

function sanitizeLayoutFacts(
  value: unknown,
  context: Record<string, unknown>,
) {
  const source = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const floor = asInteger(context.floor || source.floor, 1, 200, 1);
  const missingCorners = Array.isArray(source.missingCorners || source.missing_corners)
    ? source.missingCorners || source.missing_corners
    : [];
  const wholeHouseFacing = asDirection(
    context.wholeHouseFacing
      || context.whole_house_facing
      || source.wholeHouseFacing
      || source.whole_house_facing
      || source.mainOpeningDirection
      || source.main_opening_direction,
  );
  return {
    floor,
    northEdge: asString(context.northEdge || context.north_edge || source.northEdge || source.north_edge, 20).toLowerCase(),
    wholeHouseFacing,
    wholeHouseSitting: asDirection(source.wholeHouseSitting || source.whole_house_sitting),
    household: sanitizeHousehold(context.household || source.household),
    occupants: sanitizeOccupants(context.occupants || source.occupants, floor),
    rooms: sanitizeRooms(source.rooms, floor),
    facilities: sanitizeFacilities(source.facilities, floor),
    missingCorners: [...new Set((missingCorners as unknown[]).map(asDirection).filter(Boolean))],
    extractionConfidence: Math.max(0, Math.min(1, Number(source.extractionConfidence || source.extraction_confidence) || 0)),
    unresolved: Array.isArray(source.unresolved)
      ? source.unresolved.slice(0, 30).map((item) => asString(item, 300)).filter(Boolean)
      : [],
  };
}

function validateImageDataUrl(value: unknown): string {
  const dataUrl = asString(value, MAX_IMAGE_DATA_URL_LENGTH + 1);
  if (!dataUrl) return '';
  if (dataUrl.length > MAX_IMAGE_DATA_URL_LENGTH) throw new Error('image_too_large');
  if (!/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\r\n]+$/i.test(dataUrl)) {
    throw new Error('invalid_image_data_url');
  }
  return dataUrl;
}

function buildVisionPrompt(context: Record<string, unknown>): string {
  const floor = asInteger(context.floor, 1, 200, 1);
  const northEdge = asString(context.northEdge || context.north_edge, 20).toLowerCase();
  const wholeHouseFacing = asDirection(context.wholeHouseFacing || context.whole_house_facing);
  const assignmentNotes = asString(context.assignmentNotes || context.assignment_notes, 1800);
  const household = sanitizeHousehold(context.household);

  return `Extract geometry facts from one residential floor plan. Do not perform Feng Shui interpretation.

USER-CONFIRMED CONTEXT
- Analysed floor: ${floor}
- North edge of the uploaded image: ${northEdge || 'not confirmed'}
- Whole-house facing override: ${wholeHouseFacing || 'not confirmed'}
- Household on this floor: married men ${household.marriedMen}, married women ${household.marriedWomen}, sons ${household.sons}, daughters ${household.daughters}
- Room assignment notes: ${assignmentNotes || 'none'}

OUTPUT
Return one JSON object only, using this shape:
{
  "northEdge": "top|right|bottom|left|unknown",
  "wholeHouseFacing": "north|northeast|east|southeast|south|southwest|west|northwest|unknown",
  "wholeHouseSitting": "same direction vocabulary or unknown",
  "rooms": [
    {
      "id": "stable short id",
      "name": "visible room label or neutral English name",
      "roomType": "bedroom|study|living_room|dining_room|kitchen|toilet|other",
      "sector": "compass direction or center or unknown",
      "floor": ${floor},
      "bedHead": "direction or unknown",
      "bedFoot": "direction or unknown",
      "door": "direction or unknown",
      "windows": [{"direction":"direction", "area": 0}],
      "occupantRoles": ["husband|wife|eldest_son|middle_son|youngest_son|eldest_daughter|middle_daughter|youngest_daughter"],
      "evidence": "what is visibly marked",
      "confidence": 0
    }
  ],
  "facilities": [
    {
      "id": "stable short id",
      "type": "kitchen|toilet|sink|entrance|balcony",
      "sector": "compass direction or center or unknown",
      "floor": ${floor},
      "evidence": "what is visibly marked",
      "confidence": 0
    }
  ],
  "missingCorners": ["direction"],
  "extractionConfidence": 0,
  "unresolved": ["facts that cannot be seen clearly"]
}

EXTRACTION RULES
1. Use the supplied North edge when present. Never rotate it or infer a different North.
2. A room sector is measured from the whole-floor Tai Ji center, not from the room center.
3. A room's bedhead is the wall behind the pillows; bed-foot is the opposite direction.
4. Record every visible window direction and give relative window area. Exact units are not required.
5. Classify a toilet only when a toilet bowl / WC is present. A wash basin alone is a sink, not a toilet.
6. Do not infer a missing corner from furniture or an internal recess. Use the exterior building footprint.
7. Do not invent doors, windows, occupants, compass directions, missing corners, or room labels.
8. If North is not confirmed and not visible, mark directional fields unknown.
9. Do not write advice, Five-Element relations, hexagrams, auspicious claims, or health claims.`;
}

async function extractLayoutFacts(
  imageDataUrl: string,
  context: Record<string, unknown>,
) {
  const apiKey = asString(Deno.env.get('RUNAPI_API_KEY'), 500);
  if (!apiKey) throw new Error('runapi_not_configured');
  const baseUrl = asString(Deno.env.get('RUNAPI_BASE_URL'), 300).replace(/\/+$/, '') || 'https://runapi.co/v1';
  const role = resolveModelRole('fengshuiVision', (name: string) => Deno.env.get(name) || '');
  const requestBody: Record<string, unknown> = {
    model: role.model,
    max_tokens: 2800,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a floor-plan geometry extractor. Return strict JSON facts only. Never perform Feng Shui interpretation.',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildVisionPrompt(context) },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
  };
  if (role.reasoningEffort) requestBody.reasoning_effort = role.reasoningEffort;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`vision_model_failed_${response.status}:${details.slice(0, 300)}`);
  }
  const data = await response.json();
  const content = asString(data?.choices?.[0]?.message?.content, 100_000);
  const parsed = parseJsonObject(content);
  if (!parsed) throw new Error('vision_model_invalid_json');
  return {
    facts: parsed,
    provider: `runapi:${role.model}`,
    usage: data?.usage || null,
  };
}

Deno.serve(async (req) => {
  const allowedOrigins = resolveAllowedOrigins();
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders(req, allowedOrigins) });
  }
  if (req.method !== 'POST') {
    return json(req, { error: 'method_not_allowed' }, 405, allowedOrigins);
  }
  if (!isAllowedRequestOrigin(req, allowedOrigins)) {
    return json(req, { error: 'origin_not_allowed' }, 403, allowedOrigins);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const context = body?.context && typeof body.context === 'object' && !Array.isArray(body.context)
      ? body.context as Record<string, unknown>
      : {};
    const suppliedFacts = body?.layout_facts && typeof body.layout_facts === 'object' && !Array.isArray(body.layout_facts)
      ? body.layout_facts as Record<string, unknown>
      : null;
    let extraction = {
      provider: 'supplied-layout-facts',
      usage: null as unknown,
    };
    let rawFacts: Record<string, unknown>;

    if (suppliedFacts) {
      rawFacts = suppliedFacts;
    } else {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !serviceRoleKey) {
        return json(req, { error: 'missing_supabase_env' }, 500, allowedOrigins);
      }
      const supabase = createClient(supabaseUrl, serviceRoleKey);
      const identifier = await buildRateLimitIdentifier(req);
      const rate = await consumeRateLimit(supabase, {
        scope: 'fengshui-audit',
        identifier,
        windowSeconds: RATE_WINDOW_SECONDS,
        maxRequests: RATE_MAX_REQUESTS,
      });
      if (!rate.allowed) {
        return tooManyRequestsResponse(req, allowedOrigins, {
          message: 'Too many floor-plan analyses. Please try again later.',
          retryAfterSeconds: rate.retryAfterSeconds,
          scope: 'fengshui-audit',
          currentCount: rate.currentCount,
        });
      }

      const imageDataUrl = validateImageDataUrl(body?.image_base64 || body?.image_data_url);
      if (!imageDataUrl) {
        return json(req, {
          error: 'floor_plan_required',
          message: 'Upload a floor plan or provide normalized layout facts.',
        }, 400, allowedOrigins);
      }
      const vision = await extractLayoutFacts(imageDataUrl, context);
      rawFacts = vision.facts;
      extraction = { provider: vision.provider, usage: vision.usage };
    }

    const layoutFacts = sanitizeLayoutFacts(rawFacts, context);
    const audit = buildFengShuiAudit(layoutFacts);
    const englishAudit = toEnglishDeliveryAudit(audit);
    const requiresReview = (
      !audit.wholeHouse.resolved
      || layoutFacts.extractionConfidence < 0.72
      || layoutFacts.unresolved.length > 0
      || audit.roomMicroPatterns.some((room: Record<string, unknown>) => room.resolved === false)
    );

    return json(req, {
      ok: true,
      schema_version: 'fengshui-audit-v1',
      layout_facts: layoutFacts,
      audit: englishAudit,
      extraction,
      requires_manual_verification: requiresReview,
    }, 200, allowedOrigins);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const publicError = message === 'image_too_large'
      ? 'The compressed floor plan is too large.'
      : message === 'invalid_image_data_url'
        ? 'The uploaded image format is not supported.'
        : message.startsWith('vision_model_')
          ? 'The floor plan could not be read reliably. Confirm the directions and try again.'
          : 'The residential audit could not be completed.';
    return json(req, {
      error: 'fengshui_audit_failed',
      message: publicError,
      details: message.slice(0, 500),
    }, 500, allowedOrigins);
  }
});
