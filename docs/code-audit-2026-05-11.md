# Code Audit Report - Real Vibe Studio

Date: 2026-05-11  
Scope: production site, frontend, Express API, chat widgets, PWA/service worker, media/assets, Docker/VPS/nginx boundary, adjacent integration modules.  
Mode: read-only audit. No code fixes, commits, deploys, migrations, or production mutations were performed.

## Executive Summary

The previous video optimization work is present in production: the homepage now requests `hero-reel-desktop.webm`, not the old 281 MB autoplay source, and VPS serves WebM/MP4 with correct MIME type and byte ranges. The service worker also has a media bypass.

The highest-risk issues are now outside the raw hero file size:

1. Chat API abuse/cost risk: production still allows localhost origins, and bot rate-limit skip logic trusts the client-provided `Origin` header. Combined with cookie-only quota identity, this can be abused by non-browser clients.
2. Owner-token handling can leak the quota-bypass token through URLs, localStorage, and request logs.
3. The hero video can still stop while visible. A local Chrome/CDP run reproduced `paused=true` with the optimized WebM loaded, no media error, and the video still in viewport.
4. The Docker/public media footprint is very large: `public/` is about 1.8 GB locally and the production image is about 4.08 GB. Old huge MP4 assets remain publicly served.
5. Desktop smoothness still has measurable main-thread/CSS cost: local scroll probe showed 7 long tasks, max long task 120 ms, p95 frame gap 33.4 ms, p99 83.3 ms.

## Baseline

- Local branch: `codex/vps-migration`
- Local HEAD during audit: `fb3b380 fix: serve webm assets with correct mime type`
- Production release observed on VPS: `/srv/real-vibe-studio/releases/20260511-040244-fb3b380-webm-mime`
- Production container: `real-vibe-web`, running and healthy
- Production image size observed: about `4.08GB`
- Production health: `https://vps.real-vibe.studio/health` returned `200`
- Local working tree was not clean before the audit: nested `cf-api` has modified/untracked files; root has untracked artifacts such as `deploy-ready.zip`, `output/`, and `agent log.md`.

## Severity Rubric

- `P0`: production outage, active security incident, confirmed data leak.
- `P1`: user-visible breakage, severe performance regression, API/chat failure, realistic abuse/cost path.
- `P2`: intermittent bugs, maintainability or security hardening risk, accessibility/responsive issues.
- `P3`: cleanup, style, duplication, documentation drift.

## Findings

