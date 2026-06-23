import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '../config/supabase.js';

const REQUEST_TIMEOUT_MS = 12000;
const REST_BASE_URL = `${SUPABASE_URL}/rest/v1`;
const JSON_HEADERS = {
  apikey: SUPABASE_PUBLISHABLE_KEY,
  Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
};

const memoryCache = new Map();

class PublicContentError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'PublicContentError';
    this.code = options.code || 'PUBLIC_CONTENT_ERROR';
    this.status = options.status || 500;
  }
}

function buildUrl(path, query) {
  const url = new URL(`${REST_BASE_URL}/${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });
  return url.toString();
}

async function parseJsonSafely(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new PublicContentError('Invalid public content response.', {
      code: 'INVALID_RESPONSE',
      status: response.status,
    });
  }

  return response.json();
}

async function fetchRest(path, query, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildUrl(path, query), {
      method: 'GET',
      headers: JSON_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new PublicContentError('Unable to load public content.', {
        code: 'REQUEST_FAILED',
        status: response.status,
      });
    }

    const data = await parseJsonSafely(response);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new PublicContentError('Timed out loading public content.', {
        code: 'REQUEST_TIMEOUT',
        status: 504,
      });
    }

    if (error instanceof PublicContentError) {
      throw error;
    }

    throw new PublicContentError('Unable to load public content.', {
      code: options.code || 'REQUEST_FAILED',
      status: 500,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function remember(key, loader) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  const value = await loader();
  memoryCache.set(key, value);
  return value;
}

export function clearPublicContentCache() {
  memoryCache.clear();
}

export function getPublishedHero() {
  return remember('hero_news:published', () => fetchRest('hero_news', {
    select: 'id,category,title,subtitle,image_asset_id,image_url,image_alt,cloudinary_public_id,cta_label,cta_url,featured,published,sort_order,updated_at',
    published: 'eq.true',
    order: 'sort_order.asc.nullslast,updated_at.desc.nullslast',
  }, { code: 'HERO_REQUEST_FAILED' }));
}

export function getPublishedActions() {
  return remember('actions:published', () => fetchRest('actions', {
    select: 'id,title,summary,content,action_date,location,image_asset_id,image_url,image_alt,cloudinary_public_id,cta_label,cta_url,action_status,featured,published,sort_order,updated_at',
    published: 'eq.true',
    order: 'sort_order.asc.nullslast,updated_at.desc.nullslast',
  }, { code: 'ACTIONS_REQUEST_FAILED' }));
}

export function getPublishedMediaItems() {
  return remember('media_items:published', () => fetchRest('media_items', {
    select: 'id,type,category,title,description,url,youtube_id,image_asset_id,image_url,thumbnail_url,image_alt,cloudinary_public_id,duration,source,featured,published,sort_order,updated_at',
    published: 'eq.true',
    order: 'sort_order.asc.nullslast,updated_at.desc.nullslast',
  }, { code: 'MEDIA_REQUEST_FAILED' }));
}

export function getMediaAssetsByIds(ids = []) {
  const sanitizedIds = [...new Set(ids.filter(Boolean))];
  if (!sanitizedIds.length) return Promise.resolve(new Map());

  const cacheKey = `media_assets:${sanitizedIds.join(',')}`;
  return remember(cacheKey, async () => {
    try {
      const rows = await fetchRest('v_media_assets_library', {
        select: 'id,preferred_delivery_url,delivery_url,webp_url,card_url,thumbnail_url,original_url,alt_text,width,height,active',
        id: `in.(${sanitizedIds.join(',')})`,
        active: 'eq.true',
      }, { code: 'MEDIA_ASSETS_REQUEST_FAILED' });

      return new Map(rows.map((row) => [row.id, row]));
    } catch (error) {
      if (error instanceof PublicContentError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        return new Map();
      }
      throw error;
    }
  });
}
