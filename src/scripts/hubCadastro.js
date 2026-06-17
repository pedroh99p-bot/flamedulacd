const FLOW_CONFIG = {
  donor: {
    className: 'flow-donor',
    title: 'Doador ou interessado',
    submitText: 'Enviar meu cadastro',
    loadingText: 'Enviando...',
    successId: 'success-donor',
    stepFields: [
      ['nome', 'telefone', 'cidade', 'estado'],
      ['blood_donor_status'],
      ['redome_status'],
      ['contact_preference', 'consent_lgpd'],
    ],
  },
  patient: {
    className: 'flow-patient',
    title: 'Paciente ou família',
    submitText: 'Enviar caso',
    loadingText: 'Enviando...',
    successId: 'success-patient',
    stepFields: [
      ['requester_name', 'requester_phone', 'relation_to_patient'],
      ['patient_identifier', 'cidade', 'estado', 'hospital'],
      ['need_type', 'urgency_level'],
      ['consent_authorized'],
    ],
  },
  support: {
    className: 'flow-support',
    title: 'Apoio financeiro',
  },
};

const state = {
  flow: 'choice',
  step: 0,
};

function getMiniApp() {
  return document.getElementById('hubMiniApp');
}

function getFeedback() {
  return document.getElementById('hubFormFeedback');
}

function getFlowForm(flow) {
  if (flow === 'support') return document.getElementById('panel-support');
  return document.getElementById(`form-${flow}`);
}

function getSteps(flow) {
  return [...(getFlowForm(flow)?.querySelectorAll('.mini-step') || [])];
}

function getCurrentStep(flow = state.flow) {
  return getSteps(flow)[state.step] || null;
}

function getFormValue(form, name) {
  const field = form?.elements?.[name];
  if (!field) return '';
  if (typeof RadioNodeList !== 'undefined' && field instanceof RadioNodeList) {
    return field.value?.trim() || '';
  }
  return typeof field.value === 'string' ? field.value.trim() : '';
}

function getCheckedValue(form, name) {
  return form?.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

function getCheckboxValue(form, name) {
  return Boolean(form?.querySelector(`input[name="${name}"]`)?.checked);
}

function setElementHidden(element, hidden) {
  if (!element) return;
  element.hidden = hidden;
}

function setFeedback(message = '', type = 'error') {
  const feedback = getFeedback();
  if (!feedback) return;

  feedback.textContent = message;
  feedback.classList.toggle('is-error', Boolean(message) && type === 'error');
  feedback.hidden = !message;
}

function setFieldInvalid(container, name, invalid) {
  const fields = container?.querySelectorAll(`[name="${name}"]`);
  const group = container?.querySelector(`[data-field-group="${name}"]`);

  fields?.forEach((field) => {
    field.classList.toggle('is-invalid', invalid);
    field.closest('.form-group, .checkbox-group')?.classList.toggle('is-invalid', invalid);

    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', 'hubFormFeedback');
    } else {
      field.removeAttribute('aria-invalid');
      if (field.getAttribute('aria-describedby') === 'hubFormFeedback') {
        field.removeAttribute('aria-describedby');
      }
    }
  });

  group?.classList.toggle('is-invalid', invalid);
  group?.querySelector('.radio-card-grid')?.classList.toggle('is-invalid', invalid);
}

function clearInvalidState(container) {
  container?.querySelectorAll('.is-invalid').forEach((element) => {
    element.classList.remove('is-invalid');
  });
  container?.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid');
    if (element.getAttribute('aria-describedby') === 'hubFormFeedback') {
      element.removeAttribute('aria-describedby');
    }
  });
}

function focusFirstField(container, fields) {
  const first = fields
    .map((name) => container?.querySelector(`[name="${name}"]`))
    .find(Boolean);

  first?.focus({ preventScroll: false });
}

