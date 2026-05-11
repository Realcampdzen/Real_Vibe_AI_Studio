# Security + Code Health Follow-up — 2026-05-11

## Executive Summary

This follow-up starts after the Perf+Media production release on branch `codex/vps-migration`.
The previous production release was `20260511-152309-0edffab-preload`, with `real-vibe-web`
healthy and the Docker image reduced to about 521 MB. The hero/runtime media P1 work is closed.

This batch targets the remaining P2/P3 code review risks: dependency advisories, broad CSP,
inline HTML handlers, DOM XSS sinks in service detail rendering, unauthenticated webhooks,
the standalone `openai-proxy`, stale tracked deploy artifacts, and missing safety checks.

## Closed Or Improved

| Area | Previous Evidence | Change | Verification |
| --- | --- | --- | --- |
| Dependency audit | `npm audit --omit=dev --json` reported 4 prod findings: `body-parser`, `path-to-regexp`, `qs`, `lodash`. | Applied safe `npm audit fix --omit=dev`; lockfile now resolves patched transitive packages. | `npm audit --omit=dev --json` returns 0 vulnerabilities locally. |
| Request body size | Main Express parser accepted `10mb`. | Reduced default app JSON body limit to `256kb`; CSP report endpoint uses `16kb`. | `npm run check`; API smoke covers invalid `/chat`. |
| Webhook abuse | `/api/webhook/:botId` accepted unauthenticated production POSTs. | Production webhook now requires `X-RV-Webhook-Token`; absent env/header returns `403`. | `npm run smoke:api` supports webhook 403/200 checks. |
| Version drift | `/health` and bot status returned `3.0`/`3.0.0`, startup logged `3.1.0`. | Server responses now read the version from `package.json`. | `node --check` and health smoke. |
| CSP / inline JS | HTML entrypoints had inline `onclick`, inline scripts, and broad `script-src 'unsafe-inline'`. | Entry points moved to delegated `data-*` actions and external scripts; enforced `script-src` is now `'self'`; report-only header tracks strict CSP. | Static check fails on inline handlers/scripts/styles in the three public entrypoints. |
| Service detail DOM rendering | `service-detail.html` rendered service fields through `innerHTML`. | New `js/service-detail-page.js` renders with DOM APIs, `textContent`, and safe URL checks. | `npm run check`; detail pages need browser smoke for `id=0..7`. |
| Active chat widget sinks | `GlassUIWidget` used dynamic `innerHTML` for bot name/status. | Replaced dynamic widget rendering with DOM nodes and `replaceChildren`. | Static grep shows no `innerHTML` in active public entrypoints, service detail renderer, or active widget. |
| Legacy/debug code | Tracked stale `deploy-ready` copy, JSX prototype, unused old chat widgets, local debug ingest calls. | Removed unreferenced legacy files from tracked runtime. | `git grep` no runtime references before removal; `npm run check` covers remaining JS. |
| `openai-proxy` boundary | Optional proxy token, unbounded body, no timeout/rate guard, raw error messages. | Production token required; `1mb` body limit, upstream timeout, fixed path allowlist, simple rate limit, sanitized errors. | `node --check` through `npm run check`; README smoke commands added. |

## Remaining Risks

| Severity | Area | Status / Next Action |
| --- | --- | --- |
| P2 | CSP style policy | `style-src 'unsafe-inline'` remains because the site still uses JS/CSS style mutations and some third-party CSS. Next CSP batch should move style attributes into classes where practical, then narrow `style-src-attr`. |
| P2 | CSP telemetry | Report-only header is present, but production reports must be sampled after deploy before further tightening. |
| P2 | Browser regression risk | CSP-compatible HTML and service detail rendering changed click wiring. Needs Chrome desktop smoke across homepage, `service-detail.html?id=0..7`, and `ai-photo-detail.html`. |
| P3 | Source master media | Large public master media remain in source storage but are excluded from Docker runtime by `.dockerignore`. Keep archive policy explicit; do not re-add to runtime. |
| P3 | Adjacent repos | `cf-api` has pre-existing dirty state and was intentionally not changed in this batch. |

## Evidence Commands

```bash
git status --short
npm audit fix --omit=dev
npm audit --omit=dev --json
npm run check
git grep -n -E "onclick=|style=|<script>\\s*$|innerHTML|insertAdjacentHTML" -- index.html service-detail.html ai-photo-detail.html js chat-components server openai-proxy scripts sw.js
npm ls express body-parser path-to-regexp qs lodash --depth=10
```

## Deployment Acceptance

- `npm run check` passes.
- `npm audit --omit=dev --json` has 0 vulnerabilities.
- Local production-mode API smoke passes for `/health`, invalid `/chat`, CORS, and webhook auth.
- Browser smoke has clean console for homepage and detail pages.
- Production smoke confirms `/health` 200, strict script CSP does not block site scripts, webhook is 403 without token, and logs do not include secrets/request bodies.
