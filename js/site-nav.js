/* Mobile navigation controller for the compact menu. */
document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".top-nav");
  const toggle = document.querySelector(".mobile-nav-toggle");
  const links = document.querySelector(".nav-links");
  const toggleLabel = toggle?.querySelector("span");

  if (!nav || !toggle || !links) return;

  nav.setAttribute("aria-label", "Primary navigation");
  toggle.setAttribute("aria-label", "Open navigation menu");

  const setOpen = (isOpen, returnFocus = false) => {
    nav.classList.toggle("is-open", isOpen);
    document.documentElement.classList.toggle("mobile-menu-open", isOpen);
    document.body.classList.toggle("mobile-menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    if (toggleLabel) toggleLabel.textContent = isOpen ? "Close" : "Menu";
    if (returnFocus) toggle.focus();
  };

  toggle.addEventListener("click", event => {
    event.stopPropagation();
    setOpen(!nav.classList.contains("is-open"));
  });

  links.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("click", event => {
    if (!nav.classList.contains("is-open")) return;
    if (!nav.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false, true);
    }
  });

  setOpen(false);
});
