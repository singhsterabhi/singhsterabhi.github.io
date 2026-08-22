// Character-rain field — the "living background" (decision doc §"The living
// background"). Hand-written canvas, no animation library. The scanline
// drift layer was removed after user feedback (fix round 1): it read as a
// print artifact on the light ground and competed with the glyphs rather
// than adding motion, so only the rain remains.
//
// Five non-negotiables carried in from the decision doc, enforced here:
//   1. This module is dynamically imported by LivingBackground.astro on
//      idle — never in the LCP path. (enforced by the caller, not here)
//   2. Under reduced motion, `start()` draws exactly one static frame and
//      never calls requestAnimationFrame.
//   3. With JS disabled the canvas is simply empty — nothing here runs.
//   4. `columnCount` scales down for narrow viewports, capped at 26 at
//      375px, and callers pause the loop when off-screen/hidden.
//   5. `maxAlpha()` gives each theme its own ceiling, tuned per ground —
//      light needs a HIGHER ceiling than dark (glyphs are dark-on-white
//      there, which reads fainter per unit alpha than light-on-dark).

export type Theme = 'dark' | 'light';

export interface RainOptions {
  reducedMotion: boolean;
  theme: Theme;
}

export interface Rain {
  start(): void;
  stop(): void;
  running(): boolean;
  maxAlpha(): number;
  /** Re-derive columns for a new width (called on debounced resize). */
  resize(width: number, height: number): void;
  /** Re-read theme colours from the computed custom properties. */
  setTheme(theme: Theme): void;
  /** Flip the reduced-motion behaviour at runtime (the motion toggle). */
  setReducedMotion(reduced: boolean): void;
  /** Current x position of every column's lane centre — exposed for testing
   *  full-width coverage (bug: columns used to bunch against the left edge). */
  columnXs(): number[];
  /** A click landed at canvas-space x: send a wavefront out from it. Takes no
   *  y — the field's grammar is vertical lanes, so the front excites whole
   *  lanes and the click's height carries no information.
   *  No-op under reduced motion and while the loop is stopped. */
  ripple(x: number): void;
  /** Advance the simulation by one frame. The rAF loop calls this; tests call
   *  it directly, because a ripple is only observable over several frames. */
  step(): void;
  /** Per-column excitement, 0..1 — how hard a passing wavefront hit it. */
  excitement(): number[];
  /** Wavefronts still travelling. Capped; see MAX_RIPPLES. */
  rippleCount(): number;
  /** Each column's contents as they read on screen, top to bottom. Un-reverses
   *  the bottom-up storage, so a token column returns the token itself. */
  columnText(): string[];
}

const GLYPHS = '01<>/{}[]#$_—❯abcdef'.split('');

// ── The vocabulary ─────────────────────────────────────────────────────────
// About a third of columns spell a real token instead of glyph noise, so the
// field reads as texture from across the room and resolves into something
// meaningful where you happen to look.
//
// Every entry is sourced from this repo, never invented: project tags and copy
// (src/data/projects.yaml), the timeline (src/data/timeline.yaml), or this
// site's own build. That rule is what keeps the field from becoming a list of
// technologies the owner does not actually use — see tests/dom/rain.test.ts,
// which pins each token to where it came from.
//
// The unglamorous ones matter most. `dehazing`, `segmentation` and `circuits`
// come from the IIT Madras internship and the electrical-engineering degree,
// and they are the reason this is an easter egg rather than a keyword list:
// nobody leaning in expects a frontend portfolio to mention image dehazing.
export const TOKENS = [
  // project tags — src/data/projects.yaml
  'TypeScript', 'React', 'TanStack', 'IndexedDB', 'PWA',
  // project copy — src/data/projects.yaml
  'offline-first', 'virtualised', 'pinning',
  // timeline — src/data/timeline.yaml
  'Python', 'JavaScript', 'ad-tech', 'latency',
  'dehazing', 'segmentation', 'circuits', 'power-systems',
  // this site's own build
  'Astro', 'Tailwind', 'oklch', 'canvas', 'WebMCP',
];

/** Share of columns carrying a real token rather than glyph noise. A third:
 *  enough that a glance somewhere new usually finds one, sparse enough that
 *  the field still reads as noise behind the page's own copy. */
const TOKEN_SHARE = 1 / 3;
// GLYPH_CELL is the glyph's own vertical metric: font size and line height
// (the fall step between stacked characters in a column). It is NOT the
// horizontal column pitch — that is derived per-width below so the capped
// column count always spans the full canvas instead of bunching at the left
// edge (the bug: 52 columns * a fixed 16px pitch = 832px on a 1440px canvas).
const GLYPH_CELL = 16;

