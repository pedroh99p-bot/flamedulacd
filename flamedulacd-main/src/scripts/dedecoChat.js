import {
  BLOOD_DONATION_GUIDANCE,
  BRAZILIAN_STATES,
  DEDECO_ASSISTANT_SOURCES,
  DEDECO_WHATSAPP_URL,
  MARROW_DONATION_GUIDANCE,
} from '../data/dedecoAssistant.js';

const state = {
  initialized: false,
  greeted: false,
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

function respondWithBloodLocation() {
  appendMessage({
    text: 'Me diga sua cidade e o estado. Eu preparo os atalhos certos sem inventar endereço ou horário.',
  });
  showLocationForm();
}

function respondWithEligibility() {
  appendMessage({
    text: 'Posso explicar os critérios gerais. Quem confirma se você pode doar naquele dia é a triagem do hemocentro.',
    lines: BLOOD_DONATION_GUIDANCE,
    actions: [
      { label: 'Abrir orientação oficial', url: DEDECO_ASSISTANT_SOURCES.blood.url },
      { label: 'Encontrar onde doar', action: 'where-blood' },
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
    text: 'Não tenho uma resposta segura para isso. Posso ajudar a encontrar onde doar, explicar os critérios gerais, falar sobre REDOME ou contar a história do Dedeco.',
    actions: [
      { label: 'Onde doar sangue', action: 'where-blood' },
      { label: 'Posso doar?', action: 'eligibility' },
      { label: 'Medula e REDOME', action: 'marrow' },
      { label: 'Falar com a equipe', action: 'human' },
    ],
  });
}

function handleAction(action) {
  hideLocationForm();

  if (action === 'where-blood') respondWithBloodLocation();
  if (action === 'eligibility') respondWithEligibility();
  if (action === 'marrow') respondWithMarrow();
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
  if (/onde|hemocentro|local|cidade|perto/.test(normalized) && /doar|sangue|hemocentro/.test(normalized)) return 'where-blood';
  if (/posso doar|quem pode|requisito|criterio|idade|peso/.test(normalized)) return 'eligibility';
  if (/medula|redome|hla|compatibilidade/.test(normalized)) return 'marrow';
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

  const mapQuery = encodeURIComponent(`hemocentro doação de sangue ${city} ${stateCode}`);
  appendMessage({ sender: 'user', text: `${city} — ${stateCode}` });
  appendMessage({
    text: `Para ${city}/${stateCode}, confira os locais atualizados no Hemovida. Também deixei uma busca no mapa, mas confirme endereço, horário e necessidade de agendamento no canal oficial antes de sair.`,
    actions: [
      { label: 'Abrir Hemovida oficial', url: DEDECO_ASSISTANT_SOURCES.hemovida.url },
      { label: `Ver opções no mapa em ${city}`, url: `https://www.google.com/maps/search/?api=1&query=${mapQuery}` },
      { label: 'Cadastro de medula no REDOME', url: DEDECO_ASSISTANT_SOURCES.redome.url },
    ],
    sourceKeys: ['hemovida', 'redome'],
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
      text: 'Fala, meu amigo! Eu sou o Dedeco virtual da FlaMedula. Posso orientar com informações revisadas e fontes oficiais. Não substituo a triagem do hemocentro nem um profissional de saúde.',
    });
    state.greeted = true;
  }

  window.setTimeout(() => {
    panel.querySelector('[data-dedeco-action="where-blood"]')?.focus();
  }, 50);
}

function closeChat() {
  const panel = document.getElementById('dedecoChatPanel');
  const launcher = document.getElementById('dedecoChatLauncher');
  if (!panel || !launcher) return;

  panel.hidden = true;
  launcher.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('dedeco-chat-open');
  launcher.focus();
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

  state.initialized = true;
}
