// Erzeugt icons/*.png: Ring wie auf dem Heute-Bildschirm, darin der kleine Drache mit Zahnspange.
// Aufruf: node tools/icon.mjs  (braucht Google Chrome für die PNG-Ausgabe)
import { writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tierSvg } from "../js/tier.js";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const r = 186, u = 2 * Math.PI * r;
const punkte = Array.from({ length: 15 }, (_, i) => {
  const w = ((i + 1) / 16) * 2 * Math.PI - Math.PI / 2;
  return `<circle cx="${(256 + r * Math.cos(w)).toFixed(1)}" cy="${(256 + r * Math.sin(w)).toFixed(1)}" r="5" fill="#fff" opacity=".85"/>`;
}).join("");
const tier = tierSvg({ art: "drache", stufe: 5, bewegt: false }).replace("<svg ", '<svg x="70" y="34" width="372" height="372" ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#FBF5E9"/>
  <circle cx="256" cy="268" r="150" fill="#E6F4EA"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="#EFE6D2" stroke-width="40"/>
  <circle cx="256" cy="256" r="${r}" fill="none" stroke="#1C7F52" stroke-width="40" stroke-linecap="round"
    stroke-dasharray="${u}" stroke-dashoffset="${u * 0.25}" transform="rotate(-90 256 256)"/>
  ${punkte}
  ${tier}
</svg>`;

const ordner = mkdtempSync(join(tmpdir(), "icon-"));
for (const [name, groesse] of [["icon-512", 512], ["icon-192", 192], ["apple-touch-icon", 180]]) {
  const html = join(ordner, `${name}.html`);
  writeFileSync(html, `<!doctype html><html><body style="margin:0;overflow:hidden">${svg.replace('width="512" height="512"', `width="${groesse}" height="${groesse}"`)}</body></html>`);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${groesse},${groesse}`,
    `--screenshot=${join(process.cwd(), "icons", `${name}.png`)}`, `file://${html}`], { stdio: "ignore" });
}
writeFileSync("icons/icon.svg", svg);
console.log("Icons geschrieben");
