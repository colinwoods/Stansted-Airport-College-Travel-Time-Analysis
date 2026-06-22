import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://127.0.0.1:5180/";
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3500);

const DEST = [0.21590254232830522, 51.87615217641031];

// --- Zoom-drift check: the college dot must sit on its projected coordinate at
//     every zoom. Measure dot-center vs map.project(dest) at two zooms. ---
async function driftAt(zoom) {
  await page.evaluate(
    ([c, z]) => window.__map.jumpTo({ center: c, zoom: z }),
    [DEST, zoom],
  );
  await page.waitForTimeout(1200);
  return page.evaluate((dest) => {
    const map = window.__map;
    const p = map.project(dest);
    const canvas = map.getCanvas().getBoundingClientRect();
    const ring = document.querySelector(".dest-marker__ring").getBoundingClientRect();
    const cx = ring.left + ring.width / 2 - canvas.left;
    const cy = ring.top + ring.height / 2 - canvas.top;
    return { dx: +(cx - p.x).toFixed(2), dy: +(cy - p.y).toFixed(2) };
  }, DEST);
}
const d10 = await driftAt(10);
const d13 = await driftAt(13);
console.log("DRIFT z10:", JSON.stringify(d10), "z13:", JSON.stringify(d13));
const drift = Math.hypot(d13.dx - d10.dx, d13.dy - d10.dy);
console.log("DRIFT delta between zooms (px):", drift.toFixed(2), drift < 2 ? "PASS" : "FAIL");

// screenshots at the two zooms for eyeballing the dot stays on the airport
await page.evaluate(([c]) => window.__map.jumpTo({ center: c, zoom: 10 }), [DEST]);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/v-zoom10.png` });
await page.evaluate(([c]) => window.__map.jumpTo({ center: c, zoom: 13 }), [DEST]);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/v-zoom13.png` });

// --- Hover a route line -> tooltip-ish label + highlight (use a panel row hover) ---
await page.evaluate(() => window.__map.fitBounds([[ -0.35,51.62],[0.75,52.1]], { padding: 60, duration: 0 }));
await page.waitForTimeout(800);
await page.locator("[data-trip]").nth(0).hover();
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/v-rowhover.png` });

// --- Split view ---
await page.getByRole("button", { name: /Compare side by side/i }).click();
await page.waitForTimeout(3000);
await page.screenshot({ path: `${OUT}/v-split.png` });

// hover a route in the left (car) pane to reveal a label
const box = page.viewportSize();
await page.mouse.move(box.width * 0.25, box.height * 0.55);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/v-split-hover.png` });

await page.getByRole("button", { name: /Exit split/i }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/v-exitsplit.png` });

console.log("CONSOLE ERRORS:", errors.length ? JSON.stringify(errors, null, 2) : "none");
await browser.close();
