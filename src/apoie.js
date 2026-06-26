import './styles/variables.css';
import './styles/base.css';
import './styles/apoie.css';

import { submitDonationIntent } from './services/intakeApi.js';
import { applyFieldErrors } from './utils/formState.js';
import { hasMinPhoneDigits, onlyDigits } from './utils/formValidation.js';

const PIX_CODE = '00020126360014br.gov.bcb.pix0114530430740001715204000053039865802BR5921ASSOCIACAO FLA MEDULA6014RIO DE JANEIRO622605222RwegBxM8xgNzjcbhgJHeP6304D846';
const WHATSAPP_NUMBER = '85999280682';
const PRE_PIX_STATUS_LABEL = 'Aguardando confirma\u00e7\u00e3o do PIX';
const STEP_TRANSITION_MS = 220;
const MEDIA_READY_TIMEOUT_MS = 900;

const submitButtonLabels = {
  idle: 'Continuar para o PIX',
  validating: 'Validando seus dados...',
  sending: 'Enviando seu cadastro...',
  preparing_pix: 'Cadastro recebido. Preparando seu PIX...',
  success: 'Continuar para o PIX',
  error: 'Continuar para o PIX',
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const form = document.getElementById('apoieForm');
const feedback = document.getElementById('apoieFeedback');
const toast = document.getElementById('apoieToast');
const steps = [...document.querySelectorAll('.apoie-step')];
const progressSteps = [...document.querySelectorAll('[data-progress-step]')];
const progressLines = [...document.querySelectorAll('.apoie-progress-line span')];
const stepOneSubmitButton = document.querySelector('[data-step-one-submit]');
const amountField = form?.elements.amount_display;
const summaryName = document.getElementById('apoieSummaryName');
const summaryAmount = document.getElementById('apoieSummaryAmount');
const summaryStatus = document.getElementById('apoieSummaryStatus');
const whatsappArea = document.getElementById('apoieWhatsappArea');
const whatsappButton = document.getElementById('apoieWhatsappButton');
const pixCodeBox = document.getElementById('apoiePixCode');
const institutionalFigure = document.querySelector('.apoie-institutional-figure-step');
const institutionalImage = document.querySelector('.apoie-institutional-image');
const qrCard = document.querySelector('.apoie-qr-card');
const qrImage = document.querySelector('.apoie-qr-image');

const state = {
  isSubmitting: false,
  currentStep: 1,
  submissionId: '',
  name: '',
  phone: '',
  amount: 0,
  status: 'pending_payment_setup',
  copiedPixCode: false,
  submissionSnapshot: null,
};

let toastTimeoutId = null;
let stepTransitionTimer = null;
let mediaReadyPromise = null;

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatCurrencyInput(value) {
  const digits = onlyDigits(value).slice(0, 12);
  if (!digits) return '';
  return formatCurrency(Number(digits) / 100);
}

function parseCurrencyInput(value) {
  const digits = onlyDigits(value);
  if (!digits) return 0;
  return Number((Number(digits) / 100).toFixed(2));
}

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getSnapshot() {
  return {
    name: normalizeName(form.elements.name.value),
    phone: onlyDigits(form.elements.phone.value),
    amount: parseCurrencyInput(form.elements.amount_display.value),
  };
}

function sameSnapshot(first, second) {
  return Boolean(
    first
    && second
    && first.name === second.name
    && first.phone === second.phone,
  );
}

function setFeedback(message, tone = 'neutral') {
  if (!feedback) return;
  feedback.textContent = message || '';
  feedback.dataset.tone = tone;
  feedback.hidden = !message;
}

function setSubmitState(status = 'idle') {
  if (!form) return;
  form.dataset.submitState = status;
  const busy = status === 'validating' || status === 'sending' || status === 'preparing_pix';
  form.setAttribute('aria-busy', String(busy));

  if (stepOneSubmitButton) {
    stepOneSubmitButton.textContent = submitButtonLabels[status] || submitButtonLabels.idle;
    stepOneSubmitButton.setAttribute('aria-disabled', String(stepOneSubmitButton.disabled));
  }
}

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function setButtonDisabled(button, disabled) {
  if (!button) return;
  button.disabled = disabled;
  button.setAttribute('aria-disabled', String(disabled));
}

function markMediaLoading(container) {
  container?.classList.add('is-loading');
  container?.classList.remove('is-loaded', 'is-error');
  container?.setAttribute('data-media-state', 'loading');
}

function markMediaLoaded(container) {
  container?.classList.remove('is-loading', 'is-error');
  container?.classList.add('is-loaded');
  container?.setAttribute('data-media-state', 'loaded');
}

function markMediaError(container, label) {
  container?.classList.remove('is-loading');
  container?.classList.add('is-error');
  container?.setAttribute('data-media-state', 'error');
  console.warn(`[FlaMedula] Nao foi possivel carregar ${label}. O PIX continua disponivel.`);
}

async function decodeImage(image) {
  if (!image?.decode) return;
  try {
    await image.decode();
  } catch {
    // Alguns navegadores rejeitam decode mesmo com a imagem carregada.
  }
}

function prepareImage(image, container, label) {
  if (!image) return Promise.resolve({ label, status: 'missing' });

  markMediaLoading(container);
  image.loading = 'eager';

  if (image.complete && image.naturalWidth > 0) {
    return decodeImage(image).then(() => {
      markMediaLoaded(container);
      return { label, status: 'loaded' };
    });
  }

  return new Promise((resolve) => {
    const finishLoaded = async () => {
      image.removeEventListener('error', finishError);
      await decodeImage(image);
      markMediaLoaded(container);
      resolve({ label, status: 'loaded' });
    };

    const finishError = () => {
      image.removeEventListener('load', finishLoaded);
      markMediaError(container, label);
      resolve({ label, status: 'error' });
    };

    image.addEventListener('load', finishLoaded, { once: true });
    image.addEventListener('error', finishError, { once: true });

    if (!image.currentSrc && image.src) {
      image.src = image.src;
    }
  });
}

function startPixMediaPreload() {
  if (!mediaReadyPromise) {
    mediaReadyPromise = Promise.allSettled([
      prepareImage(institutionalImage, institutionalFigure, 'a imagem institucional'),
      prepareImage(qrImage, qrCard, 'o QR Code PIX'),
    ]);
  }

  return mediaReadyPromise;
}

function waitForPixMedia(timeoutMs = MEDIA_READY_TIMEOUT_MS) {
  const timeout = new Promise((resolve) => {
    window.setTimeout(() => resolve({ status: 'timeout' }), timeoutMs);
  });

  return Promise.race([startPixMediaPreload(), timeout]);
}

function clearErrors() {
  form.querySelectorAll('.is-invalid').forEach((element) => element.classList.remove('is-invalid'));
  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => element.removeAttribute('aria-invalid'));
}

