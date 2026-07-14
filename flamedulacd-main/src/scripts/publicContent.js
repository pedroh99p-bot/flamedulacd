import { actionsData } from '../data/actions.js';
import { heroNewsItems } from '../data/heroNews.js';
import { mediaItems } from '../data/media.js';
import { faqItems } from '../data/faq.js';
import { teamMembers } from '../data/team.js';
import { testimonialsData } from '../data/testimonials.js';
import { ambassadors } from '../data/ambassadors.js';
import { initHeroCarousel, renderActions, renderAmbassadors, renderTeam, renderTestimonials } from './carousels.js';
import { renderFaq } from './faq.js';
import { renderMetrics } from './counters.js';
import { renderMediaSection } from './mediaCarousel.js';
import {
  getMediaAssetsByIds,
  getPublishedActions,
  getPublishedHero,
  getPublishedFaqItems,
  getPublishedMediaItems,
  getPublishedTeamMembers,
  getPublishedTestimonials,
  getPublishedTransparencyMetrics,
} from '../services/publicContentService.js';

function isValidUrl(value) {
  if (!value) return false;

  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function logDevError(scope, error) {
  window.dispatchEvent(new CustomEvent('flamedula:content-fallback', {
    detail: { scope, code: error?.code || 'LOCAL_FALLBACK' },
  }));
  if (import.meta.env.DEV) console.warn(`[public-content] ${scope}`, error?.message || error);
}

function pickFirstUrl(values) {
  return values.find((value) => isValidUrl(value)) || '';
}

function buildFallbackAlt(parts) {
  const base = parts.filter(Boolean).join(' - ').trim();
  return base || 'Conteúdo FlaMedula';
}

function collectAssetIds(rows) {
  return rows.map((row) => row.image_asset_id).filter(Boolean);
}

function resolveAssetImage(asset, priority, fallbackUrl = '') {
  if (!asset || asset.active === false) return isValidUrl(fallbackUrl) ? fallbackUrl : '';
  return pickFirstUrl(priority.map((field) => asset[field]).concat(fallbackUrl));
}

function resolveAssetAlt(row, asset, fallbackParts) {
  return row.image_alt || asset?.alt_text || buildFallbackAlt(fallbackParts);
}

function normalizeHeroRows(rows, assetMap) {
  return rows.map((row, index) => {
    const asset = assetMap.get(row.image_asset_id);
    return {
      id: row.id,
      category: row.category || 'FlaMedula',
      title: row.title || 'FlaMedula',
      subtitle: row.subtitle || '',
      description: row.subtitle || '',
      image_url: resolveAssetImage(asset, ['preferred_delivery_url', 'delivery_url', 'webp_url', 'card_url', 'original_url'], row.image_url),
      image_alt: resolveAssetAlt(row, asset, [row.title, row.category, 'Hero FlaMedula']),
      cta_label: row.cta_label || '',
      cta_url: row.cta_url || '',
      published: row.published === true,
      order: row.sort_order ?? index + 1,
    };
  });
}

function normalizeActionRows(rows, assetMap) {
  return rows.map((row, index) => {
    const asset = assetMap.get(row.image_asset_id);
    return {
      id: row.id,
      date: row.action_date || '',
      location: row.location || '',
      category: row.action_status || '',
      action_status: row.action_status || '',
      title: row.title || 'Ação FlaMedula',
      summary: row.summary || row.content || '',
      image_url: resolveAssetImage(asset, ['card_url', 'preferred_delivery_url', 'delivery_url', 'webp_url', 'original_url'], row.image_url),
      image_alt: resolveAssetAlt(row, asset, [row.title, row.location, 'Ação FlaMedula']),
      image_width: asset?.width || undefined,
      image_height: asset?.height || undefined,
      cta: row.cta_label || 'Ver ação',
      cta_label: row.cta_label || 'Ver ação',
      cta_url: row.cta_url || '',
      published: row.published === true,
      order: row.sort_order ?? index + 1,
    };
  });
}

function normalizeMediaRows(rows, assetMap) {
  return rows.map((row, index) => {
    const asset = assetMap.get(row.image_asset_id);
    return {
      id: row.id,
      type: row.type || 'media',
      category: row.category || row.source || 'FlaMedula',
      title: row.title || 'Conteúdo FlaMedula',
      description: row.description || '',
      youtubeId: row.youtube_id || '',
      url: row.url || '',
      thumbnail_url: resolveAssetImage(asset, ['card_url', 'preferred_delivery_url', 'delivery_url', 'webp_url', 'thumbnail_url', 'original_url'], row.thumbnail_url || row.image_url),
      image_alt: resolveAssetAlt(row, asset, [row.title, row.category, 'Mídia FlaMedula']),
      image_width: asset?.width || undefined,
      image_height: asset?.height || undefined,
      duration: row.duration || '',
      featured: row.featured === true,
      published: row.published === true,
      order: row.sort_order ?? index + 1,
    };
  });
}

function normalizeTestimonialRows(rows, assetMap) {
  return rows.map((row, index) => {
    const asset = assetMap.get(row.image_asset_id);
    const name = row.author_name || 'Apoiador FlaMedula';
    return {
      id: row.id,
      text: row.quote || '',
      name,
      role: row.author_label || '',
      case: '',
      avatar: name.trim().charAt(0).toUpperCase() || 'F',
      image_url: resolveAssetImage(asset, ['thumbnail_url', 'card_url', 'preferred_delivery_url', 'delivery_url', 'webp_url', 'original_url'], row.image_url),
      image_alt: resolveAssetAlt(row, asset, [name, 'Depoimento FlaMedula']),
      published: row.published === true,
      order: row.sort_order ?? index + 1,
    };
  });
}

function normalizeTeamRows(rows, assetMap) {
  return rows.map((row, index) => {
    const asset = assetMap.get(row.image_asset_id);
    return {
      id: row.id,
      name: row.name || 'Equipe FlaMedula',
      role: row.role || '',
      description: row.description || '',
      member_type: row.member_type || 'team',
      image_url: resolveAssetImage(asset, ['thumbnail_url', 'card_url', 'preferred_delivery_url', 'delivery_url', 'webp_url', 'original_url'], row.image_url),
      image_alt: resolveAssetAlt(row, asset, [row.name, row.role, 'Equipe FlaMedula']),
      published: row.published === true,
      order: row.sort_order ?? index + 1,
    };
  });
}

function normalizeFaqRows(rows) {
  return rows.map((row, index) => ({
    id: row.id,
    question: row.question || 'Pergunta frequente',
    answer: row.answer || '',
    category: row.category || '',
    published: row.published === true,
    order: row.sort_order ?? index + 1,
  }));
}

async function enrichWithAssets(rows, normalizer) {
  const assetMap = await getMediaAssetsByIds(collectAssetIds(rows));
  return normalizer(rows, assetMap);
}

function sortByOrder(items) {
  return [...items].sort((first, second) => (first.order ?? 0) - (second.order ?? 0));
}

function hasRenderableHeroImages(items) {
  return items.length > 0 && items.every((item) => isValidUrl(item.image_url));
}

async function loadHeroContent() {
  try {
    const rows = await getPublishedHero();
    if (!rows.length) return sortByOrder(heroNewsItems);
    const normalizedRows = await enrichWithAssets(rows, normalizeHeroRows);
    return hasRenderableHeroImages(normalizedRows)
      ? normalizedRows
      : sortByOrder(heroNewsItems);
  } catch (error) {
    logDevError('hero fallback', error);
    return sortByOrder(heroNewsItems);
  }
}

async function loadActionsContent() {
  try {
    const rows = await getPublishedActions();
    if (!rows.length) return sortByOrder(actionsData);
    return await enrichWithAssets(rows, normalizeActionRows);
  } catch (error) {
    logDevError('actions fallback', error);
    return sortByOrder(actionsData);
  }
}

async function loadMediaContent() {
  try {
    const rows = await getPublishedMediaItems();
    if (!rows.length) return sortByOrder(mediaItems);
    return await enrichWithAssets(rows, normalizeMediaRows);
  } catch (error) {
    logDevError('media fallback', error);
    return sortByOrder(mediaItems);
  }
}

async function loadTestimonialsContent() {
  try {
    const rows = await getPublishedTestimonials();
    if (!rows.length) return testimonialsData;
    return await enrichWithAssets(rows, normalizeTestimonialRows);
  } catch (error) {
    logDevError('testimonials fallback', error);
    return testimonialsData;
  }
}

async function loadTeamContent() {
  try {
    const rows = await getPublishedTeamMembers();
    if (!rows.length) return teamMembers;
    return await enrichWithAssets(rows, normalizeTeamRows);
  } catch (error) {
    logDevError('team fallback', error);
    return teamMembers;
  }
}

async function loadFaqContent() {
  try {
    const rows = await getPublishedFaqItems();
    if (!rows.length) return faqItems;
    return normalizeFaqRows(rows);
  } catch (error) {
    logDevError('faq fallback', error);
    return faqItems;
  }
}

async function loadMetricsContent() {
  try {
    const rows = await getPublishedTransparencyMetrics();
    if (!rows.length) return null;
    return rows.map((row, index) => ({
      id: row.id,
      key: row.key || '',
      label: row.label || 'Indicador FlaMedula',
      value: Number(row.value) || 0,
      description: row.description || '',
      mode: row.mode || 'number',
      order: row.sort_order ?? index + 1,
    }));
  } catch (error) {
    logDevError('metrics fallback', error);
    return null;
  }
}

export function initLandingPublicContent() {
  const heroPromise = loadHeroContent();
  const actionsPromise = loadActionsContent();
  const mediaPromise = loadMediaContent();
  const testimonialsPromise = loadTestimonialsContent();
  const teamPromise = loadTeamContent();
  const faqPromise = loadFaqContent();
  const metricsPromise = loadMetricsContent();

  heroPromise.then((items) => {
    initHeroCarousel(items);
  });

  Promise.allSettled([actionsPromise, mediaPromise, testimonialsPromise, teamPromise, faqPromise, metricsPromise]).then((results) => {
    const [actionsResult, mediaResult, testimonialsResult, teamResult, faqResult, metricsResult] = results;

    renderActions(actionsResult.status === 'fulfilled' ? actionsResult.value : sortByOrder(actionsData));
    renderMediaSection(mediaResult.status === 'fulfilled' ? mediaResult.value : sortByOrder(mediaItems));
    renderTestimonials(testimonialsResult.status === 'fulfilled' ? testimonialsResult.value : testimonialsData);
    const people = teamResult.status === 'fulfilled' ? teamResult.value : teamMembers;
    const publicTeam = people.filter((person) => person.member_type !== 'embaixador');
    const publicAmbassadors = people.filter((person) => person.member_type === 'embaixador');
    renderTeam(publicTeam.length ? publicTeam : teamMembers);
    renderAmbassadors(publicAmbassadors.length ? publicAmbassadors : ambassadors);
    renderFaq(faqResult.status === 'fulfilled' ? faqResult.value : faqItems);
    renderMetrics(metricsResult.status === 'fulfilled' && metricsResult.value ? metricsResult.value : undefined);
  });
}
