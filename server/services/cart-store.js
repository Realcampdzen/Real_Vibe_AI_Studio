import { randomUUID } from 'crypto';
import { query, withTransaction } from './db.js';
import { getCatalogService } from './catalog.js';

function publicError(status, message, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function limitText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLength);
}

function shortOrderId(id) {
  return String(id || '').split('-')[0]?.toUpperCase() || 'ORDER';
}

async function run(client, text, params = []) {
  return client ? client.query(text, params) : query(text, params);
}

async function findActiveCart({ sessionId, userId }, client) {
  if (userId) {
    const byUser = await run(client, 'SELECT * FROM rv_carts WHERE user_id = $1 AND status = $2 LIMIT 1', [userId, 'active']);
    if (byUser.rows[0]) return byUser.rows[0];
  }

  const bySession = await run(
    client,
    `SELECT * FROM rv_carts
     WHERE session_id = $1 AND user_id IS NULL AND status = $2
     LIMIT 1`,
    [sessionId, 'active'],
  );
  return bySession.rows[0] || null;
}

async function createActiveCart({ sessionId, userId }, client) {
  const result = await run(
    client,
    `INSERT INTO rv_carts (id, user_id, session_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [randomUUID(), userId || null, sessionId],
  );
  return result.rows[0];
}

async function getOrCreateActiveCart({ sessionId, userId }, client) {
  const existing = await findActiveCart({ sessionId, userId }, client);
  if (existing) return existing;
  return createActiveCart({ sessionId, userId }, client);
}

async function getCartItems(cartId, client) {
  const result = await run(
    client,
    `SELECT id, service_id, quantity, notes, created_at, updated_at
     FROM rv_cart_items
     WHERE cart_id = $1
     ORDER BY created_at ASC`,
    [cartId],
  );
  return result.rows;
}

function mapCart(cart, rows) {
  const items = rows
    .map((item) => {
      const service = getCatalogService(item.service_id);
      if (!service) return null;
      return {
        id: item.id,
        serviceId: service.id,
        slug: service.slug,
        title: service.title,
        priceLabel: service.priceLabel,
        url: service.url,
        quantity: item.quantity,
        notes: item.notes || '',
      };
    })
    .filter(Boolean);

  return {
    id: cart.id,
    status: cart.status,
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function getCart({ sessionId, userId }) {
  const cart = await getOrCreateActiveCart({ sessionId, userId });
  return mapCart(cart, await getCartItems(cart.id));
}

export async function addCartItem({ sessionId, userId, serviceId, quantity = 1, notes = '' }) {
  const service = getCatalogService(serviceId);
  if (!service) throw publicError(404, 'Услуга не найдена', 'service_not_found');

  const safeQuantity = Math.min(9, Math.max(1, Number(quantity) || 1));
  const safeNotes = limitText(notes, 500);

  return withTransaction(async (client) => {
    const cart = await getOrCreateActiveCart({ sessionId, userId }, client);
    await run(
      client,
      `INSERT INTO rv_cart_items (id, cart_id, service_id, quantity, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (cart_id, service_id) DO UPDATE
       SET quantity = LEAST(rv_cart_items.quantity + excluded.quantity, 9),
           notes = CASE
             WHEN excluded.notes = '' THEN rv_cart_items.notes
             ELSE excluded.notes
           END,
           updated_at = now()`,
      [randomUUID(), cart.id, service.id, safeQuantity, safeNotes],
    );
    await run(client, 'UPDATE rv_carts SET updated_at = now() WHERE id = $1', [cart.id]);
    return mapCart(cart, await getCartItems(cart.id, client));
  });
}

export async function updateCartItem({ sessionId, userId, itemId, quantity, notes }) {
  return withTransaction(async (client) => {
    const cart = await getOrCreateActiveCart({ sessionId, userId }, client);
    const item = await run(client, 'SELECT id FROM rv_cart_items WHERE id = $1 AND cart_id = $2', [itemId, cart.id]);
    if (!item.rows[0]) throw publicError(404, 'Позиция корзины не найдена', 'cart_item_not_found');

    const nextQuantity = Number(quantity);
    if (Number.isFinite(nextQuantity) && nextQuantity <= 0) {
      await run(client, 'DELETE FROM rv_cart_items WHERE id = $1 AND cart_id = $2', [itemId, cart.id]);
    } else {
      await run(
        client,
        `UPDATE rv_cart_items
         SET quantity = COALESCE($3, quantity),
             notes = COALESCE($4, notes),
             updated_at = now()
         WHERE id = $1 AND cart_id = $2`,
        [
          itemId,
          cart.id,
          Number.isFinite(nextQuantity) ? Math.min(9, Math.max(1, nextQuantity)) : null,
          notes === undefined ? null : limitText(notes, 500),
        ],
      );
    }
    await run(client, 'UPDATE rv_carts SET updated_at = now() WHERE id = $1', [cart.id]);
    return mapCart(cart, await getCartItems(cart.id, client));
  });
}

export async function removeCartItem({ sessionId, userId, itemId }) {
  return withTransaction(async (client) => {
    const cart = await getOrCreateActiveCart({ sessionId, userId }, client);
    await run(client, 'DELETE FROM rv_cart_items WHERE id = $1 AND cart_id = $2', [itemId, cart.id]);
    await run(client, 'UPDATE rv_carts SET updated_at = now() WHERE id = $1', [cart.id]);
    return mapCart(cart, await getCartItems(cart.id, client));
  });
}

export async function mergeSessionCartToUser(sessionId, userId) {
  if (!sessionId || !userId) return;

  await withTransaction(async (client) => {
    const guest = await run(
      client,
      `SELECT * FROM rv_carts
       WHERE session_id = $1 AND user_id IS NULL AND status = $2
       LIMIT 1`,
      [sessionId, 'active'],
    );
    const guestCart = guest.rows[0];
    const userCart = await getOrCreateActiveCart({ sessionId, userId }, client);

    await run(client, 'UPDATE rv_carts SET session_id = $1, updated_at = now() WHERE id = $2', [sessionId, userCart.id]);

    if (!guestCart || guestCart.id === userCart.id) return;

    const guestItems = await getCartItems(guestCart.id, client);
    for (const item of guestItems) {
      await run(
        client,
        `INSERT INTO rv_cart_items (id, cart_id, service_id, quantity, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cart_id, service_id) DO UPDATE
         SET quantity = LEAST(rv_cart_items.quantity + excluded.quantity, 9),
             notes = CASE
               WHEN rv_cart_items.notes = '' THEN excluded.notes
               ELSE rv_cart_items.notes
             END,
             updated_at = now()`,
        [randomUUID(), userCart.id, item.service_id, item.quantity, item.notes || ''],
      );
    }

    await run(
      client,
      `UPDATE rv_carts
       SET status = $1, checked_out_at = now(), updated_at = now()
       WHERE id = $2`,
      ['merged', guestCart.id],
    );
  });
}

export async function checkoutCart({ sessionId, userId, customerName, contact, message, saveContact = false }) {
  const safeName = limitText(customerName, 120);
  const safeContact = limitText(contact, 180);
  const safeMessage = limitText(message, 1000);

  if (!safeName) throw publicError(400, 'Укажите имя', 'customer_name_required');
  if (!safeContact) throw publicError(400, 'Укажите контакт для связи', 'contact_required');

  return withTransaction(async (client) => {
    const cart = await getOrCreateActiveCart({ sessionId, userId }, client);
    const rows = await getCartItems(cart.id, client);
    const items = rows
      .map((item) => ({ ...item, service: getCatalogService(item.service_id) }))
      .filter((item) => item.service);

    if (items.length === 0) throw publicError(400, 'Корзина пуста', 'cart_empty');

    const orderId = randomUUID();
    await run(
      client,
      `INSERT INTO rv_orders (id, user_id, session_id, customer_name, contact, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [orderId, userId, sessionId, safeName, safeContact, safeMessage],
    );

    if (saveContact) {
      await run(
        client,
        `UPDATE rv_users
         SET default_contact = $2,
             updated_at = now()
         WHERE id = $1`,
        [userId, safeContact],
      );
    }

    for (const item of items) {
      await run(
        client,
        `INSERT INTO rv_order_items (id, order_id, service_id, service_slug, service_title, price_label, quantity, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          randomUUID(),
          orderId,
          item.service.id,
          item.service.slug,
          item.service.title,
          item.service.priceLabel,
          item.quantity,
          item.notes || '',
        ],
      );
    }

    await run(
      client,
      `UPDATE rv_carts
       SET status = $1, checked_out_at = now(), updated_at = now()
       WHERE id = $2`,
      ['checked_out', cart.id],
    );

    return {
      id: orderId,
      shortId: shortOrderId(orderId),
      customerName: safeName,
      contact: safeContact,
      message: safeMessage,
      notificationStatus: 'pending',
      items: items.map((item) => ({
        serviceId: item.service.id,
        serviceSlug: item.service.slug,
        serviceTitle: item.service.title,
        priceLabel: item.service.priceLabel,
        quantity: item.quantity,
        notes: item.notes || '',
      })),
    };
  });
}

export async function repeatOrderToCart({ sessionId, userId, orderId }) {
  return withTransaction(async (client) => {
    const order = await run(
      client,
      'SELECT id FROM rv_orders WHERE id = $1 AND user_id = $2 LIMIT 1',
      [orderId, userId],
    );
    if (!order.rows[0]) throw publicError(404, 'Заявка не найдена', 'order_not_found');

    const previousItems = await run(
      client,
      `SELECT service_id, service_title, quantity, notes
       FROM rv_order_items
       WHERE order_id = $1
       ORDER BY created_at ASC`,
      [orderId],
    );
    const cart = await getOrCreateActiveCart({ sessionId, userId }, client);
    const skippedServices = [];
    let addedCount = 0;

    for (const item of previousItems.rows) {
      const service = getCatalogService(item.service_id);
      if (!service) {
        skippedServices.push({
          serviceId: item.service_id,
          serviceTitle: item.service_title,
        });
        continue;
      }

      await run(
        client,
        `INSERT INTO rv_cart_items (id, cart_id, service_id, quantity, notes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (cart_id, service_id) DO UPDATE
         SET quantity = LEAST(rv_cart_items.quantity + excluded.quantity, 9),
             notes = CASE
               WHEN excluded.notes = '' THEN rv_cart_items.notes
               ELSE excluded.notes
             END,
             updated_at = now()`,
        [
          randomUUID(),
          cart.id,
          service.id,
          Math.min(9, Math.max(1, Number(item.quantity) || 1)),
          item.notes || '',
        ],
      );
      addedCount += 1;
    }

    if (addedCount === 0) {
      const error = publicError(409, 'В этой заявке нет услуг из текущего каталога', 'repeat_order_empty');
      error.skippedServices = skippedServices;
      throw error;
    }

    await run(client, 'UPDATE rv_carts SET updated_at = now() WHERE id = $1', [cart.id]);
    return {
      cart: mapCart(cart, await getCartItems(cart.id, client)),
      addedCount,
      skippedServices,
    };
  });
}

export async function markOrderNotification(orderId, status, errorDetail = '') {
  await query(
    `UPDATE rv_orders
     SET notification_status = $2,
         notification_error = $3,
         updated_at = now()
     WHERE id = $1`,
    [orderId, status, limitText(errorDetail, 500) || null],
  );
}

export async function listUserOrders(userId) {
  const orders = await query(
    `SELECT id, customer_name, contact, message, status, notification_status, created_at
     FROM rv_orders
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId],
  );
  if (orders.rows.length === 0) return [];

  const ids = orders.rows.map((order) => order.id);
  const items = await query(
    `SELECT order_id, service_id, service_slug, service_title, price_label, quantity, notes
     FROM rv_order_items
     WHERE order_id = ANY($1::uuid[])
     ORDER BY created_at ASC`,
    [ids],
  );
  const byOrder = new Map();
  for (const item of items.rows) {
    byOrder.set(item.order_id, [...(byOrder.get(item.order_id) || []), {
      serviceId: item.service_id,
      serviceSlug: item.service_slug,
      serviceTitle: item.service_title,
      priceLabel: item.price_label,
      quantity: item.quantity,
      notes: item.notes || '',
    }]);
  }

  return orders.rows.map((order) => ({
    id: order.id,
    shortId: shortOrderId(order.id),
    customerName: order.customer_name,
    contact: order.contact,
    message: order.message || '',
    status: order.status,
    notificationStatus: order.notification_status,
    createdAt: order.created_at,
    items: byOrder.get(order.id) || [],
  }));
}
