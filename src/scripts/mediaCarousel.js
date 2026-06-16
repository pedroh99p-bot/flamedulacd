import { mediaItems } from '../data/media.js';

const YOUTUBE_THUMBNAIL_BASE = 'https://img.youtube.com/vi';

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSortedPublishedItems() {
  return mediaItems
    .filter((item) => item.published === true)
    .sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
}

function getMediaUrl(item) {
  if (isValidUrl(item.url)) return item.url;
  if (item.youtubeId) return `https://www.youtube.com/watch?v=${encodeURIComponent(item.youtubeId)}`;
  return null;
}

function getThumbnailUrl(item) {
  if (isValidUrl(item.thumbnail_url)) return item.thumbnail_url;
  if (item.youtubeId) return `${YOUTUBE_THUMBNAIL_BASE}/${encodeURIComponent(item.youtubeId)}/hqdefault.jpg`;
  return '';
}

function createBadge(text, className = 'media-badge') {
  const badge = document.createElement('span');
  badge.className = className;
  badge.textContent = text;
  return badge;
}

function createThumbnail(item, className) {
  const figure = document.createElement('figure');
  figure.className = className;

  const thumbnailUrl = getThumbnailUrl(item);
  if (thumbnailUrl) {
    const image = document.createElement('img');
    image.src = thumbnailUrl;
    image.alt = `Thumbnail do vídeo ${item.title}`;
    image.loading = 'lazy';
    image.decoding = 'async';
    figure.appendChild(image);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'media-thumbnail-fallback';
    fallback.textContent = 'FlaMedula';
    figure.appendChild(fallback);
  }

  const playIcon = document.createElement('span');
  playIcon.className = 'media-play-icon';
  playIcon.setAttribute('aria-hidden', 'true');
  figure.appendChild(playIcon);

  return figure;
}

function createMediaCard(item, variant = 'compact') {
  const href = getMediaUrl(item);
  const element = href ? document.createElement('a') : document.createElement('article');
  const isFeatured = variant === 'featured';

  element.className = isFeatured ? 'media-featured-card' : 'media-card';
  element.dataset.mediaId = item.id;

  if (href) {
    element.href = href;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
    element.setAttribute('aria-label', `Assistir ${item.title} no YouTube`);
  }

  const thumbnail = createThumbnail(item, isFeatured ? 'media-featured-thumb' : 'media-card-thumb');
  const content = document.createElement('div');
  content.className = isFeatured ? 'media-featured-content' : 'media-card-content';

  const meta = document.createElement('div');
  meta.className = 'media-meta';
  meta.appendChild(createBadge(item.category || 'YouTube'));
  meta.appendChild(createBadge('YouTube', 'media-badge media-badge-soft'));
  if (item.duration) meta.appendChild(createBadge(item.duration, 'media-badge media-badge-duration'));
  if (isFeatured) meta.appendChild(createBadge('Destaque', 'media-badge media-badge-featured'));

  const title = document.createElement(isFeatured ? 'h3' : 'h4');
  title.textContent = item.title;

  const description = document.createElement('p');
  description.textContent = item.description;

  const cta = document.createElement('span');
  cta.className = isFeatured ? 'media-link-button media-link-button-strong' : 'media-link-button';
  cta.textContent = isFeatured ? 'Assistir agora' : 'Assistir no YouTube';

  content.append(meta, title, description, cta);
  element.append(thumbnail, content);

  return element;
}

function updateArrowState(carousel, prevButton, nextButton) {
  if (!carousel || !prevButton || !nextButton) return;

  const maxScroll = carousel.scrollWidth - carousel.clientWidth;
  const hasOverflow = maxScroll > 4;

  prevButton.disabled = !hasOverflow || carousel.scrollLeft <= 4;
  nextButton.disabled = !hasOverflow || carousel.scrollLeft >= maxScroll - 4;
}

function setupMediaCarousel() {
  const carousel = document.querySelector('.media-carousel');
  const prevButton = document.querySelector('.media-arrow-prev');
  const nextButton = document.querySelector('.media-arrow-next');
  if (!carousel || !prevButton || !nextButton) return;

  const scrollByCard = (direction) => {
    const firstCard = carousel.querySelector('.media-card');
    const cardWidth = firstCard ? firstCard.getBoundingClientRect().width + 20 : carousel.clientWidth * 0.8;
    carousel.scrollBy({ left: cardWidth * direction, behavior: 'smooth' });
  };

  prevButton.addEventListener('click', () => scrollByCard(-1));
  nextButton.addEventListener('click', () => scrollByCard(1));
  carousel.addEventListener('scroll', () => updateArrowState(carousel, prevButton, nextButton), { passive: true });
  window.addEventListener('resize', () => updateArrowState(carousel, prevButton, nextButton));

  updateArrowState(carousel, prevButton, nextButton);
}

export function renderMediaSection() {
  const section = document.getElementById('midias');
  const featuredContainer = document.querySelector('.media-featured');
  const carousel = document.querySelector('.media-carousel');
  const carouselWrap = document.querySelector('.media-carousel-wrap');
  if (!section || !featuredContainer || !carousel || !carouselWrap) return;

  const items = getSortedPublishedItems();
  if (!items.length) {
    section.hidden = true;
    return;
  }

  const featuredItem = items.find((item) => item.featured) || items[0];
  const carouselItems = items.filter((item) => item.id !== featuredItem.id);

  featuredContainer.replaceChildren(createMediaCard(featuredItem, 'featured'));
  carousel.replaceChildren(...carouselItems.map((item) => createMediaCard(item)));

  if (!carouselItems.length) {
    carouselWrap.hidden = true;
    return;
  }

  setupMediaCarousel();
}
