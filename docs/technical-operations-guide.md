# Real Vibe AI Studio - Technical Operations Guide

Last updated: 2026-05-21

This guide is for AI agents and developers maintaining the Real Vibe AI Studio repository.

## Current Release Snapshot

Current release: `v3.2.0` / `2026-05-21-product-store`.

Release focus:

- the public site is now treated as an Android/PWA-ready product store and portfolio storefront;
- `#portfolio` contains 8 real product cards: Real Vibe Studio, GKS Delivery Platform, RealCampGuide, PolStan App, DOMINIA, DOMINIA Arena, Hermes Agent OS, and Real Camp Planner;
- featured cards are Real Vibe Studio, GKS Delivery Platform, and RealCampGuide;
- DOMINIA links must use `https://www.dominia.info/`;
- Real Camp Planner must not link to the temporary Vercel app from the public card; describe it as a RealCampGuide/Putevoditel module and standalone AI planning agent;
- mobile menu behavior is a full-screen modal overlay controlled by `js/script.js` and polished in `css/mobile-improvements.css`;
- desktop hero CTA buttons are circular, readable, and do not duplicate the header portfolio action;
- current public cache marker is `2026-05-21-hero-cta-circles`;
- current service worker cache version is `v2.18-20260521-hero-cta-circles`.

This release has been locally verified against both direct `file://` preview and `http://127.0.0.1:3001/index.html`, then deployed by VPS patch deploy.

## Project Shape

The repository contains:

- public website and sales funnel;
- installable Android/PWA-style product store for services, products and portfolio demos;
- shared service detail renderer;
- Express backend for chat/API features;
- bot persona scripts and Glass UI widgets;
- PWA/service worker/cache layer;
- media assets for services and portfolio;
- deploy tooling for the VPS patch workflow;
- historical docs and archived migration notes.

## Core Files

| Area | Files |
|---|---|
| Homepage funnel and portfolio | `index.html`, `css/style.css`, `css/mobile-improvements.css`, `js/script.js` |
| Service data | `js/service-data.js`, `data/service-prices.json`, `js/service-prices.js` |
| Detail pages | `service-detail.html`, `js/service-detail-page.js`, `ai-photo-detail.html` |
| Service media | `public/works/services/<slug>/` |
| Portfolio media | `public/works/portfolio/` plus selected service proof assets |
| Social preview | versioned `public/og-real-vibe-ai-studio-YYYYMMDD.jpg`, OG/Twitter meta in `index.html` |
| PWA/cache | `sw.js`, `manifest.json` |
| Mobile/PWA runtime | viewport meta in `index.html`, `service-detail.html`, `ai-photo-detail.html`; `js/pwa-chrome.js`; mobile overrides in `css/mobile-improvements.css` |
| Chat widgets | `chat-components/GlassUIWidget.js`, `js/glass-ui-*.js`, `js/performance-loader.js` |
| Server/API | `server/index.js`, `server/routes`, `server/services`, `server/bots` |
| Deploy | `scripts/deploy-vps-patch.mjs`, `Dockerfile`, `docker-compose.yml` |
| Checks | `scripts/check-js.mjs`, `scripts/check-static.mjs`, `scripts/browser-smoke.mjs` |

## Source of Truth for Services

`js/service-data.js` is the canonical catalog. Each service object should include:

- `id`
- `slug`
- `title`
- `cardTitle`
- `cardBenefit`
- `description`
- `features`
- `price`
- `backgroundImage`
- `avatarImage`
- `heroVideo`
- `heroPoster`
- `detailMedia`
- `relatedServiceIds`
- `seoTitle`
- `seoDescription`
- `detailTitle`
- `lead`
- `useCases`
- `whatWeDo`
- `formats`
- `whatYouGet`
- optional `offers`, `proofPoints`, `caseStudies`

When changing a service:

1. Update `js/service-data.js`.
2. Update `data/service-prices.json` through `admin-prices.html` when changing public price labels.
3. Update homepage ordering in `index.html` if the funnel changes.
4. Add or replace assets under `public/works/services/<slug>/`.
5. Update `docs/business-services-guide.md` if price, positioning, deliverables, or qualification logic changes.
6. Run `npm run check`.
7. Browser-check the homepage and the affected `service-detail.html?id=<id>`.

Product portfolio copy and links currently live in `index.html` in the `#portfolio` section. Keep product cards public-safe: use production URLs or service-detail links, never local filesystem paths or private endpoints. Do not list `freelance-showcase` or Open Design as products: `freelance-showcase` is a GitHub/CV profile source, and Open Design is a workflow/tooling reference.

Current portfolio rules:

