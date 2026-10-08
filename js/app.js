import * as sp from "./speicher.js";
import { auswerten, stuecke, pruefeEintrag, dauerMin, haeufigeZeiten, istNacht, prozent, quoteProzent } from "./auswertung.js";
import {
  tagText, plusTage, tagIndex, tagLang, tagKurz, tagRelativ, montagVon, wochentag, zeitText, zeitMin, minText,
  dauerText, uhrzeit, tageZwischen, WT_KURZ, MONATE,
} from "./zeit.js";
import { zuCsv, ausCsv } from "./csv.js";
import { tierSvg, sacheSvg, ARTEN, STUFEN, SACHEN, SCHLUPF, stufeVon, freieSachen } from "./tier.js";
import { ABZEICHEN, neueAbzeichen } from "./abzeichen.js";
import { icon, sterne } from "./icons.js";
import { klang, konfetti } from "./effekte.js";

const app = document.getElementById("app");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tageWort = (n) => (n === 1 ? "Tag" : "Tage");
const vonTagen = (n) => (n === 1 ? "Tag" : "Tagen"); // "1 von 7 Tagen"
const FARBEN = { koralle: "var(--koralle)", lila: "var(--lila)", blau: "var(--blau)", gruen: "var(--gruen)", gold: "var(--gold-dunkel)" };

const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;
const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

let ansicht = "heute";   // heute | kalender | tier | erfolge | einstellungen
let monat = null;        // "JJJJ-MM" im Kalender
let formular = null;     // offenes Eintragen-Formular { id, tag, von, bis }
let wahlArt = "drache";  // Tierwahl beim ersten Start
let letzterAnteil = 0;   // Ring-Animation startet beim letzten Stand
let angezeigterTag = tagText();
let rueckgaengig = null;
let wartendeSicherung = null;

const tierName = (s = sp.get()) => s.tier.name || ARTEN[s.tier.art]?.namen[0] || "Dein Tier";
const zielStunden = (s = sp.get()) => s.ziele.at(-1).stunden;
const meinTier = (a, extra = {}) => {
  const s = sp.get();
  return tierSvg({ art: s.tier.art, stufe: stufeVon(a.erfuellt), sache: s.tier.sache, ...extra });
};
const wann = (tag, zeit) => {
  const rel = tagRelativ(tag, tagText());
  return `${rel.startsWith("am ") ? tagKurz(tag) : rel} ${zeitText(zeit)} Uhr`;
};

function zeige(html, { tabs = true } = {}) {
  schliesseDialog();
  app.innerHTML = html + (tabs ? tabLeiste() : "");
  app.classList.toggle("mit-tabs", tabs);
  window.scrollTo(0, 0);
}

function toast(html, { aktion = null, dauer = 2200 } = {}) {
  document.querySelector(".toast")?.remove();
  const t = document.createElement("div");
  t.className = "toast";
  t.setAttribute("role", "status");
  t.innerHTML = `<span>${html}</span>${aktion ? `<button data-aktion="rueckgaengig">${icon("undo", 18)}Rückgängig</button>` : ""}`;
  document.body.appendChild(t);
  rueckgaengig = aktion;
  setTimeout(() => {
    t.remove();
    if (rueckgaengig === aktion) rueckgaengig = null;
  }, dauer);
}

function wackle(el) {
  el?.classList.remove("wackeln");
  void el?.offsetWidth;
  el?.classList.add("wackeln");
}

// ---------------------------------------------------------------- Dialoge
function oeffneDialog(inhalt, klasse = "") {
  schliesseDialog();
  const d = document.createElement("div");
  d.className = "schleier";
  d.dataset.aktion = "schleier";
  d.innerHTML = `<div class="dialog ${klasse}" role="dialog" aria-modal="true" aria-labelledby="dlg-titel">${inhalt}</div>`;
  document.body.appendChild(d);
}
function schliesseDialog() {
  document.querySelector(".schleier")?.remove();
}

// Feiern nacheinander: Tag geschafft, gewachsen, neue Sachen, Abzeichen
const warteschlange = [];
function feiere(liste) {
  warteschlange.push(...liste);
  if (!document.querySelector(".schleier")) weiterFeiern();
}
function weiterFeiern() {
  schliesseDialog();
  if (warteschlange.length) document.querySelector(".toast")?.remove();
  warteschlange.shift()?.();
}

// ---------------------------------------------------------------- Bausteine
const TABS = [["heute", "clock", "Heute"], ["kalender", "calendar", "Kalender"], ["tier", "paw", null], ["erfolge", "medal", "Erfolge"]];
function tabLeiste() {
  return `<nav class="tabs" aria-label="Bereiche">${TABS.map(([id, ic, name]) => `
    <button class="tab" data-aktion="tab" data-wert="${id}" ${ansicht === id ? 'aria-current="page"' : ""}>
      <span class="tab-icon">${icon(ic, 24)}</span><span class="tab-name">${esc(name ?? tierName())}</span>
    </button>`).join("")}</nav>`;
}

function ring(min, ziel, { klein = false } = {}) {
  const r = 100, u = 2 * Math.PI * r;
  const anteil = Math.min(1, min / ziel);
  const stunden = Math.round(ziel / 60);
  const punkte = klein ? "" : Array.from({ length: stunden - 1 }, (_, i) => {
    const w = ((i + 1) / stunden) * 2 * Math.PI - Math.PI / 2;
    return `<circle cx="${(120 + r * Math.cos(w)).toFixed(1)}" cy="${(120 + r * Math.sin(w)).toFixed(1)}" r="2.3" fill="#fff" opacity=".85"/>`;
  }).join("");
  const rest = (u * (1 - anteil)).toFixed(1);
  return `<svg class="ring" viewBox="0 0 240 240" aria-hidden="true">
    <circle cx="120" cy="120" r="${r}" fill="none" stroke="var(--ring-spur)" stroke-width="${klein ? 26 : 18}"/>
    <circle class="ring-fuellung" cx="120" cy="120" r="${r}" fill="none" stroke="${anteil >= 1 ? "var(--gruen)" : "var(--blau)"}"
      stroke-width="${klein ? 26 : 18}" stroke-linecap="round" stroke-dasharray="${u.toFixed(1)}" stroke-dashoffset="${rest}"
      data-rest="${rest}" transform="rotate(-90 120 120)" ${min ? "" : 'opacity="0"'}/>
    ${punkte}
  </svg>`;
}

function animiereRing() {
  const el = app.querySelector(".tageskarte .ring-fuellung");
  if (!el) return;
  const u = 2 * Math.PI * 100;
  const rest = Number(el.dataset.rest);
  el.style.strokeDashoffset = String(u * (1 - letzterAnteil));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = "stroke-dashoffset .9s cubic-bezier(.3,.7,.3,1)";
    el.style.strokeDashoffset = String(rest);
  }));
  letzterAnteil = 1 - rest / u;
}

const seriePill = (n) => `<span class="pill serie${n ? "" : " aus"}" aria-label="${n} ${tageWort(n)} hintereinander geschafft">
  ${icon("flame", 18, { fill: n ? "#F6B49F" : "none", sw: 1.8 })}${n}</span>`;

function zeitZeilen(a, tag) {
  const liste = a.tage.get(tag)?.stuecke ?? [];
  if (!liste.length) return `<p class="leer">Noch nichts eingetragen.</p>`;
  return liste.map((st) => {
    const e = st.eintrag;
    const geteilt = stuecke(e).length > 1;
    const zusatz = !geteilt ? "" : st.von === 0 ? `seit ${wann(e.tag, e.von)}` : `geht bis ${wann(plusTage(e.tag, 1), e.bis)}`;
    const nacht = istNacht(e.von, e.bis);
    return `<button class="zeit-zeile" data-aktion="bearbeiten" data-wert="${e.id}" aria-label="Zeit ${minText(st.von)} bis ${minText(st.bis)} ändern">
      <span class="icon-kachel ${nacht ? "ton-lila" : "ton-gold"}">${icon(nacht ? "moon" : "sun", 20)}</span>
      <span class="text"><b>${minText(st.von)}–${minText(st.bis)}</b>${zusatz ? `<small>${zusatz}</small>` : ""}</span>
      <span class="dauer">${dauerText(st.bis - st.von)}</span>
      ${icon("pencil", 17)}
    </button>`;
  }).join("");
}

