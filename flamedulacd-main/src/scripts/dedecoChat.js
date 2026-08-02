import {
  AFTER_MATCH_GUIDANCE,
  BLOOD_DONATION_GUIDANCE,
  BRAZILIAN_STATES,
  DEDECO_ASSISTANT_SOURCES,
  DEDECO_WHATSAPP_URL,
  HLA_GUIDANCE,
  MARROW_DONATION_GUIDANCE,
  PLATELET_DONATION_GUIDANCE,
} from '../data/dedecoAssistant.js';
import { HEMOCENTERS, HEMOCENTER_DIRECTORY_REVIEWED_AT } from '../data/hemocenters.js';

const state = {
  initialized: false,
  greeted: false,
  locationPurpose: 'blood',
};

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function scrollMessages() {
  const messages = document.getElementById('dedecoChatMessages');
  if (!messages) return;
  window.requestAnimationFrame(() => {
    messages.scrollTop = messages.scrollHeight;
  });
}

function createMessageAction(action) {
  if (action.url) {
    const link = createElement('a', 'dedeco-message-action', action.label);
    link.href = action.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  const button = createElement('button', 'dedeco-message-action', action.label);
  button.type = 'button';
  button.dataset.dedecoAction = action.action;
  return button;
}

function appendMessage({
  sender = 'dedeco',
  text = '',
  lines = [],
  actions = [],
  sourceKeys = [],
}) {
  const messages = document.getElementById('dedecoChatMessages');
  if (!messages) return;

  const article = createElement('article', `dedeco-message is-${sender}`);
  article.setAttribute('aria-label', sender === 'user' ? 'Sua mensagem' : 'Resposta do Dedeco virtual');

  if (text) article.append(createElement('p', '', text));

  if (lines.length) {
    const list = createElement('ul', 'dedeco-message-list');
    lines.forEach((line) => list.append(createElement('li', '', line)));
    article.append(list);
  }

  if (actions.length) {
    const actionGroup = createElement('div', 'dedeco-message-actions');
    actions.forEach((action) => actionGroup.append(createMessageAction(action)));
    article.append(actionGroup);
  }

  if (sourceKeys.length) {
    const sourceGroup = createElement('div', 'dedeco-message-sources');
    sourceGroup.append(createElement('span', '', 'Fontes:'));
    sourceKeys.forEach((key) => {
      const source = DEDECO_ASSISTANT_SOURCES[key];
      if (!source) return;
      const link = createElement('a', '', source.label);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      sourceGroup.append(link);
    });
    article.append(sourceGroup);
  }

  messages.append(article);
  scrollMessages();
}

function showLocationForm() {
  const form = document.getElementById('dedecoLocationForm');
  if (!form) return;
  form.hidden = false;
  form.querySelector('input')?.focus();
  scrollMessages();
}

function hideLocationForm() {
  const form = document.getElementById('dedecoLocationForm');
  if (!form) return;
  form.hidden = true;
}

function respondWithLocation(purpose = 'blood') {
  state.locationPurpose = purpose;
  const button = document.querySelector('#dedecoLocationForm button[type="submit"]');
  if (button) {
    button.textContent = purpose === 'redome'
      ? 'Procurar local de cadastro no REDOME'
      : 'Procurar hemocentro para doação';
  }
  appendMessage({
    text: purpose === 'redome'
      ? 'Me diga sua cidade e o estado. Vou procurar locais que fazem cadastro no REDOME.'
      : 'Me diga sua cidade e o estado. Vou mostrar hemocentros da sua região. Confirme o tipo de doação e o horário com a unidade antes de sair.',
  });
  showLocationForm();
}

function respondWithEligibility() {
  appendMessage({
    text: 'Posso explicar os critérios gerais. Quem confirma se você pode doar naquele dia é a triagem do hemocentro.',
    lines: BLOOD_DONATION_GUIDANCE,
    actions: [
      { label: 'Abrir orientação oficial', url: DEDECO_ASSISTANT_SOURCES.blood.url },
      { label: 'Encontrar local para doar sangue', url: DEDECO_ASSISTANT_SOURCES.hemovida.url },
    ],
    sourceKeys: ['blood'],
  });
}

function respondWithPlatelets() {
  appendMessage({
    text: 'Plaquetas podem ser doadas por aférese. O processo e os critérios precisam ser confirmados diretamente com o hemocentro.',
    lines: PLATELET_DONATION_GUIDANCE,
    actions: [
      { label: 'Encontrar um hemocentro', action: 'where-blood' },
      { label: 'Ler orientação oficial do INCA', url: DEDECO_ASSISTANT_SOURCES.platelets.url },
    ],
    sourceKeys: ['platelets'],
  });
}

function respondWithPreparation() {
  appendMessage({
    text: 'Para doação de sangue, vá alimentado e descansado e leve um documento oficial com foto. A triagem do hemocentro confirma todos os critérios no dia.',
    lines: BLOOD_DONATION_GUIDANCE,
    actions: [
      { label: 'Encontrar um hemocentro', action: 'where-blood' },
      { label: 'Ver orientação oficial', url: DEDECO_ASSISTANT_SOURCES.blood.url },
    ],
    sourceKeys: ['blood'],
  });
}

function respondWithMarrow() {
  appendMessage({
    text: 'Doação de sangue e cadastro de medula são caminhos diferentes. Para medula, o cadastro oficial é feito pelo REDOME nos hemocentros participantes.',
    lines: MARROW_DONATION_GUIDANCE,
    actions: [
      { label: 'Localizar cadastro no REDOME', url: DEDECO_ASSISTANT_SOURCES.redome.url },
      { label: 'Ler orientação do INCA', url: DEDECO_ASSISTANT_SOURCES.inca.url },
    ],
    sourceKeys: ['redome', 'inca'],
  });
}

function respondWithHla() {
  appendMessage({
    text: 'Compatibilidade de medula não é definida pelo tipo sanguíneo. O exame usado na busca do REDOME é a tipagem HLA.',
    lines: HLA_GUIDANCE,
    actions: [
      { label: 'Ler a explicação do INCA', url: DEDECO_ASSISTANT_SOURCES.inca.url },
      { label: 'Como fazer o cadastro', action: 'marrow' },
    ],
    sourceKeys: ['inca'],
  });
}

function respondWithUpdateData() {
  appendMessage({
    text: 'Já é cadastrado? Manter telefone, endereço e e-mail atualizados ajuda o REDOME a encontrar você se surgir uma possível compatibilidade.',
    actions: [
      { label: 'Atualizar meus dados no REDOME', url: DEDECO_ASSISTANT_SOURCES.redomeUpdate.url },
      { label: 'Falar com a equipe FlaMedula', url: DEDECO_WHATSAPP_URL },
    ],
    sourceKeys: ['redomeUpdate'],
  });
}

function respondWithAfterMatch() {
  appendMessage({
    text: 'Uma possível compatibilidade é o começo de uma avaliação cuidadosa, não uma confirmação automática de doação.',
    lines: AFTER_MATCH_GUIDANCE,
    actions: [
      { label: 'Ver perguntas do INCA', url: DEDECO_ASSISTANT_SOURCES.inca.url },
    ],
    sourceKeys: ['inca', 'redome'],
  });
}

function respondWithStory() {
  appendMessage({
    text: 'André Matos, o Dedeco, é fundador e diretor-geral da FlaMedula. Ele lidera uma rede que aproxima informação, mobilização e pessoas dispostas a ajudar nas causas do sangue e da medula. A FlaMedula orienta e organiza campanhas, mas cada cadastro, triagem e doação acontece pelos canais oficiais de saúde.',
    actions: [
      { label: 'Assistir Dedeco contar a história', url: DEDECO_ASSISTANT_SOURCES.story.url },
      { label: 'Falar com a equipe', url: DEDECO_WHATSAPP_URL },
    ],
    sourceKeys: ['story'],
  });
}

function respondWithHumanSupport() {
  appendMessage({
    text: 'Claro. Vou te encaminhar para a equipe da FlaMedula no WhatsApp. Não envie exames ou dados médicos sensíveis por aqui.',
    actions: [
      { label: 'Abrir WhatsApp da FlaMedula', url: DEDECO_WHATSAPP_URL },
    ],
  });
}

function respondWithMedicalBoundary() {
  appendMessage({
    text: 'Eu não consigo avaliar sintomas, doenças, medicamentos ou dizer se uma pessoa está apta. Isso precisa ser confirmado pela triagem do hemocentro ou por um profissional de saúde.',
    actions: [
      { label: 'Ver critérios gerais', url: DEDECO_ASSISTANT_SOURCES.blood.url },
      { label: 'Falar com a equipe', url: DEDECO_WHATSAPP_URL },
    ],
    sourceKeys: ['blood'],
  });
}

function respondWithFallback() {
  appendMessage({
    text: 'Não tenho uma resposta segura para isso. Escolha um assunto abaixo ou fale com a equipe da FlaMedula.',
    actions: [
      { label: 'Onde doar sangue', action: 'where-blood' },
      { label: 'Como doar plaquetas', action: 'platelets' },
      { label: 'Quem pode doar', action: 'eligibility' },
      { label: 'Medula e REDOME', action: 'marrow' },
      { label: 'Falar com a equipe', action: 'human' },
    ],
  });
}

function handleAction(action) {
  hideLocationForm();

  if (action === 'where-blood') respondWithLocation('blood');
  if (action === 'where-redome') respondWithLocation('redome');
  if (action === 'eligibility') respondWithEligibility();
  if (action === 'platelets') respondWithPlatelets();
  if (action === 'prepare') respondWithPreparation();
  if (action === 'marrow') respondWithMarrow();
  if (action === 'hla') respondWithHla();
  if (action === 'update-data') respondWithUpdateData();
  if (action === 'after-match') respondWithAfterMatch();
  if (action === 'story') respondWithStory();
  if (action === 'human') respondWithHumanSupport();
}

function classifyMessage(message) {
  const normalized = normalizeText(message);
  const medicalTerms = [
    'remedio', 'medicamento', 'doenca', 'diabetes', 'pressao', 'gravida', 'gravidez',
    'cancer', 'hepatite', 'hiv', 'sintoma', 'febre', 'cirurgia', 'tatuagem', 'anemia',
  ];

  if (medicalTerms.some((term) => normalized.includes(term))) return 'medical-boundary';
  if (/atualizar|trocar telefone|mudei|dados cadastrais/.test(normalized) && /redome|cadastro|telefone|endereco|email/.test(normalized)) return 'update-data';
  if (/compativel|compatibilidade|hla|tipo sanguineo|tipo de sangue/.test(normalized)) return 'hla';
  if (/chamado|encontrou|encontraram|match|depois da compatibilidade/.test(normalized)) return 'after-match';
  if (/onde|hemocentro|local|cidade|perto/.test(normalized) && /medula|redome|cadastro/.test(normalized)) return 'where-redome';
  if (/onde|hemocentro|local|cidade|perto/.test(normalized) && /sangue|plaqueta|doar|doacao/.test(normalized)) return 'where-blood';
  if (/plaqueta|aferese/.test(normalized)) return 'platelets';
  if (/levar|preparar|jejum|alimentado|documento/.test(normalized)) return 'prepare';
  if (/posso doar|quem pode|requisito|criterio|idade|peso/.test(normalized)) return 'eligibility';
  if (/medula|redome|cadastro/.test(normalized)) return 'marrow';
  if (/sangue|doacao|doador/.test(normalized)) return 'eligibility';
  if (/dedeco|historia|fundador|flamedula/.test(normalized)) return 'story';
  if (/whatsapp|atendente|pessoa|equipe|ajuda humana|falar com/.test(normalized)) return 'human';
  return 'fallback';
}

function handleComposerSubmit(event) {
  event.preventDefault();
  const input = document.getElementById('dedecoChatInput');
  const message = input?.value.trim();
  if (!message) return;

  appendMessage({ sender: 'user', text: message });
  input.value = '';

  const intent = classifyMessage(message);
  if (intent === 'medical-boundary') respondWithMedicalBoundary();
  else if (intent === 'fallback') respondWithFallback();
  else handleAction(intent);
}

function formatReviewDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function handleLocationSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const city = String(formData.get('city') || '').trim().slice(0, 80);
  const stateCode = String(formData.get('state') || '').trim().toUpperCase();
  const stateName = BRAZILIAN_STATES.find(([code]) => code === stateCode)?.[1];

  if (city.length < 2 || !stateName) {
    appendMessage({
      text: 'Preencha a cidade e escolha o estado para eu montar os atalhos.',
    });
    return;
  }

  const normalizedCity = normalizeText(city);
  const stateEntries = HEMOCENTERS.filter((entry) => entry.uf === stateCode);
  const matches = stateEntries.filter((entry) => normalizeText(entry.address).includes(normalizedCity));
  const nearbyEntries = matches.length ? matches : stateEntries;
  const shownEntries = nearbyEntries.slice(0, 4);

  appendMessage({ sender: 'user', text: `${city} — ${stateCode}` });

  if (!shownEntries.length) {
    appendMessage({
      text: state.locationPurpose === 'redome'
        ? `Não encontrei uma unidade de ${stateName} na lista local. Use o localizador atual do REDOME e confirme antes de sair.`
        : `Não encontrei uma unidade de ${stateName} na lista local. Fale com a equipe FlaMedula ou consulte o guia oficial antes de sair.`,
      actions: [
        state.locationPurpose === 'redome'
          ? { label: 'Abrir localizador oficial do REDOME', url: DEDECO_ASSISTANT_SOURCES.redome.url }
          : { label: 'Consultar guia oficial de doação', url: DEDECO_ASSISTANT_SOURCES.hemovida.url },
        { label: 'Falar com a equipe FlaMedula', url: DEDECO_WHATSAPP_URL },
      ],
      sourceKeys: [state.locationPurpose === 'redome' ? 'redome' : 'hemovida'],
    });
    event.currentTarget.reset();
    hideLocationForm();
    return;
  }

  const directoryLabel = state.locationPurpose === 'redome' ? 'relação de cadastro do REDOME' : 'relação de hemocentros';
  const exactMessage = matches.length
    ? `Encontrei ${matches.length === 1 ? 'uma unidade' : `${matches.length} unidades`} na ${directoryLabel} para ${city}/${stateCode}.`
    : `Não encontrei o nome de ${city} na lista local. Estas são algumas unidades do estado de ${stateName}.`;

  const lines = shownEntries.map((entry) => {
    const phone = entry.phones.length ? ` Telefone: ${entry.phones.join(' / ')}.` : '';
    return `${entry.name} — ${entry.address}.${phone}`;
  });

  const mapActions = shownEntries.slice(0, 2).map((entry) => ({
    label: `Ver ${entry.name} no mapa`,
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${entry.name} ${entry.address}`)}`,
  }));

  appendMessage({
    text: `${exactMessage} A base foi revisada em ${formatReviewDate(HEMOCENTER_DIRECTORY_REVIEWED_AT)}. Telefone, endereço, horário e tipos de doação podem mudar: confirme diretamente com a unidade antes de ir.`,
    lines,
    actions: [
      ...mapActions,
      state.locationPurpose === 'redome'
        ? { label: 'Confirmar no REDOME oficial', url: DEDECO_ASSISTANT_SOURCES.redome.url }
        : { label: 'Ver orientação oficial', url: DEDECO_ASSISTANT_SOURCES.hemovida.url },
    ],
    sourceKeys: [state.locationPurpose === 'redome' ? 'redome' : 'hemovida'],
  });

  event.currentTarget.reset();
  hideLocationForm();
}