| Severity | Area | Evidence | Impact | Recommended Fix |
| --- | --- | --- | --- | --- |
| P1 | Chat API rate-limit bypass / cost abuse | `server/config/env.js:16-26` includes localhost/staging defaults; `server/config/env.js:44-45` merges defaults into production env; `server/middleware/rate-limit.js:13-30` skips bot limits for localhost `Origin`; `/chat` is protected only by bot limit stack in `server/index.js:58-60`; quota identity is a cookie in `server/services/chat-quota.js:136-151`. Production accepted `Origin: http://localhost:3000` with `Access-Control-Allow-Origin: http://localhost:3000`. | A non-browser client can forge localhost origin. On `/chat`, that can bypass per-IP cooldown/minute/hour/day bot rate limits. If it drops cookies, cookie-based daily quota can also be reset, creating OpenAI cost risk. | In production, allow only explicit production origins. Never skip rate limits based on `Origin`; only trust loopback IP after proxy validation. Put the global API limiter on `/chat` too. Key quota on a stronger server-side identity, at minimum IP + cookie + bot, and consider challenge/risk controls for public chat. |
| P1 | Owner token leakage | `js/chat.js:5-21` reads `rv_owner_token` from URL, stores it in `localStorage`, and sends `X-RV-Owner-Token`; `server/services/chat-quota.js:132-133` uses that token for owner bypass; `server/middleware/logging.js:30-37` enables `express-winston` with `meta: true`. Production log sampling confirmed full request metadata/headers are logged. | A quota-bypass token can leak via query strings, browser storage, XSS, reverse proxy/app logs, and request headers in logs. This converts many smaller XSS/logging issues into a direct cost-control bypass. | Rotate the current owner token. Remove URL-token ingestion. Use a short-lived HttpOnly Secure SameSite cookie or an admin-only server session. Redact `authorization`, `cookie`, `x-rv-owner-token`, and query strings from request logs. |
| P1 | Hero video can pause while visible | Local Chrome 147/CDP at 1440x900 loaded `public/works/hero-reel-desktop.webm`, `readyState=4`, `error=null`, `visibilityState=visible`, final internal state `visible=true`, `userPaused=false`, but video was `paused=true` at `currentTime=1.53` after 15s. Event sequence included `playing -> suspend -> pause`. Code path: `js/video-optimizer.js:292-327` pauses immediately when IntersectionObserver reports not visible and relies on later visible callback to resume. | This matches the reported intermittent hero freeze even after source optimization. A transient IntersectionObserver false can pause playback and not reliably resume. | Debounce offscreen pauses, especially for the primary hero. Track internal pause separately from user pause. Add a guarded hero health resume on `visibilitychange`, `pageshow`, and viewport re-entry. Re-test with real headed Chrome/Edge/Yandex. |
| P1 | Oversized production assets/image | Local `public/` is about `1,798.51 MB`; `public/works/` is about `1,776.82 MB`. Largest files include `With pain.mp4` 529 MB, `шоурил.mp4` 282 MB, `___202511240019_nx8yb_1.mp4` 282 MB, `опенинг новый.mp4` 281 MB. Production still serves the old MP4 at `Content-Length: 295066464`. `Dockerfile:12-19` copies `public` wholesale. Production Docker image observed at about `4.08GB`. | Slow deploys, large rollback surface, large Docker layers, expensive backups/transfers, and accidental public access to heavy originals. | Move originals/portfolio masters to object storage or an archive outside the runtime image. Keep only optimized web renditions in `public`. Add a media manifest and asset budget. |
| P2 | Desktop scroll smoothness and paint cost | Chrome/CDP homepage scroll probe: 7 long tasks, max long task 120 ms, p95 frame gap 33.4 ms, p99 83.3 ms, max frame gap 1147 ms. CSS has many blur/filter/backdrop-filter/will-change hotspots, e.g. `css/style.css:581-588`, `1090-1098`, `3276-3285`, `6032-6090`. | Desktop scroll can stutter even with optimized hero video because fixed widgets, glow/blur effects, and permanent `will-change` keep compositor/paint pressure high. | Reduce permanent blur/filter on fixed and animated widgets, remove broad permanent `will-change`, keep `content-visibility` but verify section intrinsic sizes, and gate chat/widget animations behind idle/interaction. |
| P2 | Detail pages load heavy shared widgets/scripts immediately | `service-detail.html:299-312` and `ai-photo-detail.html:331-344` load service data, video optimizer, script.js, chat.js, carousel, GlassUIWidget, and three bot scripts synchronously. Browser run showed repeated console warnings from generic homepage code: `Hero element not found`, `No process steps found`. | Detail pages pay homepage/chat cost before interaction and run code for absent DOM. This hurts first interaction and adds noisy diagnostics. | Reuse `performance-loader.js` on detail pages, defer chat widgets until idle/interaction, and split `script.js` into page-specific modules or guarded initializers. |
| P2 | Service card navigation is disabled while detail pages exist | `index.html:787-801`, `service-detail.html:644-657`, and `ai-photo-detail.html:446-459` return before navigation with comment "TEMP". Browser smoke showed service detail pages themselves render for ids `0..7`. | Users can see service cards but cannot navigate to available detail pages from the cards. This is a visible UX regression if the detail pages are intended to be live. | Decide whether detail pages are public. If yes, remove the early return and keep only interactive-child guards. If no, hide/disable the affordance explicitly. |
| P2 | Dynamic HTML rendering is unsafe if content source changes | `service-detail.html:369-413` builds video/image markup using service fields and assigns `heroReel.innerHTML`; `service-detail.html:436-453` injects titles, images, lead, and list items through `innerHTML`. Legacy widgets also inject message content in `js/bro-cat.js:280-289` and `js/hipych.js:296-308`. Current main Glass widget renders message text safely with `textContent` in `chat-components/GlassUIWidget.js:700-704`. | Today service data appears local/trusted, and legacy chat code looks unused, but this becomes XSS-prone if data moves to CMS/API or legacy scripts are revived. | Render dynamic content with DOM APIs/textContent or sanitize via a single helper. Delete or quarantine legacy unsafe chat widgets. |
| P2 | Logging exposes too much user data | Server logs user message snippets and replies in `server/routes/chat.js:45-78`, SSE message snippets in `server/routes/chat.js:113-114`, and tool lead details in `server/agents/tools.js:158-166`. Client code logs user messages, request bodies, responses, and error stacks in `js/glass-ui-valyusha.js:286-347`; repo-wide search found 160 console calls in `server`, `chat-components`, `js`, and `sw.js`. | PII, contacts, prompts, and operational tokens can land in browser console, Docker logs, and files. This increases privacy and incident-response risk. | Introduce structured logging with redaction and environment-based debug flags. Do not log user messages/replies by default. Redact headers and query strings. |
| P2 | CSP is broad and still relies on inline script/style | `server/middleware/security.js:9-36` allows `script-src 'unsafe-inline'`, broad `style-src`, `styleSrcElem https:`, and `connect-src https:`. | Any XSS or injected inline script has a large blast radius. Broad connect/style sources weaken browser-side containment. | Stage CSP hardening: remove inline handlers/scripts, use nonces/hashes, narrow connect/style/script domains, add report-only first, then enforce. |
| P2 | Dependency vulnerabilities | `npm audit --omit=dev --json` found 4 prod vulnerabilities: 2 high, 2 moderate. Packages include transitive `lodash`, `path-to-regexp`, `body-parser`, and `qs`. | Mostly DoS/code-injection advisory surface in transitive dependencies. Risk depends on reachable code paths, but this should not stay open on a public API. | Update dependency tree and lockfile, then re-run audit and smoke tests. If blocked by upstream Express 5 stack, document accepted residual risk or pin patched transitive versions if safe. |
| P2 | Service worker API caching can serve stale state | `sw.js:205-243` caches successful GET requests whose path includes `/api/`; `sw.js:246-258` also dynamically caches any successful same-origin response. Media bypass at `sw.js:132-135` is good. | Status endpoints and future API GETs can become stale/offline responses without explicit cache policy. This is subtle with PWA-controlled clients. | Do not cache `/api/` by default. Cache only explicitly versioned static assets. Add SW tests for media/API/cache behavior. |
| P2 | Adjacent OpenAI proxy is risky if exposed | `openai-proxy/server.js:37-48` makes proxy token optional and falls back to `OPENAI_API_KEY`; `openai-proxy/server.js:12-18` reads unbounded body; no timeout/rate limit. | If deployed publicly without `PROXY_AUTH_TOKEN`, it can become an OpenAI spend proxy. Even with a token, no body/timeout/rate limit makes abuse easier. | Treat this module as separate security track before production use: mandatory auth, body limit, timeout, rate limit, logging redaction, and network binding rules. |
| P2 | WebM asset is not stored via Git LFS | `.gitattributes:1` only covers `*.mp4`. `git check-attr` showed `public/works/hero-reel-desktop.webm` has unspecified LFS attributes, while optimized MP4 files use LFS. | The 33.8 MB WebM is likely a normal Git blob, increasing clone/fetch size and repo history bloat. | Add `*.webm filter=lfs diff=lfs merge=lfs -text` and migrate the current WebM to LFS intentionally. |
| P3 | JSX file is not buildable as plain JS | `node --check` failed on `chat-components/ModernChatWidget.js:133` because the file contains JSX. It is not referenced by current HTML. | Dead/experimental code can break broad syntax checks and confuse future maintainers. | Delete it, move it to an archive, or add a real React build pipeline if it is intended to be used. |
| P3 | Test/lint safety net is missing | `package.json:6-10` has `test` set to `echo "Error: no test specified" && exit 1`. No lint/check script exists. | Regressions in browser JS, API behavior, and SW caching are easy to ship. | Add `check`, `lint`, and focused smoke tests for Express routes, video contract, and critical browser flows. |
| P3 | Version and documentation drift | `package.json:3` says `3.1.0`; server startup logs version `3.1.0` in `server/index.js:155-162`; `/health` returns `3.0.0` in `server/routes/chat.js:174-183`; bot status returns `3.0` in `server/routes/chat.js:130-140`. | Production diagnostics are ambiguous during incident/debug work. | Use package version or one config constant for all version surfaces. |
| P3 | Stale tracked deployment copy | `git ls-files deploy-ready` returns `deploy-ready/chat-components/GlassUIWidget.js`, even though `.dockerignore:13-14` ignores `deploy-ready` and `deploy-ready.zip`. | Static searches and reviews see stale duplicate code; future edits may target the wrong copy. | Remove tracked deploy artifacts from Git and keep generated bundles outside the repository. |