// Durchgehender Balken für die Wochenquote, mit den Stern-Schwellen als Markierung
function quoteBalken(quote) {
  const p = quote == null ? 0 : quoteProzent(quote);
  const marken = [70, 85, 100].map((g) => `<span class="marke${p >= g ? " an" : ""}" style="left:${g}%">${icon("star", 15, { fill: p >= g ? "var(--gold)" : "var(--weiss)", sw: 1.8 })}</span>`).join("");
  return `<div class="quote-balken" role="img" aria-label="${p} Prozent erfüllt"><span class="spur"><span class="fuell" style="width:${p}%"></span></span>${marken}</div>`;
}

function wochenKarte(a, montag, titel) {
  const w = a.woche(montag);
  const saeulen = w.tage.map((d) => {
    const p = prozent(d.minuten, d.ziel);
    const klasse = d.zukunft ? "zukunft" : d.geschafft ? "voll" : "teil";
    const zahl = d.zukunft ? "" : d.vorStart && !d.minuten ? "–" : `${p}\u202F%`; // schmales Leerzeichen
    return `<button class="saeule ${klasse}${d.heute ? " heute" : ""}" data-aktion="tag" data-wert="${d.tag}" ${d.zukunft ? "disabled" : ""}
        aria-label="${tagLang(d.tag)}: ${dauerText(d.minuten)}, ${p} Prozent">
      <span class="spur"><span class="fuell" style="height:${Math.min(100, p)}%"></span>${d.geschafft ? `<span class="haken">${icon("check", 14, { sw: 3.4 })}</span>` : ""}</span>
      <span class="wt">${WT_KURZ[wochentag(d.tag)]}</span>
      <span class="pz">${zahl}</span>
    </button>`;
  }).join("");
  const quote = w.quote == null ? "–" : `${quoteProzent(w.quote)} %`;
  const heuteOffen = w.tage.some((d) => d.heute && !d.geschafft);
  const notiz = w.fertig ? ""
    : w.quote == null ? "Die Woche hat gerade erst angefangen. Heute zählt mit, sobald dein Ziel geschafft oder der Tag vorbei ist."
    : `${heuteOffen ? "Heute zählt mit, sobald dein Ziel geschafft oder der Tag vorbei ist. " : ""}Die Sterne gibt es, wenn die Woche vorbei ist.`;
  return `<section class="karte-box wochenkarte">
    <div class="karte-kopf"><h2>${titel}</h2><span class="leise klein">KW ${w.kw}</span></div>
    <div class="saeulen">${saeulen}</div>
    <div class="quote-zeile"><span>Erfüllt: <b>${quote}</b></span>${sterne(w.sterne, 22)}</div>
    ${quoteBalken(w.quote)}
    ${notiz ? `<p class="klein leise notiz">${notiz}</p>` : ""}
  </section>`;
}

const medaille = (z, an, gr = 58) =>
  `<span class="medaille${an ? " an" : ""}" style="--m:${FARBEN[z.farbe]};--g:${gr}px" aria-hidden="true"><span>${icon(z.icon, Math.round(gr * 0.45))}</span></span>`;

// ---------------------------------------------------------------- Erster Start
function zeigeWillkommen() {
  zeige(`<form class="willkommen" data-form="name">
    <div class="willkommen-ei" data-aktion="streicheln">${tierSvg({ art: "einhorn", stufe: 1 })}</div>
    <h1>Hallo! Wie heißt du?</h1>
    <p>Hier trägst du ein, wann deine Zahnspange drin war. An jedem Tag mit ${zielStunden()} Stunden wächst dein Tier ein Stück.</p>
    <input class="feld" name="name" maxlength="20" autocomplete="off" autocapitalize="words" enterkeyhint="next" placeholder="Dein Vorname" aria-label="Dein Vorname" required>
    <button class="knopf knopf-haupt" type="submit">Weiter ${icon("arrow", 20, { sw: 2.6 })}</button>
    <button class="link-knopf" type="button" data-aktion="import">Ich habe schon eine Sicherung</button>
  </form>`, { tabs: false });
}

function zeigeTierWahl() {
  const s = sp.get();
  zeige(`<form class="tierwahl" data-form="tier">
    <h1>Hallo ${esc(s.name)}! Welches Tier soll bei dir schlüpfen?</h1>
    <p>Erst wohnt es in einem Ei. Nach ${STUFEN[SCHLUPF].ab} geschafften Tagen schlüpft es und wächst dann immer weiter.</p>
    <div class="arten" role="radiogroup" aria-label="Tier">
      ${Object.entries(ARTEN).map(([id, x]) => `<button type="button" class="karte-box art" role="radio" aria-checked="${id === wahlArt}" data-aktion="art" data-wert="${id}">
        ${tierSvg({ art: id, stufe: 5, bewegt: false })}<span>${x.name}</span></button>`).join("")}
    </div>
    <label class="klein-titel" for="tiername">Wie soll es heißen?</label>
    <input class="feld" id="tiername" name="tiername" maxlength="16" autocomplete="off" autocapitalize="words" enterkeyhint="go" placeholder="${ARTEN[wahlArt].namen[0]}">
    <button class="knopf knopf-haupt" type="submit">${icon("egg", 22)} Ei abholen</button>
  </form>`, { tabs: false });
}

// Nach Einspielen einer Sicherung und beim ersten Start: Erreichtes still übernehmen statt zu feiern
function stillUebernehmen() {
  const s = sp.get();
  const a = auswerten(s);
  sp.setze({
    gefeiert: {
      ...s.gefeiert,
      stufe: Math.max(s.gefeiert.stufe, stufeVon(a.erfuellt)),
      sachen: Math.max(s.gefeiert.sachen, freieSachen(a.sterne).length),
      woche: a.wochen.at(-1)?.montag ?? s.gefeiert.woche,
    },
    abzeichen: { ...s.abzeichen, ...Object.fromEntries(neueAbzeichen(a, s).map((z) => [z.id, Date.now()])) },
  });
}

// ---------------------------------------------------------------- Heute
function spruch(a) {
  const t = a.heute;
  const min = a.minuten(t), ziel = a.ziel(t);
  const rest = dauerText(Math.max(0, ziel - min));
  const w = (liste) => liste[tagIndex(t) % liste.length]; // pro Tag fest, damit nichts flackert
  if (min >= ziel) return w(["Juhu, geschafft! Du bist spitze!", `${ziel / 60} Stunden! Ich bin so stolz auf dich.`, "Geschafft! Davon werde ich groß und stark.", "Volltreffer! Danke, dass du so gut aufpasst."]);
  if (min === 0) {
    if (new Date().getHours() < 11) return w(["Guten Morgen! Wie war die Nacht mit der Spange?", "Guten Morgen! Trag doch gleich die Nacht ein."]);
    return w(["Heute ist noch alles drin. Los geht’s!", "Ich warte schon auf deine erste Zeit."]);
  }
  const anteil = min / ziel;
  if (anteil < 0.5) return w([`Guter Anfang! Noch ${rest}.`, `Schon ${dauerText(min)} geschafft!`]);
  if (anteil < 0.85) return w([`Mehr als die Hälfte! Noch ${rest}.`, `Weiter so! Noch ${rest}.`]);
  return w([`Fast geschafft! Nur noch ${rest}.`, `Gleich hast du’s! Noch ${rest}.`]);
}

