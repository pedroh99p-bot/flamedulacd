// Futuro: estes itens virao da tabela hero_news no Supabase.
// image_url recebera a URL do Cloudinary enviada pelo ADM.
export const heroNewsItems = [
  {
    id: 'hero-01',
    category: 'Mobilização',
    title: 'Informação que vira mobilização',
    description: 'A FlaMedula organiza cadastro, orientação e campanhas para aproximar quem pode ajudar de quem precisa.',
    image_url: '',
    cta_label: 'Quero participar',
    cta_url: '#hub-cadastro',
    published: true,
    order: 1
  },
  {
    id: 'hero-02',
    category: 'Medula óssea',
    title: 'Uma chance rara pode estar em você',
    description: 'Cada novo cadastro pode aumentar a possibilidade de um paciente encontrar compatibilidade.',
    image_url: '',
    cta_label: 'Entender a medula',
    cta_url: '#educacional',
    published: true,
    order: 2
  },
  {
    id: 'hero-03',
    category: 'Famílias e pacientes',
    title: 'Casos precisam de rede, dados e direção',
    description: 'Quando uma família cadastra um caso, a FlaMedula ajuda a organizar orientação e mobilização responsável.',
    image_url: '',
    cta_label: 'Cadastrar paciente',
    cta_url: '#hub-cadastro',
    published: true,
    order: 3
  }
];
