const CLOUDINARY_ROOT = 'https://res.cloudinary.com/dhbrxzt5a/image/upload';

function delivery(path, transformation) {
  return `${CLOUDINARY_ROOT}/${transformation}/${path}`;
}

const HERO_TRANSFORM = 'c_fill,g_auto,w_1920,h_1080,f_auto,q_auto';
const CARD_TRANSFORM = 'c_fill,g_auto,w_960,h_640,f_auto,q_auto';
const PORTRAIT_TRANSFORM = 'c_fill,g_face,w_640,h_640,f_auto,q_auto';

export const OFFICIAL_LOGO_URL =
  `${CLOUDINARY_ROOT}/f_auto,q_auto/v1785019388/10c52067-7767-46b8-a68d-eda2de48d97e_1_xcxcat.webp`;

export const OFFICIAL_HERO_IMAGES = Object.freeze({
  diaFlamedula: delivery(
    'v1785019387/c46f2575-bd3e-429d-8831-b9d9da5ad3a8_2_mevfxh.jpg',
    HERO_TRANSFORM,
  ),
  filhaDoaParaPai: delivery(
    'v1785019388/af5b390a-4e86-4737-aaeb-af6daf55b04e_1_e3y7ro.jpg',
    HERO_TRANSFORM,
  ),
  rafael: delivery(
    'v1785019389/341c873e-d4f5-403c-a589-b6a72287dfde_1_qpe934.jpg',
    HERO_TRANSFORM,
  ),
});

export const OFFICIAL_ACTION_IMAGES = Object.freeze({
  hospitalPedroErnesto1: delivery(
    'v1785019197/Um_Dia_das_M%C3%A3es_de_colo_abra%C3%A7o_e_esperan%C3%A7a_Hospital_Pedro_Ernesto_-_RJ._%EF%B8%8F_Hoje_a_nossa_a%C3%A7%C3%A3o_fo_1_bfije5.jpg',
    CARD_TRANSFORM,
  ),
  hospitalPedroErnesto2: delivery(
    'v1785019195/Um_Dia_das_M%C3%A3es_de_colo_abra%C3%A7o_e_esperan%C3%A7a_Hospital_Pedro_Ernesto_-_RJ._%EF%B8%8F_Hoje_a_nossa_a%C3%A7%C3%A3o_fo_rv6cqx.jpg',
    CARD_TRANSFORM,
  ),
  diaDasMaes1: delivery('v1785019194/Dia_das_M%C3%A3es_1_cina39.jpg', CARD_TRANSFORM),
  diaDasMaes2: delivery('v1785019194/Dia_das_M%C3%A3es_xykeac.jpg', CARD_TRANSFORM),
  pascoa1: delivery(
    'v1785019202/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_1_ilu1ux.jpg',
    CARD_TRANSFORM,
  ),
  pascoa2: delivery(
    'v1785019197/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_wtralw.jpg',
    CARD_TRANSFORM,
  ),
  pascoa3: delivery(
    'v1785019198/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_2_hig7dq.jpg',
    CARD_TRANSFORM,
  ),
});

export const OFFICIAL_TEAM_IMAGES = Object.freeze({
  dedeco: delivery('v1785018666/1_1_1_a86ew6.jpg', PORTRAIT_TRANSFORM),
  decio: delivery(
    'v1785018593/ef619f36-3ef9-4dd0-ae16-adced1b8bb79_1_fqcw1v.jpg',
    PORTRAIT_TRANSFORM,
  ),
  ariela: delivery(
    'v1785018594/678ecd31-e992-47dd-a000-46b1d67653ba_1_syrnyg.jpg',
    PORTRAIT_TRANSFORM,
  ),
  michel: delivery(
    'v1785018596/a75db0ec-e228-4d8f-b9f4-b3c2dae868cb_1_jcey1x.jpg',
    PORTRAIT_TRANSFORM,
  ),
  carlos: delivery(
    'v1785018657/e5701f89-a6fe-4b42-a12a-7c8f3240596d_1_cnpn5a.jpg',
    PORTRAIT_TRANSFORM,
  ),
  silvio: delivery(
    'v1785018659/92fbf70c-efd1-49f8-b1c8-f29a76a4506f_1_ipr8o3.jpg',
    PORTRAIT_TRANSFORM,
  ),
  antonio: delivery(
    'v1785018986/e94d33ef-ea50-464e-870c-818b7ad53e29_wpgnki.jpg',
    PORTRAIT_TRANSFORM,
  ),
  zico: delivery('v1785018665/77db4a91-4d28-4883-822f-b755ab31f1bf_1_pzdqap.jpg', PORTRAIT_TRANSFORM),
});