## Positive Findings

- Homepage optimized hero sources are wired in `index.html:187-205`: WebM first for desktop Chromium, MP4 fallback, mobile MP4, `preload="metadata"`.
- Production serves `hero-reel-desktop.webm` as `video/webm` with `Accept-Ranges: bytes` and `Content-Length: 35442412`.
- Production homepage/browser audit did not request `опенинг новый.mp4` as hero autoplay media.
- `sw.js:132-135` bypasses media requests, so large videos should stream directly rather than being stored in Cache Storage.
- Detail page hero videos stayed metadata-only/offscreen in local Chrome smoke for `service-detail.html?id=0..7`.
- Mobile helper loading is conditional on detail pages (`service-detail.html:314-320`, `ai-photo-detail.html:346-352`).

## Verification Evidence

### Static Checks

- `node --check` across `server`, `js`, `chat-components`, and `sw.js`: one failure, `chat-components/ModernChatWidget.js` JSX.
- `npm audit --omit=dev --json`: 4 prod vulnerabilities, 2 high and 2 moderate.
- Asset inventory:
  - `public`: 116 files, about 1798.51 MB.
  - `public/works`: 107 files, about 1776.82 MB.
  - `node_modules`: about 25.2 MB.
- Console/log search: 160 `console.log/warn/error` calls in audited frontend/server paths.
- CSS search showed many blur/filter/backdrop-filter/will-change declarations.

