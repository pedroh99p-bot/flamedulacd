const PUBLICATION_TYPES = {
  hero_news: {
    tab: "hero",
    table: "hero_news",
    singular: "notícia principal",
    plural: "notícias principais",
    heading: "Notícias principais",
    titleField: "title",
    supportsImage: true,
  },
  actions: {
    tab: "actions",
    table: "actions",
    singular: "ação",
    plural: "ações",
    heading: "Ações e mobilizações",
    titleField: "title",
    supportsImage: true,
  },
  media_items: {
    tab: "media",
    table: "media_items",
    singular: "mídia",
    plural: "mídias",
    heading: "Galeria e mídias",
    titleField: "title",
    supportsImage: true,
  },
  testimonials: {
    tab: "testimonials",
    table: "testimonials",
    singular: "depoimento",
    plural: "depoimentos",
    heading: "Depoimentos",
    titleField: "author_name",
    supportsImage: true,
  },
  team_members: {
    tab: "team",
    table: "team_members",
    singular: "pessoa da equipe",
    plural: "equipe",
    heading: "Equipe e embaixadores",
    titleField: "name",
    supportsImage: true,
  },
  faq_items: {
    tab: "faq",
    table: "faq_items",
    singular: "pergunta frequente",
    plural: "perguntas frequentes",
    heading: "Perguntas frequentes",
    titleField: "question",
    supportsImage: false,
  },
  transparency_metrics: {
    tab: "metrics",
    table: "transparency_metrics",
    singular: "indicador de transparência",
    plural: "indicadores de transparência",
    heading: "Indicadores de transparência",
    titleField: "label",
    supportsImage: false,
  },
};

export function getPublicationConfig(type) {
  return PUBLICATION_TYPES[type] || PUBLICATION_TYPES.media_items;
}

export function getPublicationTypeFromTab(tab) {
  return Object.entries(PUBLICATION_TYPES)
    .find(([, config]) => config.tab === tab)?.[0] || "media_items";
}

export function getPublicationTabs() {
  return Object.values(PUBLICATION_TYPES).map((config) => config.tab);
}
