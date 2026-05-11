/**
 * Настройка Helmet для безопасности заголовков.
 */
import helmet from 'helmet';
import config from '../config/env.js';

export function createHelmetMiddleware() {
  return helmet({
    contentSecurityPolicy: config.isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'", "'unsafe-inline'",
          "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com",
          "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com", "https:",
        ],
        scriptSrc: [
          "'self'", "'unsafe-inline'",
          "https://code.jquery.com", "https://cdn.jsdelivr.net",
          "https://stackpath.bootstrapcdn.com", "https://unpkg.com",
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.openai.com", "https:"],
        fontSrc: [
          "'self'",
          "https://cdn.jsdelivr.net", "https://stackpath.bootstrapcdn.com",
          "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com",
          "https:", "data:",
        ],
        styleSrcAttr: ["'unsafe-inline'"],
        styleSrcElem: ["'self'", "'unsafe-inline'", "https:"],
        upgradeInsecureRequests: null,
      },
    },
    crossOriginEmbedderPolicy: false,
  });
}
