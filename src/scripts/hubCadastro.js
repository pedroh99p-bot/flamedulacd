import { submitDonorLead, submitPatientCase } from '../services/intakeApi.js';
import { applyFieldErrors } from '../utils/formState.js';
import { hasMinPhoneDigits, isValidEmail } from '../utils/formValidation.js';

const FLOW_CONFIG = {
  donor: {
    className: 'flow-donor',
    title: 'Doador ou interessado',
    submitText: 'Enviar meu cadastro',
    loadingText: 'Enviando...',
    successId: 'success-donor',
    stepFields: [
      ['blood_donor_status'],
      ['nome', 'telefone'],
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
      ['requester_name', 'requester_phone'],
      [],
      ['need_type'],
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
  submitting: false,
  selectionLocked: false,
  selectionTimer: null,
};

const FLOW_SELECTION_DELAY_MS = 320;
const SUPPORT_NAVIGATION_DELAY_MS = 280;
const SUPPORT_PAGE_URL = '/apoie/';
const TECHNICAL_SUBMISSION_ERROR_MESSAGE = 'N\u00e3o foi poss\u00edvel concluir o cadastro. Tente novamente.';
const DEVELOPMENT_HOSTS = new Set(['localhost', '127.0.0.1']);

function getMiniApp() {
  return document.getElementById('hubMiniApp');
}

function getFeedback() {
  return document.getElementById('hubFormFeedback');
}

function getNavigationOverlay() {
  return document.getElementById('hubNavigationOverlay');
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
  feedback.classList.toggle('is-info', Boolean(message) && type === 'info');
  feedback.classList.toggle('is-success', Boolean(message) && type === 'success');
  feedback.hidden = !message;
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function getChoiceCards() {
  return [...document.querySelectorAll('[data-action="choose-flow"]')];
}

function resetChoiceSelection() {
  if (state.selectionTimer) {
    window.clearTimeout(state.selectionTimer);
    state.selectionTimer = null;
  }

  state.selectionLocked = false;
  getMiniApp()?.classList.remove('is-choosing-flow');
  document.body.classList.remove('is-navigating-to-apoie');
  const overlay = getNavigationOverlay();
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('is-visible');
  }
  getChoiceCards().forEach((card) => {
    card.disabled = false;
    card.classList.remove('is-selected', 'is-dimmed', 'is-pending');
    card.removeAttribute('aria-current');
  });
}

function runSelectedFlow(flow) {
  if (flow === 'support') {
    window.location.href = SUPPORT_PAGE_URL;
    return;
  }

  resetChoiceSelection();
  startFlow(flow);
}

function showSupportNavigationOverlay() {
  const overlay = getNavigationOverlay();
  document.body.classList.add('is-navigating-to-apoie');

  if (!overlay) return;

  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(() => {
    overlay.classList.add('is-visible');
  });
}

function chooseFlowWithTransition(button) {
  const flow = button?.dataset.flow;
  if (!FLOW_CONFIG[flow] || state.selectionLocked) return;

  state.selectionLocked = true;
  getMiniApp()?.classList.add('is-choosing-flow');
  if (flow === 'support') {
    showSupportNavigationOverlay();
  }

  getChoiceCards().forEach((card) => {
    const isSelected = card === button;
    card.disabled = !isSelected;
    card.classList.toggle('is-selected', isSelected);
    card.classList.toggle('is-pending', isSelected);
    card.classList.toggle('is-dimmed', !isSelected);
    if (isSelected) card.setAttribute('aria-current', 'true');
    else card.removeAttribute('aria-current');
  });

  setFeedback(
    flow === 'support' ? 'Preparando a página de apoio...' : 'Abrindo cadastro...',
    'info',
  );

  const delay = flow === 'support'
    ? SUPPORT_NAVIGATION_DELAY_MS
    : prefersReducedMotion() ? 0 : FLOW_SELECTION_DELAY_MS;
  state.selectionTimer = window.setTimeout(() => runSelectedFlow(flow), delay);
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

  first?.focus({ preventScroll: true });
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

function applyPublicFlowCopyAdjustments() {
  const donorForm = getFlowForm('donor');
  const patientForm = getFlowForm('patient');
  if (!donorForm || !patientForm) return;

  const donorStepZeroText = donorForm.querySelector('[data-step="0"] .step-copy p');
  if (donorStepZeroText) {
    donorStepZeroText.textContent = 'Doacao de sangue e cadastro de medula sao caminhos diferentes. A FlaMedula usa essa resposta para orientar sem misturar os dois processos.';
  }

  const donorStepTwoText = donorForm.querySelector('[data-step="2"] .step-copy p');
  if (donorStepTwoText) {
    donorStepTwoText.textContent = 'Estar no REDOME significa estar cadastrado para uma possivel compatibilidade. Isso nao significa que a doacao ja aconteceu.';
  }

  const redomeNote = document.getElementById('redome-positive-note');
  if (redomeNote) {
    redomeNote.textContent = 'Otimo. Manter seus dados atualizados ajuda os canais oficiais a localizar voce se houver compatibilidade futura.';
  }

  const medulaLegend = document.querySelector('#medula-interest-group legend');
  if (medulaLegend) {
    medulaLegend.textContent = 'Voce quer receber orientacao para entender como funciona o cadastro de medula?';
  }

  const donorStepThreeText = donorForm.querySelector('[data-step="3"] .step-copy p');
  if (donorStepThreeText) {
    donorStepThreeText.textContent = 'Escolha o melhor canal para receber orientacao sobre sangue, REDOME e medula sem misturar os temas.';
  }

  const patientStepTwoText = patientForm.querySelector('[data-step="2"] .step-copy p');
  if (patientStepTwoText) {
    patientStepTwoText.textContent = 'Selecione a necessidade principal e adicione um contexto breve para orientar a equipe.';
  }

  const urgencyGroup = patientForm.querySelector('[data-field-group="urgency_level"]');
  if (urgencyGroup) urgencyGroup.hidden = true;
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

  const phoneFieldName = flow === 'donor' ? 'telefone' : 'requester_phone';
  if (fields.includes(phoneFieldName) && !hasMinPhoneDigits(getFormValue(form, phoneFieldName))) {
    setFieldInvalid(step, phoneFieldName, true);
    setFeedback('Informe um telefone/WhatsApp válido com DDD.');
    focusFirstField(step, [phoneFieldName]);
    return false;
  }

  const donorEmail = getFormValue(form, 'email');
  if (flow === 'donor' && fields.includes('email') && donorEmail && !isValidEmail(donorEmail)) {
    setFieldInvalid(step, 'email', true);
    setFeedback('Informe um e-mail válido.');
    focusFirstField(step, ['email']);
    return false;
  }

  const requesterEmail = getFormValue(form, 'requester_email');
  if (flow === 'patient' && requesterEmail && !isValidEmail(requesterEmail)) {
    setFieldInvalid(step, 'requester_email', true);
    setFeedback('Informe um e-mail válido.');
    focusFirstField(step, ['requester_email']);
    return false;
  }

  return true;
}

export function buildDonorPayload(form = getFlowForm('donor')) {
  const redomeStatus = getCheckedValue(form, 'redome_status');
  const medulaInterest = redomeStatus === 'sim'
    ? 'ja_cadastrado_redome'
    : getCheckedValue(form, 'medula_interest');

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
    source: 'pagina_principal',
    source_section: 'hub_cadastro_doador',
    website: getFormValue(form, 'website'),
  };
}

export function buildPatientPayload(form = getFlowForm('patient')) {
  return {
    requester_name: getFormValue(form, 'requester_name'),
    requester_phone: getFormValue(form, 'requester_phone'),
    requester_email: getFormValue(form, 'requester_email') || null,
    relation_to_patient: getFormValue(form, 'relation_to_patient'),
    patient_identifier: getFormValue(form, 'patient_identifier'),
    cidade: getFormValue(form, 'cidade'),
    estado: getFormValue(form, 'estado'),
    hospital: getFormValue(form, 'hospital'),
    need_type: getCheckedValue(form, 'need_type'),
    campaign_context: getFormValue(form, 'campaign_context') || null,
    consent_authorized: getCheckboxValue(form, 'consent_authorized'),
    source: 'pagina_principal',
    source_section: 'hub_cadastro_paciente',
    website: getFormValue(form, 'website'),
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
    if (stepLabel) stepLabel.textContent = 'Escolha uma opção para abrir o cadastro correto.';
    if (title) title.textContent = 'Como você quer participar?';
    setElementHidden(backButton, true);
    setElementHidden(switchButton, true);
    if (progressFill) progressFill.style.width = '0%';
    return;
  }

  miniApp?.classList.add(config.className);
  if (stepLabel) stepLabel.textContent = step?.dataset.label || config.title;
  if (title) title.textContent = step?.dataset.title || config.title;
  setElementHidden(backButton, true);
  setElementHidden(switchButton, true);

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
    previousButton.textContent = state.step === 0 ? 'Voltar para opções' : 'Voltar';
  }
}

function showOnlyActiveFlow() {
  resetChoiceSelection();

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

  const activeStep = getCurrentStep();
  if (activeStep) activeStep.scrollTop = 0;
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
  if (state.submitting || state.flow === 'choice' || state.flow === 'support') return;
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

function getFieldNamesWithoutInputs(form, fieldErrors = {}) {
  const fields = [...(form?.querySelectorAll('[name]') || [])];
  return Object.keys(fieldErrors).filter((name) => !fields.some((field) => field.name === name));
}

function logTechnicalSubmissionError(flow, error, technicalFields) {
  if (!DEVELOPMENT_HOSTS.has(window.location.hostname)) return;

  console.warn('[FlaMedula intake]', {
    flow,
    code: error.code,
    technicalFields,
    fieldErrors: error.fieldErrors,
    response: error.response,
  });
}

async function submitFlow(flow) {
  const payload = flow === 'donor'
    ? buildDonorPayload()
    : buildPatientPayload();

  const form = getFlowForm(flow);
  const success = document.getElementById(FLOW_CONFIG[flow].successId);

  state.submitting = true;
  setSubmitting(flow, true);
  setFeedback('');

  try {
    if (flow === 'donor') {
      await submitDonorLead(payload);
    } else {
      await submitPatientCase(payload);
    }
    setElementHidden(form, true);
    setElementHidden(success, false);
    setFeedback('');
    form.reset?.();
  } catch (error) {
    applyFieldErrors(form, error.fieldErrors);
    const technicalFields = getFieldNamesWithoutInputs(form, error.fieldErrors);
    if (technicalFields.length) {
      logTechnicalSubmissionError(flow, error, technicalFields);
      setFeedback(TECHNICAL_SUBMISSION_ERROR_MESSAGE);
    } else {
      setFeedback(error.message || 'N\u00e3o foi poss\u00edvel enviar agora. Tente novamente.');
    }
  } finally {
    state.submitting = false;
    setSubmitting(flow, false);
  }
}

export function openPanel(type) {
  if (type === 'redome') {
    document.getElementById('atualiza-redome')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  if (type === 'support') {
    const supportCard = document.querySelector('[data-action="choose-flow"][data-flow="support"]');
    if (state.flow === 'choice' && supportCard) {
      chooseFlowWithTransition(supportCard);
      return;
    }

    showSupportNavigationOverlay();
    window.setTimeout(() => {
      window.location.href = SUPPORT_PAGE_URL;
    }, SUPPORT_NAVIGATION_DELAY_MS);
    return;
  }

  startFlow(type);
}

export function closePanels() {
  showChoice();
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
    chooseFlowWithTransition(actionTarget);
    return;
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
  applyPublicFlowCopyAdjustments();
  showChoice();
}
