// Das Tier, das mit jedem geschafften Tag wächst. Alles ist SVG im 200er-Raster (Boden bei y = 186),
// damit es in jeder Größe scharf bleibt. Das Tier trägt selbst eine Zahnspange.

export const ARTEN = {
  drache: { name: "Drache", farbe: "#6CC495", hell: "#E2F5CF", dunkel: "#3E9A6C", umriss: "#2F7A55", akzent: "#F7D774", fluegel: "#A9E2C1", namen: ["Funki", "Smaragd", "Flämmchen"] },
  katze: { name: "Katze", farbe: "#F5A65B", hell: "#FFE8CC", dunkel: "#D9813A", umriss: "#B8692B", akzent: "#F7A9B8", namen: ["Mimi", "Tiger", "Krümel"] },
  einhorn: { name: "Einhorn", farbe: "#FFFAFD", hell: "#FBE4F1", dunkel: "#EBD3E8", umriss: "#C4A3D4", akzent: "#F2C14E", namen: ["Glitzer", "Luna", "Sternchen"] },
  panda: { name: "Panda", farbe: "#FFFFFF", hell: "#EEEEF2", dunkel: "#34353F", umriss: "#34353F", akzent: "#9BD27A", namen: ["Bambus", "Kiwi", "Pünktchen"] },
};
const MAEHNE = ["#F49AC1", "#B79CF2", "#86CDF2", "#F9D27A", "#9ADBB5"];

// ab = Anzahl geschaffter Tage
export const STUFEN = [
  { ab: 0, name: "Geheimnisvolles Ei" },
  { ab: 1, name: "Das Ei wackelt" },
  { ab: 2, name: "Gleich schlüpft es" },
  { ab: 3, name: "Baby" },
  { ab: 7, name: "Klein" },
  { ab: 14, name: "Jung" },
  { ab: 30, name: "Groß" },
  { ab: 50, name: "Stark" },
  { ab: 75, name: "Prächtig" },
  { ab: 100, name: "Legendär" },
  { ab: 150, name: "Strahlend" },
  { ab: 250, name: "Sagenhaft" },
  { ab: 365, name: "Unvergleichlich" },
];
export const SCHLUPF = 3; // ab dieser Stufe ist es kein Ei mehr
const GROESSE = [0.82, 0.84, 0.86, 0.6, 0.67, 0.74, 0.8, 0.85, 0.89, 0.93, 0.96, 0.98, 1];
const FLUEGEL = [0, 0, 0, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1, 1.05, 1.1, 1.15];

// ab = Anzahl Sterne aus abgeschlossenen Wochen
export const SACHEN = [
  { id: "schleife", name: "Schleife", ab: 3 },
  { id: "brille", name: "Sonnenbrille", ab: 6 },
  { id: "partyhut", name: "Partyhut", ab: 9 },
  { id: "schal", name: "Schal", ab: 12 },
  { id: "blumen", name: "Blumenkranz", ab: 15 },
  { id: "kopfhoerer", name: "Kopfhörer", ab: 18 },
  { id: "fliege", name: "Fliege", ab: 21 },
  { id: "zauberhut", name: "Zauberhut", ab: 24 },
  { id: "umhang", name: "Umhang", ab: 27 },
  { id: "krone", name: "Krone", ab: 30 },
];

export function stufeVon(erfuellt) {
  let i = 0;
  while (i + 1 < STUFEN.length && erfuellt >= STUFEN[i + 1].ab) i++;
  return i;
}
export const freieSachen = (sterne) => SACHEN.filter((s) => sterne >= s.ab);

// ---------------------------------------------------------------- Zeichnen
const strich = (farbe, breite = 3) => `stroke="${farbe}" stroke-width="${breite}" stroke-linejoin="round" stroke-linecap="round"`;
const spiegel = (inhalt) => `<g transform="translate(200 0) scale(-1 1)">${inhalt}</g>`;
let zaehler = 0;