function markInvalid(field) {
  const target = field.closest('label, .apoie-check') || field;
  target.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');
}

function focusField(field) {
  if (!field) return;
  field.focus({ preventScroll: false });
}

function updateProgress(stepNumber) {
  progressSteps.forEach((step) => {
    step.classList.toggle('is-active', Number(step.dataset.progressStep) <= stepNumber);
    step.classList.toggle('is-complete', Number(step.dataset.progressStep) < stepNumber);
  });

  const widths = {
    1: ['0%'],
    2: ['100%'],
  };

  progressLines.forEach((line, index) => {
    line.style.width = widths[stepNumber]?.[index] || '0%';
  });
}

function focusStepTitle(stepNumber) {
  const target = document.getElementById(
    stepNumber === 1
      ? 'apoieStepOneTitle'
      : 'apoieStepTwoTitle',
  );

  const focusAndScroll = () => {
    target?.focus({ preventScroll: true });
    document.querySelector('.apoie-panel')?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  window.requestAnimationFrame(focusAndScroll);
  window.setTimeout(focusAndScroll, 80);
}

function applyStep(stepNumber, { focusTitle = false } = {}) {
  state.currentStep = stepNumber;
  document.body.dataset.activeStep = String(stepNumber);

  steps.forEach((step) => {
    const isActive = Number(step.dataset.step) === stepNumber;
    step.hidden = !isActive;
    step.setAttribute('aria-hidden', String(!isActive));
    step.classList.toggle('is-active', isActive);
    step.classList.toggle('is-hidden', !isActive);
  });

  updateProgress(stepNumber);

  if (focusTitle) focusStepTitle(stepNumber);
}

function showStep(stepNumber, { focusTitle = false } = {}) {
  if (stepTransitionTimer) {
    window.clearTimeout(stepTransitionTimer);
    stepTransitionTimer = null;
  }

  if (stepNumber === state.currentStep || prefersReducedMotion()) {
    applyStep(stepNumber, { focusTitle });
    return;
  }

  const currentStep = steps.find((step) => Number(step.dataset.step) === state.currentStep);
  form?.classList.add('is-switching-step');
  currentStep?.classList.add('is-exiting');

  stepTransitionTimer = window.setTimeout(() => {
    currentStep?.classList.remove('is-exiting');
    form?.classList.remove('is-switching-step');
    applyStep(stepNumber, { focusTitle });
    stepTransitionTimer = null;
  }, STEP_TRANSITION_MS);
}

function updateSummary() {
  summaryName.textContent = state.name || '--';
  summaryAmount.textContent = formatCurrency(state.amount);
  summaryStatus.textContent = PRE_PIX_STATUS_LABEL;
}

function validateStepOne() {
  clearErrors();
  setSubmitState('validating');
  setFeedback('Validando seus dados...', 'info');

  const nameField = form.elements.name;
  const phoneField = form.elements.phone;
  const privacyField = form.elements.privacy_accepted;
  const termsField = form.elements.terms_accepted;
  const parsedAmount = parseCurrencyInput(amountField.value);

  if (!normalizeName(nameField.value)) {
    markInvalid(nameField);
    setFeedback('Informe seu nome completo.', 'error');
    focusField(nameField);
    return false;
  }

  if (!hasMinPhoneDigits(phoneField.value)) {
    markInvalid(phoneField);
    setFeedback('Informe um telefone/WhatsApp v\u00e1lido com DDD.', 'error');
    focusField(phoneField);
    return false;
  }

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    markInvalid(amountField);
    setFeedback('Informe um valor maior que zero.', 'error');
    focusField(amountField);
    return false;
  }

  if (!privacyField.checked) {
    markInvalid(privacyField);
    setFeedback('Aceite a Pol\u00edtica de Privacidade para continuar.', 'error');
    focusField(privacyField);
    return false;
  }

  if (!termsField.checked) {
    markInvalid(termsField);
    setFeedback('Aceite os Termos do Doador para continuar.', 'error');
    focusField(termsField);
    return false;
  }

  return true;
}

