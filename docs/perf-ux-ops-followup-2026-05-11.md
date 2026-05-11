# Perf + UX + Ops Follow-up — 2026-05-11

## Executive Summary

Baseline after release `8048265`: production container is healthy, `script-src 'self'` is enforced,
and `style-src-attr 'none'` is running in report-only mode. The current follow-up keeps the public
API unchanged and focuses on lower-noise ops, desktop paint cost, delayed detail-page runtime, and
repeatable performance/browser gates.

## Production Sample

- Active VPS release before this batch: `/srv/real-vibe-studio/releases/20260511-201714-8048265-csp-tests`.
- Container: `real-vibe-web`, healthy; image `current-real-vibe-web`, about `1.2GB`.
- CSP reports in the sampled Docker log window: none from normal smoke/browser flows.
- Main log noise: expected CORS smoke requests, invalid chat smoke, webhook auth smoke, old hero master 404 check, and scanner 404s such as `wlwmanifest.xml`.
- No sampled log lines contained request bodies, cookies, owner token, webhook token, user messages, or AI replies.

## Changes In This Batch

- Request logging now skips successful static asset and health-check requests in production.
- Expected 4xx errors no longer duplicate as `error` logs; scanner 404s are represented by the normal request log only.
- Detail pages delay Glass UI chat runtime beyond first paint and wake it on user interaction or later idle.
- Desktop widget paint cost is reduced by removing persistent blur, shine, pulse, and float animations from fixed chat buttons and chat panels.
- Added `npm run perf:desktop` for repeatable 1440x900 and 1920x1080 scroll probes.

## Style CSP Roadmap

`style-src-attr 'none'` remains report-only because the runtime still uses inline style writes for dynamic layout and animation state.

Keep inline style writes for now where values are genuinely runtime-calculated:

- Glass chat window placement and viewport clamping.
- Video progress width and current playback UI state.
- Carousel transform/visibility state.
- Click sparkle/ripple coordinates.

Move to CSS classes in the next style-CSP batch:

- Chat widget static visual styles, shadows, backdrop, and transitions.
- Floating button static dimensions/positioning.
- Repeated hide/show states like `display`, `opacity`, `visibility`, and active filters.
- Static skeleton/loading visuals.

Acceptance for enforcing `style-src-attr 'none'`: normal homepage/detail/chat browser smoke emits no report-only violations for first-party code, with any remaining violations documented as browser extensions or external scanner noise.

## Remaining Backlog

- Run a longer real-user-window CSP sample after production traffic.
- Convert chat widgets from JS `cssText` blocks to CSS classes before enforcing strict style attributes.
- Add CI execution of the quality gate once GitHub deployment flow is clarified.
- Continue desktop trace tuning if `perf:desktop` shows p95 frame gaps above the configured threshold.
