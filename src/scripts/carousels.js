import { actionsData } from '../data/actions.js';
import { ambassadors } from '../data/ambassadors.js';
import { heroNewsItems } from '../data/heroNews.js';
import { teamMembers } from '../data/team.js';
import { testimonialsData } from '../data/testimonials.js';

let currentSlide = 0;
const slideDuration = 6000;
let slideInterval;
let slideResumeTimeout;
let publishedHeroItems = [];

function isValidImageUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

function createAvatarMarkup(person, className) {
  const name = String(person.name ?? '').trim();
  const initial = escapeHtml(name.charAt(0) || '?');

  if (!isValidImageUrl(person.image_url)) {
    return `<div class="${className}">${initial}</div>`;
  }

  const src = escapeHtml(person.image_url);
  const alt = escapeHtml(person.image_alt || `Foto de ${name}`);

  return `<div class="${className} has-image" data-initial="${initial}"><img src="${src}" alt="${alt}" loading="lazy" onerror="this.parentElement.classList.remove('has-image'); this.parentElement.textContent = this.parentElement.dataset.initial;"></div>`;
}

function createHeroSlide(item, index) {
  const slide = document.createElement('article');
  slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
  slide.dataset.slideId = item.id;
  slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
  if (item.image_alt) slide.setAttribute('aria-label', item.image_alt);

  if (isValidImageUrl(item.image_url)) {
    slide.classList.add('has-image');
    slide.style.setProperty('--hero-image', `url("${item.image_url}")`);
  }

  const content = document.createElement('div');
  content.className = 'container hero-slide-content';

  const editorialCard = document.createElement('div');
  editorialCard.className = 'hero-editorial-card';

  const category = document.createElement('span');
  category.className = 'slide-tag';
  category.textContent = item.category;

  const title = document.createElement('h1');
  title.className = 'slide-title';
  title.textContent = item.title;

  const description = document.createElement('p');
  description.className = 'slide-text';
  description.textContent = item.subtitle || item.description || '';

  const cta = document.createElement('a');
  cta.className = 'btn slide-btn btn-glow';
  cta.href = item.cta_url;
  cta.textContent = item.cta_label;

  editorialCard.append(category, title, description, cta);
  content.appendChild(editorialCard);
  slide.appendChild(content);

  return slide;
}

export function initHeroCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  const carousel = document.getElementById('heroCarousel');
  const prevButton = carousel?.querySelector('.hero-arrow-prev');
  const nextButton = carousel?.querySelector('.hero-arrow-next');
  if (!track || !dotsContainer || !carousel) return;

  publishedHeroItems = heroNewsItems
    .filter((item) => item.published)
    .sort((first, second) => first.order - second.order);

  if (!publishedHeroItems.length) {
    carousel.classList.add('hero-empty');
    return;
  }

  publishedHeroItems.forEach((item, index) => {
    track.appendChild(createHeroSlide(item, index));

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dot.setAttribute('aria-label', `Ir para novidade ${index + 1}`);
    dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => {
      goToSlide(index);
      pauseAutoplayTemporarily();
    });
    dotsContainer.appendChild(dot);
  });

  if (publishedHeroItems.length === 1) {
    carousel.classList.add('single-slide');
    return;
  }

  prevButton?.addEventListener('click', () => {
    goToSlide(currentSlide - 1);
    pauseAutoplayTemporarily();
  });

  nextButton?.addEventListener('click', () => {
    goToSlide(currentSlide + 1);
    pauseAutoplayTemporarily();
  });

  carousel.addEventListener('pointerenter', pauseAutoplay);
  carousel.addEventListener('pointerleave', startAutoplay);
  carousel.addEventListener('focusin', pauseAutoplay);
  carousel.addEventListener('focusout', (event) => {
    if (!carousel.contains(event.relatedTarget)) startAutoplay();
  });

  startAutoplay();
}

function goToSlide(index) {
  const slides = document.querySelectorAll('#carouselTrack .carousel-slide');
  const dots = document.querySelectorAll('#carouselDots .dot');
  if (!slides.length || !dots.length) return;

  const nextIndex = (index + slides.length) % slides.length;
  if (!slides[nextIndex]) return;

  slides[currentSlide]?.classList.remove('active');
  slides[currentSlide]?.setAttribute('aria-hidden', 'true');
  dots[currentSlide]?.classList.remove('active');
  dots[currentSlide]?.setAttribute('aria-current', 'false');

  currentSlide = nextIndex;
  slides[currentSlide].classList.add('active');
  slides[currentSlide].setAttribute('aria-hidden', 'false');
  dots[currentSlide]?.classList.add('active');
  dots[currentSlide]?.setAttribute('aria-current', 'true');
}

