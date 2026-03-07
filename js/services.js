// js/services.js — 各服务页面共用逻辑

const SUPABASE_URL  = 'https://rcyssrsnalefzhzsvswm.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU';

async function callAnalyze(payload) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return data.analysis || '';
}

function cleanAnalysis(text) {
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g, '$1')
    .replace(/^\s*[-–—>]\s*/gm, '')
    .replace(/由\s*DeepSeek\s*生成.*$/gis, '')
    .replace(/Powered by DeepSeek.*$/gis, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function showResult(text) {
  const el = document.getElementById('result-text');
  const section = document.getElementById('result-section');
  const loading = document.getElementById('result-loading');
  if (loading) loading.style.display = 'none';
  if (el) el.textContent = cleanAnalysis(text);
  if (section) section.style.display = 'block';
}

function showLoading() {
  const loading = document.getElementById('result-loading');
  const section = document.getElementById('result-section');
  if (loading) loading.style.display = 'block';
  if (section) section.style.display = 'none';
}

function showError(msg) {
  const loading = document.getElementById('result-loading');
  if (loading) loading.innerHTML = `<p class="error-msg">${msg}</p>`;
}
