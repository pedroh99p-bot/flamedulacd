export function initNavbarMenu() {
  const toggle = document.querySelector('.nav-menu-toggle');
  const menu = document.getElementById('navQuickMenu');
  const closeButton = menu?.querySelector('.nav-menu-close');

  if (!toggle || !menu) return;

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.hidden = !open;
    document.body.classList.toggle('nav-menu-open', open);
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  closeButton?.addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });

  menu.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;

    const flow = link.dataset.menuFlow;
    if (flow && typeof window.openPanel === 'function') {
      window.openPanel(flow);
    }

    setOpen(false);
  });

  document.addEventListener('click', (event) => {
    if (menu.hidden) return;
    if (menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || menu.hidden) return;
    setOpen(false);
    toggle.focus();
  });
}
