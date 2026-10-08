// Abzeichen. Fast alle hängen nur an den Einträgen und kommen darum mit einer Sicherung zurück.
import { STUFEN, SCHLUPF } from "./tier.js";

const bis = (wert, ziel) => [Math.min(ziel, wert), ziel];

// stand(a, s) -> [erreicht, Ziel]; a = auswerten(), s = gespeicherter Stand
export const ABZEICHEN = [
  { id: "start", name: "Los geht’s", text: "Die erste Tragezeit eingetragen", icon: "pencil", farbe: "koralle", stand: (a) => bis(a.anzahl, 1) },
  { id: "volltreffer", name: "Volltreffer", text: "Zum ersten Mal das Tagesziel geschafft", icon: "target", farbe: "gruen", stand: (a) => bis(a.erfuellt, 1) },
  { id: "geschluepft", name: "Geschlüpft", text: "Dein Tier ist aus dem Ei geschlüpft", icon: "egg", farbe: "gold", stand: (a) => bis(a.erfuellt, STUFEN[SCHLUPF].ab) },
  { id: "serie3", name: "Dreierpack", text: "3 Tage hintereinander geschafft", icon: "flame", farbe: "koralle", stand: (a) => bis(a.besteSerie, 3) },
  { id: "serie7", name: "Ganze Woche", text: "7 Tage hintereinander geschafft", icon: "flame", farbe: "koralle", stand: (a) => bis(a.besteSerie, 7) },
  { id: "sternwoche", name: "Sternenwoche", text: "Eine Woche mit 3 Sternen", icon: "star", farbe: "gold", stand: (a) => bis(a.volleWochen, 1) },
  { id: "serie14", name: "Zwei Wochen am Stück", text: "14 Tage hintereinander geschafft", icon: "flame", farbe: "lila", stand: (a) => bis(a.besteSerie, 14) },
  { id: "tage30", name: "30 Volltreffer", text: "An 30 Tagen das Ziel geschafft", icon: "medal", farbe: "blau", stand: (a) => bis(a.erfuellt, 30) },
  { id: "serie30", name: "Monats-Serie", text: "30 Tage hintereinander geschafft", icon: "crown", farbe: "lila", stand: (a) => bis(a.besteSerie, 30) },
  { id: "tage100", name: "100 Volltreffer", text: "An 100 Tagen das Ziel geschafft", icon: "trophy", farbe: "gold", stand: (a) => bis(a.erfuellt, 100) },
  { id: "sicher", name: "Gut gesichert", text: "Die erste Sicherung gemacht", icon: "shield", farbe: "blau", stand: (a, s) => bis(s.sicherungen.length, 1) },
  { id: "sicher4", name: "Sicherungs-Profi", text: "4 Sicherungen gemacht", icon: "shield", farbe: "gruen", stand: (a, s) => bis(s.sicherungen.length, 4) },
];

/** Abzeichen, die erreicht, aber noch nicht vergeben sind */
export function neueAbzeichen(a, s) {
  return ABZEICHEN.filter((z) => {
    if (s.abzeichen[z.id]) return false;
    const [ist, ziel] = z.stand(a, s);
    return ist >= ziel;
  });
}