/** Non-negotiable 4: mobile gets fewer columns and a lower frame budget.
 *  Scales with viewport width, capped at 26 columns at/around 375px, and
 *  never returns zero so the field is never empty on a narrow screen. */
export function columnCount(width: number): number {
  const raw = Math.floor(width / GLYPH_CELL);
  const capped = Math.min(raw, 26 + Math.floor(Math.max(0, width - 375) / 40));
  return Math.max(1, Math.min(raw, capped));
}

/** Horizontal lane pitch: spread the (possibly capped) column count evenly
 *  across the full width, rather than packing columns at a fixed pitch that
 *  only fills part of the canvas when the count is capped. */
function columnPitch(width: number, cols: number): number {
  return width / cols;
}

function readColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Non-negotiable 5: each theme gets its own ceiling. Dark glyphs are
 *  light-on-dark (ΔL per unit alpha ≈ 0.66); light glyphs are dark-on-white
 *  (ΔL per unit alpha ≈ 0.50) — so light needs a HIGHER alpha ceiling than
 *  dark to read with comparable presence, not a lower one. Raised again
 *  (fix round 1, addendum) once the scanline layer was removed — with no
 *  other texture on the canvas the glyphs are the whole field and need to
 *  carry it alone. */
function maxAlphaFor(theme: Theme): number {
  return theme === 'dark' ? 0.30 : 0.38;
}

// ── Click ripple ───────────────────────────────────────────────────────────
// A click sends an invisible wavefront out from the point. Nothing draws the
// ring: as it crosses each column, that column flares and surges, so the
// reaction lives in the medium rather than sitting on top of it. Near lanes
// react first and distant ones a beat later — the delay IS the effect.
const RIPPLE_SPEED = 26;        // px per frame; crosses 1440px in ~0.9s
const RIPPLE_DECAY = 0.94;      // excitement per frame — ~0.6s back to rest
const RIPPLE_KICK = 2.2;        // px/frame added to fall speed at full flare
const RIPPLE_HEAD_SPREAD = 3;   // extra glyphs drawn in the head colour
// A flare deliberately exceeds maxAlphaFor(): that ceiling governs the field
// AT REST, where it must not compete with content. This is a transient a few
// hundred ms long, and clamping it to the resting ceiling would make the
// reaction invisible — which is the whole point of the feature.
const RIPPLE_PEAK_ALPHA = 0.72;
// Rapid clicking must not accumulate work without bound. Oldest wavefront is
// dropped rather than refusing the new one, so the newest click always reacts.
const MAX_RIPPLES = 4;

interface Ripple {
  x: number;
  r: number;
}

interface Column {
  x: number;
  y: number;
  /** Resting fall speed. Effective speed adds the ripple kick on top, so the
   *  surge decays back to exactly this instead of drifting permanently. */
  baseSpeed: number;
  /** 0..1, set to 1 when a wavefront passes and decayed every frame after. */
  excite: number;
  /** Stored bottom-up: glyphs[0] is the bright head at the BOTTOM of the
   *  column, and index increases upward (see drawFrame's `col.y - i * CELL`).
   *  A token is therefore stored reversed so it reads top-to-bottom on screen,
   *  with its last character in the bright head — as if typed downward. */
  glyphs: string[];
  length: number;
}

/** Contents for one column: a real token a third of the time, glyph noise the
 *  rest. Reversed on the way in — see Column.glyphs for why. */