### Local Browser/CDP

Environment: local Express server on `127.0.0.1:4310`, Chrome `147.0.7727.138`, viewport `1440x900` and `1920x1080`.

Homepage:

- Hero media: `/public/works/hero-reel-desktop.webm`
- Hero media response: `206`, `video/webm`, not from service worker
- Old hero requested: `false`
- Scroll probe: 7 long tasks, max long task 120 ms, p95 frame gap 33.4 ms, p99 83.3 ms, max frame gap 1147.2 ms
- Hero freeze repro: after 15s, video was visible and fully loaded but `paused=true`, `currentTime=1.53`, `error=null`

Detail pages:

- `service-detail.html?id=0..7` rendered without page exceptions.
- First video was offscreen with `preload="metadata"`, empty `currentSrc`, `readyState=0`, no eager media start.
- Detail pages loaded chat widgets immediately and emitted generic homepage warnings.

### Production Read-Only Checks

- `GET /health`: `200`, JSON status ok.
- `GET /`, `GET /service-detail.html?id=0`, `GET /ai-photo-detail.html`: `200`.
- `HEAD /public/works/hero-reel-desktop.webm`: `200`, `Content-Type: video/webm`, `Accept-Ranges: bytes`, `Content-Length: 35442412`, `Cache-Control: public, max-age=2592000`.
- `HEAD /public/works/hero-reel-desktop.mp4`: `200`, `Content-Type: video/mp4`, `Accept-Ranges: bytes`, `Content-Length: 50263422`.
- `HEAD /public/works/опенинг новый.mp4`: `200`, `Content-Type: video/mp4`, `Content-Length: 295066464`.
- `GET /api/bots/status` with `Origin: http://localhost:3000`: `200`, `Access-Control-Allow-Origin: http://localhost:3000`.
- Same endpoint with `Origin: https://evil.example`: `403`.
- VPS Docker logs sampled read-only; they contained scanner noise, health checks, range media requests, and verbose request metadata. Sensitive raw log lines are intentionally not copied into this report.

