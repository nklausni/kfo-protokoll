// Kleine Belohnungen: Töne (per Web Audio erzeugt, keine Dateien) und Konfetti. Aus dem Bundesländer-Quiz übernommen.
import { get } from "./speicher.js";

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function ton(frequenz, start, dauer, art = "sine", lautstaerke = 0.18) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = art;
  osc.frequency.setValueAtTime(frequenz, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(lautstaerke, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  osc.connect(gain).connect(a.destination);
  osc.start(t);
  osc.stop(t + dauer + 0.05);
}

export function klang(art) {
  if (!get().ton) return;
  try {
    if (art === "gespeichert") { ton(784, 0, 0.18, "triangle"); ton(1175, 0.09, 0.28, "triangle"); }
    else if (art === "geschafft") { [523, 659, 784, 1047].forEach((f, i) => ton(f, i * 0.11, 0.35, "triangle", 0.16)); }
    else if (art === "wachsen") { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => ton(f, i * 0.09, 0.3, "triangle", 0.14)); }
    else if (art === "plopp") { ton(660, 0, 0.12, "sine", 0.14); }
  } catch {
    // Ton ist nur Zugabe
  }
}

export function konfetti(dauer = 2600) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const c = document.createElement("canvas");
  c.className = "konfetti";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  document.body.appendChild(c);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  const farben = ["#C94A2B", "#2267B0", "#1C7F52", "#F2B535", "#7A4FB0", "#F4A6A0", "#6CC495"];
  const teile = Array.from({ length: 110 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 80,
    y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 11 - 4,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    f: farben[Math.floor(Math.random() * farben.length)],
  }));
  const start = performance.now();
  (function bild(jetzt) {
    const t = jetzt - start;
    g.clearRect(0, 0, innerWidth, innerHeight);
    g.globalAlpha = Math.max(0, 1 - Math.max(0, t - dauer * 0.7) / (dauer * 0.3));
    for (const p of teile) {
      p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.f;
      g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    if (t < dauer) requestAnimationFrame(bild); else c.remove();
  })(start);
}
