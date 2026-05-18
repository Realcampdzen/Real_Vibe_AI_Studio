import fs from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');
const PRICE_BOOK_PATH = path.join(ROOT_DIR, 'data', 'service-prices.json');
const CLIENT_PRICE_PATH = path.join(ROOT_DIR, 'js', 'service-prices.js');

function emptyPriceBook() {
  return {
    version: 1,
    updatedAt: '',
    services: {},
    offers: {},
  };
}

function normalizeEntry(entry = {}) {
  return {
    title: String(entry.title || '').trim().slice(0, 160),
    price: String(entry.price || '').trim().slice(0, 80),
    note: String(entry.note || '').trim().slice(0, 500),
  };
}

export function normalizePriceBook(input = {}) {
  const next = emptyPriceBook();
  next.version = Number(input.version) || 1;
  next.updatedAt = new Date().toISOString();

  for (const [slug, entry] of Object.entries(input.services || {})) {
    const key = String(slug || '').trim();
    if (!key) continue;
    next.services[key] = normalizeEntry(entry);
  }

  for (const [serviceSlug, offers] of Object.entries(input.offers || {})) {
    const serviceKey = String(serviceSlug || '').trim();
    if (!serviceKey) continue;
    next.offers[serviceKey] = {};

    for (const [offerId, entry] of Object.entries(offers || {})) {
      const offerKey = String(offerId || '').trim();
      if (!offerKey) continue;
      next.offers[serviceKey][offerKey] = normalizeEntry(entry);
    }
  }

  return next;
}

export function readPriceBookSync() {
  try {
    if (!fs.existsSync(PRICE_BOOK_PATH)) return emptyPriceBook();
    const parsed = JSON.parse(fs.readFileSync(PRICE_BOOK_PATH, 'utf8'));
    return {
      ...normalizePriceBook(parsed),
      updatedAt: parsed.updatedAt || '',
    };
  } catch {
    return emptyPriceBook();
  }
}

export async function readPriceBook() {
  try {
    const text = await fs.promises.readFile(PRICE_BOOK_PATH, 'utf8');
    const parsed = JSON.parse(text);
    return {
      ...normalizePriceBook(parsed),
      updatedAt: parsed.updatedAt || '',
    };
  } catch {
    return emptyPriceBook();
  }
}

function toClientScript(priceBook) {
  const json = JSON.stringify(priceBook, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

  return `(function exposeServicePriceOverrides() {\n  window.SERVICE_PRICE_OVERRIDES = ${json};\n}());\n`;
}

async function atomicWrite(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, filePath);
}

export async function writePriceBook(input) {
  const priceBook = normalizePriceBook(input);
  await atomicWrite(PRICE_BOOK_PATH, `${JSON.stringify(priceBook, null, 2)}\n`);
  await atomicWrite(CLIENT_PRICE_PATH, toClientScript(priceBook));
  return priceBook;
}

export function getServicePrice(slug, fallback = '') {
  const priceBook = readPriceBookSync();
  const price = priceBook.services?.[slug]?.price;
  return price || fallback;
}

export function getOfferPrice(serviceSlug, offerId, fallback = '') {
  const priceBook = readPriceBookSync();
  const price = priceBook.offers?.[serviceSlug]?.[offerId]?.price;
  return price || fallback;
}
