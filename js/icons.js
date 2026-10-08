// Strich-Icons (24er Raster), im Stil des Bundesländer-Quiz
const PFADE = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  flame: '<path d="M12 3c.8 3.2 5 5.4 5 10a5 5 0 0 1-10 0c0-2.3 1.1-3.9 2.3-5 .2 1.7.9 2.8 2 3.3-.3-3 .1-5.8.7-8.3z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  vor: '<path d="M9 5l7 7-7 7"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="6.6"/>',
  pencil: '<path d="M4 20l1.2-4.6L15.6 5a2.1 2.1 0 0 1 3 3L8.2 18.4z"/><path d="M13.5 7l3 3"/>',
  crown: '<path d="M4 18h16M4.5 15.5L3 7.5l5 3.5 4-6 4 6 5-3.5-1.5 8z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 3l2.2 6.3M15.5 3l-2.2 6.3M12 12.3v4.4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.2a3 3 0 0 0 3.2 4M16 6h2.8a3 3 0 0 1-3.2 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  paw: '<path d="M12 12.2c2.6 0 4.8 2.4 4.8 4.6 0 1.6-1.3 2.4-2.6 2.4-.9 0-1.4-.4-2.2-.4s-1.3.4-2.2.4c-1.3 0-2.6-.8-2.6-2.4 0-2.2 2.2-4.6 4.8-4.6z"/><circle cx="6.2" cy="10.2" r="1.8"/><circle cx="9.4" cy="6.2" r="1.8"/><circle cx="14.6" cy="6.2" r="1.8"/><circle cx="17.8" cy="10.2" r="1.8"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  teilen: '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M6 11.5v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/>',
  einspielen: '<path d="M12 3.5v11M8 10.5l4 4 4-4"/><path d="M5 15.5v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
  shield: '<path d="M12 3l7 3v5.5c0 4.2-3 7.6-7 9-4-1.4-7-4.8-7-9V6z"/><path d="M8.8 12l2.3 2.3 4.3-4.6"/>',
  trash: '<path d="M5 7h14M10 4h4M7 7l.8 12a2 2 0 0 0 2 1.9h4.4a2 2 0 0 0 2-1.9L17 7"/>',
  undo: '<path d="M8 8.5h7a4.5 4.5 0 0 1 0 9h-4M8 8.5l3-3M8 8.5l3 3"/>',
  egg: '<path d="M12 3.5c3.4 0 6 5.6 6 9.6a6 6 0 0 1-12 0c0-4 2.6-9.6 6-9.6z"/>',
  sparkle: '<path d="M12 3.5l1.9 5.6 5.6 1.9-5.6 1.9L12 18.5l-1.9-5.6L4.5 11l5.6-1.9z"/>',
  homescreen: '<rect x="5" y="2.5" width="14" height="19" rx="3"/><path d="M12 8.5v7M8.5 12h7"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.4"/>',
  tooth: '<path d="M7.5 4c-2.5 0-4 2-4 4.5 0 2.3 1 3.7 1.6 5.5.7 2.2.9 6.5 2.6 6.5 1.6 0 1.6-4.5 4.3-4.5s2.7 4.5 4.3 4.5c1.7 0 1.9-4.3 2.6-6.5.6-1.8 1.6-3.2 1.6-5.5C20.5 6 19 4 16.5 4c-1.8 0-2.6 1-4.5 1S9.3 4 7.5 4z"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
};

export function icon(name, size = 22, { fill = "none", sw = 2.2, klasse = "" } = {}) {
  return `<svg class="icon ${klasse}" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PFADE[name]}</svg>`;
}

export const stern = (an, size = 18) =>
  an
    ? `<span class="stern an">${icon("star", size, { fill: "var(--gold)", sw: 1.6 })}</span>`
    : `<span class="stern">${icon("star", size, { sw: 1.8 })}</span>`;

export const sterne = (n, size = 18) => `<span class="sterne" role="img" aria-label="${n} von 3 Sternen">${[0, 1, 2].map((i) => stern(i < n, size)).join("")}</span>`;
