import { useCallback, useEffect, useRef, useState } from 'react';
import { runLine, type Line, type ProjectEntry } from '../commands/registry';
import { complete } from '../commands/complete';

const TONE: Record<Line['tone'], string> = {
  cmd: 'var(--color-neutral-600)',
  out: 'var(--color-neutral-300)',
  muted: 'var(--color-neutral-600)',
  accent: 'var(--color-accent-300)',
  err: 'var(--color-accent-2-300)',
};

const BANNER: Line[] = [
  { text: "abhishek's portfolio — terminal v1", tone: 'accent' },
  { text: 'the same commands agents get through WebMCP. type help.', tone: 'muted' },
  { text: '', tone: 'muted' },
];

export default function Terminal({
  projects,
  openOnMount = false,
}: { projects: ProjectEntry[]; openOnMount?: boolean }) {
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [input, setInput] = useState('');
  const [hist, setHist] = useState<string[]>([]);
  const [hIdx, setHIdx] = useState(-1);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const openDialog = useCallback(() => {
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();                       // native focus trap + Esc handling
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const closeDialog = useCallback(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
  }, []);

  useEffect(() => {
    if (openOnMount) openDialog();
  }, [openOnMount, openDialog]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea';
      if (!typing && e.key === '`') { e.preventDefault(); openDialog(); }
      if (!typing && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openDialog(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDialog]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    // `cancelled` is load-bearing. Without it, an unmount before the dynamic
    // import resolves runs cleanup while `controller` is still null — the abort
    // is a no-op, and the controller that arrives afterwards is never aborted.
    let cancelled = false;
    let controller: AbortController | null = null;
    import('./webmcp').then(({ registerWebMcpTools }) =>
      registerWebMcpTools({ projects, setTheme: (t) => window.__setTheme?.(t) })
        .then((c) => {
          controller = c;
          if (cancelled) c?.abort();
        }),
    );
    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [projects]);

  const submit = (raw: string) => {
    const result = runLine(raw, {
      projects,
      setTheme: (t) => window.__setTheme?.(t),
    });

    if (result.clear) { setLines([]); return; }
    setLines((prev) => prev.concat(result.lines, { text: '', tone: 'muted' }));
    if (result.close) { closeDialog(); return; }
    if (result.navigate) {
      setTimeout(() => { window.location.href = result.navigate!; }, 400);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = input;
      setInput('');
      setHIdx(-1);
      if (v.trim()) setHist((h) => [v, ...h]);
      submit(v);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const i = Math.min(hIdx + 1, hist.length - 1);
      if (i >= 0) { setHIdx(i); setInput(hist[i]); }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Clamp at -1. Without the floor, one ArrowDown at rest drives hIdx to -2,
      // and ArrowUp's `if (i >= 0)` guard then blocks every recovery — history
      // recall stays dead for the rest of the session.
      const i = Math.max(hIdx - 1, -1);
      setHIdx(i);
      setInput(i >= 0 ? hist[i] : '');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      setInput(complete(input, projects.map((p) => p.slug)));
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label="Terminal"
      onClose={() => { /* native Esc lands here; nothing to undo */ }}
      className="m-0 max-h-[72vh] w-full max-w-[760px] overflow-hidden rounded-xl border border-[var(--color-neutral-700)] bg-[var(--color-panel)] p-0 backdrop:bg-[var(--color-scrim)] backdrop:backdrop-blur-sm"
      style={{ marginTop: '8vh', marginInline: 'auto' }}
    >
      <div className="flex flex-col max-h-[72vh]">
        <div className="flex flex-none items-center gap-2.5 border-b border-[var(--color-neutral-900)] px-3.5 py-2.5">
          <span className="size-2.5 rounded-full bg-[var(--color-neutral-800)]" />
          <span className="size-2.5 rounded-full bg-[var(--color-neutral-800)]" />
          <span className="size-2.5 rounded-full bg-[var(--color-neutral-800)]" />
          <span className="ml-2 font-mono text-xs text-[var(--color-neutral-600)]">
            abhishek@portfolio — ~
          </span>
          <button
            type="button"
            onClick={closeDialog}
            className="ml-auto font-mono text-[11px] text-[var(--color-neutral-700)]"
          >esc to close</button>
        </div>

        <div
          ref={scrollRef}
          aria-live="polite"
          tabIndex={0}
          role="log"
          aria-label="Terminal output"
          className="flex-1 overflow-auto px-4.5 py-4 font-mono text-[13.5px] leading-[1.85]"
        >
          {lines.map((l, i) => (
            <div key={i} className="whitespace-pre" style={{ color: TONE[l.tone] }}>{l.text}</div>
          ))}
          <div className="mt-0.5 flex items-baseline gap-2.5">
            <span className="flex-none text-[var(--color-accent)]">❯</span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoComplete="off"
              aria-label="Command"
              className="flex-1 border-0 bg-transparent p-0 font-mono text-[13.5px] leading-[1.85] text-[var(--color-text)] outline-none"
            />
          </div>
        </div>

        <div className="flex flex-none gap-4.5 border-t border-[var(--color-neutral-900)] px-4 py-2.5 font-mono text-[11px] text-[var(--color-neutral-700)]">
          <span>tab completes</span><span>↑↓ history</span><span>help lists everything</span>
          <span className="ml-auto text-[var(--color-neutral-600)]">shareable at /terminal</span>
        </div>
      </div>
    </dialog>
  );
}
