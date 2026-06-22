import './styles/variables.css';
import './styles/base.css';
import './styles/apoie.css';

import { submitDonationIntent } from './services/intakeApi.js';
import { setSubmitting as setButtonSubmitting, applyFieldErrors } from './utils/formState.js';
import { hasMinPhoneDigits, isValidCnpj, isValidCpf, isValidEmail, toIsoDateFromBrazilian } from './utils/formValidation.js';

const form = document.getElementById('apoieForm');
const feedback = document.getElementById('apoieFeedback');
const steps = [...document.querySelectorAll('.apoie-step')];
const progressSteps = [...document.querySelectorAll('[data-progress-step]')];
const progressLine = document.querySelector('.apoie-progress-line span');
const dueDaySelect = document.querySelector('[data-due-day]');
const paymentPanels = [...document.querySelectorAll('[data-payment-panel]')];
const preloader = document.getElementById('apoiePreloader');
const thanksScreen = document.getElementById('apoieThanks');
let donationCompleted = false;
let isSubmitting = false;

function activeDonorType() {
  return form.elements.donor_type.value;
}

function activeFieldset() {
  return document.querySelector(`[data-donor-fields="${activeDonorType()}"]`);
}

function setFeedback(message, tone = 'error') {
  feedback.textContent = message;
  feedback.dataset.tone = tone;
}

