// Datum und Uhrzeit. Tage sind Texte "JJJJ-MM-TT" in Ortszeit, Uhrzeiten "HH:MM".
// Gerechnet wird mit UTC-Tagesnummern, damit die Zeitumstellung keinen Tag verschiebt.

export const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
export const WT_KURZ = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
export const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const zwei = (n) => String(n).padStart(2, "0");

export const tagText = (d = new Date()) => `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
export const uhrzeit = (d = new Date()) => `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
export const minutenJetzt = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

export function tagIndex(tag) {
  const [j, m, t] = tag.split("-").map(Number);
  return Math.round(Date.UTC(j, m - 1, t) / 864e5);
}
export function tagAusIndex(i) {
  const d = new Date(i * 864e5);
  return `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`;
}
export const plusTage = (tag, n) => tagAusIndex(tagIndex(tag) + n);
export const tageZwischen = (von, bis) => tagIndex(bis) - tagIndex(von);

// 0 = Sonntag … 6 = Samstag (der 1.1.1970 war ein Donnerstag)
export const wochentag = (tag) => (((tagIndex(tag) + 4) % 7) + 7) % 7;
export const montagVon = (tag) => plusTage(tag, -((wochentag(tag) + 6) % 7));

// ISO-Kalenderwoche: Sie gehört zu dem Jahr, in dem ihr Donnerstag liegt
export function kalenderwoche(tag) {
  const donnerstag = plusTage(montagVon(tag), 3);
  return Math.floor(tageZwischen(`${donnerstag.slice(0, 4)}-01-01`, donnerstag) / 7) + 1;
}

export function zeitMin(z) {
  const [h, m] = z.split(":").map(Number);
  return h * 60 + m;
}
export const minZeit = (min) => `${zwei(Math.floor(min / 60) % 24)}:${zwei(min % 60)}`;

// Anzeige: "07:00" -> "7:00", 1440 -> "24:00"
export const zeitText = (z) => z.replace(/^0(\d)/, "$1");
export const minText = (min) => (min >= 1440 ? "24:00" : zeitText(minZeit(min)));

export function dauerText(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
// 930 -> "15,5"
export const stundenText = (min) => String(Math.round(min / 6) / 10).replace(".", ",");

export const tagLang = (tag) => `${WOCHENTAGE[wochentag(tag)]}, ${Number(tag.slice(8))}. ${MONATE[Number(tag.slice(5, 7)) - 1]}`;
export const tagKurz = (tag) => `${WT_KURZ[wochentag(tag)]}., ${Number(tag.slice(8))}.${Number(tag.slice(5, 7))}.`;
export const tagMonat = (tag) => `${Number(tag.slice(8))}. ${MONATE[Number(tag.slice(5, 7)) - 1]}`;

export function tagRelativ(tag, heute) {
  const d = tageZwischen(tag, heute);
  if (d === 0) return "heute";
  if (d === 1) return "gestern";
  if (d === -1) return "morgen";
  return `am ${tagKurz(tag)}`;
}
