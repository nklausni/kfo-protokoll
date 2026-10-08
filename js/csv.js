// Sicherung als CSV: eine Zeile pro Eintrag, so wie er eingegeben wurde.
// Semikolon und Dezimalkomma, damit Excel und Numbers die Datei mit deutschen Einstellungen direkt öffnen.
import { dauerMin } from "./auswertung.js";
import { WT_KURZ, wochentag } from "./zeit.js";

const KOPF = ["Datum", "Wochentag", "Von", "Bis", "Dauer (Std.)"];

export function zuCsv(eintraege) {
  const zeilen = [...eintraege]
    .sort((a, b) => (a.tag + a.von).localeCompare(b.tag + b.von))
    .map((e) => [e.tag, WT_KURZ[wochentag(e.tag)], e.von, e.bis, (dauerMin(e.von, e.bis) / 60).toFixed(2).replace(".", ",")]);
  // BOM, damit Excel die Umlaute als UTF-8 liest
  return "﻿" + [KOPF, ...zeilen].map((z) => z.join(";")).join("\r\n") + "\r\n";
}

function datum(text) {
  let j, m, t;
  let treffer = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (treffer) [, j, m, t] = treffer.map(Number);
  else if ((treffer = text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/))) {
    [, t, m, j] = treffer.map(Number);
    if (j < 100) j += 2000;
  } else return null;
  const d = new Date(Date.UTC(j, m - 1, t));
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== t) return null;
  return `${j}-${String(m).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
}

function zeit(text) {
  const treffer = text.match(/^(\d{1,2})[:.](\d{2})$/);
  if (!treffer) return null;
  let [h, m] = [Number(treffer[1]), Number(treffer[2])];
  if (h === 24 && m === 0) h = 0; // 24:00 ist Mitternacht
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Liest eine Sicherung. Versteht auch Dateien, die in Excel/Numbers bearbeitet
 * und mit Komma oder Tabulator gespeichert wurden.
 * @returns {{eintraege:{tag:string,von:string,bis:string}[], fehler:number[]}} fehler = Zeilennummern
 */
export function ausCsv(text) {
  const zeilen = text.replace(/^﻿/, "").split(/\r?\n/);
  const erste = zeilen.find((z) => z.trim()) ?? "";
  const trenner = [";", "\t", ","].sort((a, b) => erste.split(b).length - erste.split(a).length)[0];
  const felder = (z) => z.split(trenner).map((f) => f.trim().replace(/^"(.*)"$/, "$1").trim());

  let spalten = { datum: 0, von: 2, bis: 3 };
  let ab = 0;
  const kopf = felder(erste).map((f) => f.toLowerCase());
  if (kopf.some((f) => f.startsWith("datum"))) {
    spalten = { datum: kopf.findIndex((f) => f.startsWith("datum")), von: kopf.findIndex((f) => f === "von"), bis: kopf.findIndex((f) => f === "bis") };
    ab = zeilen.indexOf(erste) + 1;
  } else if (felder(erste).length < 4) {
    spalten = { datum: 0, von: 1, bis: 2 };
  }

  const eintraege = [];
  const fehler = [];
  zeilen.forEach((z, i) => {
    if (i < ab || !z.trim()) return;
    const f = felder(z);
    const e = { tag: datum(f[spalten.datum] ?? ""), von: zeit(f[spalten.von] ?? ""), bis: zeit(f[spalten.bis] ?? "") };
    if (e.tag && e.von && e.bis && e.von !== e.bis) eintraege.push(e);
    else fehler.push(i + 1);
  });
  return { eintraege, fehler };
}
