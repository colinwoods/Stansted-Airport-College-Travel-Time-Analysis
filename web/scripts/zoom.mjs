import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.env.URL || "http://127.0.0.1:5180/";
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
await page.waitForTimeout(3500);

async function fly(center, zoom) {
  await page.evaluate(
    ([c, z]) => window.__map.flyTo({ center: c, zoom: z, duration: 0 }),
    [center, zoom],
  );
  await page.waitForTimeout(2500);
}

// Diff view (default), zoom into the dense Bishop's Stortford / Stansted cluster
await fly([0.14, 51.86], 10.4);
await page.screenshot({ path: "shots/zoom-diff-cluster.png" });
console.log("shot: zoom-diff-cluster");

// Tight on the college convergence point
await fly([0.205, 51.872], 12.2);
await page.screenshot({ path: "shots/zoom-diff-converge.png" });
console.log("shot: zoom-diff-converge");

await browser.close();
