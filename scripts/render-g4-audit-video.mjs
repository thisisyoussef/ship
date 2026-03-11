import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const dataPath = path.join(
  repoRoot,
  "docs",
  "g4",
  "video",
  "ship-audit-video-data.json"
);
const renderRoot = path.join(repoRoot, "docs", "g4", "video", "rendered");
const imageDir = path.join(renderRoot, "images");
const audioDir = path.join(renderRoot, "audio");
const segmentDir = path.join(renderRoot, "segments");
const htmlPath = path.join(renderRoot, "slides.html");
const manifestPath = path.join(renderRoot, "manifest.json");
const finalVideoPath = path.join(renderRoot, "ship-audit-walkthrough.mp4");
const posterPath = path.join(renderRoot, "poster.png");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`
        )
      );
    });
  });
}

async function readData() {
  return JSON.parse(await fs.readFile(dataPath, "utf8"));
}

async function ensureDirs() {
  await fs.mkdir(imageDir, { recursive: true });
  await fs.mkdir(audioDir, { recursive: true });
  await fs.mkdir(segmentDir, { recursive: true });
}

function buildHtml(data) {
  const slides = data.slides
    .map((slide, index) => {
      const metrics = (slide.metrics || [])
        .map(
          (metric) => `
            <div class="metric-card">
              <div class="metric-value">${escapeHtml(metric.value)}</div>
              <div class="metric-label">${escapeHtml(metric.label)}</div>
            </div>
          `
        )
        .join("");

      const bullets = (slide.bullets || [])
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("");

      return `
        <section class="slide" id="slide-${index}" style="--accent:${slide.accent}">
          <div class="noise"></div>
          <div class="accent-bar"></div>
          <div class="top-row">
            <div class="kicker">${escapeHtml(slide.kicker)}</div>
            <div class="counter">${String(index + 1).padStart(2, "0")} / ${String(
        data.slides.length
      ).padStart(2, "0")}</div>
          </div>
          <div class="title-wrap">
            <h1>${escapeHtml(slide.title)}</h1>
            <p class="summary">${escapeHtml(slide.summary)}</p>
          </div>
          <div class="grid">
            <div class="metrics">${metrics}</div>
            <div class="notes">
              <div class="notes-title">What the audit says</div>
              <ul>${bullets}</ul>
            </div>
          </div>
          <div class="footer">
            <div class="footer-label">${escapeHtml(data.title)}</div>
            <div class="footer-source">${escapeHtml(data.source)}</div>
          </div>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(data.title)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #09131d;
        font-family: "Avenir Next", "Segoe UI", sans-serif;
      }

      .slide {
        position: relative;
        width: 1920px;
        height: 1080px;
        overflow: hidden;
        padding: 78px 88px 72px;
        background:
          radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 18%, #fff7ed 82%), transparent 38%),
          radial-gradient(circle at bottom right, color-mix(in srgb, var(--accent) 12%, #e2e8f0 88%), transparent 32%),
          linear-gradient(135deg, #fffaf2 0%, #f6efe4 46%, #eef4f7 100%);
        color: #112031;
      }

      .noise {
        position: absolute;
        inset: 0;
        opacity: 0.06;
        background-image:
          linear-gradient(rgba(17, 32, 49, 0.12) 1px, transparent 1px),
          linear-gradient(90deg, rgba(17, 32, 49, 0.12) 1px, transparent 1px);
        background-size: 36px 36px;
        mask-image: radial-gradient(circle at center, black 50%, transparent 96%);
      }

      .accent-bar {
        position: absolute;
        inset: 0 auto 0 0;
        width: 22px;
        background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 50%, #ffffff 50%));
      }

      .top-row,
      .footer {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .kicker,
      .counter,
      .footer-label,
      .footer-source,
      .notes-title,
      .metric-label {
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .kicker {
        color: var(--accent);
        font-size: 20px;
        font-weight: 700;
      }

      .counter {
        padding: 10px 16px;
        border-radius: 999px;
        border: 1px solid rgba(17, 32, 49, 0.14);
        background: rgba(255, 255, 255, 0.55);
        font-size: 14px;
        font-weight: 700;
      }

      .title-wrap {
        position: relative;
        z-index: 1;
        max-width: 1220px;
        margin-top: 84px;
      }

      h1 {
        margin: 0;
        font-family: "Iowan Old Style", Georgia, serif;
        font-size: 74px;
        line-height: 0.98;
        letter-spacing: -0.04em;
      }

      .summary {
        margin: 28px 0 0;
        max-width: 1040px;
        font-size: 30px;
        line-height: 1.35;
        color: rgba(17, 32, 49, 0.84);
      }

      .grid {
        position: relative;
        z-index: 1;
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 28px;
        margin-top: 68px;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .metric-card,
      .notes {
        border: 1px solid rgba(17, 32, 49, 0.12);
        border-radius: 28px;
        background: rgba(255, 255, 255, 0.72);
        box-shadow: 0 24px 60px rgba(17, 32, 49, 0.08);
        backdrop-filter: blur(10px);
      }

      .metric-card {
        min-height: 188px;
        padding: 26px 26px 22px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .metric-value {
        font-family: "Iowan Old Style", Georgia, serif;
        font-size: 54px;
        line-height: 0.95;
        letter-spacing: -0.05em;
      }

      .metric-label {
        font-size: 15px;
        line-height: 1.35;
        color: rgba(17, 32, 49, 0.68);
        font-weight: 700;
      }

      .notes {
        min-height: 394px;
        padding: 28px 30px;
      }

      .notes-title {
        color: var(--accent);
        font-size: 15px;
        font-weight: 800;
      }

      ul {
        margin: 18px 0 0;
        padding-left: 24px;
      }

      li {
        margin: 0 0 16px;
        font-size: 27px;
        line-height: 1.32;
      }

      .footer {
        position: absolute;
        left: 88px;
        right: 88px;
        bottom: 36px;
        z-index: 1;
        color: rgba(17, 32, 49, 0.6);
        font-size: 13px;
        font-weight: 700;
      }

      .footer-source {
        font-family: "SF Mono", "Roboto Mono", monospace;
        letter-spacing: 0.03em;
        text-transform: none;
      }
    </style>
  </head>
  <body>
    ${slides}
  </body>
</html>`;
}

async function renderSlides(data) {
  await fs.writeFile(htmlPath, buildHtml(data), "utf8");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  await page.goto(`file://${htmlPath}`, { waitUntil: "load" });

  for (let index = 0; index < data.slides.length; index += 1) {
    const pngPath = path.join(imageDir, `slide-${String(index + 1).padStart(2, "0")}.png`);
    await page.locator(`#slide-${index}`).screenshot({ path: pngPath });
    if (index === 0) {
      await fs.copyFile(pngPath, posterPath);
    }
  }

  await browser.close();
}

async function createNarration(slide, index, voice, rate) {
  const baseName = `slide-${String(index + 1).padStart(2, "0")}`;
  const aiffPath = path.join(audioDir, `${baseName}.aiff`);
  const m4aPath = path.join(audioDir, `${baseName}.m4a`);

  await run("say", ["-v", voice, "-r", String(rate), "-o", aiffPath, slide.narration]);
  await run("ffmpeg", [
    "-y",
    "-i",
    aiffPath,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    m4aPath,
  ]);

  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    m4aPath,
  ]);

  return {
    aiffPath,
    m4aPath,
    durationSeconds: Number.parseFloat(stdout.trim()),
  };
}

async function renderSegment(index, audioPath, durationSeconds) {
  const imagePath = path.join(imageDir, `slide-${String(index + 1).padStart(2, "0")}.png`);
  const segmentPath = path.join(
    segmentDir,
    `segment-${String(index + 1).padStart(2, "0")}.mp4`
  );
  const displayDuration = Number((durationSeconds + 0.6).toFixed(2));
  const fadeOutStart = Math.max(displayDuration - 0.35, 0.2).toFixed(2);
  const audioFadeOutStart = Math.max(displayDuration - 0.25, 0.2).toFixed(2);

  await run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-i",
    audioPath,
    "-filter_complex",
    `[1:a]apad=pad_dur=0.6,atrim=duration=${displayDuration},afade=t=in:st=0:d=0.2,afade=t=out:st=${audioFadeOutStart}:d=0.25[a]`,
    "-map",
    "0:v:0",
    "-map",
    "[a]",
    "-t",
    String(displayDuration),
    "-vf",
    `fps=30,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOutStart}:d=0.35`,
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    segmentPath,
  ]);

  return { segmentPath, displayDuration };
}

async function concatSegments(segmentPaths) {
  const concatPath = path.join(renderRoot, "segments.txt");
  const concatBody = segmentPaths
    .map((segmentPath) => `file '${segmentPath.replaceAll("'", "'\\''")}'`)
    .join("\n");

  await fs.writeFile(concatPath, `${concatBody}\n`, "utf8");
  await run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatPath,
    "-c",
    "copy",
    finalVideoPath,
  ]);
}

async function main() {
  const data = await readData();
  await ensureDirs();
  await renderSlides(data);

  const manifest = [];
  const segmentPaths = [];

  for (let index = 0; index < data.slides.length; index += 1) {
    const slide = data.slides[index];
    const narration = await createNarration(slide, index, data.voice, data.rate);
    const segment = await renderSegment(index, narration.m4aPath, narration.durationSeconds);

    manifest.push({
      id: slide.id,
      title: slide.title,
      image: path.relative(renderRoot, path.join(imageDir, `slide-${String(index + 1).padStart(2, "0")}.png`)),
      audio: path.relative(renderRoot, narration.m4aPath),
      segment: path.relative(renderRoot, segment.segmentPath),
      narrationSeconds: narration.durationSeconds,
      displaySeconds: segment.displayDuration,
    });
    segmentPaths.push(segment.segmentPath);
  }

  await concatSegments(segmentPaths);
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        title: data.title,
        source: data.source,
        generatedAt: new Date().toISOString(),
        output: path.relative(renderRoot, finalVideoPath),
        poster: path.relative(renderRoot, posterPath),
        slides: manifest,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(finalVideoPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