function openChat() {
  const panel = document.getElementById('dedecoChatPanel');
  const launcher = document.getElementById('dedecoChatLauncher');
  if (!panel || !launcher) return;

  panel.hidden = false;
  launcher.setAttribute('aria-expanded', 'true');
  document.body.classList.add('dedeco-chat-open');

  if (!state.greeted) {
    appendMessage({
      text: 'Fala, meu amigo! Eu sou o Dedeco virtual da FlaMedula. Posso ajudar você a entender como doar sangue ou plaquetas, encontrar um hemocentro e saber o que levar. Se quiser, também explico o REDOME separadamente.',
    });
    state.greeted = true;
  }

  window.setTimeout(() => {
    panel.querySelector('[data-dedeco-action="where-blood"]')?.focus();
  }, 50);
}

function closeChat({ restoreFocus = true } = {}) {
  const panel = document.getElementById('dedecoChatPanel');
  const launcher = document.getElementById('dedecoChatLauncher');
  if (!panel || !launcher) return;

  panel.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('dedeco-chat-open');
  if (restoreFocus) launcher.focus();
}

function populateStates() {
  const select = document.getElementById('dedecoState');
  if (!select) return;

  BRAZILIAN_STATES.forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${name} (${code})`;
    select.append(option);
  });
}

function handleRootClick(event) {
  const actionTarget = event.target.closest('[data-dedeco-action]');
  if (!actionTarget) return;
  handleAction(actionTarget.dataset.dedecoAction);
}

export function initDedecoChat() {
  if (state.initialized) return;

  const root = document.getElementById('dedecoAssistant');
  const launcher = document.getElementById('dedecoChatLauncher');
  const closeButton = document.getElementById('dedecoChatClose');
  const composer = document.getElementById('dedecoChatComposer');
  const locationForm = document.getElementById('dedecoLocationForm');
  if (!root || !launcher || !closeButton || !composer || !locationForm) return;

  populateStates();
  launcher.addEventListener('click', openChat);
  closeButton.addEventListener('click', closeChat);
  composer.addEventListener('submit', handleComposerSubmit);
  locationForm.addEventListener('submit', handleLocationSubmit);
  root.addEventListener('click', handleRootClick);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !document.getElementById('dedecoChatPanel')?.hidden) {
      closeChat();
    }
  });

  document.addEventListener('flamedula:registration-flow', (event) => {
    if (event.detail?.active && !document.getElementById('dedecoChatPanel')?.hidden) {
      closeChat({ restoreFocus: false });
    }
  });

  state.initialized = true;
}