function ei(a, stufe) {
  const u = strich(a.umriss);
  const riss1 = stufe >= 1 ? `<path d="M100 74 l-7 11 l8 7 l-6 10" fill="none" ${u}/>` : "";
  const riss2 = stufe >= 2
    ? `<path d="M58 128 l11 -7 l9 9 l10 -9 l11 9 l10 -9 l11 9 l10 -8 l12 6" fill="#3B2C35" ${strich("#3B2C35", 4)}/>
       <circle cx="88" cy="126" r="2.4" fill="#fff"/><circle cx="111" cy="126" r="2.4" fill="#fff"/>`
    : "";
  return `<g class="ei${stufe >= 1 ? " wackel" : ""}">
    <path d="M100 70 C130 70 146 120 144 142 C142 168 124 184 100 184 C76 184 58 168 56 142 C54 120 70 70 100 70 Z" fill="${a.farbe}" ${u}/>
    <circle cx="80" cy="106" r="9" fill="${a.hell}"/><circle cx="120" cy="124" r="11" fill="${a.hell}"/>
    <circle cx="86" cy="158" r="8" fill="${a.hell}"/><circle cx="122" cy="162" r="6" fill="${a.hell}"/>
    <circle cx="104" cy="90" r="5" fill="${a.hell}"/>
    ${riss1}${riss2}
  </g>`;
}

function augen(art, jubel) {
  const panda = art === "panda";
  if (jubel) {
    return `<path d="M71 92 Q80 80 89 92 M111 92 Q120 80 129 92" fill="none" ${strich(panda ? "#fff" : "#1E2A4A", 4.5)}/>`;
  }
  const auge = (x) => `${panda ? `<circle cx="${x}" cy="88" r="9.5" fill="#fff"/>` : ""}
    <ellipse cx="${x}" cy="88" rx="${panda ? 6 : 7.5}" ry="${panda ? 7 : 9.5}" fill="#1E2A4A"/>
    <circle cx="${x + 2.6}" cy="84.5" r="2.8" fill="#fff"/><circle cx="${x - 2.4}" cy="92" r="1.3" fill="#fff"/>`;
  return `<g class="augen">${auge(80)}${auge(120)}</g>`;
}

// Offener Mund mit Zahnspange: Zähne, Draht und vier Brackets
function mund(jubel) {
  const w = jubel ? 15 : 12, d = jubel ? 26 : 19, y = 104;
  const l = 100 - w, r = 100 + w;
  const brackets = [-0.62, -0.2, 0.2, 0.62].map((f) => {
    const x = 100 + f * (w - 2.5);
    const by = y + 3.3 + 1.85 * (1 - f * f);
    return `<rect x="${(x - 1.7).toFixed(1)}" y="${(by - 1.7).toFixed(1)}" width="3.4" height="3.4" rx=".8" fill="#DCE2EA" stroke="#8C97A8" stroke-width=".7"/>`;
  }).join("");
  return `<path d="M${l} ${y} Q100 ${y + d} ${r} ${y} Q100 ${y + 4} ${l} ${y} Z" fill="#8E3B46" ${strich("#6E2A35", 2)}/>
    <ellipse cx="100" cy="${y + d * 0.4}" rx="${w * 0.42}" ry="${d * 0.1}" fill="#E8838F"/>
    <path d="M${l + 2} ${y + 1.2} Q100 ${y + 4.8} ${r - 2} ${y + 1.2} L${r - 3} ${y + 5} Q100 ${y + 9} ${l + 3} ${y + 5} Z" fill="#fff"/>
    <path d="M${l + 2.5} ${y + 3.3} Q100 ${y + 7} ${r - 2.5} ${y + 3.3}" fill="none" stroke="#9AA6B8" stroke-width="1.4"/>
    ${brackets}`;
}

