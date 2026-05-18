import express from 'express';
import Joi from 'joi';
import config from '../config/env.js';
import { listCatalogServices } from '../services/catalog.js';
import { readPriceBook, writePriceBook } from '../services/price-book.js';

const router = express.Router();

const entrySchema = Joi.object({
  title: Joi.string().max(160).allow('').optional(),
  price: Joi.string().max(80).allow('').required(),
  note: Joi.string().max(500).allow('').optional(),
});

const priceBookSchema = Joi.object({
  version: Joi.number().integer().min(1).default(1),
  updatedAt: Joi.string().allow('').optional(),
  services: Joi.object().pattern(Joi.string().max(80), entrySchema).required(),
  offers: Joi.object().pattern(
    Joi.string().max(80),
    Joi.object().pattern(Joi.string().max(80), entrySchema),
  ).required(),
});

function canWritePrices(req) {
  const configuredToken = config.admin.priceEditorToken;
  if (configuredToken) {
    return req.get('x-rv-admin-token') === configuredToken;
  }

  return config.isDevelopment;
}

function isEditorAvailable() {
  return config.isDevelopment || Boolean(config.admin.priceEditorToken);
}

router.get('/admin/prices', async (req, res, next) => {
  try {
    res.json({
      available: isEditorAvailable(),
      canWrite: canWritePrices(req),
      services: listCatalogServices(),
      priceBook: await readPriceBook(),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/admin/prices', async (req, res, next) => {
  try {
    if (!canWritePrices(req)) {
      return res.status(403).json({
        error: config.admin.priceEditorToken
          ? 'Неверный admin token для изменения цен'
          : 'Редактор цен доступен для записи только локально или при RV_PRICE_EDITOR_TOKEN',
      });
    }

    const { error, value } = priceBookSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ error: 'Проверьте формат прайса', details: error.details.map((item) => item.message) });
    }

    const priceBook = await writePriceBook(value);
    res.json({
      ok: true,
      priceBook,
      services: listCatalogServices(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