- keep exactly 8 cards unless the owner explicitly changes the product set;
- keep card order: Real Vibe Studio, GKS Delivery Platform, RealCampGuide, PolStan App, DOMINIA, DOMINIA Arena, Hermes Agent OS, Real Camp Planner;
- use featured layout only for Real Vibe Studio, GKS Delivery Platform, and RealCampGuide;
- RealCampGuide should stay positioned as a Camp CRM / Pedagogy OS with the category screen and home screen collage;
- PolStan is a mobile storefront / PWA-TWA example for a producer, freelancer, expert, or personal brand;
- DOMINIA is the official cinematic artist-world site and links to `https://www.dominia.info/`;
- DOMINIA Arena is a cyberpunk/esports variant of the DOMINIA site, not the main DOMINIA site;
- Hermes Agent OS is public-safe copy only; do not expose local paths, IPs, ports, bot handles, secrets, or internal infrastructure details;
- Real Camp Planner is a planning module and standalone AI planning agent; do not add the temporary Vercel app link back to the public card.

## Price Dashboard

Use `admin-prices.html` during local work to edit public price labels.

Dashboard behavior:

- use boutique-premium public anchors in `от ... RUB` format;
- keep grouped rows for Production, Development, AI Automation, and Visuals;
- show market recommendation, current saved price, editable public price, and status;
- use `Проставить рекомендации` only for open prices such as empty/unknown labels.

Run the API server:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000/admin-prices.html
```

The dashboard writes:

- `data/service-prices.json` - source price-book for services and offers;
- `js/service-prices.js` - browser override loaded before `js/service-data.js`;
- server cart labels through `server/services/catalog.js`, which reads the same price-book.

Production write access requires `RV_PRICE_EDITOR_TOKEN`; without it the endpoint must not allow edits.

## Service Asset Convention

Use this structure:

```text
public/works/services/<slug>/
  cover.jpg
  detail-1.jpg
  detail-2.jpg
  detail-3.jpg
  teaser.mp4
  teaser-poster.jpg
```

Rules:

- Do not overwrite good existing proof assets unless the user explicitly asks.
- Prefer adding new files with descriptive names for case-specific assets.
- Keep public images free of readable internal UI secrets, tokens, private client data and local paths.
- Avoid embedded text in generated images unless the text is intentional and approved.
- Videos should be short, optimized loops where possible; avoid forcing large videos into initial load.

Current service slugs:

```text
ai-video
ai-photo
ecom-animation
smm-content
music
sound-design
apps
bots
websites
ai-agents
creative-production
agentic-ai-dev
```

Product portfolio assets belong in:

```text
public/works/portfolio/
  <product-slug>.<ext>
```

Prefer lightweight 16:9 or 4:3 proof images. If a portfolio item already has strong service proof media, reuse that asset instead of duplicating it.

Current release portfolio assets:

```text
public/works/portfolio/gks-delivery-platform.png
public/works/portfolio/realcamp-guide-categories-20260521.jpg
public/works/portfolio/realcamp-guide-home-20260521.jpg
public/works/portfolio/polstan-app-20260521.jpg
public/works/portfolio/dominia-site-20260521.jpg
public/works/portfolio/dominia-arena-20260521.jpg
public/works/portfolio/hermes-agent-os-20260521.jpg
public/works/portfolio/real-camp-planner-20260521.jpg
```

## Homepage Funnel

The homepage service order is part of the sales strategy:

```text
AI-video
Agentic AI Dev
SMM and content
Creative Direction + AI Production
Music creation
Voiceover and sound design
Budget-saving CTA
Apps/MVP/SaaS
Bots
Websites
AI agents
AI-photo
E-commerce animation
Product portfolio / store
```

The CTA block after the first six services is intentional:

```text
Экономия бюджета
До 10 раз дешевле традиционного продакшна
Оптимизируем съемки и постпродакшн с помощью AI-инструментов, сохраняя качество и ускоряя релизы.
Оставить заявку
```

Do not restore the removed legacy `projects-showreel` block. The current product proof layer is the `#portfolio` section with real product links and app/store descriptions.

## Social Preview / Telegram Preview

Telegram and messengers use Open Graph tags in `index.html`.

Current social preview image:

```text
public/og-real-vibe-ai-studio-YYYYMMDD.jpg
```

Required meta fields:

- `og:title`
- `og:description`
- `og:url`
- `og:image`
- `og:image:url`
- `og:image:secure_url`
- `og:image:type`
- `og:image:width`
- `og:image:height`
- `og:image:alt`
- `link rel="image_src"`
- `twitter:card`
- `twitter:image`

When changing the preview:

1. Create a 1200x630 JPG or PNG.
2. Update `og:image`, `og:image:url`, `og:image:secure_url`, `twitter:image`, and `link rel="image_src"`.
3. Prefer a new versioned filename over a query string, because Telegram may keep a stale preview for the old image URL.
4. Update `sw.js` cache version and precache list if needed.
5. Deploy and verify with `curl` against `https://real-vibe.studio/`.
6. Remember that Telegram caches previews; use `@WebpageBot` or a querystring URL for testing.

