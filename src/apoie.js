import './styles/variables.css';
import './styles/base.css';
import './styles/apoie.css';

import { submitDonationIntent } from './services/intakeApi.js';
import { setSubmitting as setButtonSubmitting, applyFieldErrors } from './utils/formState.js';
import { hasMinPhoneDigits, onlyDigits } from './utils/formValidation.js';

const PIX_CODE = '00020126360014br.gov.bcb.pix0114530430740001715204000053039865802BR5921ASSOCIACAO FLA MEDULA6014RIO DE JANEIRO622605222RwegBxM8xgNzjcbhgJHeP6304D846';
const PIX_KEY_RAW = '53043074000171';
const WHATSAPP_NUMBER = '85999280682';
const SUCCESS_MESSAGE = 'Cadastro recebido. Agora voc\u00ea pode realizar sua contribui\u00e7\u00e3o via PIX.';

const form = document.getElementById('apoieForm');
const feedback = document.getElementById('apoieFeedback');
const toast = document.getElementById('apoieToast');
const steps = [...document.querySelectorAll('.apoie-step')];
const progressSteps = [...document.querySelectorAll('[data-progress-step]')];
const progressLine = document.querySelector('.apoie-progress-line span');
const stepOneSubmitButton = document.querySelector('[data-step-one-submit]');
const stepTwoTitle = document.getElementById('apoieStepTwoTitle');
const submissionIdOutput = document.getElementById('apoieSubmissionId');
const whatsappGate = document.getElementById('apoieWhatsappGate');
const whatsappButton = document.getElementById('apoieWhatsappButton');
const pixCodeBox = document.getElementById('apoiePixCode');
const pixKeyRaw = document.getElementById('apoiePixKeyRaw');

const state = {
  isSubmitting: false,
  currentStep: 1,
  submissionId: '',
  name: '',
  phone: '',
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

function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function getSnapshot() {
  return {
    name: normalizeName(form.elements.name.value),
    phone: onlyDigits(form.elements.phone.value),
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

function showStep(stepNumber, { focusTitle = false } = {}) {
  state.currentStep = stepNumber;
  document.body.classList.toggle('apoie-step-two-active', stepNumber === 2);

  steps.forEach((step) => {
    const isActive = Number(step.dataset.step) === stepNumber;
    step.hidden = !isActive;
    step.classList.toggle('is-active', isActive);
  });

  progressSteps.forEach((step) => {
    step.classList.toggle('is-active', Number(step.dataset.progressStep) <= stepNumber);
  });

  if (progressLine) {
    progressLine.style.width = stepNumber === 2 ? '100%' : '0%';
  }

  if (focusTitle) {
    const target = stepNumber === 2 ? stepTwoTitle : document.getElementById('apoieStepOneTitle');
    window.requestAnimationFrame(() => target?.focus({ preventScroll: false }));
  }
}

function validateStepOne() {
  clearErrors();
  setFeedback('Validando seus dados...', 'info');

  const nameField = form.elements.name;
  const phoneField = form.elements.phone;
  const privacyField = form.elements.privacy_accepted;
  const termsField = form.elements.terms_accepted;

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

function updateSubmissionMeta() {
  submissionIdOutput.textContent = state.submissionId || '--';
}

function buildWhatsappUrl() {
  const message = `Ol\u00e1! Meu nome \u00e9 ${state.name}. Realizei uma contribui\u00e7\u00e3o via PIX para a FlaMedula e gostaria de enviar o comprovante. Cadastro: ${state.submissionId}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function unlockWhatsapp() {
  if (!whatsappGate || (!state.copiedPixCode && !state.copiedPixKey) || !state.submissionId) return;

  whatsappButton.href = buildWhatsappUrl();
  if (!whatsappGate.hidden) return;

  whatsappGate.hidden = false;
  window.requestAnimationFrame(() => {
    whatsappGate.classList.add('is-visible');
  });
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
  if (!element) return;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(element);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function fallbackCopy(text, element) {
  const helper = document.createElement('textarea');
  helper.value = text;
  helper.setAttribute('readonly', 'readonly');
  helper.style.position = 'fixed';
  helper.style.opacity = '0';
  helper.style.pointerEvents = 'none';
  document.body.appendChild(helper);
  helper.select();

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }

  document.body.removeChild(helper);

  if (!copied) {
    selectElementText(element);
  }

  return copied;
}

async function copyValue(value, element, button, successMessage, stateKey) {
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
    return;
  }

  state[stateKey] = true;
  unlockWhatsapp();
  setFeedback('Depois do PIX, envie o comprovante pelo WhatsApp.', 'success');
  setCopiedButtonState(button, successMessage);
  showToast(successMessage, 'success');
}

function resetPixUnlock() {
  state.copiedPixCode = false;
  state.copiedPixKey = false;
  if (whatsappGate) {
    whatsappGate.hidden = true;
    whatsappGate.classList.remove('is-visible');
  }
  if (whatsappButton) {
    whatsappButton.href = '#';
  }
}

async function handleStepOneSubmit() {
  if (state.isSubmitting) return;

  const snapshot = getSnapshot();
  if (state.submissionId && sameSnapshot(snapshot, state.submissionSnapshot)) {
    updateSubmissionMeta();
    setFeedback(SUCCESS_MESSAGE, 'success');
    unlockWhatsapp();
    showStep(2, { focusTitle: true });
    return;
  }

  if (!validateStepOne()) return;

  state.isSubmitting = true;
  clearErrors();
  resetPixUnlock();
  setFeedback('Enviando seu cadastro...', 'info');
  setButtonSubmitting(stepOneSubmitButton, true, 'Enviando cadastro...');

  try {
    const response = await submitDonationIntent(buildPrePixPayload());
    const result = response?.data ?? response;

    if (!result?.submissionId || result?.nextStep !== 'pix' || result?.status !== 'pending_payment_setup') {
      throw new Error('N\u00e3o foi poss\u00edvel confirmar a libera\u00e7\u00e3o do PIX agora.');
    }

    state.name = snapshot.name;
    state.phone = snapshot.phone;
    state.submissionId = result.submissionId;
    state.submissionSnapshot = snapshot;
    updateSubmissionMeta();
    setFeedback(SUCCESS_MESSAGE, 'success');
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
      if (button.dataset.copyTarget === 'pix-code') {
        await copyValue(PIX_CODE, pixCodeBox, button, 'C\u00f3digo PIX copiado', 'copiedPixCode');
      }

      if (button.dataset.copyTarget === 'pix-key') {
        await copyValue(PIX_KEY_RAW, pixKeyRaw, button, 'Chave PIX copiada', 'copiedPixKey');
      }
    });
  });
}

function bindBackButton() {
  const backButton = form.querySelector('[data-action="back"]');
  backButton?.addEventListener('click', () => {
    setFeedback(SUCCESS_MESSAGE, 'success');
    showStep(1, { focusTitle: true });
  });
}

function initApoiePage() {
  if (!form) return;

  setFeedback('', 'neutral');
  updateSubmissionMeta();
  showStep(1);
  bindCopyButtons();
  bindBackButton();

  form.addEventListener('input', (event) => {
    const field = event.target;
    field.closest('.is-invalid')?.classList.remove('is-invalid');
    field.removeAttribute?.('aria-invalid');

    if (field.name === 'phone') {
      field.value = formatPhone(field.value);
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
initApoiePage();
