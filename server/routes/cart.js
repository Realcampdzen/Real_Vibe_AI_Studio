import express from 'express';
import Joi from 'joi';
import { ensureSession, requireAuth, requireCsrf } from '../services/auth.js';
import {
  addCartItem,
  checkoutCart,
  getCart,
  listUserOrders,
  markOrderNotification,
  removeCartItem,
  repeatOrderToCart,
  updateCartItem,
} from '../services/cart-store.js';
import { listCatalogServices } from '../services/catalog.js';
import { notifyOrderCreated } from '../services/order-notifier.js';
import { logger } from '../middleware/logging.js';
import { isDatabaseEnabled } from '../services/db.js';

const router = express.Router();

const addItemSchema = Joi.object({
  serviceId: Joi.alternatives(Joi.string(), Joi.number()).required(),
  quantity: Joi.number().integer().min(1).max(9).optional(),
  notes: Joi.string().max(500).allow('').optional(),
});

const updateItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).max(9).optional(),
  notes: Joi.string().max(500).allow('').optional(),
}).min(1);

const checkoutSchema = Joi.object({
  customerName: Joi.string().max(120).required(),
  contact: Joi.string().max(180).required(),
  message: Joi.string().max(1000).allow('').optional(),
  saveContact: Joi.boolean().truthy('on').truthy('true').falsy('false').optional(),
});

function context(req) {
  return {
    sessionId: req.auth.session.id,
    userId: req.auth.user?.id || null,
  };
}

router.get('/catalog/services', (req, res) => {
  res.json({ services: listCatalogServices() });
});

router.get('/cart', async (req, res, next) => {
  if (!isDatabaseEnabled()) {
    return res.json({
      available: false,
      cart: { items: [], itemCount: 0 },
    });
  }

  try {
    await new Promise((resolve, reject) => {
      ensureSession(req, res, (error) => (error ? reject(error) : resolve()));
    });
    res.json({ available: true, cart: await getCart(context(req)) });
  } catch (error) {
    next(error);
  }
});

router.post('/cart/items', ensureSession, requireCsrf, async (req, res, next) => {
  try {
    const { error, value } = addItemSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Проверьте услугу и количество' });

    const cart = await addCartItem({ ...context(req), ...value });
    res.status(201).json({ cart });
  } catch (error) {
    next(error);
  }
});

router.patch('/cart/items/:itemId', ensureSession, requireCsrf, async (req, res, next) => {
  try {
    const { error, value } = updateItemSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Проверьте параметры позиции' });

    const cart = await updateCartItem({ ...context(req), itemId: req.params.itemId, ...value });
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

router.delete('/cart/items/:itemId', ensureSession, requireCsrf, async (req, res, next) => {
  try {
    const cart = await removeCartItem({ ...context(req), itemId: req.params.itemId });
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

router.post('/orders', ensureSession, requireCsrf, requireAuth, async (req, res, next) => {
  try {
    const { error, value } = checkoutSchema.validate(req.body);
    if (error) return res.status(400).json({ error: 'Укажите имя и контакт для связи' });

    const order = await checkoutCart({ ...context(req), ...value });
    try {
      const notification = await notifyOrderCreated(order);
      order.notificationStatus = notification.status;
      await markOrderNotification(order.id, notification.status, notification.error || '');
    } catch (notifyError) {
      order.notificationStatus = 'failed';
      await markOrderNotification(order.id, 'failed', notifyError.detail || notifyError.message);
      logger.warn('Order notification failed', {
        requestId: req.requestId,
        orderId: order.id,
        error: notifyError.message,
      });
    }

    res.status(201).json({ order, cart: await getCart(context(req)) });
  } catch (error) {
    next(error);
  }
});

router.get('/orders/my', ensureSession, requireAuth, async (req, res, next) => {
  try {
    res.json({ orders: await listUserOrders(req.auth.user.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:orderId/repeat', ensureSession, requireCsrf, requireAuth, async (req, res, next) => {
  try {
    const result = await repeatOrderToCart({
      ...context(req),
      orderId: req.params.orderId,
    });
    res.json(result);
  } catch (error) {
    if (error.code === 'repeat_order_empty') {
      return res.status(409).json({
        error: error.message,
        skippedServices: error.skippedServices || [],
      });
    }
    next(error);
  }
});

export default router;
