import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://127.0.0.1:5180/";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3500);

// 1. Scatter axis labels (diff view is default) — crop the scatter card
await page.screenshot({ path: "shots/a-diff.png" });
const scatter = page.locator("svg[role=img]").first();
await scatter.screenshot({ path: "shots/a-scatter.png" });

// 2. Split-view camera sync: move the CAR map, the TRANSIT map must follow
await page.getByRole("button", { name: /Compare side by side/i }).click();
await page.waitForTimeout(3000);
await page.evaluate(() =>
  window.__carMap.jumpTo({ center: [0.45, 51.95], zoom: 11.3, bearing: 18, pitch: 0 }),
);
await page.waitForTimeout(900);
const sync = await page.evaluate(() => {
  const a = window.__carMap, b = window.__transitMap;
  const ca = a.getCenter(), cb = b.getCenter();
  return {
    dLng: +(ca.lng - cb.lng).toFixed(5),
    dLat: +(ca.lat - cb.lat).toFixed(5),
    dZoom: +(a.getZoom() - b.getZoom()).toFixed(4),
    dBearing: +(a.getBearing() - b.getBearing()).toFixed(3),
  };
});
const synced = Math.abs(sync.dLng) < 1e-4 && Math.abs(sync.dLat) < 1e-4 && Math.abs(sync.dZoom) < 1e-3 && Math.abs(sync.dBearing) < 1e-2;
console.log("SPLIT SYNC delta:", JSON.stringify(sync), synced ? "PASS" : "FAIL");
await page.screenshot({ path: "shots/a-split-synced.png" });
await page.getByRole("button", { name: /Exit split/i }).click();
await page.waitForTimeout(1200);

// 3. Print: light basemap, route colours preserved. Stub window.print so the
//    dialog doesn't block and printMode stays true for the screenshot.
await page.evaluate(() => { window.print = () => {}; });
await page.getByRole("button", { name: /Export map/i }).click();
await page.waitForTimeout(2500);
const styleName = await page.evaluate(() => {
  try { return window.__map.getStyle()?.name || "(unnamed)"; } catch { return "(no map)"; }
});
console.log("PRINT basemap style name:", JSON.stringify(styleName));
await page.screenshot({ path: "shots/a-print-light.png" });

console.log("CONSOLE ERRORS:", errors.length ? JSON.stringify(errors, null, 2) : "none");
await browser.close();
