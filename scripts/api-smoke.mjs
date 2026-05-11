const baseUrl = (process.env.API_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const expectProdCors = process.env.API_SMOKE_EXPECT_PROD_CORS === 'true';
const expectWebhookForbidden = process.env.API_SMOKE_EXPECT_WEBHOOK_FORBIDDEN !== 'false';
const webhookToken = process.env.API_SMOKE_WEBHOOK_TOKEN || '';

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function expect(name, condition, detail = '') {
  if (!condition) {
    throw new Error(`${name} failed${detail ? `: ${detail}` : ''}`);
  }
  console.log(`${name} ok`);
}

const health = await request('/health');
await expect('/health', health.ok, `status ${health.status}`);

const cors = await request('/api/bots/status', {
  headers: { Origin: 'http://localhost:3000' },
});
if (expectProdCors) {
  await expect('production CORS localhost reject', cors.status === 403, `status ${cors.status}`);
}

const invalidChat = await request('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
await expect('invalid /chat rejected', [400, 429].includes(invalidChat.status), `status ${invalidChat.status}`);

const webhookBody = JSON.stringify({ type: 'smoke', data: {} });
const forbiddenWebhook = await request('/api/webhook/smoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: webhookBody,
});
if (expectWebhookForbidden) {
  await expect('webhook requires token', forbiddenWebhook.status === 403, `status ${forbiddenWebhook.status}`);
}

if (webhookToken) {
  const allowedWebhook = await request('/api/webhook/smoke', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RV-Webhook-Token': webhookToken,
    },
    body: webhookBody,
  });
  await expect('webhook token accepted', allowedWebhook.ok, `status ${allowedWebhook.status}`);
}

console.log('api smoke checks passed');
