import { useEffect, useRef } from "react";

/**
 * Keep Browse's document height stable until its one reset scroll finishes.
 * A new query can replace the grid with a small loading block; without this
 * reservation the browser clamps scrollY before the smooth scroll even starts.
 */
export function useBrowseResetScroll() {
  const resultsAreaRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const scrollAfterReset = (reset: () => void) => {
    cleanupRef.current?.();
    const results = resultsAreaRef.current;
    const layout = results?.parentElement;
    const previousMinHeight = results?.style.minHeight ?? "";
    const previousAnchor = layout?.style.overflowAnchor ?? "";
    if (results && layout) {
      results.style.minHeight = `${layout.getBoundingClientRect().height}px`;
      layout.style.overflowAnchor = "none";
    }

    let frame = 0;
    const cleanup = () => {
      cancelAnimationFrame(frame);
      if (results) results.style.minHeight = previousMinHeight;
      if (layout) layout.style.overflowAnchor = previousAnchor;
      cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;
    reset();

    frame = requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reducedMotion ? "instant" : "smooth" });
      if (reducedMotion) {
        cleanup();
        return;
      }
      const startedAt = performance.now();
      const releaseWhenFinished = () => {
        // Release on arrival, or if the user interrupts the native animation.
        // This loop observes positioning; it never issues another scroll.
        if (window.scrollY <= 1 || performance.now() - startedAt > 2000) cleanup();
        else frame = requestAnimationFrame(releaseWhenFinished);
      };
      frame = requestAnimationFrame(releaseWhenFinished);
    });
  };

  return { resultsAreaRef, scrollAfterReset };
}