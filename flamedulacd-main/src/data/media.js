// Futuro: estes itens virão da tabela media_items no Supabase.
// O ADM poderá cadastrar URL do YouTube, thumbnail, tipo, destaque, published e order.
export const mediaItems = [
  {
    id: 'media-01',
    type: 'youtube',
    category: 'Vídeo oficial',
    title: 'Apresentação do Canal FlaMedula',
    description: 'Uma introdução à causa e à orientação sobre cadastro de medula.',
    youtubeId: 'U4Mk8wK_Ig8',
    url: 'https://www.youtube.com/watch?v=U4Mk8wK_Ig8',
    thumbnail_url: '',
    duration: '',
    featured: true,
    published: true,
    order: 1
  },
  {
    id: 'media-02',
    type: 'youtube',
    category: 'REDOME',
    title: 'Fiz cadastro como doador de medula e o REDOME ligou. E agora?',
    description: 'Conteúdo educativo sobre o que pode acontecer após um possível contato dos canais oficiais.',
    youtubeId: '_W0GsCB-GiQ',
    url: 'https://www.youtube.com/watch?v=_W0GsCB-GiQ',
    thumbnail_url: '',
    duration: '',
    featured: false,
    published: true,
    order: 2
  },
  {
    id: 'media-03',
    type: 'youtube',
    category: 'Entrevista',
    title: 'Dedeco fala sobre a FlaMedula',
    description: 'Conversa sobre a história, mobilização e importância da rede FlaMedula.',
    youtubeId: 'fHT9F5hqwKw',
    url: 'https://www.youtube.com/watch?v=fHT9F5hqwKw',
    thumbnail_url: '',
    duration: '',
    featured: false,
    published: true,
    order: 3
  },
  {
    id: 'media-04',
    type: 'youtube',
    category: 'Bate-papo',
    title: 'Bate-papo sobre doação de medula óssea',
    description: 'Uma conversa para ampliar informação, tirar dúvidas e aproximar mais pessoas da causa.',
    youtubeId: 'ivdMsdLYQl4',
    url: 'https://www.youtube.com/watch?v=ivdMsdLYQl4',
    thumbnail_url: '',
    duration: '',
    featured: false,
    published: true,
    order: 4
  }
];
