# Development Follow-up — 2026-05-11

## Executive Summary

This batch continues after release `0037c5e` and closes the next code-health items: static chat widget styles moved out of runtime `cssText`, enforced CSP now blocks style attributes, GitHub Pages deploy workflow was replaced by a CI quality gate, and browser smoke covers chat UI interaction without calling AI.

Public API shapes for `/chat`, `/api/chat/:botId`, `/api/webhook/:botId`, and `/health` were not changed.

## Closed Or Improved

| Area | Change | Evidence |
| --- | --- | --- |
| Style CSP | `style-src-attr 'none'` is enforced. Static Glass UI widget styling now lives in `css/style.css`; active widget JS keeps only computed runtime CSSOM values such as viewport placement and click coordinates. | `npm run check`, local browser smoke with clean console and zero CSP report-only warnings. |
| Static security checks | `check:security` now fails if active Glass UI files reintroduce `cssText`, runtime `<style>` injection, style attributes, or relaxed enforced style-attr CSP. | `npm run check:security`. |
| CI | Removed the GitHub Pages staging deploy workflow and added `Site Quality Gate` CI for push/PR: `npm ci`, Playwright install, `quality:release`, local API smoke, browser smoke. | `.github/workflows/ci.yml`. |
| Chat UX | Glass chat widgets now have busy/disabled send state, empty-input feedback, safer fallback error text, keyboard-open support, and smoke-tested rate-limit UI. | `npm run smoke:browser`. |
| Runtime split | Detail pages no longer load `services-carousel.js`; `script.js` skips homepage-only preload, testimonials, tilt, project video, hero, and process animation initializers on detail pages. | Browser smoke fresh detail check: no eager chat runtime and no offscreen media decode. |
| Service worker | Cache version and runtime asset URLs bumped for the style-CSP release. | `sw.js` version `v1.20-20260511-stylecsp`. |

## Verification

Local production-mode server: `http://127.0.0.1:4314`.

```bash
npm run quality:release
API_SMOKE_BASE_URL=http://127.0.0.1:4314 API_SMOKE_EXPECT_PROD_CORS=true API_SMOKE_WEBHOOK_TOKEN=local-stylecsp-webhook npm run smoke:api
BROWSER_SMOKE_BASE_URL=http://127.0.0.1:4314 npm run smoke:browser
PERF_PROBE_BASE_URL=http://127.0.0.1:4314 npm run perf:desktop
git diff --check
```

Browser smoke used the default 60 second hero wait and also checked CTA/contact links plus a mocked chat rate-limit response.

Observed local perf:

| Viewport | Long tasks | p95 frame gap | p99 frame gap |
| --- | ---: | ---: | ---: |
| 1440x900 | 0 | 17.0 ms | 17.1 ms |
| 1920x1080 | 0 | 16.8 ms | 16.9 ms |

`npm audit --omit=dev --json` reports 0 production vulnerabilities.

## Remaining Backlog

- Run production smoke and log/CSP sampling after VPS deploy.
- Consider moving remaining runtime-calculated `.style.*` values to CSS custom properties if future CSP/browser behavior requires it.
- Add a later observability batch for real-user chat/API errors and CSP report aggregation.
- Keep dependency upgrades and deeper frontend modularization as separate, smaller releases.