function browserHinweis(s) {
  if (standalone() || !apple) return "";
  return `<section class="karte-box hinweis-karte ton-koralle">
    <span class="icon-kachel">${icon("homescreen")}</span>
    <div class="text"><b>Hol mich auf den Home-Bildschirm</b>
      <span>${s.eintraege.length ? "Dort habe ich einen eigenen Speicher. Mach vorher eine Sicherung." : "Dort ist dein Protokoll am sichersten aufgehoben."}</span></div>
    <button class="knopf-klein" data-aktion="homescreen-info">Wie?</button>
  </section>`;
}

function nachtKarte(a, s) {
  const heuteSt = a.tage.get(a.heute)?.stuecke ?? [];
  if (new Date().getHours() >= 12 || heuteSt.some((st) => st.von === 0)) return "";
  const nacht = haeufigeZeiten(s.eintraege, 5).find((v) => zeitMin(v.bis) < zeitMin(v.von));
  return `<section class="karte-box hinweis-karte ton-lila">
    <span class="icon-kachel">${icon("moon")}</span>
    <div class="text"><b>Letzte Nacht eintragen</b>
      <span>${nacht ? `Wie meistens von ${zeitText(nacht.von)} bis ${zeitText(nacht.bis)} Uhr?` : "Wann war die Spange heute Nacht drin?"}</span></div>
    <button class="knopf-klein" data-aktion="nacht" data-wert="${nacht ? `${nacht.von}-${nacht.bis}` : ""}">Eintragen</button>
  </section>`;
}

// Am Folgetag steht fest, ob das Ziel vom Vortag geschafft ist
function gesternKarte(a) {
  const g = plusTage(a.heute, -1);
  if (!a.start || g < a.start) return "";
  const min = a.minuten(g), ziel = a.ziel(g), ok = min >= ziel;
  return `<section class="karte-box gestern-karte${ok ? " fertig" : ""}">
    <button class="gestern-inhalt" data-aktion="tag" data-wert="${g}" aria-label="Gestern ansehen">
      <span class="mini-ring">${ring(min, ziel, { klein: true })}<span class="mitte">${ok ? icon("check", 22, { sw: 3.4 }) : `${prozent(min, ziel)}<small>%</small>`}</span></span>
      <span class="text">
        <span class="klein-titel">Gestern · ${tagKurz(g)}</span>
        <b>${ok ? "Ziel geschafft!" : `${prozent(min, ziel)} % geschafft`}</b>
        <span>${dauerText(min)} von ${ziel / 60} h</span>
      </span>
    </button>
    ${ok ? "" : `<button class="knopf-klein" data-aktion="tag" data-wert="${g}">Nachtragen</button>`}
  </section>`;
}

function sicherungFaellig(a, s) {
  if (!s.eintraege.length) return false;
  const letzte = s.sicherungen.at(-1);
  if (!letzte) return tageZwischen(a.start ?? a.heute, a.heute) >= 6;
  return Date.now() - letzte >= 7 * 864e5;
}

function sicherungKarte(a, s) {
  if (!sicherungFaellig(a, s)) return "";
  return `<section class="karte-box hinweis-karte ton-blau">
    <span class="icon-kachel">${icon("shield")}</span>
    <div class="text"><b>Zeit für deine Wochen-Sicherung</b><span>Speicher dein Protokoll in „Dateien“ oder schick es deinen Eltern.</span></div>
    <button class="knopf-klein" data-aktion="export">Sichern</button>
  </section>`;
}

function schnellwahl(s) {
  const vorlagen = haeufigeZeiten(s.eintraege, 3);
  if (!vorlagen.length) return "";
  return `<div class="schnell" aria-label="Schnellwahl">${vorlagen.map((v) => `<button class="vorlage" data-aktion="schnell" data-wert="${v.von}-${v.bis}">
    ${icon(istNacht(v.von, v.bis) ? "moon" : "sun", 18)}${zeitText(v.von)}–${zeitText(v.bis)}</button>`).join("")}</div>`;
}

function zeigeHeute() {
  const s = sp.get();
  const a = auswerten(s);
  const t = a.heute;
  const min = a.minuten(t), ziel = a.ziel(t);
  const fertig = min >= ziel;
  zeige(`<div class="seite heute">
    <header class="kopf">
      <div class="kopf-text"><div class="datum">${tagLang(t)}</div><h1>Hallo ${esc(s.name)}!</h1></div>
      <div class="kopf-rechts">${seriePill(a.serie)}<button class="icon-knopf" data-aktion="einstellungen" aria-label="Einstellungen">${icon("gear")}</button></div>
    </header>
    ${browserHinweis(s)}
    <section class="karte-box tageskarte${fertig ? " fertig" : ""}">
      <div class="sprechblase">${esc(spruch(a))}</div>
      <div class="ring-rahmen">
        ${ring(min, ziel)}
        <button class="ring-tier" data-aktion="streicheln" aria-label="${esc(tierName(s))} streicheln">${meinTier(a, { jubel: fertig })}</button>
        <span class="ring-prozent">${prozent(min, ziel)} %</span>
      </div>
      <div class="tageszahl"><b>${dauerText(min)}</b><span> von ${ziel / 60} h</span></div>
      <div class="rest">${fertig ? `${icon("check", 18, { sw: 3 })}Tagesziel geschafft` : `Noch ${dauerText(ziel - min)}`}</div>
      <button class="knopf knopf-haupt" data-aktion="eintragen">${icon("plus", 22, { sw: 2.8 })}Tragezeit eintragen</button>
    </section>
    ${schnellwahl(s)}
    ${nachtKarte(a, s)}
    ${gesternKarte(a)}
    ${sicherungKarte(a, s)}
    <section class="karte-box liste-karte">
      <div class="karte-kopf"><h2>Heute eingetragen</h2></div>
      ${zeitZeilen(a, t)}
    </section>
    ${wochenKarte(a, montagVon(t), "Diese Woche")}
  </div>`);
  animiereRing();
}

// ---------------------------------------------------------------- Eintragen
function oeffneFormular(vorgabe = {}) {
  formular = { id: null, tag: tagText(), von: "", bis: "", ...vorgabe };
  const heute = tagText();
  const vorlagen = formular.id ? [] : haeufigeZeiten(sp.get().eintraege, 4);
  oeffneDialog(`<form class="formular" data-form="eintrag" novalidate>
    <div class="blatt-kopf">
      <h2 id="dlg-titel">${formular.id ? "Zeit ändern" : "Tragezeit eintragen"}</h2>
      <button type="button" class="icon-knopf" data-aktion="dialog-zu" aria-label="Schließen">${icon("close")}</button>
    </div>
    <div class="feld-gruppe">
      <span class="klein-titel">Tag</span>
      <div class="tag-wahl" role="radiogroup" aria-label="Tag">
        <button type="button" class="chip-knopf" role="radio" data-aktion="f-tag" data-wert="${heute}">Heute</button>
        <button type="button" class="chip-knopf" role="radio" data-aktion="f-tag" data-wert="${plusTage(heute, -1)}">Gestern</button>
        <label class="chip-knopf datum-chip" role="radio">${icon("calendar", 18)}<span class="datum-text">Anderer Tag</span>
          <input type="date" name="tag" max="${heute}" aria-label="Anderer Tag"></label>
      </div>
    </div>
    ${vorlagen.length ? `<div class="feld-gruppe"><span class="klein-titel">Schnellwahl</span><div class="vorlagen">
      ${vorlagen.map((v) => `<button type="button" class="vorlage" data-aktion="vorlage" data-wert="${v.von}-${v.bis}">
        ${icon(istNacht(v.von, v.bis) ? "moon" : "sun", 18)}${zeitText(v.von)}–${zeitText(v.bis)}</button>`).join("")}
    </div></div>` : ""}
    <div class="zeiten">
      <div class="zeit-feld">
        <label class="klein-titel" for="f-von">Von <span>Spange rein</span></label>
        <input type="time" id="f-von" name="von" step="300" required>
        <button type="button" class="jetzt" data-aktion="jetzt" data-wert="von">Jetzt</button>
      </div>
      <span class="zeit-pfeil">${icon("arrow", 22)}</span>
      <div class="zeit-feld">
        <label class="klein-titel" for="f-bis">Bis <span>Spange raus</span></label>
        <input type="time" id="f-bis" name="bis" step="300" required>
        <button type="button" class="jetzt" data-aktion="jetzt" data-wert="bis">Jetzt</button>
      </div>
    </div>
    <div class="vorschau" aria-live="polite"></div>
    <button class="knopf knopf-gruen" type="submit">${icon("check", 22, { sw: 3 })}Speichern</button>
    ${formular.id ? `<button type="button" class="knopf knopf-leise loeschen" data-aktion="loeschen">${icon("trash", 20)}Eintrag löschen</button>` : ""}
  </form>`, "blatt");
  aktualisiereFormular(true);
}

