document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".top-nav");
  const toggle = document.querySelector(".mobile-nav-toggle");
  const links = document.querySelector(".nav-links");

  if (!nav || !toggle || !links) return;

  const setOpen = isOpen => {
    nav.classList.toggle("is-open", isOpen);
    document.documentElement.classList.toggle("mobile-menu-open", isOpen);
    document.body.classList.toggle("mobile-menu-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
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
    if (event.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 821px)").matches) setOpen(false);
  });
});
