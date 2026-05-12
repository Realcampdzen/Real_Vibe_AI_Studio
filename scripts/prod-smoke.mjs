const baseUrl = (process.env.PROD_SMOKE_BASE_URL || 'https://vps.real-vibe.studio').replace(/\/$/, '');
const oldHeroMasterPath = '/public/works/%D0%BE%D0%BF%D0%B5%D0%BD%D0%B8%D0%BD%D0%B3%20%D0%BD%D0%BE%D0%B2%D1%8B%D0%B9.mp4';

function fail(message, detail = '') {
  console.error(`${message}${detail ? `: ${detail}` : ''}`);
  process.exitCode = 1;
}

async function check(name, condition, detail = '') {
  if (!condition) {
    fail(`${name} failed`, detail);
    return;
  }
  console.log(`${name} ok`);
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

const health = await request('/health');
await check('/health', health.ok, `status ${health.status}`);

const homepage = await request('/');
const csp = homepage.headers.get('content-security-policy') || '';
const cspReportOnly = homepage.headers.get('content-security-policy-report-only') || '';
const homepageText = await homepage.text();
await check('homepage', homepage.ok, `status ${homepage.status}`);
await check('enforced script CSP', /script-src 'self'/.test(csp), csp);
await check('enforced object/base/frame CSP', /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /frame-ancestors 'self'/.test(csp), csp);
await check('enforced style attr CSP', /style-src-attr 'none'/.test(csp), csp);
await check('enforced style CSP has no unsafe-inline', !/style-src[^;]*'unsafe-inline'/.test(csp), csp);
await check('report-only style-src-attr', /style-src-attr 'none'/.test(cspReportOnly), cspReportOnly);
await check('report-only style CSP has no unsafe-inline', !/style-src[^;]*'unsafe-inline'/.test(cspReportOnly), cspReportOnly);
await check('legacy chat overlay removed', !homepageText.includes('id="chat-overlay"'), 'legacy #chat-overlay found');
await check('chat client script present', homepageText.includes('js/chat-client.js'), 'chat-client script not found');
await check('homepage canonical present', /<link rel="canonical" href="https:\/\/vps\.real-vibe\.studio\/">/.test(homepageText), 'canonical missing');
await check('homepage Open Graph present', homepageText.includes('property="og:title"') && homepageText.includes('property="og:image"'), 'OG tags missing');
await check('schema.org microdata present', homepageText.includes('https://schema.org/Organization') && homepageText.includes('https://schema.org/FAQPage'), 'schema.org microdata missing');

const cors = await request('/api/bots/status', {
  headers: { Origin: 'http://localhost:3000' },
});
await check('production CORS localhost reject', cors.status === 403, `status ${cors.status}`);

const invalidChat = await request('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
await check('invalid /chat rejected', [400, 429].includes(invalidChat.status), `status ${invalidChat.status}`);

const analytics = await request('/api/analytics/event', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'cta_click', page: '/smoke', target: 'telegram', serviceId: '1' }),
});
await check('analytics event accepted', analytics.status === 204, `status ${analytics.status}`);

const webhook = await request('/api/webhook/smoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'smoke', data: {} }),
});
await check('webhook requires token', webhook.status === 403, `status ${webhook.status}`);

const heroWebm = await request('/public/works/hero-reel-desktop.webm', {
  headers: { Range: 'bytes=0-1' },
});
await check('hero WebM range status', heroWebm.status === 206, `status ${heroWebm.status}`);
await check('hero WebM content type', (heroWebm.headers.get('content-type') || '').includes('video/webm'), heroWebm.headers.get('content-type') || '');
await check('hero WebM content range', Boolean(heroWebm.headers.get('content-range')), heroWebm.headers.get('content-range') || '');

const oldMaster = await request(oldHeroMasterPath);
await check('old hero master unavailable', oldMaster.status === 404, `status ${oldMaster.status}`);

const robots = await request('/robots.txt');
await check('robots.txt', robots.ok, `status ${robots.status}`);
const sitemap = await request('/sitemap.xml');
const sitemapText = await sitemap.text();
await check('sitemap.xml', sitemap.ok && sitemapText.includes('/service-detail.html?id=7'), `status ${sitemap.status}`);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('production smoke checks passed');
