import express from 'express';
import { createHash } from 'crypto';
import { logger } from '../middleware/logging.js';

const router = express.Router();

function limitString(value, maxLength = 140) {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[\r\n\t]+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function hashString(value) {
  if (!value) return undefined;
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

function sanitizeReportUri(value) {
  if (typeof value !== 'string' || !value) return undefined;

  const special = value.trim().toLowerCase();
  if (['inline', 'eval', 'self', 'about', 'data', 'blob'].includes(special)) {
    return { type: special };
  }

  try {
    const parsed = new URL(value);
    return {
      origin: limitString(parsed.origin),
      path: limitString(parsed.pathname, 180),
    };
  } catch {
    return { type: limitString(value, 80) };
  }
}

function normalizeCspReport(body, req) {
  const report = body?.['csp-report'] || body?.body || body || {};
  const userAgent = req.get('user-agent') || '';

  return {
    documentUri: sanitizeReportUri(report['document-uri'] || report.documentURL),
    blockedUri: sanitizeReportUri(report['blocked-uri'] || report.blockedURL),
    violatedDirective: limitString(report['violated-directive']),
    effectiveDirective: limitString(report['effective-directive'] || report.effectiveDirective),
    disposition: limitString(report.disposition),
    statusCode: Number(report['status-code'] || report.statusCode || 0) || undefined,
    sourceFile: sanitizeReportUri(report['source-file']),
    lineNumber: Number(report['line-number'] || report.lineNumber || 0) || undefined,
    columnNumber: Number(report['column-number'] || report.columnNumber || 0) || undefined,
    userAgentHash: hashString(userAgent),
    userAgentPrefix: limitString(userAgent, 80),
  };
}

router.post('/', (req, res) => {
  const reports = Array.isArray(req.body) ? req.body : [req.body];
  for (const report of reports.slice(0, 10)) {
    logger.warn('CSP report', normalizeCspReport(report, req));
  }
  res.status(204).end();
});

export default router;
