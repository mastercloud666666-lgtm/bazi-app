import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const username = process.env.TENGYUNZI_ADMIN_USERNAME;
const password = process.env.TENGYUNZI_ADMIN_PASSWORD;
const email = process.env.REPORT_RECIPIENT;
const reportId = process.env.REPORT_ID;
const pdfPath = path.resolve(process.env.REPORT_PDF || '');
if (!username || !password || !email || !reportId || !fs.existsSync(pdfPath)) {
  throw new Error('Admin credentials, REPORT_RECIPIENT, REPORT_ID, and REPORT_PDF are required');
}

const authSource = fs.readFileSync(path.join(ROOT, 'public', 'js', 'tengyunzi-auth.js'), 'utf8');
const supabaseUrl = authSource.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const anon = authSource.match(/const SUPABASE_ANON = '([^']+)'/)?.[1];
if (!supabaseUrl || !anon) throw new Error('Supabase public configuration could not be read');

const headers = {
  'content-type': 'application/json',
  apikey: anon,
  authorization: `Bearer ${anon}`,
  origin: 'https://www.tengyunzi.com',
};
const loginResponse = await fetch(`${supabaseUrl}/functions/v1/admin-orders`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ action: 'admin_login', username, password }),
});
const login = await loginResponse.json().catch(() => ({}));
if (!loginResponse.ok || !login.token) throw new Error(login.error || `Admin login failed: ${loginResponse.status}`);

const response = await fetch(`${supabaseUrl}/functions/v1/report-delivery`, {
  method: 'POST',
  headers: { ...headers, 'x-admin-token': login.token },
  body: JSON.stringify({
    action: 'send_pdf',
    email,
    report_id: reportId,
    birth_date: 'August 16, 1994',
    filename: path.basename(pdfPath),
    pdf_base64: fs.readFileSync(pdfPath).toString('base64'),
  }),
});
const result = await response.json().catch(() => ({}));
if (!response.ok || result.ok !== true) throw new Error(`${result.error || `Delivery failed: ${response.status}`} ${JSON.stringify(result.details || {})}`);
console.log(JSON.stringify(result, null, 2));