function clearErrors() {
  form.querySelectorAll('.is-invalid').forEach((field) => field.classList.remove('is-invalid'));
  form.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
  setFeedback('');
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

function formatDate(value) {
  return onlyDigits(value).slice(0, 8).replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

function showStep(stepNumber) {
  document.body.classList.toggle('apoie-step-two', stepNumber === 2);

  steps.forEach((step) => {
    const isActive = step.dataset.step === String(stepNumber);
    step.hidden = !isActive;
    step.classList.toggle('is-active', isActive);
  });

  progressSteps.forEach((step) => {
    const isActive = Number(step.dataset.progressStep) <= stepNumber;
    step.classList.toggle('is-active', isActive);
  });

  if (progressLine) {
    progressLine.style.width = stepNumber === 2 ? '100%' : '0%';
  }

  clearErrors();
}

function markInvalid(element) {
  const target = element.closest('label, fieldset') || element;
  target.classList.add('is-invalid');
  element.setAttribute?.('aria-invalid', 'true');
}

function validateRequired(elements, message) {
  const invalid = elements.filter((element) => !element.value?.trim());
  invalid.forEach(markInvalid);
  if (invalid.length) {
    setFeedback(message);
    invalid[0].focus?.();
    return false;
  }
  return true;
}

function validateRadio(name, message) {
  if (form.querySelector(`input[name="${name}"]:checked`)) return true;

  const group = form.querySelector(`input[name="${name}"]`)?.closest('fieldset');
  if (group) group.classList.add('is-invalid');
  setFeedback(message);
  return false;
}

function syncDonorFields() {
  const type = activeDonorType();

  document.querySelectorAll('[data-donor-fields]').forEach((fieldset) => {
    const isActive = fieldset.dataset.donorFields === type;
    fieldset.hidden = !isActive;
    fieldset.classList.remove('is-invalid');
    fieldset.querySelectorAll('input').forEach((input) => {
      input.disabled = !isActive;
      input.closest('.is-invalid')?.classList.remove('is-invalid');
    });
  });

  clearErrors();
}

function validateStepOne() {
  clearErrors();

  const fields = [...activeFieldset().querySelectorAll('input[required]')]
    .filter((input) => !input.disabled);

  if (!validateRequired(fields, 'Preencha os dados obrigatórios do apoiador.')) return false;

  const email = activeFieldset().querySelector('input[name="email"]');
  if (!isValidEmail(email.value)) {
    markInvalid(email);
    setFeedback('Informe um e-mail válido.');
    email.focus();
    return false;
  }

  const phone = activeFieldset().querySelector('input[name="phone"]');
  if (!hasMinPhoneDigits(phone.value)) {
    markInvalid(phone);
    setFeedback('Informe um telefone/WhatsApp válido com DDD.');
    phone.focus();
    return false;
  }

  const donorType = activeDonorType();
  const documentField = donorType === 'pessoa_juridica' ? form.elements.cnpj : form.elements.cpf;
  const validDocument = donorType === 'pessoa_juridica'
    ? isValidCnpj(documentField.value)
    : isValidCpf(documentField.value);
  if (!validDocument) {
    markInvalid(documentField);
    setFeedback(donorType === 'pessoa_juridica' ? 'Informe um CNPJ válido.' : 'Informe um CPF válido.');
    documentField.focus();
    return false;
  }

  const birthDate = form.elements.birth_date;
  if (donorType === 'pessoa_fisica' && birthDate.value && !toIsoDateFromBrazilian(birthDate.value)) {
    markInvalid(birthDate);
    setFeedback('Informe uma data de nascimento válida.');
    birthDate.focus();
    return false;
  }

  return validateRadio('contact_preference', 'Escolha uma preferência de contato.');
}

function validateStepTwo() {
  clearErrors();

  if (!validateRadio('payment_method', 'Escolha uma forma de pagamento.')) return false;
  if (!validateRadio('donation_type', 'Escolha o tipo de doação.')) return false;
  if (!validateRadio('amount', 'Escolha um valor para doar.')) return false;

  const amount = form.querySelector('input[name="amount"]:checked')?.value;
  const customAmount = form.elements.custom_amount;
  if (amount === 'custom' && (!customAmount.value || Number(customAmount.value) < 10)) {
    markInvalid(customAmount);
    setFeedback('Informe um valor personalizado de pelo menos R$ 10,00.');
    customAmount.focus();
    return false;
  }

  if (!form.elements.privacy_accepted.checked) {
    markInvalid(form.elements.privacy_accepted);
    setFeedback('Aceite a Política de Privacidade para continuar.');
    return false;
  }

  if (!form.elements.terms_accepted.checked) {
    markInvalid(form.elements.terms_accepted);
    setFeedback('Aceite os Termos do Doador para continuar.');
    return false;
  }

  return true;
}

function syncPaymentPanels() {
  const method = form.querySelector('input[name="payment_method"]:checked')?.value;

  paymentPanels.forEach((panel) => {
    const isActive = panel.dataset.paymentPanel === method;
    panel.hidden = false;
    panel.classList.toggle('is-open', isActive);
    panel.setAttribute('aria-hidden', String(!isActive));
    panel.querySelectorAll('input').forEach((input) => {
      input.disabled = !isActive;
      if (!isActive) input.value = '';
    });
  });
}

function syncDonationType() {
  const isSingle = form.querySelector('input[name="donation_type"]:checked')?.value === 'single';
  const recurring = document.querySelector('.apoie-recurring-fields');

  recurring.hidden = isSingle;
  recurring.classList.toggle('is-disabled', isSingle);
  recurring.querySelectorAll('input, select').forEach((field) => {
    field.disabled = isSingle;
  });
}

function syncCustomAmount() {
  const amount = form.querySelector('input[name="amount"]:checked')?.value;
  const custom = document.querySelector('.apoie-custom-amount');
  const input = custom.querySelector('input');
  const isCustom = amount === 'custom';

  custom.hidden = !isCustom;
  input.disabled = !isCustom;
  if (!isCustom) input.value = '';
}

export function buildDonationIntentPayload() {
  const data = new FormData(form);
  const donorType = data.get('donor_type');
  const isCompany = donorType === 'pessoa_juridica';
  const documentType = donorType === 'pessoa_juridica' ? 'cnpj' : 'cpf';
  const amount = data.get('amount');
  const isSingle = data.get('donation_type') === 'single';
  const normalizedAmount = amount === 'custom'
    ? Number(data.get('custom_amount'))
    : Number(amount);

  // Futuro: gateway de pagamento real. Cartão deve ser tokenizado pelo provedor. Nunca salvar dados sensíveis no Supabase.
  // Campos visuais de cartão nunca entram neste payload e não devem ser salvos ou logados.
  return {
    donor_type: donorType,
    name: isCompany ? null : data.get('name') || '',
    company_name: isCompany ? data.get('company_name') || '' : null,
    responsible_name: isCompany ? data.get('responsible_name') || '' : null,
    document_type: documentType,
    document: data.get(documentType) || '',
    email: data.get('email') || '',
    phone: data.get('phone') || '',
    birth_date: isCompany ? null : toIsoDateFromBrazilian(data.get('birth_date')) || null,
    contact_preference: data.get('contact_preference'),
    payment_method: data.get('payment_method'),
    donation_type: data.get('donation_type'),
    due_day: isSingle ? null : Number(data.get('due_day')),
    recurrence_period: isSingle ? null : data.get('recurrence_period'),
    amount: normalizedAmount,
    custom_amount: amount === 'custom' ? normalizedAmount : null,
    privacy_accepted: data.get('privacy_accepted') === 'on',
    terms_accepted: data.get('terms_accepted') === 'on',
    source: 'apoie_page',
    website: data.get('website') || '',
  };
}

function showDonationThanks() {
  donationCompleted = true;
  window.flamedulaDonationCompleted = donationCompleted;
  document.body.classList.add('apoie-donation-complete');
  document.body.classList.remove('apoie-step-two');
  form.hidden = true;
  thanksScreen.hidden = false;
  thanksScreen.focus({ preventScroll: true });
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  thanksScreen.scrollIntoView({ behavior, block: 'start' });
}

function populateDueDays() {
  dueDaySelect.innerHTML = Array.from({ length: 28 }, (_, index) => {
    const day = index + 1;
    return `<option value="${day}">${day}</option>`;
  }).join('');
}

function initMiniPreloader() {
  if (!preloader) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduceMotion ? 250 : 900;
  const fadeDuration = reduceMotion ? 0 : 260;

  preloader.hidden = false;
  document.body.classList.add('apoie-preloading');

  window.setTimeout(() => {
    preloader.classList.add('is-hidden');
    document.body.classList.remove('apoie-preloading');

    window.setTimeout(() => {
      preloader.hidden = true;
    }, fadeDuration);
  }, duration);
}

function initApoiePage() {
  if (!form) return;

  initMiniPreloader();
  populateDueDays();
  syncDonorFields();
  syncPaymentPanels();
  syncDonationType();
  syncCustomAmount();

  form.addEventListener('change', (event) => {
    if (event.target.name === 'donor_type') syncDonorFields();
    if (event.target.name === 'payment_method') syncPaymentPanels();
    if (event.target.name === 'donation_type') syncDonationType();
    if (event.target.name === 'amount') syncCustomAmount();
    event.target.closest('.is-invalid')?.classList.remove('is-invalid');
  });

  form.addEventListener('input', (event) => {
    const { name } = event.target;
    if (name === 'cpf') event.target.value = formatCpf(event.target.value);
    if (name === 'cnpj') event.target.value = formatCnpj(event.target.value);
    if (name === 'phone') event.target.value = formatPhone(event.target.value);
    if (name === 'birth_date') event.target.value = formatDate(event.target.value);
    event.target.closest('.is-invalid')?.classList.remove('is-invalid');
  });

  form.querySelector('[data-action="next"]').addEventListener('click', () => {
    if (!validateStepOne()) return;
    showStep(2);
  });

  form.querySelector('[data-action="back"]')?.addEventListener('click', () => {
    showStep(1);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!validateStepTwo()) return;

    const submitButton = form.querySelector('button[type="submit"]');
    isSubmitting = true;
    setButtonSubmitting(submitButton, true);
    setFeedback('');

    submitDonationIntent(buildDonationIntentPayload())
      .then(() => {
        showDonationThanks();
        form.reset();
      })
      .catch((error) => {
        applyFieldErrors(form, error.fieldErrors);
        setFeedback(error.message || 'Não foi possível enviar agora. Tente novamente.');
      })
      .finally(() => {
        isSubmitting = false;
        setButtonSubmitting(submitButton, false);
      });
  });
}

window.buildDonationIntentPayload = buildDonationIntentPayload;
initApoiePage();
