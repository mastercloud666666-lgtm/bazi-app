import type { AlmanacData } from './daily-almanac.ts';

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function list(items: string[]): string {
  return items.slice(0, 4).map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join('');
}

export function freeDailySubject(almanac: AlmanacData): string {
  return `Free Daily Almanac | ${almanac.display_date} | ${almanac.day_ganzhi} Day`;
}

export function renderFreeDailyEmail(params: {
  almanac: AlmanacData;
  unsubscribeUrl: string;
  supportEmail?: string;
}): string {
  const almanac = params.almanac;
  const supportEmail = params.supportEmail || 'hello@tengyunzi.com';
  return `<!doctype html><html><body style="margin:0;background:#edf4f9;font-family:Arial,'Noto Sans',sans-serif;color:#17324d;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(`${almanac.theme}. Supportive activities, cautions, lunar date, and traditional directions for today.`)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf4f9;"><tr><td align="center" style="padding:28px 14px 40px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:660px;background:#ffffff;border:1px solid #c8d9e7;border-top:5px solid #1f7ab8;">
        <tr><td style="padding:26px 30px 22px;border-bottom:1px solid #dfe9f1;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#102e49;">Tengyunzi</td>
            <td align="right" style="font-size:11px;font-weight:700;color:#2e6d9e;text-transform:uppercase;">Free Daily Almanac</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 30px 26px;border-bottom:1px solid #dfe9f1;">
          <div style="font-size:12px;font-weight:700;color:#2e6d9e;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(almanac.weekday)} | ${escapeHtml(almanac.day_ganzhi)} Day</div>
          <h1 style="font-family:Georgia,'Noto Serif',serif;font-size:34px;line-height:1.18;margin:0;color:#102e49;">${escapeHtml(almanac.display_date)}</h1>
          <p style="font-size:17px;line-height:1.7;margin:15px 0 0;color:#36566f;">${escapeHtml(almanac.theme)}</p>
        </td></tr>
        <tr><td style="padding:25px 30px;border-bottom:1px solid #dfe9f1;">
          <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 14px;color:#102e49;">Today's calendar</h2>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;line-height:1.55;">
            <tr><td style="padding:8px 0;color:#6a8094;width:38%;">Lunar date</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(almanac.lunar_date)}</td></tr>
            <tr><td style="padding:8px 0;color:#6a8094;">Date pillars</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(`${almanac.year_ganzhi} / ${almanac.month_ganzhi} / ${almanac.day_ganzhi}`)}</td></tr>
            <tr><td style="padding:8px 0;color:#6a8094;">Solar term</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(almanac.solar_term || 'None today')}</td></tr>
            <tr><td style="padding:8px 0;color:#6a8094;">Day clash</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(`${almanac.clash}${almanac.sha ? ` / ${almanac.sha}` : ''}`)}</td></tr>
            <tr><td style="padding:8px 0;color:#6a8094;">Wealth direction</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(almanac.wealth_direction)}</td></tr>
            <tr><td style="padding:8px 0;color:#6a8094;">Joy direction</td><td style="padding:8px 0;font-weight:700;">${escapeHtml(almanac.joy_direction)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:0;border-bottom:1px solid #dfe9f1;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td valign="top" width="50%" style="padding:24px 30px;border-right:1px solid #dfe9f1;">
              <h3 style="font-size:15px;margin:0 0 12px;color:#2f7653;">Supportive activities</h3>
              <ul style="padding-left:18px;margin:0;line-height:1.55;color:#36566f;">${list(almanac.yi)}</ul>
            </td>
            <td valign="top" width="50%" style="padding:24px 30px;">
              <h3 style="font-size:15px;margin:0 0 12px;color:#a34b3d;">Keep measured</h3>
              <ul style="padding-left:18px;margin:0;line-height:1.55;color:#36566f;">${list(almanac.ji)}</ul>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:24px 30px 28px;">
          <p style="margin:0;line-height:1.7;color:#526b82;">Use the calendar as context for planning, not as a command or a guarantee. For a forecast calculated against your own birth chart, see the Personal Monthly BaZi Forecast.</p>
          <a href="https://www.tengyunzi.com/tengyunzi-newsletter.html#monthly" style="display:inline-block;margin-top:18px;background:#1f7ab8;color:#ffffff;text-decoration:none;padding:13px 18px;font-size:14px;font-weight:700;border-radius:6px;">Explore personal monthly forecast</a>
        </td></tr>
        <tr><td style="padding:20px 30px;background:#f7fafc;border-top:1px solid #dfe9f1;font-size:12px;line-height:1.65;color:#6a8094;">
          Tengyunzi emails are educational and reflective. They do not replace professional advice.<br>
          Questions: <a href="mailto:${escapeHtml(supportEmail)}" style="color:#2e6d9e;">${escapeHtml(supportEmail)}</a> | <a href="${escapeHtml(params.unsubscribeUrl)}" style="color:#2e6d9e;">Stop free daily emails</a>
        </td></tr>
      </table>
    </td></tr></table>
  </body></html>`;
}