function updateContactPreferenceState() {
  const form = getFlowForm('donor');
  if (!form?.elements) return;

  const prefersEmail = getCheckedValue(form, 'contact_preference') === 'email';
  const emailInput = form.elements.email;
  const emailNote = form.querySelector('label[for="donor-email"] .optional-label');

  emailInput?.toggleAttribute('required', prefersEmail);

  if (emailNote) {
    emailNote.textContent = prefersEmail ? 'obrigatório para contato por e-mail' : 'opcional';
    emailNote.classList.toggle('is-required', prefersEmail);
  }

  if (!prefersEmail) {
    setFieldInvalid(form, 'email', false);
  }
}

export function updateDonorConditionalFields() {
  const form = getFlowForm('donor');
  if (!form) return;

  const redomeStatus = getCheckedValue(form, 'redome_status');
  const medulaGroup = document.getElementById('medula-interest-group');
  const redomeNote = document.getElementById('redome-positive-note');
  const shouldAskMedula = redomeStatus === 'nao' || redomeStatus === 'nao_tenho_certeza';

  medulaGroup?.classList.toggle('is-hidden', !shouldAskMedula);
  medulaGroup?.classList.toggle('is-visible', shouldAskMedula);
  redomeNote?.classList.toggle('is-visible', redomeStatus === 'sim');

  medulaGroup?.querySelectorAll('input[name="medula_interest"]').forEach((input) => {
    input.required = shouldAskMedula;
    if (!shouldAskMedula) input.checked = false;
  });

  if (!shouldAskMedula) {
    setFieldInvalid(form, 'medula_interest', false);
  }
}

function getRequiredFieldsForStep(flow, stepIndex) {
  const config = FLOW_CONFIG[flow];
  const fields = [...(config?.stepFields?.[stepIndex] || [])];
  const form = getFlowForm(flow);

  if (flow === 'donor' && stepIndex === 2) {
    const redomeStatus = getCheckedValue(form, 'redome_status');
    if (redomeStatus === 'nao' || redomeStatus === 'nao_tenho_certeza') {
      fields.push('medula_interest');
    }
  }

  if (flow === 'donor' && stepIndex === 3) {
    if (getCheckedValue(form, 'contact_preference') === 'email') {
      fields.push('email');
    }
  }

  return fields;
}

function getFieldValueForValidation(form, name) {
  const field = form?.querySelector(`[name="${name}"]`);

  if (field?.type === 'checkbox') {
    return getCheckboxValue(form, name);
  }

  if (field?.type === 'radio') {
    return getCheckedValue(form, name);
  }

  return getFormValue(form, name);
}

function validateStep(flow, stepIndex = state.step) {
  const form = getFlowForm(flow);
  const step = getSteps(flow)[stepIndex];
  const fields = getRequiredFieldsForStep(flow, stepIndex);
  const missingFields = fields.filter((name) => !getFieldValueForValidation(form, name));

  clearInvalidState(step);
  setFeedback('');

  if (missingFields.length) {
    missingFields.forEach((name) => setFieldInvalid(step, name, true));

    const consentMissing = missingFields.some((name) => name === 'consent_lgpd' || name === 'consent_authorized');
    const emailMissing = missingFields.includes('email');
    const message = consentMissing
      ? 'Para enviar, é necessário autorizar o contato.'
      : emailMissing
        ? 'Informe um e-mail para usar este canal de contato.'
        : 'Preencha os campos obrigatórios para continuar.';

    setFeedback(message);
    focusFirstField(step, missingFields);
    return false;
  }

  return true;
}

export function buildDonorPayload(form = getFlowForm('donor')) {
  const redomeStatus = getCheckedValue(form, 'redome_status');
  const medulaInterest = redomeStatus === 'sim'
    ? 'ja_cadastrado_redome'
    : getCheckedValue(form, 'medula_interest');

  // Futuro: enviar este payload para a tabela donor_leads no Supabase.
  return {
    nome: getFormValue(form, 'nome'),
    telefone: getFormValue(form, 'telefone'),
    email: getFormValue(form, 'email') || null,
    cidade: getFormValue(form, 'cidade'),
    estado: getFormValue(form, 'estado'),
    blood_donor_status: getCheckedValue(form, 'blood_donor_status'),
    redome_status: redomeStatus,
    medula_interest: medulaInterest,
    contact_preference: getCheckedValue(form, 'contact_preference'),
    consent_lgpd: getCheckboxValue(form, 'consent_lgpd'),
    consent_updates: getCheckboxValue(form, 'consent_updates'),
    origem: 'landing',
    source_section: 'hub_cadastro',
    status: 'novo',
  };
}