// Morgens ist mit einer Nacht-Zeit fast immer die letzte Nacht gemeint
function nachtAufGestern() {
  const p = pruefeEintrag(formular, sp.get().eintraege);
  if (!p.ok && p.vorschlag) formular.tag = p.vorschlag.tag;
}

function aktualisiereFormular(felderSetzen = false) {
  const f = document.querySelector(".formular");
  if (!f || !formular) return;
  const heute = tagText();
  const anders = formular.tag !== heute && formular.tag !== plusTage(heute, -1);
  f.querySelectorAll('[data-aktion="f-tag"]').forEach((b) => b.setAttribute("aria-checked", String(b.dataset.wert === formular.tag)));
  const chip = f.querySelector(".datum-chip");
  chip.setAttribute("aria-checked", String(anders));
  chip.querySelector(".datum-text").textContent = anders ? tagKurz(formular.tag) : "Anderer Tag";
  f.querySelector('input[name="tag"]').value = formular.tag;
  if (felderSetzen) {
    f.querySelector('input[name="von"]').value = formular.von;
    f.querySelector('input[name="bis"]').value = formular.bis;
  }

  const v = f.querySelector(".vorschau");
  const speichern = f.querySelector('button[type="submit"]');
  if (!formular.von || !formular.bis) {
    speichern.disabled = true;
    v.innerHTML = `<p class="leise">Wann war die Spange drin?</p>`;
    return;
  }
  const p = pruefeEintrag(formular, sp.get().eintraege);
  speichern.disabled = !p.ok;
  if (!p.ok) {
    v.innerHTML = `<div class="meldung fehler">${p.vorschlag
      ? `<span>Meinst du die Nacht ${tageZwischen(p.vorschlag.tag, heute) === 1 ? "von gestern auf heute" : `ab ${tagKurz(p.vorschlag.tag)}`}?</span>
         <button type="button" class="knopf-klein" data-aktion="vorschlag">Ja, eintragen für ${tagRelativ(p.vorschlag.tag, heute)}</button>`
      : `<span>${esc(p.fehler)}</span>`}</div>`;
    return;
  }
  const teile = stuecke(formular);
  v.innerHTML = `<div class="dauer-gross">${dauerText(dauerMin(formular.von, formular.bis))}</div>
    ${teile.length > 1 ? `<p class="teilung">${teile.map((x) => `${dauerText(x.bis - x.von)} ${x.tag === heute ? "heute" : `am ${tagKurz(x.tag)}`}`).join(" · ")}</p>` : ""}
    ${p.hinweis ? `<p class="meldung hinweis">${esc(p.hinweis)}</p>` : ""}`;
}

function speichereFormular() {
  const s = sp.get();
  const p = pruefeEintrag(formular, s.eintraege);
  if (!p.ok) return wackle(document.querySelector(".vorschau"));
  const vorher = auswerten(s);
  const alt = formular.id ? s.eintraege.find((e) => e.id === formular.id) : null;
  const neu = sp.speichereEintrag(formular);
  formular = null;
  schliesseDialog();
  sp.dauerhaftAnfragen();
  nachAenderung(vorher, [neu, alt].filter(Boolean));
}

function nachAenderung(vorher, betroffen) {
  const nachher = auswerten(sp.get());
  neuZeichnen();
  const tage = [...new Set(betroffen.flatMap((e) => stuecke(e).map((x) => x.tag)))].filter((t) => t <= nachher.heute).sort();
  const neuGeschafft = tage.filter((t) => !vorher.geschafft(t) && nachher.geschafft(t));
  const liste = [];
  if (neuGeschafft.length) liste.push(() => dialogGeschafft(neuGeschafft, nachher));
  liste.push(...meilensteine(nachher));
  if (liste.length) feiere(liste);
  else {
    klang("gespeichert");
    toast(`${icon("check", 18, { sw: 3 })}Gespeichert`);
  }
}

// Neue Stufe, neue Sachen, neue Abzeichen: gleich als gefeiert merken, damit nichts doppelt kommt
function meilensteine(a) {
  const s = sp.get();
  const liste = [];
  const stufe = stufeVon(a.erfuellt);
  const frei = freieSachen(a.sterne);
  const abz = neueAbzeichen(a, s);
  if (stufe > s.gefeiert.stufe) liste.push(() => dialogGewachsen(stufe, a));
  if (frei.length > s.gefeiert.sachen) {
    const neu = frei.slice(s.gefeiert.sachen);
    liste.push(() => dialogSachen(neu));
  }
  if (abz.length) liste.push(() => dialogAbzeichen(abz));
  if (liste.length) {
    sp.setze({
      gefeiert: { ...s.gefeiert, stufe: Math.max(stufe, s.gefeiert.stufe), sachen: Math.max(frei.length, s.gefeiert.sachen) },
      abzeichen: { ...s.abzeichen, ...Object.fromEntries(abz.map((z) => [z.id, Date.now()])) },
    });
  }
  return liste;
}

function wochenbilanz(a) {
  const s = sp.get();
  const letzte = a.wochen.at(-1);
  if (!letzte || s.gefeiert.woche === letzte.montag) return [];
  sp.setze({ gefeiert: { ...s.gefeiert, woche: letzte.montag } });
  return letzte.quote == null ? [] : [() => dialogWoche(letzte)];
}

function naechsteStufeText(a) {
  const stufe = stufeVon(a.erfuellt);
  const n = STUFEN[stufe < SCHLUPF ? SCHLUPF : stufe + 1];
  if (!n) return "";
  const fehlt = n.ab - a.erfuellt;
  const ziel = stufe < SCHLUPF ? "bis zum Schlüpfen" : `bis zur Stufe „${n.name}“`;
  return `Noch ${fehlt} ${fehlt === 1 ? "geschaffter Tag" : "geschaffte Tage"} ${ziel}.`;
}

// Mehrere Feiern hintereinander: Konfetti nur einmal, sonst wird es zu viel
let letztesKonfetti = 0;
function feierKonfetti(dauer) {
  if (Date.now() - letztesKonfetti < 4000) return;
  letztesKonfetti = Date.now();
  konfetti(dauer);
}

