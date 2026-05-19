const baseUrl = (process.env.AUTH_CART_SMOKE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');

function fail(message, detail) {
  console.error(message);
  if (detail !== undefined) {
    console.error(typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2));
  }
  process.exit(1);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ');
  }

  store(response) {
    const setCookie = response.headers.get('set-cookie');
    if (!setCookie) return;
    for (const raw of setCookie.split(/,(?=\s*[^;,\s]+=)/)) {
      const [pair] = raw.trim().split(';');
      const [name, value] = pair.split('=');
      if (name && value !== undefined) this.cookies.set(name, value);
    }
  }
}

async function request(jar, path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = jar.header();
  if (cookie) headers.set('Cookie', cookie);
  let body = options.body;
  if (body && typeof body === 'object') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body,
  });
  jar.store(response);
  const payload = (response.headers.get('content-type') || '').includes('application/json')
    ? await response.json()
    : null;

  if (!response.ok) {
    fail(`${options.method || 'GET'} ${path} failed with ${response.status}`, payload);
  }
  return payload;
}

async function requestRaw(jar, path, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = jar.header();
  if (cookie) headers.set('Cookie', cookie);

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  });
  jar.store(response);
  return response;
}

const jar = new CookieJar();
const initial = await request(jar, '/api/auth/session');
if (!initial.csrfToken) fail('Session did not return csrfToken', initial);
for (const provider of ['google', 'yandex', 'vk', 'telegram']) {
  if (typeof initial.providers?.[provider] !== 'boolean') {
    fail(`Session providers.${provider} is not a boolean`, initial.providers);
  }
}

const oauthStartExpectations = [
  ['google', 'https://accounts.google.com/o/oauth2/v2/auth'],
  ['yandex', 'https://oauth.yandex.ru/authorize'],
  ['vk', 'https://id.vk.ru/authorize'],
];
for (const [provider, expectedLocation] of oauthStartExpectations) {
  if (!initial.providers[provider]) continue;
  const response = await requestRaw(jar, `/api/auth/${provider}/start?returnTo=%2Findex.html%23services`);
  const location = response.headers.get('location') || '';
  if (response.status < 300 || response.status >= 400 || !location.startsWith(expectedLocation)) {
    fail(`${provider} OAuth start did not redirect to provider`, { status: response.status, location });
  }
}

const guestCart = await request(jar, '/api/cart/items', {
  method: 'POST',
  headers: { 'X-RV-CSRF': initial.csrfToken },
  body: { serviceId: '7', quantity: 1 },
});
if (guestCart.cart.itemCount !== 1) fail('Guest cart add failed', guestCart);

const guestItem = guestCart.cart.items?.[0];
if (!guestItem?.id) fail('Guest cart item missing id', guestCart);
const notedGuestCart = await request(jar, `/api/cart/items/${guestItem.id}`, {
  method: 'PATCH',
  headers: { 'X-RV-CSRF': initial.csrfToken },
  body: { notes: 'Smoke note for cart item' },
});
if (notedGuestCart.cart.items?.[0]?.notes !== 'Smoke note for cart item') {
  fail('Cart item notes were not saved', notedGuestCart);
}

const email = `smoke-${Date.now()}@example.com`;
const registered = await request(jar, '/api/auth/register', {
  method: 'POST',
  headers: { 'X-RV-CSRF': initial.csrfToken },
  body: { email, password: 'smoke-password-123', name: 'Smoke User' },
});
if (!registered.user?.id) fail('Register did not return user', registered);

const profile = await request(jar, '/api/account/profile', {
  method: 'PATCH',
  headers: { 'X-RV-CSRF': registered.csrfToken || initial.csrfToken },
  body: { name: 'Smoke Profile', defaultContact: '@profile_smoke' },
});
if (profile.user?.defaultContact !== '@profile_smoke') fail('Profile update failed', profile);

const merged = await request(jar, '/api/cart');
if (merged.cart.itemCount !== 1) fail('Guest cart was not merged after register', merged);

const order = await request(jar, '/api/orders', {
  method: 'POST',
  headers: { 'X-RV-CSRF': registered.csrfToken || initial.csrfToken },
  body: {
    customerName: 'Smoke Profile',
    contact: '@checkout_smoke',
    message: 'Smoke test order',
    saveContact: true,
  },
});
if (!order.order?.id || order.cart.itemCount !== 0) fail('Checkout failed', order);
if (!order.order.items?.length) fail('Checkout response did not include order items', order);

const savedContactSession = await request(jar, '/api/auth/session');
if (savedContactSession.user?.defaultContact !== '@checkout_smoke') {
  fail('Checkout did not save default contact', savedContactSession);
}

const orders = await request(jar, '/api/orders/my');
const createdOrder = orders.orders?.find((item) => item.id === order.order.id);
if (!createdOrder) fail('Created order missing from order history', orders);
if (!createdOrder.items?.length) fail('Order history did not include items', orders);

const repeated = await request(jar, `/api/orders/${order.order.id}/repeat`, {
  method: 'POST',
  headers: { 'X-RV-CSRF': savedContactSession.csrfToken || registered.csrfToken || initial.csrfToken },
});
if (!repeated.addedCount || repeated.cart.itemCount !== createdOrder.items.reduce((sum, item) => sum + item.quantity, 0)) {
  fail('Repeat order did not add items to cart', repeated);
}

const cleared = await request(jar, '/api/cart/items', {
  method: 'DELETE',
  headers: { 'X-RV-CSRF': savedContactSession.csrfToken || registered.csrfToken || initial.csrfToken },
});
if (cleared.cart.itemCount !== 0) fail('Clear cart failed', cleared);

await request(jar, '/api/auth/logout', {
  method: 'POST',
  headers: { 'X-RV-CSRF': savedContactSession.csrfToken || registered.csrfToken || initial.csrfToken },
});
const afterLogout = await request(jar, '/api/auth/session');
if (afterLogout.user) fail('Logout did not clear user', afterLogout);

const loggedIn = await request(jar, '/api/auth/login', {
  method: 'POST',
  headers: { 'X-RV-CSRF': afterLogout.csrfToken },
  body: { email, password: 'smoke-password-123' },
});
if (loggedIn.user?.email !== email) fail('Login after logout failed', loggedIn);

console.log(JSON.stringify({
  ok: true,
  email,
  orderId: order.order.shortId,
  notificationStatus: order.order.notificationStatus,
}, null, 2));