function pickGlyphs(): string[] {
  if (Math.random() < TOKEN_SHARE) {
    const token = TOKENS[Math.floor(Math.random() * TOKENS.length)];
    return [...token].reverse();
  }
  const length = 6 + Math.floor(Math.random() * 10);
  return Array.from({ length }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
}

function makeColumn(x: number, height: number): Column {
  const glyphs = pickGlyphs();
  const length = glyphs.length;
  return {
    x,
    // Seeded within the visible band (not above it) so the very first
    // drawn frame already shows a populated field — this matters under
    // reduced motion, where that first frame is the only one ever drawn
    // and must never come up blank by the luck of the random seed.
    y: Math.random() * height,
    baseSpeed: 0.4 + Math.random() * 1.1,
    excite: 0,
    glyphs,
    length,
  };
}

export function createRain(canvas: HTMLCanvasElement, opts: RainOptions): Rain {
  const ctx = canvas.getContext('2d');
  let theme = opts.theme;
  let reducedMotion = opts.reducedMotion;
  let running = false;
  let rafId: number | null = null;

  let width = canvas.clientWidth || 800;
  let height = canvas.clientHeight || 600;
  let dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);

  let cols = columnCount(width);
  let pitch = columnPitch(width, cols);
  let columns: Column[] = Array.from({ length: cols }, (_, i) =>
    makeColumn(Math.round(i * pitch + pitch / 2), height)
  );

  let ripples: Ripple[] = [];

  let head = readColor('--color-accent-2', '#e070c0');
  let tail = readColor('--color-accent', '#f5ae39');

  function applyCanvasSize() {
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  applyCanvasSize();

  function drawFrame() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const alpha = maxAlphaFor(theme);
    ctx.font = `${GLYPH_CELL - 2}px var(--font-mono, ui-monospace, monospace)`;
    ctx.textBaseline = 'top';

    for (const col of columns) {
      // A flared lane brightens and its head colour reaches further down it.
      const lit = Math.min(alpha * (1 + col.excite * 1.6), RIPPLE_PEAK_ALPHA);
      const headTo = Math.round(col.excite * RIPPLE_HEAD_SPREAD);
      for (let i = 0; i < col.glyphs.length; i++) {
        const gy = col.y - i * GLYPH_CELL;
        if (gy < -GLYPH_CELL || gy > height) continue;
        const isHead = i <= headTo;
        const fade = 1 - i / col.glyphs.length;
        ctx.globalAlpha = lit * (i === 0 ? 1 : 0.55 * fade + col.excite * 0.35 * fade);
        ctx.fillStyle = isHead ? head : tail;
        ctx.fillText(col.glyphs[i], col.x, gy);
      }
    }

    ctx.globalAlpha = 1;
  }

  /** One frame of simulation, drawing excluded. Wavefronts advance first, so a
   *  column flares on the same frame the front reaches it. */
  function advance() {
    if (ripples.length > 0) {
      const reach = width;
      for (const rip of ripples) {
        const prev = rip.r;
        rip.r += RIPPLE_SPEED;
        for (const col of columns) {
          // Horizontal distance only: the field's grammar is vertical lanes,
          // so the front excites whole lanes rather than bending them.
          const d = Math.abs(col.x - rip.x);
          // Triggered exactly once, on the frame the front sweeps past it.
          if (d >= prev && d < rip.r) col.excite = 1;
        }
      }
      ripples = ripples.filter((rip) => rip.r <= reach);
    }

    for (const col of columns) {
      col.y += col.baseSpeed + col.excite * RIPPLE_KICK;
      col.excite *= RIPPLE_DECAY;
      if (col.excite < 0.01) col.excite = 0;
      if (col.y - col.length * GLYPH_CELL > height) {
        col.y = Math.random() * -height * 0.2;
        col.baseSpeed = 0.4 + Math.random() * 1.1;
        // Re-picked on every recycle, not just at creation: a column that kept
        // its contents for the life of the page would show one token forever,
        // and the vocabulary would only ever be as wide as the column count.
        col.glyphs = pickGlyphs();
        col.length = col.glyphs.length;
      }
    }
  }

  function tick() {
    advance();
    drawFrame();
    if (running) rafId = requestAnimationFrame(tick);
  }

  return {
    start() {
      if (running) return;
      if (reducedMotion) {
        // Non-negotiable 2: one static frame, then nothing moves.
        drawFrame();
        return;
      }
      running = true;
      rafId = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    running() {
      return running;
    },
    maxAlpha() {
      return maxAlphaFor(theme);
    },
    columnXs() {
      return columns.map((c) => c.x);
    },
    ripple(x: number) {
      // Non-negotiable 2: reduced motion means nothing moves, so a click gets
      // no reaction at all. Also ignored while stopped (off-screen or hidden
      // tab) — queueing wavefronts nothing will draw would let them all fire
      // at once on the next start().
      if (reducedMotion || !running) return;
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, r: 0 });
    },
    step() {
      advance();
      drawFrame();
    },
    excitement() {
      return columns.map((c) => c.excite);
    },
    rippleCount() {
      return ripples.length;
    },
    columnText() {
      return columns.map((c) => [...c.glyphs].reverse().join(''));
    },
    resize(w: number, h: number) {
      width = w;
      height = h;
      dpr = Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2);
      applyCanvasSize();
      cols = columnCount(width);
      pitch = columnPitch(width, cols);
      columns = Array.from({ length: cols }, (_, i) =>
        makeColumn(Math.round(i * pitch + pitch / 2), height)
      );
      if (!running) drawFrame();
    },
    setTheme(t: Theme) {
      theme = t;
      head = readColor('--color-accent-2', head);
      tail = readColor('--color-accent', tail);
      if (!running) drawFrame();
    },
    setReducedMotion(reduced: boolean) {
      reducedMotion = reduced;
      if (reduced) {
        running = false;
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        drawFrame();
      }
    },
  };
}