function dialogGeschafft(tage, a) {
  const t = tage.at(-1);
  const titel = tage.length > 1 ? `${tage.length} Tage geschafft!` : t === a.heute ? "Heute geschafft!" : `${tagLang(t)}: geschafft!`;
  oeffneDialog(`<div class="feier">
    <div class="feier-tier">${meinTier(a, { jubel: true })}</div>
    <h2 id="dlg-titel">${titel}</h2>
    <p>${a.ziel(t) / 60} Stunden Zahnspange. ${esc(tierName())} freut sich riesig!</p>
    ${a.serie >= 2 ? `<span class="pill serie">${icon("flame", 18, { fill: "#F6B49F", sw: 1.8 })}${a.serie} Tage hintereinander</span>` : ""}
    ${naechsteStufeText(a) ? `<p class="klein">${naechsteStufeText(a)}</p>` : ""}
    <button class="knopf knopf-gruen" data-aktion="weiter">Super!</button>
  </div>`, "mitte");
  feierKonfetti();
  klang("geschafft");
}

function dialogGewachsen(stufe, a) {
  const name = esc(tierName());
  const titel = stufe < SCHLUPF ? `${STUFEN[stufe].name}!` : stufe === SCHLUPF ? `${name} ist geschlüpft!` : `${name} ist gewachsen!`;
  const text = stufe < SCHLUPF ? "Da bewegt sich was im Ei." : stufe === SCHLUPF ? "Hallo Welt! Schau mal, es trägt auch eine Zahnspange." : `Neue Stufe: ${STUFEN[stufe].name}`;
  oeffneDialog(`<div class="feier">
    <div class="feier-tier gross">${meinTier(a, { jubel: stufe >= SCHLUPF })}</div>
    <h2 id="dlg-titel">${titel}</h2>
    <p>${text}</p>
    ${naechsteStufeText(a) ? `<p class="klein">${naechsteStufeText(a)}</p>` : ""}
    <button class="knopf knopf-gruen" data-aktion="weiter">Weiter</button>
  </div>`, "mitte");
  feierKonfetti(3200);
  klang("wachsen");
}

function dialogSachen(neu) {
  const name = esc(tierName());
  oeffneDialog(`<div class="feier">
    <h2 id="dlg-titel">${neu.length === 1 ? "Neue Sache" : "Neue Sachen"} für ${name}!</h2>
    <p>Deine Sterne haben gereicht.</p>
    <div class="sachen-neu">${neu.map((x) => `<button class="sache frei" data-aktion="anziehen" data-wert="${x.id}">
      <span class="sache-bild">${sacheSvg(x.id)}</span><span class="sache-name">${x.name}</span></button>`).join("")}</div>
    <p class="klein leise">Tipp auf eine Sache, dann zieht ${name} sie an.</p>
    <button class="knopf knopf-leise" data-aktion="weiter">Später</button>
  </div>`, "mitte");
  feierKonfetti();
  klang("geschafft");
}

function dialogAbzeichen(neu) {
  oeffneDialog(`<div class="feier links">
    <h2 id="dlg-titel">${neu.length === 1 ? "Neues Abzeichen!" : "Neue Abzeichen!"}</h2>
    <div class="abz-liste">${neu.map((z) => `<div class="abz-zeile">${medaille(z, true, 52)}<div><b>${esc(z.name)}</b><span>${esc(z.text)}</span></div></div>`).join("")}</div>
    <button class="knopf knopf-gruen" data-aktion="weiter">Super!</button>
  </div>`, "mitte");
  feierKonfetti();
  klang("geschafft");
}

function dialogWoche(w) {
  const tage = w.tage.filter((d) => !d.vorStart).length;
  oeffneDialog(`<div class="feier">
    <span class="klein-titel">Deine Woche · KW ${w.kw}</span>
    <div class="gross-sterne">${sterne(w.sterne, 56)}</div>
    <h2 id="dlg-titel">${["Neue Woche, neues Glück!", "Ein Stern!", "Zwei Sterne!", "Drei Sterne!"][w.sterne]}</h2>
    <p>${w.geschafft} von ${tage} ${vonTagen(tage)} geschafft. Erfüllt: ${quoteProzent(w.quote)} %.</p>
    <button class="knopf knopf-gruen" data-aktion="weiter">Weiter</button>
  </div>`, "mitte");
  if (w.sterne === 3) feierKonfetti();
  klang(w.sterne ? "geschafft" : "plopp");
}

// ---------------------------------------------------------------- Tag ansehen
function zeigeTag(tag) {
  const a = auswerten(sp.get());
  const min = a.minuten(tag), ziel = a.ziel(tag);
  const fertig = min >= ziel;
  oeffneDialog(`<div class="blatt-kopf">
      <h2 id="dlg-titel">${tagLang(tag)}</h2>
      <button class="icon-knopf" data-aktion="dialog-zu" aria-label="Schließen">${icon("close")}</button>
    </div>
    <div class="tag-summe${fertig ? " fertig" : ""}">
      <span class="mini-ring">${ring(min, ziel, { klein: true })}${fertig ? icon("check", 22, { sw: 3.4 }) : ""}</span>
      <div><b>${prozent(min, ziel)} %</b><span>${dauerText(min)} von ${ziel / 60} h · ${fertig ? "geschafft" : `noch ${dauerText(ziel - min)}`}</span></div>
    </div>
    <div class="zeit-liste">${zeitZeilen(a, tag)}</div>
    <button class="knopf knopf-haupt" data-aktion="eintragen" data-wert="${tag}">${icon("plus", 22, { sw: 2.8 })}Zeit für diesen Tag</button>`, "blatt");
}

