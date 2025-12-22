export default function isMobile() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(max-width: 559px)").matches;
  }
  return window.innerWidth < 560;
}
