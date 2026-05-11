import { chromium } from '@playwright/test';

const baseUrl = (process.env.PERF_PROBE_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const channel = process.env.PERF_PROBE_CHANNEL || 'msedge';
const viewportSpecs = (process.env.PERF_PROBE_VIEWPORTS || '1440x900,1920x1080')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [width, height] = item.split('x').map((value) => Number(value));
    return { width, height, label: item };
  });
const maxP95FrameGap = Number(process.env.PERF_PROBE_MAX_P95_FRAME_GAP_MS || 50);
const maxLongTasks = Number(process.env.PERF_PROBE_MAX_LONG_TASKS || 20);

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[index].toFixed(2));
}

async function launchBrowser() {
  try {
    return await chromium.launch({ channel, headless: true });
  } catch (error) {
    if (channel === 'chromium') throw error;
    console.warn(`[perf-probe] ${channel} unavailable, falling back to bundled chromium`);
    return chromium.launch({ headless: true });
  }
}

async function installObservers(page) {
  await page.addInitScript(() => {
    window.__rvPerfProbe = {
      frameGaps: [],
      longTasks: [],
      startedAt: 0,
    };

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__rvPerfProbe.longTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
            name: entry.name,
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch {}

    let previousFrame = 0;
    function tick(now) {
      if (previousFrame) {
        window.__rvPerfProbe.frameGaps.push(now - previousFrame);
      }
      previousFrame = now;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

async function runScroll(page) {
  await page.evaluate(async () => {
    window.__rvPerfProbe.startedAt = performance.now();
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const duration = 9000;
    const start = performance.now();

    await new Promise((resolve) => {
      function step(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const y = progress < 0.5
          ? maxScroll * (eased * 2)
          : maxScroll * (2 - eased * 2);
        window.scrollTo(0, Math.max(0, Math.min(maxScroll, y)));
        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          window.scrollTo(0, 0);
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  });
  await page.waitForTimeout(1000);
}

const browser = await launchBrowser();
const results = [];
const consoleIssues = [];

try {
  for (const viewport of viewportSpecs) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) {
        const text = message.text();
        if (!/content security policy/i.test(text) || !/report-only/i.test(text)) {
          consoleIssues.push(`${viewport.label} ${message.type()}: ${text}`);
        }
      }
    });
    await installObservers(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await runScroll(page);
    const metrics = await page.evaluate(() => {
      const data = window.__rvPerfProbe;
      const longTasks = data.longTasks.filter((entry) => entry.startTime >= data.startedAt);
      const frameGaps = data.frameGaps.slice(-700).filter((gap) => Number.isFinite(gap));
      const heroVideo = document.querySelector('.hero-video video, video[data-managed-video], video');
      return {
        longTasks,
        frameGaps,
        hero: heroVideo ? {
          src: heroVideo.currentSrc || heroVideo.src,
          paused: heroVideo.paused,
          readyState: heroVideo.readyState,
          currentTime: Number(heroVideo.currentTime.toFixed(2)),
        } : null,
      };
    });
    const durations = metrics.longTasks.map((task) => task.duration);
    results.push({
      viewport: viewport.label,
      longTasks: metrics.longTasks.length,
      maxLongTaskMs: Number((durations.length ? Math.max(...durations) : 0).toFixed(2)),
      p95FrameGapMs: percentile(metrics.frameGaps, 95),
      p99FrameGapMs: percentile(metrics.frameGaps, 99),
      maxFrameGapMs: Number((metrics.frameGaps.length ? Math.max(...metrics.frameGaps) : 0).toFixed(2)),
      hero: metrics.hero,
    });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ baseUrl, results, consoleIssues }, null, 2));

const failed = results.some((result) =>
  result.p95FrameGapMs > maxP95FrameGap ||
  result.longTasks > maxLongTasks ||
  !result.hero ||
  result.hero.paused ||
  !String(result.hero.src).includes('hero-reel-desktop.webm')
) || consoleIssues.length > 0;

if (failed) {
  console.error('desktop performance probe failed thresholds');
  process.exit(1);
}

console.log('desktop performance probe passed');
