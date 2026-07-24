export type TrueSolarStatus =
  | 'applied'
  | 'birth_time_unknown'
  | 'birth_time_not_exact'
  | 'birth_place_missing'
  | 'birth_place_unresolved'
  | 'timezone_unavailable';

export type TrueSolarResult = {
  status: TrueSolarStatus;
  input_local_datetime: string | null;
  corrected_local_datetime: string | null;
  corrected_components: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  } | null;
  location: {
    query: string;
    name: string;
    admin1: string;
    country: string;
    latitude: number;
    longitude: number;
    timezone: string;
  } | null;
  utc_offset_minutes: number | null;
  longitude_correction_minutes: number | null;
  equation_of_time_minutes: number | null;
  total_correction_minutes: number | null;
  method: 'longitude_plus_equation_of_time';
  source: 'open-meteo-geocoding';
};

type BirthInput = {
  year: number;
  month: number;
  day: number;
  clock: string | null;
  place: string | null;
};

type GeocodingResult = {
  name?: unknown;
  admin1?: unknown;
  country?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  timezone?: unknown;
};

const METHOD = 'longitude_plus_equation_of_time' as const;
const SOURCE = 'open-meteo-geocoding' as const;

function clean(value: unknown, max = 160): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function localIso(year: number, month: number, day: number, hour: number, minute: number): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function emptyResult(status: TrueSolarStatus, inputLocal: string | null, query = ''): TrueSolarResult {
  return {
    status,
    input_local_datetime: inputLocal,
    corrected_local_datetime: null,
    corrected_components: null,
    location: null,
    utc_offset_minutes: null,
    longitude_correction_minutes: null,
    equation_of_time_minutes: null,
    total_correction_minutes: null,
    method: METHOD,
    source: SOURCE,
  };
}

function parseExactClock(value: string | null): { hour: number; minute: number } | null {
  const clock = clean(value, 32);
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(clock);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function dayOfYear(year: number, month: number, day: number): number {
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86400000) + 1;
}

// NOAA's commonly used fractional-year approximation, returned in minutes.
export function equationOfTimeMinutes(year: number, month: number, day: number, hour = 12): number {
  const daysInYear = new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1 ? 366 : 365;
  const gamma = (2 * Math.PI / daysInYear) * (dayOfYear(year, month, day) - 1 + (hour - 12) / 24);
  return 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
}

function partsAt(date: Date, timeZone: string): Record<string, number> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value);
  }
  return parts;
}

// Solve the UTC instant that displays as the supplied local civil time.
export function historicalOffsetMinutes(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): number | null {
  try {
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    let guess = targetAsUtc;
    for (let index = 0; index < 4; index += 1) {
      const parts = partsAt(new Date(guess), timeZone);
      const displayedAsUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second || 0,
      );
      guess += targetAsUtc - displayedAsUtc;
    }
    return Math.round((targetAsUtc - guess) / 60000);
  } catch (_error) {
    return null;
  }
}

async function geocodePlace(query: string): Promise<TrueSolarResult['location']> {
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', query);
    url.searchParams.set('count', '5');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'Tengyunzi-True-Solar-Time/1.0' },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return null;
    const data = await response.json().catch(() => ({}));
    const candidates = Array.isArray(data?.results) ? data.results as GeocodingResult[] : [];
    const best = candidates.find((item) => (
      Number.isFinite(Number(item.latitude))
      && Number.isFinite(Number(item.longitude))
      && clean(item.timezone, 80)
    ));
    if (!best) return null;
    return {
      query,
      name: clean(best.name, 120),
      admin1: clean(best.admin1, 120),
      country: clean(best.country, 120),
      latitude: Number(best.latitude),
      longitude: Number(best.longitude),
      timezone: clean(best.timezone, 80),
    };
  } catch (_error) {
    return null;
  }
}

export async function resolveTrueSolarTime(input: BirthInput): Promise<TrueSolarResult> {
  const rawClock = clean(input.clock, 32).toLowerCase();
  if (!rawClock || rawClock === 'unknown') {
    return emptyResult('birth_time_unknown', null, clean(input.place));
  }

  const exact = parseExactClock(rawClock);
  const inputLocal = exact
    ? localIso(input.year, input.month, input.day, exact.hour, exact.minute)
    : null;
  if (!exact) return emptyResult('birth_time_not_exact', inputLocal, clean(input.place));

  const place = clean(input.place, 180);
  if (!place) return emptyResult('birth_place_missing', inputLocal);

  const location = await geocodePlace(place);
  if (!location) return emptyResult('birth_place_unresolved', inputLocal, place);

  const offset = historicalOffsetMinutes(
    location.timezone,
    input.year,
    input.month,
    input.day,
    exact.hour,
    exact.minute,
  );
  if (offset === null) {
    return { ...emptyResult('timezone_unavailable', inputLocal, place), location };
  }

  const equation = equationOfTimeMinutes(input.year, input.month, input.day, exact.hour);
  const longitudeCorrection = 4 * location.longitude - offset;
  const totalCorrection = longitudeCorrection + equation;
  const localCivilAsUtc = Date.UTC(input.year, input.month - 1, input.day, exact.hour, exact.minute, 0);
  const corrected = new Date(localCivilAsUtc + Math.round(totalCorrection * 60000));
  const components = {
    year: corrected.getUTCFullYear(),
    month: corrected.getUTCMonth() + 1,
    day: corrected.getUTCDate(),
    hour: corrected.getUTCHours(),
    minute: corrected.getUTCMinutes(),
  };

  return {
    status: 'applied',
    input_local_datetime: inputLocal,
    corrected_local_datetime: localIso(
      components.year,
      components.month,
      components.day,
      components.hour,
      components.minute,
    ),
    corrected_components: components,
    location,
    utc_offset_minutes: offset,
    longitude_correction_minutes: Math.round(longitudeCorrection * 10) / 10,
    equation_of_time_minutes: Math.round(equation * 10) / 10,
    total_correction_minutes: Math.round(totalCorrection * 10) / 10,
    method: METHOD,
    source: SOURCE,
  };
}