// ---------------------------------------------------------------- Kalender
function zeigeKalender() {
  const a = auswerten(sp.get());
  const jetztMonat = a.heute.slice(0, 7);
  // Zurückblättern geht ein Jahr weit, damit sich auch Tage vor dem ersten Eintrag nachtragen lassen
  const startMonat = [(a.start ?? a.heute), plusTage(a.heute, -365)].sort()[0].slice(0, 7);
  monat ??= jetztMonat;
  const [j, m] = monat.split("-").map(Number);
  const anzahl = new Date(j, m, 0).getDate();
  const erster = `${monat}-01`;
  const letzter = `${monat}-${String(anzahl).padStart(2, "0")}`;

  const zellen = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span class="wt">${w}</span>`);
  for (let i = 0; i < (wochentag(erster) + 6) % 7; i++) zellen.push("<span></span>");
  let geschafft = 0, zaehlend = 0;
  for (let d = 1; d <= anzahl; d++) {
    const t = `${monat}-${String(d).padStart(2, "0")}`;
    const min = a.minuten(t), ziel = a.ziel(t);
    const zukunft = t > a.heute, vor = !a.start || t < a.start, voll = min >= ziel;
    if (!zukunft && !vor) { zaehlend++; if (voll) geschafft++; }
    const klasse = zukunft ? "zukunft" : voll ? "voll" : min > 0 ? "teil" : vor ? "vor" : "leer";
    zellen.push(`<button class="kal-tag ${klasse}${t === a.heute ? " heute" : ""}" data-aktion="tag" data-wert="${t}" ${zukunft ? "disabled" : ""}
      style="--p:${Math.min(100, prozent(min, ziel))}" aria-label="${tagLang(t)}: ${dauerText(min)}, ${prozent(min, ziel)} Prozent"><span class="nr">${d}</span></button>`);
  }

  const wochen = [];
  for (let mo = montagVon(letzter); mo >= montagVon(erster); mo = plusTage(mo, -7)) {
    if (mo > a.heute || !a.start || plusTage(mo, 6) < a.start) continue;
    const w = a.woche(mo);
    const kurz = (t) => `${Number(t.slice(8))}.${Number(t.slice(5, 7))}.`;
    wochen.push(`<div class="wochen-zeile">
      <div><b>KW ${w.kw}</b><span>${kurz(mo)}–${kurz(plusTage(mo, 6))}${w.fertig ? "" : " · läuft noch"}</span></div>
      <div class="rechts"><span>${w.quote == null ? "–" : `${quoteProzent(w.quote)} %`}</span>${sterne(w.sterne, 18)}</div>
    </div>`);
  }

  zeige(`<div class="seite">
    <header class="kopf"><div class="kopf-text"><div class="datum">Tippe auf einen Tag zum Nachtragen</div><h1>Kalender</h1></div></header>
    <section class="karte-box monat">
      <div class="monat-kopf">
        <button class="icon-knopf" data-aktion="monat" data-wert="-1" ${monat <= startMonat ? "disabled" : ""} aria-label="Monat zurück">${icon("back", 22)}</button>
        <h2>${MONATE[m - 1]} ${j}</h2>
        <button class="icon-knopf" data-aktion="monat" data-wert="1" ${monat >= jetztMonat ? "disabled" : ""} aria-label="Monat vor">${icon("vor", 22)}</button>
      </div>
      <div class="monat-raster">${zellen.join("")}</div>
      ${zaehlend ? `<p class="monat-summe"><b>${geschafft}</b> von ${zaehlend} ${vonTagen(zaehlend)} geschafft</p>` : ""}
    </section>
    ${wochen.length ? `<section class="karte-box wochen-liste"><div class="karte-kopf"><h2>Wochen</h2></div>${wochen.join("")}</section>` : ""}
  </div>`);
}

// ---------------------------------------------------------------- Tier
function zeigeTier() {
  const s = sp.get();
  const a = auswerten(s);
  const stufe = stufeVon(a.erfuellt);
  const naechste = STUFEN[stufe + 1];
  const name = esc(tierName(s));
  // Im Ei zählt der Balken bis zum Schlüpfen, danach bis zur nächsten Stufe
  const von = stufe < SCHLUPF ? 0 : STUFEN[stufe].ab;
  const bis = stufe < SCHLUPF ? STUFEN[SCHLUPF].ab : naechste?.ab;
  const anteil = bis ? (a.erfuellt - von) / (bis - von) : 1;
  zeige(`<div class="seite">
    <header class="kopf">
      <div class="kopf-text"><div class="datum">${ARTEN[s.tier.art].name}</div><h1>${name}</h1></div>
      <div class="kopf-rechts"><span class="pill" aria-label="${a.sterne} Sterne">${icon("star", 18, { fill: "var(--gold)", sw: 1.6 })}${a.sterne}</span></div>
    </header>
    <section class="karte-box buehne">
      <button class="buehne-tier" data-aktion="streicheln" aria-label="${name} streicheln">${meinTier(a, { jubel: a.geschafft(a.heute) })}</button>
      <div class="stufe-name">${STUFEN[stufe].name}</div>
      <div class="leise klein">Stufe ${stufe + 1} von ${STUFEN.length} · ${a.erfuellt} ${a.erfuellt === 1 ? "geschaffter Tag" : "geschaffte Tage"}</div>
      ${naechste ? `<div class="balken"><div style="width:${Math.round(anteil * 100)}%"></div></div><p class="klein">${naechsteStufeText(a)}</p>` : `<p class="klein">Höchste Stufe erreicht. Unglaublich!</p>`}
    </section>
    <section class="karte-box sachen-karte">
      <div class="karte-kopf"><h2>Sachen für ${name}</h2></div>
      <p class="klein leise">Jede abgeschlossene Woche bringt bis zu 3 Sterne. Für Sterne gibt es neue Sachen.${stufe < SCHLUPF ? " Anziehen kann sie dein Tier, sobald es geschlüpft ist." : ""}</p>
      <div class="sachen-raster">${SACHEN.map((x) => {
        const frei = a.sterne >= x.ab, traegt = s.tier.sache === x.id;
        return `<button class="sache${frei ? " frei" : ""}${traegt ? " traegt" : ""}" data-aktion="sache" data-wert="${x.id}" ${frei ? "" : "disabled"} aria-pressed="${traegt}">
          <span class="sache-bild">${sacheSvg(x.id)}</span>
          <span class="sache-name">${frei ? x.name : `${icon("lock", 13)}${x.ab} Sterne`}</span></button>`;
      }).join("")}</div>
    </section>
  </div>`);
}

// ---------------------------------------------------------------- Erfolge
function zeigeErfolge() {
  const s = sp.get();
  const a = auswerten(s);
  const kachel = (ic, ton, zahl, text) => `<div class="karte-box zahl-kachel ton-${ton}"><span class="icon-kachel">${icon(ic)}</span><b>${zahl}</b><span>${text}</span></div>`;
  const verdient = ABZEICHEN.filter((z) => s.abzeichen[z.id]).length;
  zeige(`<div class="seite">
    <header class="kopf"><h1>Erfolge</h1></header>
    <section class="zahlen">
      ${kachel("target", "gruen", a.erfuellt, a.erfuellt === 1 ? "Tag geschafft" : "Tage geschafft")}
      ${kachel("flame", "koralle", a.serie, `${tageWort(a.serie)} in Folge · Rekord ${a.besteSerie}`)}
      ${kachel("star", "gold", a.sterne, "Sterne gesammelt")}
      ${kachel("clock", "blau", Math.floor(a.gesamtMinuten / 60), "Stunden getragen")}
    </section>
    <section class="karte-box abzeichen-karte">
      <div class="karte-kopf"><h2>Abzeichen</h2><span class="leise klein">${verdient} von ${ABZEICHEN.length}</span></div>
      <div class="abzeichen-raster">${ABZEICHEN.map((z) => {
        const an = !!s.abzeichen[z.id];
        const [ist, ziel] = z.stand(a, s);
        return `<div class="abzeichen${an ? " an" : ""}">
          ${medaille(z, an)}
          <b>${esc(z.name)}</b><span>${esc(z.text)}</span>
          ${an ? "" : `<span class="balken klein"><span style="width:${Math.round((ist / ziel) * 100)}%"></span></span>`}
        </div>`;
      }).join("")}</div>
    </section>
  </div>`);
}

// ---------------------------------------------------------------- Einstellungen
function zeigeEinstellungen() {
  const s = sp.get();
  const letzte = s.sicherungen.at(-1);
  const ok = (wahr) => `<span class="status-punkt ${wahr ? "an" : ""}">${icon(wahr ? "check" : "info", 15, { sw: 3 })}</span>`;
  zeige(`<div class="seite einstellungen">
    <header class="seiten-kopf">
      <button class="icon-knopf" data-aktion="zurueck" aria-label="Zurück">${icon("back", 24)}</button>
      <h1>Einstellungen</h1>
    </header>
    <section class="karte-box einst-block">
      <div class="block-kopf"><span class="icon-kachel ton-blau">${icon("shield")}</span>
        <div><h2>Sicherung</h2><span class="leise klein">${letzte ? `Zuletzt ${tagRelativ(tagText(new Date(letzte)), tagText())}` : "Noch keine Sicherung"}</span></div></div>
      <p class="klein">Die Sicherung ist eine CSV-Datei mit allen Einträgen. Speicher sie in „Dateien“ oder schick sie deinen Eltern. Beim Einspielen kommen nur fehlende Einträge dazu, gelöscht wird nichts.</p>
      <button class="knopf knopf-blau" data-aktion="export">${icon("teilen")}Sicherung erstellen</button>
      <button class="knopf knopf-leise" data-aktion="import">${icon("einspielen")}Sicherung einspielen</button>
      <ul class="status-liste">
        <li>${ok(s.eintraege.length > 0)}${s.eintraege.length} ${s.eintraege.length === 1 ? "Eintrag" : "Einträge"} auf diesem Gerät</li>
        <li>${ok(standalone())}${standalone() ? "Läuft vom Home-Bildschirm" : "Läuft im Browser, nicht vom Home-Bildschirm"}</li>
        <li id="status-dauerhaft">${ok(false)}Speicher wird geprüft …</li>
        ${sp.speicherFehler() ? `<li>${ok(false)}Der Browser-Speicher ist voll oder gesperrt</li>` : ""}
      </ul>
    </section>
    <section class="karte-box einst-block">
      <h2>Tagesziel</h2>
      <div class="stepper">
        <button data-aktion="ziel" data-wert="-1" aria-label="Eine Stunde weniger">−</button>
        <b><span id="ziel-zahl">${zielStunden(s)}</span> Stunden</b>
        <button data-aktion="ziel" data-wert="1" aria-label="Eine Stunde mehr">+</button>
      </div>
      <p class="klein leise">Nur ändern, wenn es die Kieferorthopädin oder der Kieferorthopäde sagt. Das neue Ziel gilt ab heute.</p>
    </section>
    <section class="karte-box einst-block">
      <h2>Dein Name</h2>
      <form class="zeile-form" data-form="name-aendern">
        <input class="feld" name="name" value="${esc(s.name)}" maxlength="20" autocomplete="off" aria-label="Dein Name">
        <button class="knopf knopf-blau" type="submit">OK</button>
      </form>
    </section>
    <section class="karte-box einst-block">
      <h2>Dein Tier</h2>
      <div class="arten klein" role="radiogroup" aria-label="Tier">${Object.entries(ARTEN).map(([id, x]) => `
        <button class="karte-box art" role="radio" aria-checked="${id === s.tier.art}" data-aktion="art-wechseln" data-wert="${id}">
          ${tierSvg({ art: id, stufe: 5, bewegt: false })}<span>${x.name}</span></button>`).join("")}</div>
      <form class="zeile-form" data-form="tiername">
        <input class="feld" name="tiername" value="${esc(tierName(s))}" maxlength="16" autocomplete="off" aria-label="Name des Tiers">
        <button class="knopf knopf-blau" type="submit">OK</button>
      </form>
    </section>
    <section class="karte-box">
      <div class="schalter-zeile"><span>Töne</span><button class="schalter" role="switch" aria-checked="${s.ton}" data-aktion="ton" aria-label="Töne"></button></div>
    </section>
    <p class="fusszeile klein leise">Alles bleibt auf diesem Gerät. Es gibt keinen Server, kein Konto und keine Werbung.</p>
  </div>`, { tabs: false });
  sp.dauerhaftAnfragen().then((dauerhaft) => {
    const li = document.getElementById("status-dauerhaft");
    if (li) li.innerHTML = `${ok(dauerhaft)}${dauerhaft ? "Speicher ist als dauerhaft markiert" : "Speicher nicht als dauerhaft bestätigt, darum regelmäßig sichern"}`;
  });
}

// ---------------------------------------------------------------- Sicherung
function exportieren() {
  const s = sp.get();
  if (!s.eintraege.length) return toast("Noch nichts zum Sichern");
  const datei = new File([zuCsv(s.eintraege)], `trageprotokoll-${tagText()}.csv`, { type: "text/csv" });
  // Auf dem Handy über das Teilen-Menü (Dateien, Nachrichten, Mail), am Computer als Download
  const handy = matchMedia("(pointer: coarse)").matches;
  if (handy && navigator.canShare?.({ files: [datei] })) {
    navigator.share({ files: [datei], title: "Trageprotokoll" })
      .then(gesichert)
      .catch((e) => {
        if (e?.name === "AbortError") return;
        herunterladen(datei);
        gesichert();
      });
  } else {
    herunterladen(datei);
    gesichert();
  }
}

function herunterladen(datei) {
  const url = URL.createObjectURL(datei);
  const link = document.createElement("a");
  link.href = url;
  link.download = datei.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function gesichert() {
  sp.merkeSicherung();
  neuZeichnen();
  const liste = meilensteine(auswerten(sp.get()));
  if (liste.length) feiere(liste);
  else toast(`${icon("shield", 18)}Sicherung erstellt`);
}

function importWaehlen() {
  const eingabe = document.getElementById("datei-wahl");
  eingabe.value = "";
  eingabe.click();
}

async function dateiGewaehlt(datei) {
  let text = "";
  try { text = await datei.text(); } catch { /* unten als leer gemeldet */ }
  const { eintraege, fehler } = ausCsv(text);
  if (!eintraege.length) {
    oeffneDialog(`<h2 id="dlg-titel">Keine Einträge gefunden</h2>
      <p>In „${esc(datei.name)}“ steht nichts, was wie ein Trageprotokoll aussieht. Nimm die CSV-Datei, die beim Sichern entstanden ist.</p>
      <button class="knopf knopf-leise" data-aktion="dialog-zu">OK</button>`);
    return;
  }
  wartendeSicherung = eintraege;
  const tage = eintraege.map((e) => e.tag).sort();
  oeffneDialog(`<h2 id="dlg-titel">Sicherung einspielen?</h2>
    <p>${eintraege.length} ${eintraege.length === 1 ? "Eintrag" : "Einträge"} aus der Zeit vom ${tagKurz(tage[0])} bis ${tagKurz(tage.at(-1))}</p>
    ${fehler.length ? `<p>${fehler.length === 1 ? "Eine Zeile konnte" : `${fehler.length} Zeilen konnten`} nicht gelesen werden (Zeile ${fehler.slice(0, 5).join(", ")}${fehler.length > 5 ? " …" : ""}).</p>` : ""}
    <p>Was schon eingetragen ist, bleibt. Es kommen nur die fehlenden Einträge dazu.</p>
    <button class="knopf knopf-blau" data-aktion="import-ok">${icon("einspielen")}Einspielen</button>
    <button class="knopf knopf-leise" data-aktion="dialog-zu">Abbrechen</button>`);
}

// ---------------------------------------------------------------- Ablauf
function neuZeichnen() {
  angezeigterTag = tagText();
  const s = sp.get();
  if (!s.name) return zeigeWillkommen();
  if (!s.tier.art) return zeigeTierWahl();
  ({ heute: zeigeHeute, kalender: zeigeKalender, tier: zeigeTier, erfolge: zeigeErfolge, einstellungen: zeigeEinstellungen }[ansicht] ?? zeigeHeute)();
}

function homescreenInfo() {
  const mitDaten = sp.get().eintraege.length > 0;
  oeffneDialog(`<h2 id="dlg-titel">Auf den Home-Bildschirm</h2>
    <p>Vom Home-Bildschirm startet das Protokoll wie eine App. Safari räumt dort nichts weg.</p>
    <ol class="schritte">
      ${mitDaten ? `<li><span class="nr">1</span><span>Erst eine Sicherung erstellen. Die App auf dem Home-Bildschirm hat einen eigenen Speicher und fängt leer an.</span></li>` : ""}
      <li><span class="nr">${mitDaten ? 2 : 1}</span><span>In Safari unten auf ${icon("teilen", 18)} <b>Teilen</b> tippen.</span></li>
      <li><span class="nr">${mitDaten ? 3 : 2}</span><span><b>„Zum Home-Bildschirm“</b> wählen und auf <b>Hinzufügen</b> tippen.</span></li>
      <li><span class="nr">${mitDaten ? 4 : 3}</span><span>Ab jetzt nur noch dort öffnen.${mitDaten ? " Dann unter Einstellungen die Sicherung einspielen." : ""}</span></li>
    </ol>
    ${mitDaten ? `<button class="knopf knopf-blau" data-aktion="export">${icon("teilen")}Sicherung erstellen</button>` : ""}
    <button class="knopf knopf-leise" data-aktion="dialog-zu">Alles klar</button>`);
}

const AKTIONEN = {
  tab: (wert) => { ansicht = wert; if (wert === "kalender") monat = null; neuZeichnen(); },
  einstellungen: () => { ansicht = "einstellungen"; neuZeichnen(); },
  zurueck: () => { ansicht = "heute"; neuZeichnen(); },

  eintragen: (wert) => oeffneFormular({ tag: wert || tagText() }),
  nacht: (wert) => {
    const [von = "", bis = ""] = wert ? wert.split("-") : [];
    oeffneFormular({ tag: plusTage(tagText(), -1), von, bis });
  },
  schnell: (wert) => {
    const [von, bis] = wert.split("-");
    oeffneFormular({ von, bis });
    nachtAufGestern();
    aktualisiereFormular(true);
  },
  bearbeiten: (id) => {
    const e = sp.get().eintraege.find((x) => x.id === id);
    if (e) oeffneFormular({ ...e });
  },
  "f-tag": (wert) => { formular.tag = wert; aktualisiereFormular(); },
  vorlage: (wert) => {
    [formular.von, formular.bis] = wert.split("-");
    nachtAufGestern();
    aktualisiereFormular(true);
  },
  jetzt: (feld) => { formular[feld] = uhrzeit(); aktualisiereFormular(true); },
  vorschlag: () => { nachtAufGestern(); aktualisiereFormular(); },
  loeschen: () => {
    const e = sp.loescheEintrag(formular?.id);
    formular = null;
    schliesseDialog();
    if (!e) return;
    neuZeichnen();
    toast(`Gelöscht: ${zeitText(e.von)}–${zeitText(e.bis)}`, {
      dauer: 6000,
      aktion: () => {
        if (sp.stelleWiederHer(e)) { neuZeichnen(); toast(`${icon("undo", 18)}Wiederhergestellt`); }
        else toast("Geht nicht mehr, die Zeit ist inzwischen belegt");
      },
    });
  },
  rueckgaengig: () => { const f = rueckgaengig; rueckgaengig = null; document.querySelector(".toast")?.remove(); f?.(); },

  tag: (wert) => zeigeTag(wert),
  monat: (wert) => {
    const [j, m] = monat.split("-").map(Number);
    const d = new Date(j, m - 1 + Number(wert), 1);
    monat = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    zeigeKalender();
  },

  export: () => exportieren(),
  import: () => importWaehlen(),
  "import-ok": () => {
    const r = sp.importiere(wartendeSicherung ?? []);
    wartendeSicherung = null;
    stillUebernehmen();
    neuZeichnen();
    oeffneDialog(`<h2 id="dlg-titel">Sicherung eingespielt</h2>
      <p><b>${r.neu}</b> ${r.neu === 1 ? "Eintrag" : "Einträge"} übernommen.${r.doppelt ? ` ${r.doppelt === 1 ? "Einer war" : `${r.doppelt} waren`} schon da.` : ""}${r.konflikt ? ` ${r.konflikt === 1 ? "Einer überschneidet sich mit einer vorhandenen Zeit und wurde" : `${r.konflikt} überschneiden sich mit vorhandenen Zeiten und wurden`} ausgelassen.` : ""}</p>
      <button class="knopf knopf-gruen" data-aktion="dialog-zu">Super</button>`);
  },
  "homescreen-info": () => homescreenInfo(),

  sache: (id) => {
    const s = sp.get();
    sp.setze({ tier: { ...s.tier, sache: s.tier.sache === id ? null : id } });
    klang("plopp");
    neuZeichnen();
  },
  anziehen: (id) => {
    sp.setze({ tier: { ...sp.get().tier, sache: id } });
    ansicht = "tier";
    neuZeichnen();
    weiterFeiern();
  },
  streicheln: (_, el) => {
    const t = el.querySelector(".tier");
    t?.classList.remove("stups");
    void t?.getBoundingClientRect();
    t?.classList.add("stups");
    t?.addEventListener("animationend", () => t.classList.remove("stups"), { once: true });
    klang("plopp");
  },

  art: (wert, el) => {
    wahlArt = wert;
    for (const b of el.parentElement.children) b.setAttribute("aria-checked", String(b === el));
    document.getElementById("tiername")?.setAttribute("placeholder", ARTEN[wert].namen[0]);
  },
  "art-wechseln": (wert, el) => {
    sp.setze({ tier: { ...sp.get().tier, art: wert } });
    for (const b of el.parentElement.children) b.setAttribute("aria-checked", String(b === el));
  },
  ton: (_, el) => {
    const an = !sp.get().ton;
    sp.setze({ ton: an });
    el.setAttribute("aria-checked", String(an));
    if (an) klang("gespeichert");
  },
  ziel: (wert) => {
    const neu = Math.min(23, Math.max(6, zielStunden() + Number(wert)));
    sp.setzeZiel(neu);
    document.getElementById("ziel-zahl").textContent = neu;
  },

  "dialog-zu": () => { formular = null; schliesseDialog(); if (warteschlange.length) weiterFeiern(); },
  schleier: (_, el, e) => { if (e.target === el) AKTIONEN["dialog-zu"](); },
  weiter: () => weiterFeiern(),
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-aktion]");
  if (!el || el.disabled) return;
  AKTIONEN[el.dataset.aktion]?.(el.dataset.wert, el, e);
});

function feldGeaendert(e) {
  if (e.target.id === "datei-wahl") {
    const datei = e.target.files?.[0];
    if (datei && e.type === "change") dateiGewaehlt(datei);
    return;
  }
  if (!formular || !e.target.closest(".formular")) return;
  const { name, value } = e.target;
  if (name === "von" || name === "bis") {
    formular[name] = value;
    aktualisiereFormular();
  } else if (name === "tag" && value) {
    formular.tag = value > tagText() ? tagText() : value;
    aktualisiereFormular();
  }
}
document.addEventListener("input", feldGeaendert);
document.addEventListener("change", feldGeaendert);

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;
  const daten = new FormData(form);
  const s = sp.get();
  switch (form.dataset.form) {
    case "eintrag":
      return speichereFormular();
    case "name": {
      const name = String(daten.get("name") ?? "").trim();
      if (!name) return wackle(form.querySelector("input"));
      sp.setze({ name });
      return neuZeichnen();
    }
    case "tier": {
      const name = String(daten.get("tiername") ?? "").trim() || ARTEN[wahlArt].namen[0];
      sp.setze({ tier: { ...s.tier, art: wahlArt, name } });
      stillUebernehmen();
      ansicht = "heute";
      neuZeichnen();
      if (apple && !standalone()) homescreenInfo();
      return;
    }
    case "name-aendern": {
      const name = String(daten.get("name") ?? "").trim();
      if (name) { sp.setze({ name }); toast(`${icon("check", 18, { sw: 3 })}Gespeichert`); }
      return;
    }
    case "tiername": {
      const name = String(daten.get("tiername") ?? "").trim();
      if (name) { sp.setze({ tier: { ...s.tier, name } }); toast(`${icon("check", 18, { sw: 3 })}Gespeichert`); }
      return;
    }
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.querySelector(".schleier")) AKTIONEN["dialog-zu"]();
});

// Bleibt die App über Mitternacht offen, beim nächsten Hinsehen auf den neuen Tag springen
function tagPruefen() {
  if (document.hidden || tagText() === angezeigterTag || document.querySelector(".schleier")) return;
  neuZeichnen();
  beimOeffnen();
}
document.addEventListener("visibilitychange", tagPruefen);
setInterval(tagPruefen, 60_000);

function beimOeffnen() {
  const s = sp.get();
  if (!s.name || !s.tier.art) return;
  const a = auswerten(s);
  const liste = [...wochenbilanz(a), ...meilensteine(a)];
  if (liste.length) feiere(liste);
}

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

await sp.abgleichen();
if (standalone() && sp.get().eintraege.length) sp.dauerhaftAnfragen();
neuZeichnen();
beimOeffnen();