const ASSET_IDENTIFIERS = Object.freeze([
  ['c46f2575-bd3e-429d-8831-b9d9da5ad3a8', OFFICIAL_HERO_IMAGES.diaFlamedula],
  ['af5b390a-4e86-4737-aaeb-af6daf55b04e', OFFICIAL_HERO_IMAGES.filhaDoaParaPai],
  ['341c873e-d4f5-403c-a589-b6a72287dfde', OFFICIAL_HERO_IMAGES.rafael],
  ['fo_1_ipchnu', OFFICIAL_ACTION_IMAGES.hospitalPedroErnesto1],
  ['fo_sygcyi', OFFICIAL_ACTION_IMAGES.hospitalPedroErnesto2],
  ['Dia_das_M%C3%A3es_1_f5umjr', OFFICIAL_ACTION_IMAGES.diaDasMaes1],
  ['Dia_das_M%C3%A3es_sc8ttx', OFFICIAL_ACTION_IMAGES.diaDasMaes2],
  ['incavol_1_w1xb8t', OFFICIAL_ACTION_IMAGES.pascoa1],
  ['incavol_m1kicl', OFFICIAL_ACTION_IMAGES.pascoa2],
  ['incavol_2_rs3nri', OFFICIAL_ACTION_IMAGES.pascoa3],
  ['ef619f36-3ef9-4dd0-ae16-adced1b8bb79', OFFICIAL_TEAM_IMAGES.decio],
  ['678ecd31-e992-47dd-a000-46b1d67653ba', OFFICIAL_TEAM_IMAGES.ariela],
  ['a75db0ec-e228-4d8f-b9f4-b3c2dae868cb', OFFICIAL_TEAM_IMAGES.michel],
  ['e5701f89-a6fe-4b42-a12a-7c8f3240596d', OFFICIAL_TEAM_IMAGES.carlos],
  ['92fbf70c-efd1-49f8-b1c8-f29a76a4506f', OFFICIAL_TEAM_IMAGES.silvio],
  ['e94d33ef-ea50-464e-870c-818b7ad53e29', OFFICIAL_TEAM_IMAGES.antonio],
  ['77db4a91-4d28-4883-822f-b755ab31f1bf', OFFICIAL_TEAM_IMAGES.zico],
  ['1_1_hv02q8', OFFICIAL_TEAM_IMAGES.dedeco],
  ['1_1_1_a86ew6', OFFICIAL_TEAM_IMAGES.dedeco],
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function imageForTeamMember(name) {
  const normalized = normalize(name);
  if (normalized.includes('dedeco') || normalized.includes('andre matos')) return OFFICIAL_TEAM_IMAGES.dedeco;
  if (normalized.includes('decio')) return OFFICIAL_TEAM_IMAGES.decio;
  if (normalized.includes('ariela')) return OFFICIAL_TEAM_IMAGES.ariela;
  if (normalized.includes('michel')) return OFFICIAL_TEAM_IMAGES.michel;
  if (normalized.includes('carlos andre')) return OFFICIAL_TEAM_IMAGES.carlos;
  if (normalized.includes('silvio')) return OFFICIAL_TEAM_IMAGES.silvio;
  if (normalized.includes('antonio')) return OFFICIAL_TEAM_IMAGES.antonio;
  if (normalized.includes('zico')) return OFFICIAL_TEAM_IMAGES.zico;
  return '';
}

export function resolveOfficialMediaUrl(value, context = '') {
  const candidate = String(value || '');
  if (candidate.includes('res.cloudinary.com/dhbrxzt5a/')) return candidate;
  const matched = ASSET_IDENTIFIERS.find(([identifier]) => candidate.includes(identifier));
  if (matched) return matched[1];

  return imageForTeamMember(context) || candidate;
}
