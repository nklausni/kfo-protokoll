// Das Protokoll bleibt auf dem Gerät. Es liegt doppelt vor: im localStorage (schnell, synchron)
// und als Spiegel in der IndexedDB, dort zusätzlich als Tagesstand der letzten 30 Tage.
// Fehlt eine der Kopien oder ist sie kaputt, gewinnt beim Start die andere.
import { ueberschneidung } from "./auswertung.js";
import { tagText } from "./zeit.js";

// Der Schlüssel bleibt "…-v1", auch wenn das Format wächst. Neue Felder ergänzt migriere().
const SCHLUESSEL = "kfo-protokoll-v1";
const DEFEKT = "kfo-protokoll-defekt";
const SCHEMA = 1;
const DB_NAME = "kfo-protokoll";
const VERLAUF_TAGE = 30;

const leer = () => ({
  schema: SCHEMA,
  rev: 0,          // zählt jede Änderung hoch, damit beim Abgleich die neuere Kopie gewinnt
  geaendert: 0,
  name: "",
  tier: { art: null, name: "", sache: null },
  ziele: [{ ab: "2000-01-01", stunden: 16 }],  // Tagesziel ab einem Tag, aufsteigend
  eintraege: [],   // { id, tag: "JJJJ-MM-TT", von: "HH:MM", bis: "HH:MM" }
  abzeichen: {},   // Abzeichen-ID -> Zeitpunkt
  sicherungen: [], // Zeitpunkte der CSV-Exporte
  gefeiert: { stufe: 0, sachen: 0, woche: null },
  ton: true,
});

// Altes Format -> aktuelles Format. Vorhandene Werte gewinnen immer gegen die Vorgaben.
export function migriere(alt) {
  const basis = leer();
  return {
    ...basis,
    ...alt,
    tier: { ...basis.tier, ...alt.tier },
    gefeiert: { ...basis.gefeiert, ...alt.gefeiert },
    schema: SCHEMA,
  };
}

let lsFehler = false;

function lesen() {
  let roh = null;
  try {
    roh = localStorage.getItem(SCHLUESSEL);
    return roh ? migriere(JSON.parse(roh)) : null;
  } catch {
    // Unlesbares nie überschreiben, sondern beiseitelegen. abgleichen() holt dann die IndexedDB-Kopie.
    try { if (roh) localStorage.setItem(`${DEFEKT}-${Date.now()}`, roh); } catch { /* nichts zu retten */ }
    return null;
  }
}

let stand = lesen() ?? leer();

// ---------------------------------------------------------------- IndexedDB
let dbVersprechen = null;
function db() {
  dbVersprechen ??= new Promise((ok, fehler) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("stand");
      r.result.createObjectStore("verlauf");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fehler(r.error);
  });
  return dbVersprechen;
}

async function anfrage(store, art, machen) {
  const d = await db();
  return new Promise((ok, fehler) => {
    const tx = d.transaction(store, art);
    const r = machen(tx.objectStore(store));
    tx.oncomplete = () => ok(r?.result);
    tx.onerror = () => fehler(tx.error);
    tx.onabort = () => fehler(tx.error);
  });
}
const idbLesen = (store, k) => anfrage(store, "readonly", (s) => s.get(k));
const idbSchreiben = (store, k, wert) => anfrage(store, "readwrite", (s) => s.put(wert, k));
const idbSchluessel = (store) => anfrage(store, "readonly", (s) => s.getAllKeys());

async function verlaufAufraeumen() {
  const alt = (await idbSchluessel("verlauf")).sort().slice(0, -VERLAUF_TAGE);
  if (alt.length) await anfrage("verlauf", "readwrite", (s) => { alt.forEach((k) => s.delete(k)); });
}

function spiegeln(roh) {
  if (!window.indexedDB) return;
  idbSchreiben("stand", "aktuell", roh).catch(() => {});
  idbSchreiben("verlauf", tagText(), roh).then(verlaufAufraeumen).catch(() => {});
}