## Commands Used

Representative commands:

```powershell
git status --short
git branch --show-current
git log --oneline -5
npm audit --omit=dev --json
node --check <js-file>
git grep -n "innerHTML" -- service-detail.html js chat-components
git grep -n "console\\.log\\|console\\.warn\\|console\\.error" -- server chat-components js sw.js
git check-attr filter diff merge text -- public/works/hero-reel-desktop.webm public/works/hero-reel-desktop.mp4 public/works/hero-reel-mobile.mp4
Invoke-WebRequest -UseBasicParsing -Uri https://vps.real-vibe.studio/health
Invoke-WebRequest -UseBasicParsing -Uri https://vps.real-vibe.studio/public/works/hero-reel-desktop.webm -Method Head
ssh root@89.223.126.190 "<read-only release/container/log commands>"
```

Browser checks were run with a temporary Chrome profile and CDP. No production browser actions mutated server state.

## Refactor Roadmap

### Batch 1 - Highest Risk, 1-2 Days

1. Lock production CORS and rate limits:
   - remove localhost/staging defaults from production allowlist;
   - remove origin-based rate-limit bypass;
   - apply API limiter to `/chat`;
   - harden quota identity.
2. Rotate and redesign owner token:
   - remove URL/localStorage token flow;
   - redact logs;
   - introduce HttpOnly Secure owner session or signed short-lived token.
3. Fix hero video controller:
   - debounce IntersectionObserver out-of-view pause;
   - protect autoplay state from internal pauses;
   - add guarded resume when hero is visible.
4. Reduce production media/image size:
   - remove/archive unused huge MP4s from runtime image;
   - add WebM to LFS;
   - keep optimized renditions only in `public`.

### Batch 2 - Performance And Maintainability, 3-5 Days

1. Move detail pages to the same lazy script contract as homepage.
2. Split homepage-only logic out of `js/script.js`.
3. Reduce CSS paint cost around fixed chat buttons, glow/blur effects, and permanent `will-change`.
4. Decide and fix service card navigation behavior.
5. Clean tracked generated artifacts and dead JSX/legacy widgets.

### Batch 3 - Security Hardening, 1-2 Weeks

1. CSP migration from `unsafe-inline` to nonce/hash based scripts.
2. Request/response logging policy with PII and secret redaction.
3. Dependency update plan and repeat `npm audit`.
4. Lock down or remove unused `/api/webhook/:botId`.
5. Separate security review for `openai-proxy`, `cf-api`, and `vk-autocomment-module` if they remain production boundaries.

### Batch 4 - Architecture And Testing

1. Add a real frontend/API check suite:
   - `node --check` or bundler build;
   - route smoke tests;
   - browser smoke for hero/detail/chat;
   - service worker cache tests.
2. Add asset budgets and CI checks for large media additions.
3. Introduce a build pipeline or module bundler for page-specific JS.
4. Move large media to CDN/object storage with explicit cache and range behavior.
5. Add release/rollback documentation that includes image size and media manifest checks.

## Open Questions

1. Should `/chat` remain a public legacy endpoint, or should all clients use `/api/chat/:botId`?
2. Should service card clicks now navigate to detail pages, since `service-detail.html?id=0..7` renders?
3. Is `openai-proxy` deployed anywhere public today? If yes, it needs immediate auth/rate/body/timeout hardening.
4. Which large original media files must remain publicly accessible, and which are source masters that should move out of runtime?
5. Do we need owner-token access from the public site at all, or can owner bypass move to an admin-only surface?
6. Can we collect a headed Chrome/Edge/Yandex trace on the same desktop where freezes were observed to compare with the headless CDP repro?

