# Real Vibe AI Studio - Agent Guide

This repository is the production workspace for Real Vibe AI Studio. Use this file as the first stop for any AI agent or developer working in the repo.

## Business Context

Real Vibe AI Studio sells AI production and agentic development services for business and creative projects.

Primary positioning:

- AI-video, SMM, music, voice/sound, and creative direction for content production.
- Agentic full-stack development: MVP, SaaS, Telegram Mini Apps, AI bots, sites, custom GPTs, and stabilization of AI-generated code.
- Frontend/design quality loop: Open Design with Codex and GPT Pro for fast design-system based prototypes, sandbox previews, and cleaner design-to-code handoff.
- The public site is a sales funnel, a portfolio, and a live demo of AI assistants.

Key person:

- Stepan Ivanov
- Agentic Full-Stack Developer / Vibe Coder
- Stack: TypeScript, React, Next.js, Python FastAPI/Django, Node.js, PostgreSQL, Supabase, Vercel, Docker, OpenAI API, Telegram Bot API, Open Design, Codex, GPT Pro.

Primary docs:

- [Business and Services Guide](docs/business-services-guide.md)
- [Technical Operations Guide](docs/technical-operations-guide.md)
- [Release Runbook](docs/release-runbook.md)

## Source of Truth

Use these files before changing copy, services, media, or behavior:

- `js/service-data.js` - canonical service catalog for cards, detail pages, SEO copy, related services, and media.
- `data/service-prices.json` and `js/service-prices.js` - editable price-book and browser price overrides.
- `admin-prices.html` - local price dashboard for changing public price labels.
- `index.html` - homepage funnel, hero, service order, CTA blocks, SEO/social meta.
- `service-detail.html` and `js/service-detail-page.js` - shared detail page renderer.
- `public/works/services/<slug>/` - service covers, detail media, posters, and video loops.
- `sw.js` - service worker cache version and precache list.
- `README.md`, `AGENTS.md`, `docs/business-services-guide.md`, `docs/technical-operations-guide.md` - agent-facing docs.

## Current Homepage Funnel

At the start of the homepage, the service order is intentionally:

1. AI-video
2. Vibe coding / Agentic AI Dev
3. SMM and content
4. Creative Direction + AI Production
5. Music creation
6. Voiceover and sound design
7. Budget-saving CTA
8. MVP/SaaS/apps, bots, websites, AI agents, AI-photo, e-commerce animation

Do not reintroduce the old `projects-showreel` section with demo cards such as "AI-video for brand", "Click play", or repeated placeholder videos. That block was intentionally removed from the sales funnel.

## Service Catalog Snapshot

| ID | Slug | Service | Public price anchor |
|---:|---|---|---|
| 0 | `ai-video` | AI-video and advertising reels | from 80,000 RUB |
| 11 | `agentic-ai-dev` | Vibe coding / Agentic AI Dev | development from 30,000 RUB |
| 3 | `smm-content` | SMM and content | from 40,000 RUB |
| 10 | `creative-production` | Creative Direction + AI Production | from 150,000 RUB |
| 4 | `music` | Music creation | from 20,000 RUB |
| 5 | `sound-design` | Voiceover and sound design | from 15,000 RUB |
| 6 | `apps` | MVP, SaaS, apps with AI functions | from 50,000 RUB for MVP module |
| 7 | `bots` | Telegram bots with AI, DB, admin panel | from 10,000 RUB |
| 8 | `websites` | Sites and web services with AI functions | from 70,000 RUB |
| 9 | `ai-agents` | AI agents and GPT assistants | from 25,000 RUB |
| 1 | `ai-photo` | AI-photo for e-commerce and key visual | from 20,000 RUB per set |
| 2 | `ecom-animation` | AI animation and e-commerce infographics | from 35,000 RUB |

Detailed descriptions, qualification questions, and deliverables are in [docs/business-services-guide.md](docs/business-services-guide.md).

## Operating Rules

- Keep business copy in sync with `js/service-data.js` and public prices in sync with `data/service-prices.json`.
- If changing service order, update both the homepage and the docs.
- If changing CSS, HTML, JS, or media paths, bump the relevant cache-buster and `sw.js` cache version.
- If changing social preview, update `og:image`, `twitter:image`, image dimensions, and deploy the new asset.
- Never commit `.env`, API keys, tokens, database URLs, Supabase keys, VPS IPs in public-facing docs, or private customer data.
- Do not revert dirty files you did not change. This workspace often contains parallel changes.

## Verification

Minimum before finishing:

```bash
npm run check
```

For homepage or detail-page changes, also run a browser check with Playwright or an equivalent script:

- `index.html`
- `service-detail.html?id=0..11` when service data changes
- production URL after deploy
- social preview meta when OG tags change

## Deploy Notes

Patch deploy:

```bash
npm run deploy:vps:patch
```

Important: the patch deploy script packages files from the current Git `HEAD`, not arbitrary unstaged workspace changes. Commit the intended files first, then run the deploy.

After deploy, verify production directly:

```bash
curl -I https://real-vibe.studio/
curl -I https://real-vibe.studio/public/og-real-vibe-ai-studio.jpg
```

Do not assume the in-app browser or Telegram preview has the newest cache.
