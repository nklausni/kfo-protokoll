// Alles, was sich aus den Einträgen ableiten lässt: Stunden pro Tag, Serien, Wochen, Sterne.
// Tier, Sachen und Abzeichen hängen nur hiervon ab. Darum stellt eine eingespielte
// CSV-Sicherung den kompletten Fortschritt wieder her.
import { zeitMin, plusTage, tagIndex, tagText, minutenJetzt, montagVon, kalenderwoche, tagKurz, zeitText } from "./zeit.js";

export const TAG_MIN = 1440;
export const STANDARD_ZIEL = 16;

// Von 20:30 bis 07:00 sind 630 Minuten. Gleiche Zeiten ergeben 0 (ungültig).
export function dauerMin(von, bis) {
  const d = zeitMin(bis) - zeitMin(von);
  return d < 0 ? d + TAG_MIN : d;
}

// Absolute Minuten [Beginn, Ende) auf einer durchgehenden Zeitachse
export function spanne(e) {
  const a = tagIndex(e.tag) * TAG_MIN + zeitMin(e.von);
  return [a, a + dauerMin(e.von, e.bis)];
}

// Ein Eintrag über Mitternacht wird geteilt: bis 24:00 zählt zum Starttag, ab 0:00 zum Folgetag.
// von/bis der Stücke sind Minuten seit Tagesbeginn (0–1440).
export function stuecke(e) {
  const v = zeitMin(e.von);
  const ende = v + dauerMin(e.von, e.bis);
  if (ende <= TAG_MIN) return [{ tag: e.tag, von: v, bis: ende, eintrag: e }];
  return [
    { tag: e.tag, von: v, bis: TAG_MIN, eintrag: e },
    { tag: plusTage(e.tag, 1), von: 0, bis: ende - TAG_MIN, eintrag: e },
  ];
}

export function proTag(eintraege) {
  const tage = new Map();
  for (const e of eintraege) {
    for (const st of stuecke(e)) {
      const t = tage.get(st.tag) ?? { minuten: 0, stuecke: [] };
      t.minuten += st.bis - st.von;
      t.stuecke.push(st);
      tage.set(st.tag, t);
    }
  }
  for (const t of tage.values()) {
    t.minuten = Math.min(TAG_MIN, t.minuten);
    t.stuecke.sort((a, b) => a.von - b.von);
  }
  return tage;
}

export function ueberschneidung(e, alle) {
  const [a, b] = spanne(e);
  return alle.find((x) => {
    if (x.id === e.id) return false;
    const [c, d] = spanne(x);
    return a < d && c < b;
  }) ?? null;
}

// Erlaubt ist, was schon begonnen hat (eine Stunde Spielraum, falls die Spange gleich reinkommt)
const SPIELRAUM = 60;

/**
 * Prüft einen neuen oder geänderten Eintrag.
 * @returns {{ok:boolean, fehler?:string, vorschlag?:object, nacht?:boolean, hinweis?:string}}
 *   vorschlag: derselbe Eintrag für gestern, wenn "heute" gewählt ist, die Zeit aber noch nicht begonnen hat
 *   nacht: der Eintrag geht über Mitternacht
 */
export function pruefeEintrag(e, alle, jetzt = new Date()) {
  if (!e.tag || !e.von || !e.bis) return { ok: false, fehler: "Trag bitte ein, von wann bis wann." };
  if (e.von === e.bis) return { ok: false, fehler: "Von und Bis sind gleich." };
  const heute = tagText(jetzt);
  if (e.tag > heute) return { ok: false, fehler: "Dieser Tag liegt noch in der Zukunft." };

  const jetztAbs = tagIndex(heute) * TAG_MIN + minutenJetzt(jetzt);
  const [a, b] = spanne(e);
  if (a > jetztAbs + SPIELRAUM) {
    // Morgens wird oft "heute" gewählt, gemeint ist aber die letzte Nacht
    const gestern = { ...e, tag: plusTage(e.tag, -1) };
    const passt = e.tag === heute && spanne(gestern)[0] <= jetztAbs + SPIELRAUM && !ueberschneidung(gestern, alle);
    return {
      ok: false,
      fehler: "Diese Zeit liegt noch in der Zukunft. Trag sie ein, sobald die Spange drin ist.",
      vorschlag: passt ? gestern : null,
      nacht: zeitMin(e.bis) < zeitMin(e.von),
    };
  }
  const k = ueberschneidung(e, alle);
  if (k) {
    return { ok: false, fehler: `Das überschneidet sich mit ${zeitText(k.von)}–${zeitText(k.bis)} (${tagKurz(k.tag)}).` };
  }
  if (b > jetztAbs) {
    const morgen = b > (tagIndex(heute) + 1) * TAG_MIN;
    return { ok: true, hinweis: `Läuft noch bis ${morgen ? "morgen " : ""}${zeitText(e.bis)} Uhr.` };
  }
  return { ok: true };
}