const ARTEN_TEILE = {
  drache: {
    schwanz: (a) => `<path d="M134 160 Q174 170 170 128" fill="none" ${strich(a.umriss, 20)}/>
      <path d="M134 160 Q174 170 170 128" fill="none" ${strich(a.farbe, 14)}/>
      <path d="M170 134 L157 124 L170 104 L183 124 Z" fill="${a.akzent}" ${strich(a.umriss)}/>`,
    fluegel: (a, stufe) => {
      const f = FLUEGEL[stufe];
      const fl = `<path d="M0 0 C-14 -22 -38 -30 -50 -20 C-42 -16 -40 -8 -44 0 C-36 -4 -28 0 -28 8 C-20 2 -10 2 0 8 Z" fill="${a.fluegel}" ${strich(a.umriss)}/>`;
      return `<g transform="translate(70 130) scale(${f})">${fl}</g><g transform="translate(130 130) scale(${-f} ${f})">${fl}</g>`;
    },
    ohren: (a) => {
      const horn = `<path d="M74 50 Q65 28 78 18 Q82 34 93 42 Z" fill="${a.akzent}" ${strich(a.umriss)}/>`;
      return horn + spiegel(horn);
    },
    bauch: (a) => `<path d="M84 141 Q100 145 116 141 M80 151 Q100 155 120 151 M84 161 Q100 165 116 161" fill="none" stroke="${a.umriss}" stroke-opacity=".25" stroke-width="2.5" stroke-linecap="round"/>`,
    gesicht: (a) => `<circle cx="93" cy="99" r="1.6" fill="${a.umriss}"/><circle cx="107" cy="99" r="1.6" fill="${a.umriss}"/>`,
  },
  katze: {
    schwanz: (a) => `<path d="M136 162 C168 168 178 138 162 112" fill="none" ${strich(a.umriss, 18)}/>
      <path d="M136 162 C168 168 178 138 162 112" fill="none" ${strich(a.farbe, 12)}/>
      <path d="M167 126 Q166 117 162 112" fill="none" ${strich(a.dunkel, 12)}/>`,
    ohren: (a) => {
      const ohr = `<path d="M56 64 L60 22 L94 46 Z" fill="${a.farbe}" ${strich(a.umriss)}/><path d="M64 55 L66 33 L85 46 Z" fill="${a.akzent}"/>`;
      return ohr + spiegel(ohr);
    },
    gesicht: (a) => `<path d="M100 43 L100 53 M89 46 L91 55 M111 46 L109 55" fill="none" ${strich(a.dunkel, 4)}/>
      <path d="M95.5 97.5 L104.5 97.5 L100 102 Z" fill="#F08A9A" ${strich("#F08A9A", 2)}/>`,
    vorne: (a) => `<path d="M60 100 L36 95 M60 106 L37 109 M140 100 L164 95 M140 106 L163 109" fill="none" ${strich(a.umriss, 2.2)}/>`,
  },
  einhorn: {
    schwanz: (a) => [[140, 164, 10], [152, 153, 11], [160, 139, 10], [162, 124, 9]]
      .map(([x, y, r], i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${MAEHNE[i]}" ${strich(a.umriss, 2.5)}/>`).join(""),
    ohren: (a) => {
      const maehne = [[-70, 14], [-45, 14], [-20, 13], [5, 12], [30, 11]].map(([w, r], i) => {
        const rad = (w * Math.PI) / 180;
        return `<circle cx="${(100 + 52 * Math.cos(rad)).toFixed(1)}" cy="${(84 + 45 * Math.sin(rad)).toFixed(1)}" r="${r}" fill="${MAEHNE[i]}" ${strich(a.umriss, 2.5)}/>`;
      }).join("");
      const ohr = `<path d="M68 54 L63 28 L88 42 Z" fill="${a.farbe}" ${strich(a.umriss)}/><path d="M70 47 L68 34 L81 42 Z" fill="${a.hell}"/>`;
      return maehne + ohr + spiegel(ohr);
    },
    vorne: (a) => `<path d="M93 41 L100 6 L107 41 Z" fill="${a.akzent}" ${strich("#C99A1E", 2.5)}/>
      <path d="M95.5 31 L104.5 27 M97.5 21 L103 18.5" fill="none" ${strich("#C99A1E", 2)}/>
      <circle cx="91" cy="45" r="10" fill="${MAEHNE[1]}" ${strich(a.umriss, 2.5)}/>
      <circle cx="106" cy="43" r="9" fill="${MAEHNE[0]}" ${strich(a.umriss, 2.5)}/>`,
  },
  panda: {
    ohren: (a) => `<circle cx="59" cy="48" r="17" fill="${a.dunkel}"/><circle cx="141" cy="48" r="17" fill="${a.dunkel}"/>`,
    gesicht: (a) => `<ellipse cx="79" cy="90" rx="14" ry="17.5" transform="rotate(28 79 90)" fill="${a.dunkel}"/>
      <ellipse cx="121" cy="90" rx="14" ry="17.5" transform="rotate(-28 121 90)" fill="${a.dunkel}"/>
      <ellipse cx="100" cy="99" rx="5" ry="3.4" fill="${a.dunkel}"/>`,
  },
};

const SACHEN_SVG = {
  schleife: () => `<g transform="translate(134 48) rotate(20)">
      <path d="M0 0 L-17 -11 Q-21 0 -17 11 Z" fill="#F06C9B" ${strich("#B8436E", 2.5)}/>
      <path d="M0 0 L17 -11 Q21 0 17 11 Z" fill="#F06C9B" ${strich("#B8436E", 2.5)}/>
      <circle r="5" fill="#F48FB4" ${strich("#B8436E", 2.5)}/></g>`,
  brille: () => `<rect x="64" y="78" width="30" height="21" rx="9" fill="#26335A"/>
      <rect x="106" y="78" width="30" height="21" rx="9" fill="#26335A"/>
      <path d="M94 85 Q100 81 106 85 M64 84 L49 80 M136 84 L151 80" fill="none" ${strich("#1E2A4A", 3.5)}/>
      <path d="M70 83 L78 83 M112 83 L120 83" fill="none" ${strich("#fff", 2.5)} opacity=".75"/>`,
  partyhut: () => `<g transform="rotate(-14 100 44)">
      <path d="M100 8 L119 46 Q100 52 81 46 Z" fill="#7A4FB0" ${strich("#563687", 2.5)}/>
      <path d="M95.5 17 L104.5 17 M90.5 27 L109.5 27 M85.5 37 L114.5 37" fill="none" stroke="#F2C14E" stroke-width="3.5"/>
      <circle cx="100" cy="8" r="6" fill="#F2C14E" ${strich("#B7860F", 2.5)}/></g>`,
  schal: () => `<path d="M114 134 L120 166 L134 162 L127 131 Z" fill="#C94A2B" ${strich("#93331D", 2.5)}/>
      <path d="M121 166 L120 172 M127 165 L127 171 M133 163 L134 169" fill="none" ${strich("#93331D", 2.5)}/>
      <path d="M62 120 Q100 138 138 120 L140 131 Q100 150 60 131 Z" fill="#C94A2B" ${strich("#93331D", 2.5)}/>
      <path d="M78 128 L77 138 M100 133 L100 143 M122 128 L123 138" fill="none" stroke="#FBE3DA" stroke-width="4"/>`,
  blumen: () => [[-150, "#F49AC1"], [-120, "#FFFFFF"], [-90, "#C3A6F0"], [-60, "#FFFFFF"], [-30, "#F49AC1"]].map(([w, farbe]) => {
    const rad = (w * Math.PI) / 180;
    const x = 100 + 50 * Math.cos(rad), y = 86 + 44 * Math.sin(rad);
    const blaetter = [0, 72, 144, 216, 288].map((b) => {
      const r2 = (b * Math.PI) / 180;
      return `<circle cx="${(x + 6 * Math.cos(r2)).toFixed(1)}" cy="${(y + 6 * Math.sin(r2)).toFixed(1)}" r="5.2" fill="${farbe}" stroke="#D592B4" stroke-width="1.4"/>`;
    }).join("");
    return `${blaetter}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#F2C14E"/>`;
  }).join(""),
  kopfhoerer: () => `<path d="M47 84 Q46 24 100 24 Q154 24 153 84" fill="none" ${strich("#174D86", 10)}/>
      <path d="M47 84 Q46 24 100 24 Q154 24 153 84" fill="none" ${strich("#2267B0", 5)}/>
      <rect x="37" y="70" width="19" height="31" rx="9.5" fill="#2267B0" ${strich("#174D86", 2.5)}/>
      <rect x="144" y="70" width="19" height="31" rx="9.5" fill="#2267B0" ${strich("#174D86", 2.5)}/>`,
  fliege: () => `<path d="M100 126 L83 116 Q78 126 83 136 Z" fill="#2267B0" ${strich("#174D86", 2.5)}/>
      <path d="M100 126 L117 116 Q122 126 117 136 Z" fill="#2267B0" ${strich("#174D86", 2.5)}/>
      <circle cx="88" cy="122" r="1.8" fill="#fff"/><circle cx="88" cy="130" r="1.8" fill="#fff"/>
      <circle cx="112" cy="122" r="1.8" fill="#fff"/><circle cx="112" cy="130" r="1.8" fill="#fff"/>
      <circle cx="100" cy="126" r="5" fill="#3A7FC7" ${strich("#174D86", 2.5)}/>`,
  zauberhut: () => `<path d="M80 45 Q95 24 101 5 Q105 0 108 6 Q113 26 120 45 Z" fill="#3B3F8F" ${strich("#262A66", 2.5)}/>
      <ellipse cx="100" cy="46" rx="35" ry="8" fill="#3B3F8F" ${strich("#262A66", 2.5)}/>
      <path d="M83 40 Q100 44 117 40" fill="none" stroke="#F2C14E" stroke-width="4"/>
      <path d="M97 22 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z M108 12 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1z" fill="#F9D27A"/>`,
  umhang: () => `<path d="M70 120 Q100 130 130 120 L153 180 Q100 193 47 180 Z" fill="#C94A2B" ${strich("#93331D", 2.5)}/>`,
  krone: () => `<path d="M72 48 L68 20 L86 34 L100 12 L114 34 L132 20 L128 48 Q100 54 72 48 Z" fill="#F2C14E" ${strich("#B7860F", 2.5)}/>
      <circle cx="68" cy="19" r="3.5" fill="#F2C14E" ${strich("#B7860F", 2)}/><circle cx="100" cy="11" r="3.5" fill="#F2C14E" ${strich("#B7860F", 2)}/>
      <circle cx="132" cy="19" r="3.5" fill="#F2C14E" ${strich("#B7860F", 2)}/>
      <circle cx="100" cy="38" r="4.5" fill="#C94A2B"/><circle cx="84" cy="42" r="3.2" fill="#2267B0"/><circle cx="116" cy="42" r="3.2" fill="#1C7F52"/>`,
};
// Sachen, die auf dem Kopf sitzen, ersetzen die Eierschale des Babys
const KOPF_SACHEN = ["schleife", "partyhut", "blumen", "kopfhoerer", "zauberhut", "krone"];

function wesen(a, art, stufe, sache, jubel) {
  const t = ARTEN_TEILE[art];
  const u = strich(a.umriss);
  const dunkleGlieder = art === "panda" ? a.dunkel : a.farbe;
  const schale = stufe === SCHLUPF && !KOPF_SACHEN.includes(sache)
    ? `<path d="M60 58 Q66 23 100 21 Q134 23 140 58 L130 50 L121 59 L111 50 L100 59 L89 50 L79 59 L70 50 Z" fill="${a.farbe}" ${u}/><circle cx="114" cy="36" r="6" fill="${a.hell}"/>`
    : "";
  return [
    sache === "umhang" ? SACHEN_SVG.umhang() : "",
    t.schwanz?.(a) ?? "",
    t.fluegel?.(a, stufe) ?? "",
    `<ellipse cx="100" cy="146" rx="40" ry="34" fill="${a.farbe}" ${u}/>`,
    `<ellipse cx="100" cy="152" rx="25" ry="22" fill="${a.hell}"/>`,
    t.bauch?.(a) ?? "",
    `<ellipse cx="63" cy="146" rx="9" ry="15" transform="rotate(25 63 146)" fill="${dunkleGlieder}" ${u}/>`,
    `<ellipse cx="137" cy="146" rx="9" ry="15" transform="rotate(-25 137 146)" fill="${dunkleGlieder}" ${u}/>`,
    `<ellipse cx="80" cy="180" rx="15" ry="8" fill="${dunkleGlieder}" ${u}/>`,
    `<ellipse cx="120" cy="180" rx="15" ry="8" fill="${dunkleGlieder}" ${u}/>`,
    t.ohren?.(a) ?? "",
    `<ellipse cx="100" cy="84" rx="52" ry="45" fill="${a.farbe}" ${u}/>`,
    t.gesicht?.(a) ?? "",
    augen(art, jubel),
    `<ellipse cx="64" cy="105" rx="9" ry="5.5" fill="#F59AA0" opacity=".55"/><ellipse cx="136" cy="105" rx="9" ry="5.5" fill="#F59AA0" opacity=".55"/>`,
    mund(jubel),
    t.vorne?.(a) ?? "",
    sache && sache !== "umhang" ? SACHEN_SVG[sache]() : "",
    schale,
  ].join("");
}

function glanz(stufe, id) {
  const ab = (name) => stufe >= STUFEN.findIndex((s) => s.name === name);
  let s = "";
  if (ab("Legendär")) {
    s += `<defs><radialGradient id="aura${id}"><stop offset="55%" stop-color="#F9D27A" stop-opacity=".55"/><stop offset="100%" stop-color="#F9D27A" stop-opacity="0"/></radialGradient>
      <linearGradient id="bogen${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F49AC1"/><stop offset=".33" stop-color="#F9D27A"/><stop offset=".66" stop-color="#86CDF2"/><stop offset="1" stop-color="#B79CF2"/></linearGradient></defs>
      <circle cx="100" cy="112" r="92" fill="url(#aura${id})"/>`;
  }
  if (ab("Sagenhaft")) s += `<circle cx="100" cy="112" r="88" fill="none" stroke="url(#bogen${id})" stroke-width="5" opacity=".7"/>`;
  if (ab("Unvergleichlich")) s += `<circle cx="100" cy="112" r="80" fill="none" stroke="url(#bogen${id})" stroke-width="3" opacity=".5" stroke-dasharray="2 7" stroke-linecap="round"/>`;
  return s;
}

// Ab "Prächtig" funkelt es, und mit jeder weiteren Stufe kommen Sterne dazu
const FUNKEN = [[28, 62, 9], [174, 46, 7], [178, 126, 8], [22, 138, 6], [58, 22, 6], [146, 16, 8], [12, 96, 7], [190, 86, 6]];
function funkeln(stufe) {
  const ab = STUFEN.findIndex((s) => s.name === "Prächtig");
  if (stufe < ab) return "";
  const anzahl = Math.min(FUNKEN.length, 4 + (stufe - ab) * 1);
  const stern = ([x, y, g], i) => `<path class="funkel" style="animation-delay:${(i * 0.45).toFixed(2)}s" d="M${x} ${y - g} Q${x} ${y} ${x + g} ${y} Q${x} ${y} ${x} ${y + g} Q${x} ${y} ${x - g} ${y} Q${x} ${y} ${x} ${y - g} Z" fill="#F2B535"/>`;
  return FUNKEN.slice(0, anzahl).map(stern).join("");
}

/**
 * @param {{art:string, stufe:number, sache?:string|null, jubel?:boolean, ansicht?:string, klasse?:string, bewegt?:boolean}} o
 *   ansicht: eigener viewBox, z. B. nur der Kopf für die Sachen-Kacheln
 */
export function tierSvg({ art, stufe, sache = null, jubel = false, ansicht = "0 0 200 200", klasse = "", bewegt = true }) {
  const a = ARTEN[art] ?? ARTEN.drache;
  const id = ++zaehler;
  const g = GROESSE[stufe] ?? 1;
  const inhalt = stufe < SCHLUPF ? ei(a, stufe) : wesen(a, art, stufe, sache, jubel);
  return `<svg class="tier ${bewegt ? "bewegt" : ""} ${jubel ? "jubel" : ""} ${klasse}" viewBox="${ansicht}" aria-hidden="true">
    ${glanz(stufe, id)}
    <ellipse cx="100" cy="188" rx="${(48 * g).toFixed(1)}" ry="6" fill="#1E2A4A" opacity=".12"/>
    <g class="figur"><g transform="translate(100 186) scale(${g}) translate(-100 -186)">${inhalt}</g></g>
    ${funkeln(stufe)}
  </svg>`;
}

// Für Kacheln: nur die Sache allein, ohne Tier
export function sacheSvg(id) {
  const ausschnitt = { schleife: "108 28 52 40", brille: "44 70 112 34", partyhut: "72 0 56 56", schal: "54 112 92 64", blumen: "40 30 120 46",
    kopfhoerer: "32 18 136 88", fliege: "74 110 52 32", zauberhut: "62 0 76 58", umhang: "40 112 120 84", krone: "60 6 80 52" }[id];
  return `<svg viewBox="${ausschnitt}" aria-hidden="true">${SACHEN_SVG[id]()}</svg>`;
}
