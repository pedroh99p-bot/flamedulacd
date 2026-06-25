import './styles/variables.css';
import './styles/base.css';
import './styles/apoie.css';

import { submitDonationIntent } from './services/intakeApi.js';
import { setSubmitting as setButtonSubmitting, applyFieldErrors } from './utils/formState.js';
import { hasMinPhoneDigits, onlyDigits } from './utils/formValidation.js';

const PIX_CODE = '00020126360014br.gov.bcb.pix0114530430740001715204000053039865802BR5921ASSOCIACAO FLA MEDULA6014RIO DE JANEIRO622605222RwegBxM8xgNzjcbhgJHeP6304D846';
const PIX_KEY_RAW = '53043074000171';
const WHATSAPP_NUMBER = '85999280682';
const PRE_PIX_STATUS_LABEL = 'Aguardando confirma\u00e7\u00e3o do PIX';

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
const pixKeyRaw = document.getElementById('apoiePixKeyRaw');

const state = {
  isSubmitting: false,
  currentStep: 1,
  submissionId: '',
  name: '',
  phone: '',
  amount: 0,
  status: 'pending_payment_setup',
  copiedPixCode: false,
  copiedPixKey: false,
  submissionSnapshot: null,
};

let toastTimeoutId = null;

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
  feedback.textContent = message || '';
  feedback.dataset.tone = tone;
  feedback.hidden = !message;
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

function showStep(stepNumber, { focusTitle = false } = {}) {
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

  if (!focusTitle) return;

  const target = document.getElementById(
    stepNumber === 1
      ? 'apoieStepOneTitle'
      : 'apoieStepTwoTitle',
  );

  window.requestAnimationFrame(() => {
    target?.focus({ preventScroll: false });
    document.querySelector('.apoie-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function updateSummary() {
  summaryName.textContent = state.name || '--';
  summaryAmount.textContent = formatCurrency(state.amount);
  summaryStatus.textContent = PRE_PIX_STATUS_LABEL;
}

function validateStepOne() {
  clearErrors();
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
  const message = `Ol\u00e1! Meu nome \u00e9 ${state.name}. Informei que gostaria de contribuir com ${formatCurrency(state.amount)} para a FlaMedula e realizei o PIX. Gostaria de enviar o comprovante. Cadastro: ${state.submissionId}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
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

  if (copied) return true;

  selectElementText(element);
  return false;
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
  window.requestAnimationFrame(() => {
    whatsappArea.classList.add('is-visible');
  });
}

async function copyValue(value, element, button, successMessage, stateKey, { revealWhatsapp = false } = {}) {
  let copied = false;

  try {
    await navigator.clipboard.writeText(value);
    copied = true;
  } catch {
    copied = fallbackCopy(value, element);
  }

  if (!copied) {
    setFeedback('N\u00e3o foi poss\u00edvel copiar. Selecione manualmente.', 'warning');
    showToast('N\u00e3o foi poss\u00edvel copiar. Selecione manualmente.', 'warning');
    return false;
  }

  state[stateKey] = true;
  setFeedback(successMessage, 'success');
  setCopiedButtonState(button, successMessage);
  showToast(successMessage, 'success');

  if (revealWhatsapp) {
    revealWhatsappArea();
  }

  return true;
}

function resetCopyState() {
  state.copiedPixCode = false;
  state.copiedPixKey = false;
  hideWhatsappArea();
}

async function handleStepOneSubmit() {
  if (state.isSubmitting) return;

  const snapshot = getSnapshot();

  if (state.submissionId && sameSnapshot(snapshot, state.submissionSnapshot)) {
    state.amount = snapshot.amount;
    updateSummary();
    setFeedback(`Cadastro recebido. Sua contribui\u00e7\u00e3o de ${formatCurrency(state.amount)} est\u00e1 aguardando confirma\u00e7\u00e3o do PIX.`, 'success');
    showStep(2, { focusTitle: true });
    return;
  }

  if (!validateStepOne()) return;

  state.isSubmitting = true;
  clearErrors();
  resetCopyState();
  setFeedback('Enviando seu cadastro...', 'info');
  setButtonSubmitting(stepOneSubmitButton, true, 'Enviando cadastro...');

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
    setFeedback(`Cadastro recebido. Sua contribui\u00e7\u00e3o de ${formatCurrency(state.amount)} est\u00e1 aguardando confirma\u00e7\u00e3o do PIX.`, 'success');
    showStep(2, { focusTitle: true });
  } catch (error) {
    applyFieldErrors(form, error.fieldErrors);
    setFeedback(error.message || 'N\u00e3o foi poss\u00edvel enviar. Seus dados continuam preenchidos.', 'error');
  } finally {
    state.isSubmitting = false;
    setButtonSubmitting(stepOneSubmitButton, false);
  }
}

function bindCopyButtons() {
  form.querySelectorAll('[data-copy-target]').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button.dataset.copyTarget;

      if (target === 'pix-code') {
        await copyValue(PIX_CODE, pixCodeBox, button, 'C\u00f3digo PIX copiado', 'copiedPixCode', { revealWhatsapp: true });
      }

      if (target === 'pix-key') {
        await copyValue(PIX_KEY_RAW, pixKeyRaw, button, 'Chave PIX copiada', 'copiedPixKey', { revealWhatsapp: true });
      }
    });
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

  setFeedback('', 'neutral');
  updateSummary();
  updateProgress(1);
  showStep(1);
  hideWhatsappArea();
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
