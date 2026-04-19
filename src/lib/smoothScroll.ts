/**
 * Premium smooth-scroll helper.
 *
 * - Uses requestAnimationFrame with an ease-in-out cubic for a polished feel
 * - Accounts for the sticky navbar height so section headings aren't hidden
 * - Respects prefers-reduced-motion (instant jump for accessibility)
 */

const NAVBAR_OFFSET = 80;        // px — height of sticky header + small gap
const DEFAULT_DURATION = 850;    // ms

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function smoothScrollToId(id: string, duration: number = DEFAULT_DURATION): void {
  const el = document.getElementById(id);
  if (!el) return;

  // Respect accessibility preference
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const targetY =
    el.getBoundingClientRect().top + window.pageYOffset - NAVBAR_OFFSET;

  if (prefersReduced) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.pageYOffset;
  const distance = targetY - startY;
  if (Math.abs(distance) < 2) return;

  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, startY + distance * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export function smoothScrollToTop(duration: number = 600): void {
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    window.scrollTo(0, 0);
    return;
  }

  const startY = window.pageYOffset;
  if (startY < 2) return;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);
    window.scrollTo(0, startY * (1 - eased));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