function setStepOneLocked(locked) {
  const stepOne = document.getElementById('supportStep1');
  if (!stepOne) return;

  stepOne.querySelectorAll('input, button, select, textarea').forEach((control) => {
    if (control.name === 'website') return;
    control.disabled = locked;
    if (control.matches('button')) {
      control.setAttribute('aria-disabled', String(locked));
    }
  });
}

function buildPrePixPayload() {
  const snapshot = getSnapshot();

  return {
    submission_mode: 'pre_pix',
    name: snapshot.name,
    phone: snapshot.phone,
    privacy_accepted: form.elements.privacy_accepted.checked,
    terms_accepted: form.elements.terms_accepted.checked,
    source: 'apoie_page',
    source_section: 'support_page',
    website: form.elements.website.value || '',
  };
}

function buildWhatsappUrl() {
  const message = [
    'Ol\u00e1, FlaMedula! Quero enviar o comprovante do PIX de apoio financeiro.',
    `Nome: ${state.name}.`,
    `Valor pretendido: ${formatCurrency(state.amount)}.`,
    `Cadastro: ${state.submissionId}.`,
  ].join(' ');
  return `https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
}

function setCopiedButtonState(button, copiedLabel) {
  const defaultLabel = button.dataset.defaultLabel || button.textContent;
  button.dataset.defaultLabel = defaultLabel;
  button.textContent = copiedLabel;
  button.dataset.copied = 'true';

  window.setTimeout(() => {
    button.textContent = defaultLabel;
    delete button.dataset.copied;
  }, 2400);
}

function showToast(message, tone = 'success') {
  if (!toast) return;

  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId);
  }

  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  toast.classList.add('is-visible');

  toastTimeoutId = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => {
      toast.hidden = true;
    }, 180);
  }, 2600);
}

function selectElementText(element) {
  if (!element) return false;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
  return Boolean(selection?.toString());
}

function fallbackCopy(text, element) {
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.style.position = 'fixed';
  helper.style.left = '-9999px';
  helper.style.top = '0';
  helper.style.opacity = '0';
  helper.style.pointerEvents = 'none';
  document.body.appendChild(helper);
  helper.focus();
  helper.select();
  helper.setSelectionRange(0, helper.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(helper);

  if (copied) {
    return { copied: true, selected: false };
  }

  return { copied: false, selected: selectElementText(element) };
}

function hideWhatsappArea() {
  if (!whatsappArea) return;
  whatsappArea.hidden = true;
  whatsappArea.setAttribute('aria-hidden', 'true');
  whatsappArea.classList.remove('is-visible');
}

function revealWhatsappArea() {
  if (!whatsappArea || !state.submissionId) return;
  whatsappButton.href = buildWhatsappUrl();
  whatsappArea.hidden = false;
  whatsappArea.setAttribute('aria-hidden', 'false');
  const showArea = () => {
    whatsappArea.classList.add('is-visible');
    window.setTimeout(() => {
      const rect = whatsappArea.getBoundingClientRect();
      if (rect.bottom > window.innerHeight || rect.top < 0) {
        whatsappArea.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
      }
    }, prefersReducedMotion() ? 0 : 260);
  };

  window.requestAnimationFrame(showArea);
  window.setTimeout(showArea, 80);
}

async function copyValue(value, element, button, successMessage, stateKey, { revealWhatsapp = false, feedbackMessage = successMessage } = {}) {
  let copied = false;
  let selected = false;

  try {
    if (!window.navigator?.clipboard?.writeText) {
      throw new Error('Clipboard API indisponivel.');
    }
    await window.navigator.clipboard.writeText(value);
    copied = true;
  } catch {
    const result = fallbackCopy(value, element);
    copied = result.copied;
    selected = result.selected;
  }

  state[stateKey] = copied || selected;

  if (copied) {
    setFeedback(feedbackMessage, 'success');
    setCopiedButtonState(button, successMessage);
    showToast(feedbackMessage, 'success');
  } else if (selected) {
    const manualMessage = 'O c\u00f3digo foi selecionado. Copie manualmente e envie o comprovante pelo WhatsApp.';
    setFeedback(manualMessage, 'warning');
    setCopiedButtonState(button, 'C\u00f3digo selecionado');
    showToast(manualMessage, 'warning');
  } else {
    const errorMessage = 'N\u00e3o foi poss\u00edvel copiar automaticamente. O c\u00f3digo continua vis\u00edvel para c\u00f3pia manual.';
    setFeedback(errorMessage, 'warning');
    showToast(errorMessage, 'warning');
  }

  if (revealWhatsapp) {
    revealWhatsappArea();
  }

  return copied;
}

function resetCopyState() {
  state.copiedPixCode = false;
  hideWhatsappArea();
}

async function handleStepOneSubmit() {
  if (state.isSubmitting) return;

  const snapshot = getSnapshot();

  if (state.submissionId && sameSnapshot(snapshot, state.submissionSnapshot)) {
    state.amount = snapshot.amount;
    updateSummary();
    setSubmitState('preparing_pix');
    setFeedback('Cadastro recebido. Preparando seu PIX...', 'success');
    await waitForPixMedia();
    showStep(2, { focusTitle: true });
    setSubmitState('success');
    return;
  }

  if (!validateStepOne()) {
    setSubmitState('error');
    return;
  }

  state.isSubmitting = true;
  clearErrors();
  resetCopyState();
  setStepOneLocked(true);
  setSubmitState('sending');
  setFeedback('Enviando seu cadastro...', 'info');
  setButtonDisabled(stepOneSubmitButton, true);

  try {
    const response = await submitDonationIntent(buildPrePixPayload());
    const result = response?.data ?? response;

    if (!result?.submissionId || result?.status !== 'pending_payment_setup') {
      throw new Error('N\u00e3o foi poss\u00edvel confirmar a libera\u00e7\u00e3o do PIX agora.');
    }

    state.name = snapshot.name;
    state.phone = snapshot.phone;
    state.amount = snapshot.amount;
    state.status = result.status || 'pending_payment_setup';
    state.submissionId = result.submissionId;
    state.submissionSnapshot = {
      name: snapshot.name,
      phone: snapshot.phone,
    };

    whatsappButton.href = buildWhatsappUrl();
    updateSummary();
    setSubmitState('preparing_pix');
    setFeedback('Cadastro recebido. Preparando seu PIX...', 'success');
    await waitForPixMedia();
    setFeedback(`Cadastro recebido. Sua contribui\u00e7\u00e3o de ${formatCurrency(state.amount)} est\u00e1 aguardando confirma\u00e7\u00e3o do PIX.`, 'success');
    showStep(2, { focusTitle: true });
    setSubmitState('success');
  } catch (error) {
    applyFieldErrors(form, error.fieldErrors);
    setSubmitState('error');
    setFeedback(error.message || 'N\u00e3o foi poss\u00edvel enviar. Seus dados continuam preenchidos.', 'error');
  } finally {
    state.isSubmitting = false;
    setStepOneLocked(false);
    setButtonDisabled(stepOneSubmitButton, false);
  }
}

function bindCopyButtons() {
  form.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-target]');
    if (!button || !form.contains(button)) return;

    const target = button.dataset.copyTarget;

    if (target === 'pix-code') {
      await copyValue(PIX_CODE, pixCodeBox, button, 'C\u00f3digo PIX copiado', 'copiedPixCode', {
        revealWhatsapp: true,
        feedbackMessage: 'C\u00f3digo PIX copiado. Envie o comprovante pelo WhatsApp para confirmar o apoio.',
      });
    }
  });
}

function bindNavigation() {
  form.querySelector('[data-action="back-step-one"]')?.addEventListener('click', () => {
    resetCopyState();
    setFeedback(`Cadastro recebido. Sua contribui\u00e7\u00e3o de ${formatCurrency(state.amount)} est\u00e1 aguardando confirma\u00e7\u00e3o do PIX.`, 'success');
    showStep(1, { focusTitle: true });
  });
}

function initApoiePage() {
  if (!form) return;

  const releasePageEntrance = () => {
    document.body.classList.remove('apoie-page-entering');
  };
  window.requestAnimationFrame(releasePageEntrance);
  window.setTimeout(releasePageEntrance, 80);

  setFeedback('', 'neutral');
  setSubmitState('idle');
  updateSummary();
  updateProgress(1);
  showStep(1);
  hideWhatsappArea();
  startPixMediaPreload();
  bindCopyButtons();
  bindNavigation();

  form.addEventListener('input', (event) => {
    const field = event.target;
    field.closest('.is-invalid')?.classList.remove('is-invalid');
    field.removeAttribute?.('aria-invalid');

    if (field.name === 'phone') {
      field.value = formatPhone(field.value);
    }

    if (field.name === 'amount_display') {
      field.value = formatCurrencyInput(field.value);
    }
  });

  form.addEventListener('change', (event) => {
    event.target.closest('.is-invalid')?.classList.remove('is-invalid');
    event.target.removeAttribute?.('aria-invalid');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await handleStepOneSubmit();
  });
}

window.buildDonationIntentPayload = buildPrePixPayload;
window.parseCurrencyInput = parseCurrencyInput;
initApoiePage();
