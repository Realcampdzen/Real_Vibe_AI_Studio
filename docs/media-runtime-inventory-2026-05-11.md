# Media Runtime Inventory - 2026-05-11

## Summary

- Local `public/` size before cleanup: about 1,798.51 MB.
- Local `public/works/` size before cleanup: about 1,776.82 MB.
- Files larger than 80 MB total about 1,374.98 MB and are not referenced by runtime HTML/JS/CSS outside docs.
- Runtime cleanup keeps source/master media in source storage while excluding unused masters from the Docker image.

## Runtime Media Kept

| Asset | Purpose | Notes |
| --- | --- | --- |
| `public/works/hero-reel-desktop.webm` | Primary desktop hero autoplay source | Used by `index.html` and dynamic service detail hero contract. |
| `public/works/hero-reel-desktop.mp4` | Desktop MP4 fallback | Used by hero video source fallback. |
| `public/works/hero-reel-mobile.mp4` | Mobile hero source | Used for narrow viewport hero playback. |
| `public/works/вечерний дождь клип.mp4` | Service detail default video | Referenced by `service-detail.html`. |
| `public/works/*` below 80 MB | Portfolio/detail media | Kept for this batch unless a later runtime scan proves unused. |

## Runtime Media Excluded From Docker

These source/master files are larger than 80 MB and have no runtime references outside docs/public:

| Asset | Size | Runtime references | Action |
| --- | ---: | ---: | --- |
| `public/works/With pain.mp4` | 529.37 MB | 0 | Exclude from Docker runtime image. |
| `public/works/___202511240019_nx8yb_1.mp4` | 282.10 MB | 0 | Exclude from Docker runtime image. |
| `public/works/шоурил.mp4` | 282.10 MB | 0 | Exclude from Docker runtime image. |
| `public/works/опенинг новый.mp4` | 281.40 MB | 0 | Exclude from Docker runtime image. |

## Verification Commands

```powershell
Get-ChildItem -Path public -Recurse -File | Where-Object { $_.Length -gt 80MB } | Sort-Object Length -Descending
git grep -n -F -- "<asset-name>" -- ':!public/**' ':!deploy-ready/**' ':!docs/**'
git check-attr filter diff merge text -- public/works/hero-reel-desktop.webm public/works/hero-reel-desktop.mp4 public/works/hero-reel-mobile.mp4
```

## Acceptance

- New Docker builds exclude the four unused source/master videos above.
- Optimized hero sources and smaller portfolio/detail assets remain available.
- `*.webm` is tracked through Git LFS for future WebM media.
