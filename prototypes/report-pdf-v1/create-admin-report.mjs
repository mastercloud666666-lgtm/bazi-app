import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const username = process.env.TENGYUNZI_ADMIN_USERNAME;
const password = process.env.TENGYUNZI_ADMIN_PASSWORD;
if (!username || !password) throw new Error('TENGYUNZI_ADMIN_USERNAME and TENGYUNZI_ADMIN_PASSWORD are required');

const authSource = fs.readFileSync(path.join(ROOT, 'public', 'js', 'tengyunzi-auth.js'), 'utf8');
const supabaseUrl = authSource.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const anon = authSource.match(/const SUPABASE_ANON = '([^']+)'/)?.[1];
if (!supabaseUrl || !anon) throw new Error('Supabase public configuration could not be read');

const context = { window: {}, console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'public', 'js', 'bazi.js'), 'utf8'), context);
const calc = context.window.BaziCalc;

const birth = { year: 1994, month: 8, day: 16, hour: 16, gender: 'female' };
const chart = calc.calculateBazi(birth.year, birth.month, birth.day, birth.hour);
const luck = calc.calculateDaYun(chart.year, chart.month, '女', birth.year, birth.month, birth.day);
const finalLuck = luck.dayuns.at(-1);
const specialYears = calc.calcSpecialYears(
  chart,
  luck.dayuns,
  birth.year,
  birth.year + luck.startAge,
  birth.year + finalLuck.ageStart + 10,
);
const elementNames = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
const chartData = {
  pillars: Object.fromEntries(['year', 'month', 'day', 'hour'].map((key) => [key, {
    stem: chart[key].tg,
    branch: chart[key].dz,
  }])),
  elements: Object.fromEntries(Object.entries(chart.wuxing).map(([key, value]) => [elementNames[key], Number(value)])),
};
const birthInput = {
  ...birth,
  hour_known: true,
  birthplace: '',
  timezone: 'Asia/Taipei',
  bazi_str: ['year', 'month', 'day', 'hour'].map((key) => `${chart[key].tg}${chart[key].dz}`).join(' / '),
  dayun_text: luck.dayuns.map((period) => `${period.gz} from age ${period.ageStart} (${period.yearStart})`).join(' | '),
  special_years_text: specialYears.length
    ? specialYears.map((item) => `${item.year} ${item.gz}: notable structural emphasis`).join('\n')
    : 'No major structural markers detected in the calculated range.',
  start_age: luck.startAge,
};

const headers = {
  'content-type': 'application/json',
  apikey: anon,
  authorization: `Bearer ${anon}`,
  origin: 'https://www.tengyunzi.com',
};
if (process.env.REPORT_REQUEST_ONLY === '1') {
  console.log(JSON.stringify({ action: 'create_admin_test', birth_input: birthInput, chart_data: chartData }));
  process.exit(0);
}
const loginResponse = await fetch(`${supabaseUrl}/functions/v1/admin-orders`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ action: 'admin_login', username, password }),
});
const login = await loginResponse.json().catch(() => ({}));
if (!loginResponse.ok || !login.token) throw new Error(login.error || `Admin login failed: ${loginResponse.status}`);

const reportResponse = await fetch(`${supabaseUrl}/functions/v1/english-report`, {
  method: 'POST',
  headers: { ...headers, 'x-admin-token': login.token },
  body: JSON.stringify({ action: 'create_admin_test', birth_input: birthInput, chart_data: chartData }),
});
const result = await reportResponse.json().catch(() => ({}));
if (!reportResponse.ok || !result.report?.id) {
  throw new Error(`${result.error || `Report generation failed: ${reportResponse.status}`} ${result.details || ''}`.trim());
}

const snapshotPath = process.env.REPORT_SNAPSHOT_OUTPUT
  ? path.resolve(process.env.REPORT_SNAPSHOT_OUTPUT)
  : '';
if (snapshotPath) {
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, `${JSON.stringify(result.report, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  reportId: result.report.id,
  status: result.report.status,
  sections: String(result.report.result_text || '').split(/(?=^Section\s+\d+\s*:)/gim).filter((value) => value.trim()).length,
  snapshot: snapshotPath || null,
  birthInput,
  chartData,
}, null, 2));
