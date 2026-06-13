import { actionsData, heroNewsItems } from '../data/actions.js';
import { ambassadors } from '../data/ambassadors.js';
import { teamMembers } from '../data/team.js';
import { testimonialsData } from '../data/testimonials.js';

let currentSlide = 0;
const slideDuration = 6000;
let slideInterval;

export function initHeroCarousel() {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  if (!track || !dotsContainer) return;

  heroNewsItems.forEach((item, index) => {
    const slide = document.createElement('div');
    slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
    slide.innerHTML = `<div class="slide-tag">${item.categoria}</div><h2 class="slide-title">${item.titulo}</h2><p class="slide-text">${item.texto}</p><button class="btn slide-btn" onclick="document.getElementById('hub-cadastro').scrollIntoView({behavior:'smooth'}); setTimeout(()=>openPanel('${item.path}'), 500);">${item.cta}</button>`;
    track.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `dot ${index === 0 ? 'active' : ''}`;
    dot.onclick = () => goToSlide(index);
    dotsContainer.appendChild(dot);
  });

  startAutoplay();
}

function goToSlide(index) {
  const slides = document.querySelectorAll('.carousel-slide');
  const dots = document.querySelectorAll('.dot');
  if (!slides.length || !dots.length) return;

  slides[currentSlide]?.classList.remove('active');
  dots[currentSlide]?.classList.remove('active');
  currentSlide = index;
  slides[currentSlide]?.classList.add('active');
  dots[currentSlide]?.classList.add('active');
  resetAutoplay();
}

function startAutoplay() {
  const progressFill = document.getElementById('progressFill');
  if (!progressFill || !heroNewsItems.length) return;

  progressFill.style.transition = 'none';
  progressFill.style.width = '0%';
  setTimeout(() => {
    progressFill.style.transition = `width ${slideDuration}ms linear`;
    progressFill.style.width = '100%';
  }, 50);
  slideInterval = setInterval(() => goToSlide((currentSlide + 1) % heroNewsItems.length), slideDuration);
}

function resetAutoplay() {
  clearInterval(slideInterval);
  startAutoplay();
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

  setInterval(() => {
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
