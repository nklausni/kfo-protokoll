import { test } from "node:test";
import assert from "node:assert/strict";
import { stuecke, proTag, pruefeEintrag, auswerten, dauerMin, haeufigeZeiten, wochenQuote, sterneFuer, prozent, quoteProzent } from "../js/auswertung.js";
import { kalenderwoche, montagVon, plusTage, wochentag, dauerText, tagLang } from "../js/zeit.js";
import { zuCsv, ausCsv } from "../js/csv.js";
import { stufeVon, freieSachen } from "../js/tier.js";

const e = (tag, von, bis, id = `${tag}-${von}`) => ({ id, tag, von, bis });
const stand = (eintraege, ziele = [{ ab: "2000-01-01", stunden: 16 }]) => ({ eintraege, ziele });
// Mittwoch, 8. Oktober 2026, 14:00 Uhr Ortszeit
const JETZT = new Date(2026, 9, 8, 14, 0);

test("Datum: Wochentag, Montag und Kalenderwoche", () => {
  assert.equal(wochentag("2026-10-08"), 4); // Donnerstag
  assert.equal(montagVon("2026-10-08"), "2026-10-05");
  assert.equal(montagVon("2026-10-05"), "2026-10-05");
  assert.equal(kalenderwoche("2026-10-08"), 41);
  assert.equal(kalenderwoche("2027-01-01"), 53); // gehört zur letzten Woche von 2026
  assert.equal(kalenderwoche("2026-01-01"), 1);
  assert.equal(plusTage("2026-03-28", 2), "2026-03-30"); // über die Zeitumstellung
  assert.equal(tagLang("2026-10-08"), "Donnerstag, 8. Oktober");
  assert.equal(dauerText(630), "10 h 30 min");
  assert.equal(dauerText(960), "16 h");
});

test("Nacht über Mitternacht wird geteilt", () => {
  const teile = stuecke(e("2026-10-07", "20:30", "07:00"));
  assert.deepEqual(teile.map((t) => [t.tag, t.von, t.bis]), [["2026-10-07", 1230, 1440], ["2026-10-08", 0, 420]]);
  assert.equal(dauerMin("20:30", "07:00"), 630);
  assert.equal(stuecke(e("2026-10-07", "20:00", "00:00")).length, 1); // endet genau um Mitternacht
});

test("Tagessummen aus Nacht und Nachmittag", () => {
  const tage = proTag([e("2026-10-06", "20:30", "07:00"), e("2026-10-07", "14:00", "19:00"), e("2026-10-07", "20:30", "07:00")]);
  assert.equal(tage.get("2026-10-06").minuten, 210);
  assert.equal(tage.get("2026-10-07").minuten, 420 + 300 + 210); // 15,5 h
  assert.equal(tage.get("2026-10-08").minuten, 420);
});

test("Überschneidungen werden abgelehnt, auch über Mitternacht", () => {
  const alle = [e("2026-10-07", "20:30", "07:00")];
  assert.equal(pruefeEintrag(e("2026-10-08", "06:00", "08:00", "neu"), alle, JETZT).ok, false);
  assert.equal(pruefeEintrag(e("2026-10-08", "07:00", "08:00", "neu"), alle, JETZT).ok, true);
  // Beim Bearbeiten stört der Eintrag sich nicht selbst
  assert.equal(pruefeEintrag({ ...alle[0], bis: "06:30" }, alle, JETZT).ok, true);
});

test("Morgens 'heute' statt 'gestern' gewählt: Vorschlag für gestern", () => {
  const morgens = new Date(2026, 9, 8, 7, 30);
  const p = pruefeEintrag(e("2026-10-08", "20:30", "07:00", "neu"), [], morgens);
  assert.equal(p.ok, false);
  assert.equal(p.vorschlag.tag, "2026-10-07");
  assert.equal(pruefeEintrag(p.vorschlag, [], morgens).ok, true);
});

test("Zukunft, gleiche Zeiten und laufende Zeiten", () => {
  assert.equal(pruefeEintrag(e("2026-10-09", "08:00", "09:00"), [], JETZT).ok, false);
  assert.equal(pruefeEintrag(e("2026-10-08", "08:00", "08:00"), [], JETZT).ok, false);
  const laeuft = pruefeEintrag(e("2026-10-08", "13:00", "07:00"), [], JETZT);
  assert.equal(laeuft.ok, true);
  assert.match(laeuft.hinweis, /morgen 7:00/);
});