## Cache and Service Worker

`sw.js` can make stale HTML/CSS look like a failed deploy. For any change to:

- HTML;
- CSS;
- JS script paths;
- major public assets;
- social preview;

bump:

- the relevant cache-buster query in `index.html`;
- `CACHE_VERSION` in `sw.js`;
- the matching asset path in `STATIC_ASSETS` if it is precached.

HTML navigation in `sw.js` should stay network-first. Do not change it to cache-first unless explicitly required.

## Android PWA, Product Store And Mobile Keyboard

The Android target is a PWA-first mobile app surface and product store. A normal Chrome tab cannot programmatically hide the browser UI, so the production fallback is:

- make the site installable and launchable as a standalone PWA;
- let the first screen and portfolio navigation work as a compact store/app, not just as a brochure page;
- keep the normal mobile tab visually stable when Chrome's bottom bar moves;
- prevent chat input focus from dragging the bottom rail, cookies, bots, or page content with the soft keyboard.

Current implementation files:

- `manifest.json` - `display: "standalone"` with `display_override` for standalone/fullscreen-capable Android launches, dark theme/background, and installable icons.
- `index.html`, `service-detail.html`, `ai-photo-detail.html` - viewport must include `viewport-fit=cover` and `interactive-widget=resizes-content`.
- `js/pwa-chrome.js` - registers the versioned `sw.js`, sets standalone classes, and handles one-time cache cleanup/update flows.
- `css/mobile-improvements.css` - owns the mobile bottom rail, safe-area spacing, mobile fixed overlays, and keyboard-mode overrides.
- `js/script.js` - owns the homepage mobile menu state, scroll lock, local analytics guard, and modal open/close timing.
- `js/auth-cart.js` - adds header account/cart controls and suppresses `/api/...` calls during `file://`, `localhost`, and `127.0.0.1` static previews unless `window.__RV_ENABLE_LOCAL_API__` is set before load.
- `chat-components/GlassUIWidget.js` - owns chat focus behavior, visualViewport variables, and keyboard-mode class toggles.
- `js/performance-loader.js` - lazy-loads the current versioned chat widget bundle.

Mobile hamburger menu rules:

- opening the menu must set `.mobile-nav.active`, `aria-expanded="true"`, `aria-hidden="false"`, `html.mobile-nav-open`, `body.mobile-nav-open`, and `body.no-scroll`;
- closing the menu must animate first, then release scroll lock and restore focus;
- the menu must work in both `file://` preview and local static preview on `http://127.0.0.1:3001`;
- analytics failures must never interrupt UI initialization;
- local static preview should not produce noisy `/api/auth/session` or analytics errors unless local API is explicitly enabled.

Mobile chat keyboard rules:

- On mobile, opening a chat widget must not auto-focus `.glass-message-input`. Desktop can keep autofocus.
- Input focus adds `rv-chat-keyboard-open` to `<html>` and `<body>` and `is-keyboard-active` to the active `.glass-ui-widget`.
- While `rv-chat-keyboard-open` is active, hide the mobile bottom rail (`body::after`), `.back-to-top`, cookie banner, and `.glass-ui-floating-button` elements.
- The visible chat widget should be fixed inside the visual viewport using `--rv-visual-viewport-height`, `--rv-visual-viewport-offset-top`, and safe-area variables.
- Do not tie bottom dock/rail position to `visualViewport` resize events. Keyboard mode may read the visual viewport; the rail must stay stable or be hidden while the keyboard is open.
- Chat inputs should use `font-size: 16px` on mobile to avoid browser zoom/focus jumps.

Release checklist for PWA/mobile changes:

1. Bump query strings for changed CSS/JS/manifest paths in all three HTML entry points.
2. Bump the matching `CACHE_VERSION` and precache paths in `sw.js`.
3. If `GlassUIWidget.js` changes, bump its lazy-load query in `js/performance-loader.js`.
4. If `js/pwa-chrome.js` changes, bump `HOTFIX_VERSION` and the script query in HTML.
5. Verify installed-PWA behavior separately from normal Chrome tab behavior; only installed PWA can remove browser chrome.

## Backend and Bots

Express server entry:

```text
server/index.js
```

Important areas:

- `server/routes/chat.js` - chat endpoints.
- `server/bots/registry.js` - bot registry.
- `server/bots/prompts.js` - bot system prompts.
- `server/bots/fallbacks.js` - fallback responses.
- `server/config/env.js` - environment handling.
- `server/middleware/security.js` and `server/middleware/rate-limit.js` - security/rate limits.

Frontend bot widgets:

