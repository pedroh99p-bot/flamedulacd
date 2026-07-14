import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { actionsData } from '../src/data/actions.js';
import { heroNewsItems } from '../src/data/heroNews.js';
import { mediaItems } from '../src/data/media.js';

function sqlString(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlBoolean(value) {
  return value ? 'TRUE' : 'FALSE';
}

function sqlInteger(value, fallback = 'NULL') {
  return Number.isFinite(Number(value)) ? String(Number(value)) : fallback;
}

function toIsoDate(dateValue) {
  if (!dateValue) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

  const [day, month, year] = String(dateValue).split('/');
  if (!day || !month || !year) return null;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function heroInsertSql(item, index) {
  return `
INSERT INTO public.hero_news (
  category, title, subtitle, image_url, image_alt, cta_label, cta_url, featured, published, sort_order, published_at
)
SELECT
  'concluida',
  ${sqlString(item.title)},
  ${sqlString(item.subtitle)},
  ${sqlString(item.image_url)},
  ${sqlString(item.image_alt)},
  ${sqlString(item.cta_label)},
  ${sqlString(item.cta_url)},
  FALSE,
  TRUE,
  ${sqlInteger(item.order ?? index + 1)},
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.hero_news
  WHERE title = ${sqlString(item.title)}
    AND COALESCE(cta_url, '') = COALESCE(${sqlString(item.cta_url)}, '')
);`.trim();
}

function actionInsertSql(item, index) {
  const actionDate = toIsoDate(item.date);

  return `
INSERT INTO public.actions (
  title, summary, action_date, location, image_url, image_alt, cta_label, action_status, featured, published, sort_order, published_at
)
SELECT
  ${sqlString(item.title)},
  ${sqlString(item.summary)},
  ${sqlString(actionDate)},
  ${sqlString(item.location)},
  ${sqlString(item.image_url)},
  ${sqlString(`Registro da ação ${item.title}`)},
  ${sqlString(item.cta || 'Ver ação')},
  'concluida',
  FALSE,
  TRUE,
  ${sqlInteger(item.order ?? index + 1)},
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.actions
  WHERE title = ${sqlString(item.title)}
    AND COALESCE(location, '') = COALESCE(${sqlString(item.location)}, '')
    AND COALESCE(action_date::text, '') = COALESCE(${sqlString(actionDate)}, '')
);`.trim();
}

function mediaInsertSql(item, index) {
  return `
INSERT INTO public.media_items (
  type, category, title, description, url, youtube_id, thumbnail_url, duration, featured, published, sort_order, published_at
)
SELECT
  ${sqlString(item.type)},
  ${sqlString(item.category)},
  ${sqlString(item.title)},
  ${sqlString(item.description)},
  ${sqlString(item.url)},
  ${sqlString(item.youtubeId)},
  ${sqlString(item.thumbnail_url)},
  ${sqlString(item.duration)},
  ${sqlBoolean(item.featured)},
  TRUE,
  ${sqlInteger(item.order ?? index + 1)},
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.media_items
  WHERE title = ${sqlString(item.title)}
    AND COALESCE(url, '') = COALESCE(${sqlString(item.url)}, '')
    AND COALESCE(youtube_id, '') = COALESCE(${sqlString(item.youtubeId)}, '')
);`.trim();
}

const statements = [
  ...heroNewsItems.map(heroInsertSql),
  ...actionsData.map(actionInsertSql),
  ...mediaItems.map(mediaInsertSql),
];

const sqlFile = '.seed-public-content.sql';

if (process.env.ALLOW_LINKED_SEED !== 'true') {
  throw new Error('Seed remoto bloqueado. Defina ALLOW_LINKED_SEED=true somente depois de validar o projeto Supabase alvo e o backup.');
}

writeFileSync(sqlFile, statements.join('\n\n'), 'utf8');

try {
  execFileSync('cmd.exe', ['/d', '/s', '/c', `type ${sqlFile} | npx supabase db query --linked`], {
    stdio: 'inherit',
  });
} finally {
  rmSync(sqlFile, { force: true });
}
