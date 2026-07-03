document.addEventListener("DOMContentLoaded", () => {
  const nav = document.querySelector(".top-nav");
  const toggle = document.querySelector(".mobile-nav-toggle");
  const links = document.querySelector(".nav-links");

  if (!nav || !toggle || !links) return;

  const closeMenu = () => {
    nav.classList.remove("is-open");
    document.body.classList.remove("mobile-nav-is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    nav.classList.add("is-open");
    document.body.classList.add("mobile-nav-is-open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.contains("is-open");
    isOpen ? closeMenu() : openMenu();
  });

  links.addEventListener("click", event => {
    if (event.target.closest("a")) closeMenu();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  document.addEventListener("click", event => {
    if (!nav.classList.contains("is-open")) return;
    if (nav.contains(event.target)) return;
    closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 821px)").matches) closeMenu();
  });
});
