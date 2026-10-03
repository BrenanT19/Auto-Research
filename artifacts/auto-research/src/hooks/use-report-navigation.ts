import { useEffect, useRef, useState } from "react";
import { getActiveReportSection, type ReportSectionId } from "../shopper-tools";

const sectionIds: ReportSectionId[] = ["overview", "reliability", "external-owner-patterns", "costs", "reports"];

export function useReportNavigation(vehicleId: string, ready: boolean, reportsLoading: boolean) {
  const [activeSection, setActiveSection] = useState<ReportSectionId>("overview");
  const detailNavRef = useRef<HTMLElement>(null);
  const pendingTarget = useRef<ReportSectionId | null>(null);
  const initializedRoute = useRef<string | null>(null);
  const scheduleRef = useRef<(() => void) | null>(null);

  const geometry = () => {
    const nav = detailNavRef.current;
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 72;
    const navHeight = nav && getComputedStyle(nav).position === "sticky" ? nav.getBoundingClientRect().height : 0;
    const activationLine = headerHeight + navHeight + 12;
    nav?.parentElement?.style.setProperty("--report-section-offset", `${activationLine}px`);
    const positions = sectionIds.map(id => ({
      id,
      top: document.getElementById(id)?.getBoundingClientRect().top ?? Infinity,
    }));
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return { activationLine, positions, maxScroll };
  };

  const navigateToSection = (id: ReportSectionId, updateHistory = true, instant = false) => {
    const { positions, activationLine, maxScroll } = geometry();
    const position = positions.find(section => section.id === id)!;
    if (!Number.isFinite(position.top)) return;
    pendingTarget.current = id;
    setActiveSection(id);
    if (updateHistory && window.location.hash !== `#${id}`) {
      window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${id}`);
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: Math.min(maxScroll, Math.max(0, window.scrollY + position.top - activationLine)),
      behavior: instant || reducedMotion ? "instant" : "smooth",
    });
    scheduleRef.current?.();
  };

  useEffect(() => {
    if (!ready) return;
    pendingTarget.current = null;
    let frame = 0;
    const update = () => {
      const { positions, activationLine, maxScroll } = geometry();
      const target = pendingTarget.current;
      if (target) {
        const position = positions.find(section => section.id === target)!;
        const destination = Math.min(maxScroll, Math.max(0, window.scrollY + position.top - activationLine));
        // Keep click feedback while intermediate sections pass the same line.
        // At arrival (including a bottom-clamped short section), hand back.
        if (Math.abs(window.scrollY - destination) > 1) return;
        pendingTarget.current = null;
      }
      setActiveSection(getActiveReportSection(positions, activationLine, window.scrollY >= maxScroll - 1));
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    scheduleRef.current = schedule;
    const interrupt = () => {
      pendingTarget.current = null;
      schedule();
    };
    const keyInterrupt = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) interrupt();
    };
    const settled = (event: Event) => {
      // A prior animation's scrollend may arrive after a new click. It is only
      // a wakeup: the shared destination rule, not this event, ends click feedback.
      if (event.target === document || event.target === window) schedule();
    };
    // Observer events are wakeups only; all decisions use the same measured line.
    const observer = new IntersectionObserver(schedule, { threshold: [0, 0.01, 0.5, 1] });
    const resizeObserver = new ResizeObserver(schedule);
    sectionIds.forEach(id => {
      const section = document.getElementById(id);
      if (section) { observer.observe(section); resizeObserver.observe(section); }
    });
    if (detailNavRef.current) resizeObserver.observe(detailNavRef.current);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("scrollend", settled);
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("keydown", keyInterrupt);
    window.addEventListener("popstate", interrupt);
    window.addEventListener("hashchange", interrupt);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scrollend", settled);
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("keydown", keyInterrupt);
      window.removeEventListener("popstate", interrupt);
      window.removeEventListener("hashchange", interrupt);
      pendingTarget.current = null;
      scheduleRef.current = null;
    };
  }, [vehicleId, ready]);

  useEffect(() => {
    if (!ready || initializedRoute.current === vehicleId) return;
    const hash = window.location.hash.slice(1) as ReportSectionId;
    if (hash === "reports" && reportsLoading) return;
    initializedRoute.current = vehicleId;
    if (sectionIds.includes(hash)) navigateToSection(hash, false, true);
  }, [vehicleId, ready, reportsLoading]);

  useEffect(() => {
    const nav = detailNavRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!nav || !link) return;
    const navBox = nav.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    // Horizontal-only reveal cannot interrupt the document's vertical scroll.
    if (linkBox.left < navBox.left) nav.scrollLeft += linkBox.left - navBox.left;
    else if (linkBox.right > navBox.right) nav.scrollLeft += linkBox.right - navBox.right;
  }, [activeSection]);

  return { activeSection, detailNavRef, navigateToSection };
}