export function buildPatientPayload(form = getFlowForm('patient')) {
  // Futuro: enviar este payload para a tabela patient_cases no Supabase.
  return {
    requester_name: getFormValue(form, 'requester_name'),
    requester_phone: getFormValue(form, 'requester_phone'),
    relation_to_patient: getFormValue(form, 'relation_to_patient'),
    patient_identifier: getFormValue(form, 'patient_identifier'),
    cidade: getFormValue(form, 'cidade'),
    estado: getFormValue(form, 'estado'),
    hospital: getFormValue(form, 'hospital'),
    need_type: getCheckedValue(form, 'need_type'),
    urgency_level: getCheckedValue(form, 'urgency_level'),
    campaign_context: getFormValue(form, 'campaign_context') || null,
    consent_authorized: getCheckboxValue(form, 'consent_authorized'),
    origem: 'landing',
    source_section: 'hub_cadastro',
    status: 'novo',
  };
}

function updateMiniHeader() {
  const stepLabel = document.getElementById('hubStepLabel');
  const title = document.getElementById('hubFlowTitle');
  const backButton = document.getElementById('hubBackBtn');
  const switchButton = document.getElementById('hubSwitchBtn');
  const progressFill = document.getElementById('hubProgressFill');
  const miniApp = getMiniApp();
  const config = FLOW_CONFIG[state.flow];
  const step = getCurrentStep();
  const steps = getSteps(state.flow);

  miniApp?.classList.remove('flow-neutral', 'flow-donor', 'flow-patient', 'flow-support');

  if (!config) {
    miniApp?.classList.add('flow-neutral');
    if (stepLabel) stepLabel.textContent = 'Escolha o caminho';
    if (title) title.textContent = 'Cadastro FlaMedula';
    setElementHidden(backButton, true);
    setElementHidden(switchButton, true);
    if (progressFill) progressFill.style.width = '0%';
    return;
  }

  miniApp?.classList.add(config.className);
  if (stepLabel) stepLabel.textContent = step?.dataset.label || config.title;
  if (title) title.textContent = step?.dataset.title || config.title;
  setElementHidden(backButton, false);
  setElementHidden(switchButton, false);

  if (progressFill) {
    const progress = steps.length > 1 ? ((state.step + 1) / steps.length) * 100 : 100;
    progressFill.style.width = `${progress}%`;
  }
}

function updateFooter(flow) {
  const form = getFlowForm(flow);
  const footer = form?.querySelector('.mini-step-footer');
  if (!footer) return;

  const nextButton = footer.querySelector('[data-action="next-step"]');
  const previousButton = footer.querySelector('[data-action="prev-step"]');
  const isFinalStep = state.step === getSteps(flow).length - 1;

  if (nextButton) {
    nextButton.textContent = isFinalStep ? FLOW_CONFIG[flow].submitText : 'Continuar';
  }

  if (previousButton) {
    previousButton.textContent = state.step === 0 ? 'Voltar ao início' : 'Voltar';
  }
}

function showOnlyActiveFlow() {
  const choice = document.getElementById('hubGrid');
  const successDonor = document.getElementById('success-donor');
  const successPatient = document.getElementById('success-patient');

  setElementHidden(choice, state.flow !== 'choice');
  setElementHidden(successDonor, true);
  setElementHidden(successPatient, true);

  ['donor', 'patient', 'support'].forEach((flow) => {
    const form = getFlowForm(flow);
    setElementHidden(form, state.flow !== flow);
  });

  getSteps(state.flow).forEach((step, index) => {
    step.classList.toggle('is-active', index === state.step);
  });

  updateMiniHeader();
  updateFooter(state.flow);
  setFeedback('');
}

