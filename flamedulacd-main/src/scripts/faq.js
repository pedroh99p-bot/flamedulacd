import { faqItems } from '../data/faq.js';

export function toggleAccordion(element) {
  const body = element.querySelector('.accordion-body');
  const isActive = element.classList.contains('active');

  document.querySelectorAll('.accordion-item').forEach((item) => {
    item.classList.remove('active');
    item.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'false');
    const itemBody = item.querySelector('.accordion-body');
    if (itemBody) itemBody.style.maxHeight = null;
  });

  if (!isActive && body) {
    element.classList.add('active');
    element.querySelector('.accordion-header')?.setAttribute('aria-expanded', 'true');
    body.style.maxHeight = body.scrollHeight + 'px';
  }
}

export function renderFaq(items = faqItems) {
  const list = document.querySelector('.accordion-list');
  if (!list) return;

  list.replaceChildren();
  items.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'accordion-item';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'accordion-header';
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', `faq-answer-${index + 1}`);
    header.append(document.createTextNode(item.question || 'Pergunta frequente'));

    const icon = document.createElement('span');
    icon.className = 'accordion-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '+';
    header.appendChild(icon);

    const body = document.createElement('div');
    body.id = `faq-answer-${index + 1}`;
    body.className = 'accordion-body';
    body.setAttribute('role', 'region');

    const content = document.createElement('div');
    content.className = 'accordion-content';
    content.textContent = item.answer || '';
    body.appendChild(content);

    header.addEventListener('click', () => toggleAccordion(wrapper));
    wrapper.append(header, body);
    list.appendChild(wrapper);
  });
}

export function initFaq() {
  renderFaq();
}