function sichern() {
  stand.rev = (stand.rev ?? 0) + 1;
  stand.geaendert = Date.now();
  const roh = JSON.stringify(stand);
  try {
    localStorage.setItem(SCHLUESSEL, roh);
    lsFehler = false;
  } catch {
    lsFehler = true; // privater Modus o. Ä.: Die IndexedDB-Kopie trägt dann allein
  }
  spiegeln(roh);
}

const mitFrist = (p, ms) => Promise.race([p, new Promise((_, f) => setTimeout(() => f(new Error("Frist")), ms))]);
const besser = (a, b) => a.rev > b.rev || (!b.eintraege.length && a.eintraege.length > 0);

/**
 * Beim Start: localStorage und IndexedDB vergleichen und die bessere Kopie nehmen.
 * @returns {Promise<boolean>} true, wenn der Stand aus der IndexedDB übernommen wurde
 */
export async function abgleichen() {
  if (!window.indexedDB) return false;
  try {
    const roh = await mitFrist(idbLesen("stand", "aktuell"), 2500);
    const kopie = roh ? migriere(JSON.parse(roh)) : null;
    if (kopie && besser(kopie, stand)) {
      stand = kopie;
      try { localStorage.setItem(SCHLUESSEL, JSON.stringify(stand)); } catch { lsFehler = true; }
      return true;
    }
    if (!kopie || stand.rev > kopie.rev) spiegeln(JSON.stringify(stand));
  } catch {
    // ohne IndexedDB bleibt der localStorage
  }
  return false;
}

// Bittet den Browser, die Daten nie von sich aus zu löschen. Safari entscheidet selbst, Chrome nach Nutzung.
export async function dauerhaftAnfragen() {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? null;
  } catch {
    return null;
  }
}

export const speicherFehler = () => lsFehler;

// ---------------------------------------------------------------- Zugriff
export const get = () => stand;

export function setze(teil) {
  Object.assign(stand, teil);
  sichern();
}

const neueId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sortiere = () => stand.eintraege.sort((a, b) => (a.tag + a.von).localeCompare(b.tag + b.von));

export function speichereEintrag({ id, tag, von, bis }) {
  const e = { id: id ?? neueId(), tag, von, bis };
  const i = stand.eintraege.findIndex((x) => x.id === e.id);
  if (i >= 0) stand.eintraege[i] = e;
  else stand.eintraege.push(e);
  sortiere();
  sichern();
  return e;
}

export function loescheEintrag(id) {
  const i = stand.eintraege.findIndex((x) => x.id === id);
  if (i < 0) return null;
  const [e] = stand.eintraege.splice(i, 1);
  sichern();
  return e;
}

// Für "Rückgängig" nach dem Löschen
export function stelleWiederHer(e) {
  if (ueberschneidung(e, stand.eintraege)) return false;
  stand.eintraege.push(e);
  sortiere();
  sichern();
  return true;
}

/**
 * Sicherung einspielen: Es kommen nur Einträge dazu, vorhandene bleiben unangetastet.
 * @returns {{neu:number, doppelt:number, konflikt:number}}
 */
export function importiere(liste) {
  let neu = 0, doppelt = 0, konflikt = 0;
  for (const e of liste) {
    if (stand.eintraege.some((x) => x.tag === e.tag && x.von === e.von && x.bis === e.bis)) { doppelt++; continue; }
    const kandidat = { ...e, id: neueId() };
    if (ueberschneidung(kandidat, stand.eintraege)) { konflikt++; continue; }
    stand.eintraege.push(kandidat);
    neu++;
  }
  if (neu) { sortiere(); sichern(); }
  return { neu, doppelt, konflikt };
}

// Ein neues Tagesziel gilt ab heute, frühere Tage behalten ihr altes Ziel
export function setzeZiel(stunden) {
  const heute = tagText();
  stand.ziele = [...stand.ziele.filter((z) => z.ab < heute), { ab: heute, stunden }];
  sichern();
}

export function merkeSicherung() {
  stand.sicherungen = [...stand.sicherungen, Date.now()];
  sichern();
}