function startFlow(flow) {
  if (!FLOW_CONFIG[flow]) return;

  state.flow = flow;
  state.step = 0;
  showOnlyActiveFlow();

  if (flow === 'donor') {
    updateDonorConditionalFields();
    updateContactPreferenceState();
  }

  document.getElementById('hub-cadastro')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showChoice() {
  state.flow = 'choice';
  state.step = 0;
  showOnlyActiveFlow();
}

function goPrevious() {
  if (state.flow === 'choice') return;

  if (state.step === 0) {
    showChoice();
    return;
  }

  state.step -= 1;
  showOnlyActiveFlow();
}

function goNext() {
  if (state.flow === 'choice' || state.flow === 'support') return;
  if (!validateStep(state.flow, state.step)) return;

  const steps = getSteps(state.flow);
  const isFinalStep = state.step === steps.length - 1;

  if (isFinalStep) {
    submitFlow(state.flow);
    return;
  }

  state.step += 1;
  showOnlyActiveFlow();
}

function setSubmitting(flow, submitting) {
  const form = getFlowForm(flow);
  const button = form?.querySelector('[data-action="next-step"]');
  if (!button) return;

  button.disabled = submitting;
  button.textContent = submitting ? FLOW_CONFIG[flow].loadingText : FLOW_CONFIG[flow].submitText;
}

function submitFlow(flow) {
  const payload = flow === 'donor'
    ? buildDonorPayload()
    : buildPatientPayload();

  setSubmitting(flow, true);

  window.setTimeout(() => {
    if (import.meta.env?.DEV) {
      console.info(`[FlaMedula] ${flow}_payload`, payload);
    }

    const form = getFlowForm(flow);
    const success = document.getElementById(FLOW_CONFIG[flow].successId);
    setElementHidden(form, true);
    setElementHidden(success, false);
    setFeedback('');
    setSubmitting(flow, false);
  }, 450);
}

export function openPanel(type) {
  if (type === 'redome') {
    document.getElementById('atualiza-redome')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  startFlow(type);
}

export function closePanels() {
  showChoice();
  document.getElementById('hub-cadastro')?.scrollIntoView({ behavior: 'smooth' });
}

export function handleFormSubmit(event, type) {
  event.preventDefault();

  if (type === state.flow) {
    goNext();
  }
}

function handleHubClick(event) {
  const actionTarget = event.target.closest('[data-action]');
  if (!actionTarget) return;

  const action = actionTarget.dataset.action;

  if (action === 'choose-flow') {
    startFlow(actionTarget.dataset.flow);
  }

  if (action === 'switch-flow') {
    showChoice();
  }

  if (action === 'back' || action === 'prev-step') {
    goPrevious();
  }

  if (action === 'next-step') {
    goNext();
  }
}

function handleHubInput(event) {
  const fieldName = event.target?.name;
  if (!fieldName || state.flow === 'choice') return;

  const step = getCurrentStep();
  setFieldInvalid(step, fieldName, false);

  if (fieldName === 'redome_status') updateDonorConditionalFields();
  if (fieldName === 'contact_preference') updateContactPreferenceState();

  if (getFeedback()?.textContent) {
    const fields = getRequiredFieldsForStep(state.flow, state.step);
    const form = getFlowForm(state.flow);
    const stillMissing = fields.some((name) => !getFieldValueForValidation(form, name));
    if (!stillMissing) setFeedback('');
  }
}

export function initHubCadastro() {
  window.openPanel = openPanel;
  window.closePanels = closePanels;
  window.handleFormSubmit = handleFormSubmit;

  const miniApp = getMiniApp();
  miniApp?.addEventListener('click', handleHubClick);
  miniApp?.addEventListener('input', handleHubInput);
  miniApp?.addEventListener('change', handleHubInput);

  updateDonorConditionalFields();
  updateContactPreferenceState();
  showChoice();
}