function startAutoplay() {
  const progressFill = document.getElementById('progressFill');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!progressFill || publishedHeroItems.length <= 1 || reduceMotion || slideInterval) return;

  restartProgress();
  slideInterval = window.setInterval(() => {
    goToSlide((currentSlide + 1) % publishedHeroItems.length);
    restartProgress();
  }, slideDuration);
}

function restartProgress() {
  const progressFill = document.getElementById('progressFill');
  if (!progressFill) return;

  progressFill.style.transition = 'none';
  progressFill.style.width = '0%';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressFill.style.transition = `width ${slideDuration}ms linear`;
      progressFill.style.width = '100%';
    });
  });
}

function pauseAutoplay() {
  window.clearInterval(slideInterval);
  window.clearTimeout(slideResumeTimeout);
  slideInterval = undefined;
  slideResumeTimeout = undefined;
}

function pauseAutoplayTemporarily() {
  pauseAutoplay();
  resetProgress();

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || publishedHeroItems.length <= 1) return;

  slideResumeTimeout = window.setTimeout(() => {
    slideResumeTimeout = undefined;
    startAutoplay();
  }, slideDuration);
}

function resetProgress() {
  const progressFill = document.getElementById('progressFill');
  if (!progressFill) return;

  progressFill.style.transition = 'none';
  progressFill.style.width = '0%';
}

export function renderTeam() {
  const grid = document.getElementById('teamGrid');
  if (!grid) return;

  grid.innerHTML = teamMembers.map((member) => {
    const avatar = createAvatarMarkup(member, 'team-avatar-v');

    return `<div class="team-card-v">${avatar}<div class="team-name-v">${escapeHtml(member.name)}</div><div class="team-role-v">${escapeHtml(member.role)}</div></div>`;
  }).join('');
}

export function renderAmbassadors() {
  const grid = document.getElementById('ambassadorsGrid');
  if (!grid) return;

  grid.innerHTML = ambassadors.map((ambassador) => {
    const avatar = createAvatarMarkup(ambassador, 'ambassador-avatar');

    return `<div class="ambassador-card"><div class="ambassador-badge">${escapeHtml(ambassador.role)}</div>${avatar}<h3 style="font-size:1.1rem; font-weight:700;">${escapeHtml(ambassador.name)}</h3><p class="ambassador-desc">"${escapeHtml(ambassador.desc)}"</p></div>`;
  }).join('');
}

export function renderActions() {
  const grid = document.getElementById('actionsCarousel');
  if (!grid) return;

  grid.replaceChildren();

  actionsData.forEach((action) => {
    const card = document.createElement('article');
    card.className = 'action-card';

    const figure = document.createElement('figure');
    figure.className = 'action-graphic';

    if (action.image_url) {
      const image = document.createElement('img');
      image.className = 'action-image';
      image.src = action.image_url;
      image.alt = `Registro da ação ${action.title}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      figure.appendChild(image);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'action-fallback';
      fallback.textContent = 'FLA';
      figure.appendChild(fallback);
    }

    const category = document.createElement('span');
    category.className = 'action-category';
    category.textContent = action.category;
    figure.appendChild(category);

    const content = document.createElement('div');
    content.className = 'action-content';

    const meta = document.createElement('div');
    meta.className = 'action-meta';

    const date = document.createElement('span');
    date.textContent = action.date;

    const separator = document.createElement('span');
    separator.setAttribute('aria-hidden', 'true');
    separator.textContent = '\u2022';

    const location = document.createElement('span');
    location.textContent = action.location;

    const title = document.createElement('h3');
    title.className = 'action-title';
    title.textContent = action.title;

    const summary = document.createElement('p');
    summary.className = 'action-summary';
    summary.textContent = action.summary;

    const cta = document.createElement('span');
    cta.className = 'action-cta';
    cta.textContent = action.cta;

    meta.append(date, separator, location);
    content.append(meta, title, summary, cta);
    card.append(figure, content);
    grid.appendChild(card);
  });
}

export function renderTestimonials() {
  const track = document.getElementById('testimonialsTrack');
  if (!track) return;

  testimonialsData.forEach((testimonial) => {
    track.innerHTML += `
      <div class="testimonial-card">
        <div class="testimonial-header">
          <div class="testimonial-avatar">${testimonial.avatar}</div>
          <div class="quote-mark">"</div>
        </div>
        <p class="testimonial-text">"${testimonial.text}"</p>
        <div class="testimonial-author-info">
          <p class="testimonial-author">${testimonial.name}</p>
          <p class="testimonial-role">${testimonial.role} \u2022 ${testimonial.case}</p>
        </div>
      </div>
    `;
  });

  window.setInterval(() => {
    const card = track.querySelector('.testimonial-card');
    if (!card) return;

    const cardWidth = card.offsetWidth + 24;
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: cardWidth, behavior: 'smooth' });
    }
  }, 3500);
}