// Die häufigsten Zeiten der letzten Wochen, für die Schnellwahl
export function haeufigeZeiten(eintraege, anzahl = 3) {
  const zaehler = new Map();
  eintraege.slice(-60).forEach((e, i) => {
    const k = `${e.von}-${e.bis}`;
    const z = zaehler.get(k) ?? { von: e.von, bis: e.bis, n: 0, zuletzt: 0 };
    z.n++;
    z.zuletzt = i;
    zaehler.set(k, z);
  });
  return [...zaehler.values()].sort((a, b) => b.n - a.n || b.zuletzt - a.zuletzt).slice(0, anzahl);
}

export const istNacht = (von, bis) => zeitMin(bis) < zeitMin(von) || zeitMin(von) >= 19 * 60 || zeitMin(von) < 5 * 60;

export function zielFuer(tag, ziele) {
  let stunden = STANDARD_ZIEL;
  for (const z of ziele) if (z.ab <= tag) stunden = z.stunden;
  return stunden * 60;
}

/**
 * Erfüllungsquote einer Woche, 0 bis 1.
 * @param {{tag:string, minuten:number, ziel:number}[]} tage  die Tage, die schon zählen
 *   (nie leer; Tage vor Protokollbeginn, künftige Tage und ein noch nicht geschafftes Heute sind schon herausgefiltert)
 * @returns {number}
 */
export function wochenQuote(tage) {
  // Stufenlos: Jeder Tag zählt mit seinem Anteil am Ziel, höchstens aber 100 %.
  // Mehr Stunden an einem Tag gleichen einen anderen Tag nicht aus, es kommt auf jeden Tag an.
  const summe = tage.reduce((s, d) => s + Math.min(1, d.minuten / d.ziel), 0);
  return summe / tage.length;
}

// Abgerundet, damit 100 % nur erscheint, wenn das Ziel wirklich erreicht ist
export const prozent = (min, ziel) => Math.floor((min * 100) / ziel + 1e-9);
export const quoteProzent = (quote) => Math.floor(quote * 100 + 1e-9);

export function sterneFuer(quote) {
  if (quote == null) return 0;
  if (quote >= 1) return 3;
  if (quote >= 0.85) return 2;
  if (quote >= 0.7) return 1;
  return 0;
}

/** Alle Kennzahlen auf einen Blick, einmal pro Bildschirm berechnet. */
export function auswerten(stand, jetzt = new Date()) {
  const heute = tagText(jetzt);
  const tage = proTag(stand.eintraege);
  const minuten = (t) => tage.get(t)?.minuten ?? 0;
  const ziel = (t) => zielFuer(t, stand.ziele);
  const geschafft = (t) => minuten(t) >= ziel(t);
  const start = [...tage.keys()].filter((t) => t <= heute).sort()[0] ?? null;

  let erfuellt = 0, serie = 0, besteSerie = 0;
  if (start) {
    for (let t = start; t <= heute; t = plusTage(t, 1)) {
      if (geschafft(t)) { erfuellt++; serie++; besteSerie = Math.max(besteSerie, serie); }
      else if (t !== heute) serie = 0; // Heute ist noch nicht vorbei und bricht die Serie nicht
    }
  }

  function woche(montag) {
    const liste = Array.from({ length: 7 }, (_, i) => {
      const t = plusTage(montag, i);
      return {
        tag: t, minuten: minuten(t), ziel: ziel(t), geschafft: geschafft(t),
        heute: t === heute, zukunft: t > heute, vorStart: !start || t < start,
      };
    });
    const zaehlend = liste.filter((d) => !d.zukunft && !d.vorStart && (!d.heute || d.geschafft));
    const quote = zaehlend.length ? Math.max(0, Math.min(1, wochenQuote(zaehlend) ?? 0)) : null;
    return {
      montag, kw: kalenderwoche(montag), tage: liste, quote, sterne: sterneFuer(quote),
      geschafft: liste.filter((d) => d.geschafft && !d.zukunft).length,
      fertig: plusTage(montag, 6) < heute,
    };
  }

  // Sterne gibt es nur für abgeschlossene Wochen
  const wochen = [];
  if (start) {
    const diese = montagVon(heute);
    for (let m = montagVon(start); m < diese; m = plusTage(m, 7)) wochen.push(woche(m));
  }
  const sterne = wochen.reduce((s, w) => s + w.sterne, 0);

  let gesamt = 0;
  for (const [t, d] of tage) if (t <= heute) gesamt += d.minuten;

  return {
    heute, tage, start, minuten, ziel, geschafft, woche, wochen, sterne, erfuellt, serie, besteSerie,
    volleWochen: wochen.filter((w) => w.sterne === 3).length,
    gesamtMinuten: gesamt,
    anzahl: stand.eintraege.length,
  };
}
