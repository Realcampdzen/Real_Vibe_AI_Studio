import express from 'express';
import { logger } from '../middleware/logging.js';

const router = express.Router();

function limitString(value, maxLength = 180) {
  if (typeof value !== 'string') return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function normalizeCspReport(body) {
  const report = body?.['csp-report'] || body?.body || body || {};

  return {
    documentUri: limitString(report['document-uri'] || report.documentURL),
    blockedUri: limitString(report['blocked-uri'] || report.blockedURL),
    violatedDirective: limitString(report['violated-directive'] || report.effectiveDirective),
    effectiveDirective: limitString(report['effective-directive'] || report.effectiveDirective),
    disposition: limitString(report.disposition),
    statusCode: Number(report['status-code'] || report.statusCode || 0) || undefined,
  };
}

router.post('/', (req, res) => {
  const reports = Array.isArray(req.body) ? req.body : [req.body];
  for (const report of reports.slice(0, 10)) {
    logger.warn('CSP report', normalizeCspReport(report));
  }
  res.status(204).end();
});

export default router;