test("Serie: heute bricht sie nicht, ein verpasster Tag schon", () => {
  const voll = (tag) => [e(plusTage(tag, -1), "20:00", "08:00", `${tag}a`), e(tag, "14:00", "18:00", `${tag}b`)];
  // 4.–7.10. jeweils 8 h aus der Nacht davor + 4 h + 4 h aus der Nacht danach = 16 h.
  // Der 3.10. hat nur 4 h (Protokollbeginn), der 8.10. (heute) bisher 8 h.
  const eintraege = [...["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"].flatMap(voll), e("2026-10-07", "20:00", "08:00", "letzte")];
  const a = auswerten(stand(eintraege), JETZT);
  assert.equal(a.start, "2026-10-03");
  assert.equal(a.geschafft("2026-10-03"), false);
  assert.equal(a.geschafft("2026-10-05"), true);
  assert.equal(a.serie, 4);
  assert.equal(a.besteSerie, 4);
  assert.equal(a.erfuellt, 4);
  const mitLuecke = auswerten(stand(eintraege.filter((x) => x.id !== "2026-10-06b")), JETZT);
  assert.equal(mitLuecke.serie, 1);
});

test("Tagesziel gilt ab dem Tag der Änderung", () => {
  const ziele = [{ ab: "2000-01-01", stunden: 16 }, { ab: "2026-10-08", stunden: 14 }];
  const a = auswerten(stand([e("2026-10-07", "08:00", "23:00")], ziele), JETZT);
  assert.equal(a.ziel("2026-10-07"), 960);
  assert.equal(a.ziel("2026-10-08"), 840);
});

test("CSV hin und zurück verliert nichts", () => {
  const eintraege = [e("2026-10-07", "20:30", "07:00"), e("2026-10-07", "14:00", "18:15"), e("2026-10-08", "13:05", "14:00")];
  const csv = zuCsv(eintraege);
  assert.ok(csv.startsWith("﻿Datum;Wochentag;Von;Bis;Dauer (Std.)"));
  assert.match(csv, /2026-10-07;Mi;20:30;07:00;10,50/);
  const { eintraege: zurueck, fehler } = ausCsv(csv);
  assert.deepEqual(fehler, []);
  assert.deepEqual(zurueck, [...eintraege].sort((a, b) => (a.tag + a.von).localeCompare(b.tag + b.von)).map(({ tag, von, bis }) => ({ tag, von, bis })));
});

test("CSV aus Excel: Komma, deutsches Datum, 24:00, kaputte Zeile", () => {
  const text = 'Datum,Wochentag,Von,Bis\r\n"07.10.2026",Mi,20:30,24:00\r\n8.10.26,Do,7.15,9.00\r\nquatsch,,,\r\n';
  const { eintraege, fehler } = ausCsv(text);
  assert.deepEqual(eintraege, [
    { tag: "2026-10-07", von: "20:30", bis: "00:00" },
    { tag: "2026-10-08", von: "07:15", bis: "09:00" },
  ]);
  assert.deepEqual(fehler, [4]);
});

test("Häufige Zeiten für die Schnellwahl", () => {
  const liste = haeufigeZeiten([e("2026-10-05", "20:30", "07:00"), e("2026-10-06", "20:30", "07:00"), e("2026-10-06", "14:00", "18:00")]);
  assert.deepEqual(liste.map((v) => `${v.von}-${v.bis}`), ["20:30-07:00", "14:00-18:00"]);
});

test("Tier-Stufen und Sachen", () => {
  assert.equal(stufeVon(0), 0);
  assert.equal(stufeVon(3), 3);
  assert.equal(stufeVon(6), 3);
  assert.equal(stufeVon(7), 4);
  assert.equal(stufeVon(10000), 12);
  assert.deepEqual(freieSachen(7).map((s) => s.id), ["schleife", "brille"]);
});

test("Wochenquote stufenlos, pro Tag höchstens 100 %", () => {
  const tag = (stunden) => ({ minuten: stunden * 60, ziel: 960 });
  assert.equal(wochenQuote([tag(16), tag(16)]), 1);
  assert.equal(wochenQuote([tag(8), tag(16)]), 0.75);
  assert.equal(wochenQuote([tag(20), tag(12)]), 0.875); // Überstunden gleichen nichts aus
  assert.equal(sterneFuer(wochenQuote(Array(7).fill(tag(16)))), 3);
  assert.equal(sterneFuer(wochenQuote([...Array(6).fill(tag(16)), { minuten: 959, ziel: 960 }])), 2);
});

test("Prozente sind ganzzahlig und abgerundet", () => {
  assert.equal(prozent(959, 960), 99); // 100 % erst, wenn das Ziel wirklich erreicht ist
  assert.equal(prozent(960, 960), 100);
  assert.equal(prozent(1020, 960), 106);
  assert.equal(prozent(0, 960), 0);
  assert.equal(quoteProzent(0.86), 86);
  assert.equal(quoteProzent(0.29), 29);
  assert.equal(quoteProzent(6.5 / 7), 92);
});
