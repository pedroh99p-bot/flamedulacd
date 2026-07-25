import { OFFICIAL_HERO_IMAGES } from '../config/officialMedia.js';

// Fallback local do Hero. A landing usa o Supabase quando os posts publicados
// possuem imagens renderizaveis; caso contrario, estes 3 posts garantem o Hero.
export const heroNewsItems = [
  {
    id: 'hero-01',
    category: 'Notícia',
    title: '15 de junho agora é o Dia do FlaMedula',
    subtitle: 'A data entrou no calendário oficial do Rio de Janeiro após aprovação na Câmara, fortalecendo a visibilidade da causa e da doação de sangue e medula.',
    image_url: OFFICIAL_HERO_IMAGES.diaFlamedula,
    image_alt: 'Registro institucional do Dia do FlaMedula',
    cta_label: 'Quero me cadastrar',
    cta_url: 'https://wa.me/558599280682',
    published: true,
    order: 1,
  },
  {
    id: 'hero-02',
    category: 'História real',
    title: 'Filha doa medula para o pai',
    subtitle: 'A compatibilidade entre familiares costuma ser maior. Entre pessoas sem parentesco, a chance pode chegar a 1 em 100 mil - por isso cada novo cadastro importa.',
    image_url: OFFICIAL_HERO_IMAGES.filhaDoaParaPai,
    image_alt: 'Filha realizando doação de medula para o pai',
    cta_label: 'Entenda como ajudar',
    cta_url: 'https://wa.me/558599280682',
    published: true,
    order: 2,
  },
  {
    id: 'hero-03',
    category: 'Vitória',
    title: 'Rafael VENCEU!!!',
    subtitle: 'Depois de dois transplantes de medula, Rafael venceu. Uma história de superação que mostra como a doação pode mudar destinos e salvar vidas.',
    image_url: OFFICIAL_HERO_IMAGES.rafael,
    image_alt: 'Vitória de Rafael após dois transplantes de medula',
    cta_label: 'Seja parte dessa corrente',
    cta_url: 'https://wa.me/558599280682',
    published: true,
    order: 3,
  },
];
