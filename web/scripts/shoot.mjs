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
await page.waitForTimeout(3500); // let basemap tiles + fonts + fitBounds settle

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot:", name);
}

// 1. Default (difference) view
await shot("01-diff");

// 2. Car view
await page.getByRole("button", { name: /^Car/ }).click();
await page.waitForTimeout(1200);
await shot("02-car");

// 3. Transit view
await page.getByRole("button", { name: /^Transit/ }).click();
await page.waitForTimeout(1200);
await shot("03-transit");

// 4. Back to difference + select the top row (best switch candidate)
await page.getByRole("button", { name: /^Difference/ }).click();
await page.waitForTimeout(800);
const firstRow = page.locator("[data-trip]").first();
await firstRow.click();
await page.waitForTimeout(800);
await shot("04-diff-selected");

// 5. Print layout (emulate print media so the sidebar collapses)
await page.emulateMedia({ media: "print" });
await page.waitForTimeout(500);
await page.evaluate(() => {
  // mimic the print resize the app does on the afterprint path
  window.dispatchEvent(new Event("resize"));
});
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/05-print.png`, fullPage: false });
console.log("shot: 05-print");
await page.emulateMedia({ media: "screen" });

console.log("CONSOLE ERRORS:", errors.length ? JSON.stringify(errors, null, 2) : "none");
await browser.close();
