export function toggleAccordion(element) {
  const body = element.querySelector('.accordion-body');
  const isActive = element.classList.contains('active');

  document.querySelectorAll('.accordion-item').forEach((item) => {
    item.classList.remove('active');
    const itemBody = item.querySelector('.accordion-body');
    if (itemBody) itemBody.style.maxHeight = null;
  });

  if (!isActive && body) {
    element.classList.add('active');
    body.style.maxHeight = body.scrollHeight + 'px';
  }
}

export function initFaq() {
  window.toggleAccordion = toggleAccordion;
}
