/**
 * Настройка Helmet для безопасности заголовков.
 */
import helmet from 'helmet';
import config from '../config/env.js';

const cspReportOnlyDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'script-src-attr': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'self'"],
  'connect-src': [
    "'self'",
    'https://api.openai.com',
    'https://vps.real-vibe.studio',
    'https://real-vibe.studio',
    'https://www.real-vibe.studio',
  ],
  'img-src': ["'self'", 'data:', 'https:', 'blob:'],
  'media-src': ["'self'", 'blob:'],
  'style-src': [
    "'self'",
    "'unsafe-inline'",
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com',
  ],
  'style-src-attr': ["'none'"],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'https://cdnjs.cloudflare.com',
    'data:',
  ],
  'report-uri': ['/api/csp-report'],
};

function serializeCspDirective(name, values) {
  return `${name} ${values.join(' ')}`;
}

function buildCspHeader(directives) {
  return Object.entries(directives)
    .map(([name, values]) => serializeCspDirective(name, values))
    .join('; ');
}

export function createHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: config.isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", "'unsafe-inline'",
          "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com",
        ],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        mediaSrc: ["'self'", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
        connectSrc: ["'self'", "https://api.openai.com"],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:",
        ],
        styleSrcAttr: ["'none'"],
        styleSrcElem: [
          "'self'", "'unsafe-inline'",
          "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com",
        ],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}

export function createCspReportOnlyMiddleware() {
  const headerValue = buildCspHeader(cspReportOnlyDirectives);

  return function cspReportOnly(req, res, next) {
    if (!config.isDevelopment && config.security.cspReportOnly) {
      res.setHeader('Content-Security-Policy-Report-Only', headerValue);
    }
    next();
  };
}
