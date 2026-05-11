# Observability + UX Follow-up — 2026-05-12

## Executive Summary

Starting point: branch `codex/vps-migration`, production release `35603e7`, container `real-vibe-web` healthy.

This follow-up records the next hardening batch: sanitized request correlation for API/chat logs, stricter enforced style CSP, detail-page CTA polish, and a lighter runtime for detail pages.

## Production Baseline

- Current production symlink before this batch: `/srv/real-vibe-studio/releases/20260511-213154-35603e7-smokefix`.
- Container health before this batch: `real-vibe-web` healthy.
- Image size before this batch: `current-real-vibe-web:latest` around `1.2GB`, under the `1.5GB` budget.
- `/health` before this batch returned `200` with app version `3.1.0`.

## 24h Log/CSP Sample

Read-only sample command:

```bash
ssh root@89.223.126.190 "docker logs --since=24h --tail=500 real-vibe-web"
```

Observed in the sample:

- Normal static/page requests for `/`, `service-detail.html`, and `ai-photo-detail.html`.
- Expected smoke/security events: localhost CORS rejection, invalid `/chat`, webhook forbidden, old master video `404`.
- Scanner noise: `/.git/config`, `wlwmanifest.xml`, and WordPress probe paths.
- No raw user messages, AI replies, request bodies, cookies, owner tokens, or webhook tokens were present in the sampled output.
- No first-party CSP violation pattern was visible in the sampled tail.

## Implemented In This Batch

- Request ids are attached to inbound requests and returned as `X-Request-Id`.
- Chat/API warning/error logs now use sanitized metadata: status, bot id, request id, outcome, reason, duration, and error name only.
- Chat accepted/generated logs are development-only to reduce production noise.
- Enforced and report-only CSP no longer allow `style-src 'unsafe-inline'` or `style-src-elem 'unsafe-inline'`.
- Active frontend files no longer inject runtime `<style>` elements or static `cssText`.
- Detail CTA blocks now expose explicit Telegram, phone, and email anchors.
- Detail pages load `js/page-common.js` instead of the heavier homepage `js/script.js`.
- Browser smoke now verifies detail CTA hrefs and open/close behavior for all Glass chat widgets.
- Safe production dependency updates were applied within current semver ranges: `cors`, `dotenv`, `express`, `express-rate-limit`, `openai`, and `winston`.

## Verification

Local production-mode server:

```bash
NODE_ENV=production PORT=4313 BIND_HOST=127.0.0.1 \
ALLOWED_ORIGINS=https://vps.real-vibe.studio,https://real-vibe.studio,https://www.real-vibe.studio \
RV_WEBHOOK_TOKEN=local-webhook-token PROXY_AUTH_TOKEN=local-proxy-token \
CHAT_QUOTA_STORE_PATH=data/local-observeux-chat-quotas.json node server/index.js
```

Checks passed:

- `npm run quality:release`
- `API_SMOKE_BASE_URL=http://127.0.0.1:4313 API_SMOKE_EXPECT_PROD_CORS=true API_SMOKE_WEBHOOK_TOKEN=local-webhook-token npm run smoke:api`
- `BROWSER_SMOKE_BASE_URL=http://127.0.0.1:4313 BROWSER_SMOKE_CHANNEL=chromium npm run smoke:browser`
- `PERF_PROBE_BASE_URL=http://127.0.0.1:4313 BROWSER_SMOKE_CHANNEL=chromium npm run perf:desktop`
- `git diff --check`

Local perf result:

- `1440x900`: `0` long tasks, p95 frame gap `16.9ms`, hero WebM playing.
- `1920x1080`: `0` long tasks, p95 frame gap `16.9ms`, hero WebM playing.

## Remaining Backlog

- Remove the hidden legacy chat overlay only after one production cycle confirms all Glass widget entrypoints stay clean.
- Continue splitting homepage-only behavior out of `js/script.js` if detail/runtime footprint needs another reduction.
- Keep monitoring CSP reports for extension/scanner noise after strict style CSP is live.
- Dependency upgrades remain patch/minor only unless a separate major-upgrade plan is approved.
