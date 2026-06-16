// Futuro: estes dados virão da tabela hero_news no Supabase.
// image_url receberá a URL do Cloudinary enviada pelo ADM.
export const heroNewsItems = [
  {
    id: 'hero-01',
    category: 'Mobilização',
    title: 'Informação que vira mobilização',
    subtitle: 'A FlaMedula organiza cadastro, orientação e campanhas para aproximar quem pode ajudar de quem precisa.',
    image_url: '',
    image_alt: 'Mobilização FlaMedula',
    cta_label: 'Quero participar',
    cta_url: '#hub-cadastro',
    published: true,
    order: 1
  },
  {
    id: 'hero-02',
    category: 'Medula óssea',
    title: 'Uma chance rara pode estar em você',
    subtitle: 'Cada novo cadastro pode aumentar a possibilidade de um paciente encontrar compatibilidade pelos canais oficiais.',
    image_url: '',
    image_alt: 'Orientação sobre cadastro de medula óssea',
    cta_label: 'Entender a medula',
    cta_url: '#educacional',
    published: true,
    order: 2
  },
  {
    id: 'hero-03',
    category: 'Famílias e pacientes',
    title: 'Casos precisam de rede, dados e direção',
    subtitle: 'Quando uma família cadastra um caso, a FlaMedula ajuda a organizar orientação e mobilização responsável.',
    image_url: '',
    image_alt: 'Rede de apoio para famílias e pacientes',
    cta_label: 'Cadastrar um caso',
    cta_url: '#hub-cadastro',
    published: true,
    order: 3
  }
];
