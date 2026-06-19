export function initRedomeSection() {
  const section = document.getElementById('atualiza-redome');
  const toggle = document.getElementById('redomeToggle');
  const expanded = document.getElementById('redomeExpanded');

  if (!section || !toggle || !expanded) return;

  const setExpanded = (isExpanded) => {
    section.classList.toggle('is-expanded', isExpanded);
    toggle.setAttribute('aria-expanded', String(isExpanded));
    toggle.textContent = isExpanded ? 'Ver menos' : 'Atualize seus dados';
    expanded.setAttribute('aria-hidden', String(!isExpanded));
    expanded.hidden = false;
  };

  expanded.hidden = false;
  setExpanded(false);

  toggle.addEventListener('click', () => {
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });
}
