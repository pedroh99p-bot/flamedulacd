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

  teamMembers.forEach((member) => {
    const initial = member.name.charAt(0);
    grid.innerHTML += `<div class="team-card-v"><div class="team-avatar-v">${initial}</div><div class="team-name-v">${member.name}</div><div class="team-role-v">${member.role}</div></div>`;
  });
}

export function renderAmbassadors() {
  const grid = document.getElementById('ambassadorsGrid');
  if (!grid) return;

  ambassadors.forEach((ambassador) => {
    const initial = ambassador.name.charAt(0);
    grid.innerHTML += `<div class="ambassador-card"><div class="ambassador-badge">${ambassador.role}</div><div class="ambassador-avatar">${initial}</div><h3 style="font-size:1.1rem; font-weight:700;">${ambassador.name}</h3><p class="ambassador-desc">"${ambassador.desc}"</p></div>`;
  });
}

export function renderActions() {
  const grid = document.getElementById('actionsCarousel');
  if (!grid) return;

  actionsData.forEach((action) => {
    grid.innerHTML += `<div class="action-card"><div class="action-graphic">FLA</div><div class="action-content"><div class="action-meta"><span>${action.date}</span><span>\u2022</span><span>${action.location}</span></div><h3 class="action-title">${action.title}</h3><p class="action-summary">${action.summary}</p><button class="btn btn-outline" style="width:100%">${action.cta}</button></div></div>`;
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
