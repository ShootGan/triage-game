import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/** A term with an explanation shown on hover (desktop) or tap (phone). */
export function Term({ children, explain }: { children: ReactNode; explain: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const tipRef = useRef<HTMLSpanElement>(null);

  // Keep the tip inside the scrolling panel (or the window) when the word sits near the right edge.
  useLayoutEffect(() => {
    if (!open || !tipRef.current) return;
    const tip = tipRef.current;
    const box = tip.closest('.panel')?.getBoundingClientRect() ?? { left: 0, right: window.innerWidth };
    const r = tip.getBoundingClientRect();
    const over = r.right - shift - (box.right - 12);
    const next = over > 0 ? Math.max(-over, box.left + 12 - (r.left - shift)) : 0;
    if (next !== shift) setShift(next);
  }, [open, shift]);

  return (
    <span className={`term ${open ? 'open' : ''}`} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" className="term-word" aria-expanded={open} onClick={() => setOpen(!open)}>
        {children}
      </button>
      <span className="term-tip" role="tooltip" ref={tipRef} style={{ left: shift }}>
        {explain}
      </span>
    </span>
  );
}