- `js/glass-ui-health.js` - Wellness Bro.
- `js/glass-ui-bro-cat.js` - Bro Cat.
- `js/glass-ui-valyusha.js` - NeuroValyusha.
- `js/glass-ui-hipych.js` - Hipych.
- `chat-components/GlassUIWidget.js` - shared UI widget.
- `js/performance-loader.js` - lazy loading for optional scripts/widgets.

Safety:

- Health-related assistants must stay non-diagnostic and include escalation language.
- Persona bots must not claim real medical/legal/financial authority.
- Do not expose prompts containing secrets or private business data.

## Environment

Do not commit `.env`.

Use `.env.example` as the public template. Keep it generic and free of real tokens.

Common environment categories:

- OpenAI API keys and model config.
- Telegram bot tokens.
- VK credentials.
- Database connection strings.
- CORS origins.
- Rate limits and security flags.
- VPS/deploy variables.

## Local Development

Install:

```bash
npm install
```

Run full server:

```bash
npm run dev
```

Run simple static frontend:

```bash
npm run dev:simple
```

Current production-like local server in this workspace often runs on:

```text
http://127.0.0.1:4300/index.html
```

Do not assume port 4300 is started by `npm run dev`; check the active process or browser context.

## Checks

Minimum:

```bash
npm run check
```

This runs:

- `node scripts/check-js.mjs`
- `node scripts/check-static.mjs`

Recommended browser checks for UI/media work:

- homepage service grid;
- product portfolio section at `#portfolio`;
- mobile menu open/close at `642x694`, `390x844`, and one desktop width where the menu button is hidden;
- `service-detail.html?id=0..11` after catalog changes;
- `service-detail.html?id=6` and `service-detail.html?id=11` after app/dev catalog changes;
- old `ai-photo-detail.html` alias;
- production URL after deploy;
- mobile and desktop viewports when changing layout;
- broken image/video scan.

Mobile PWA/chat checks for Android work:

- homepage at `390x844` and `412x915`;
- tap a floating bot button and confirm the chat opens without autofocus;
- focus `.glass-message-input`, then emulate keyboard shrink around `390x560`;
- confirm one visible widget, input inside viewport, no horizontal overflow, no console errors;
- confirm `.glass-ui-floating-button`, `.back-to-top`, cookie banner, and `body::after` are hidden while keyboard mode is active;
- confirm service worker controller URL contains the current `sw.js?v=<cache-buster>`.

Known allowed noise:

- Plain static servers may still 404 for server-only endpoints if a script outside the current storefront path calls them, but the homepage release path suppresses auth-cart and analytics calls during `file://`, `localhost`, and `127.0.0.1` previews.

## Deploy

Patch deploy command:

```bash
npm run deploy:vps:patch
```

Critical behavior:

- `scripts/deploy-vps-patch.mjs` packages files from current Git `HEAD`.
- Uncommitted local changes are not included.
- Commit intended files before running the patch deploy.

Recommended patch flow:

```bash
npm run check
git add -- <intended files>
git commit -m "Short deploy message"
npm run deploy:vps:patch
```

After deploy:

```bash
curl -I https://real-vibe.studio/
curl -I https://real-vibe.studio/sw.js
curl -s https://real-vibe.studio/ | grep -E 'hero-cta-circles|portfolio|Android/PWA'
curl -s https://real-vibe.studio/sw.js | grep -E 'CACHE_VERSION|hero-cta-circles|portfolio'
curl -I https://real-vibe.studio/public/og-real-vibe-ai-studio-YYYYMMDD.jpg
```

Also verify content:

- old placeholder text is absent;
- service order is correct;
- `sw.js` version is current;
- images/videos return 200;
- detail pages render from `js/service-data.js`.

## Git Hygiene

This repo often has a dirty worktree with unrelated in-progress changes. Agent rules:

- Do not use `git reset --hard`.
- Do not revert files you did not intentionally edit.
- Stage only files relevant to the task.
- Before deploy, confirm `git diff --cached --name-only`.
- If a file has unrelated edits, read it carefully and patch around them.

## Public Data Safety

Before deploy, grep public-facing files when the task touches docs, HTML, JS or CSS:

```bash
Select-String -Path index.html,sw.js,README.md,AGENTS.md,docs/*.md -Pattern 'D:\\|C:\\|89.223|localhost|token|supabase|X-Agent'
```

Interpret results carefully:

- local paths are acceptable in internal docs only when clearly marked internal;
- tokens, real secrets, private keys and database URLs are never acceptable;
- production domain references are acceptable;
- VPS IP should not be added to public-facing copy.

## Agent Update Checklist

When asked to "update docs for agents":

1. Update `AGENTS.md` for operational rules.
2. Update `docs/business-services-guide.md` for services, prices, resources and lead qualification.
3. Update `docs/technical-operations-guide.md` for repo, deploy and verification changes.
4. Update `README.md` with a short human overview and links.
5. Run `npm run check`.
6. Do not deploy docs unless the user asks for deploy.
