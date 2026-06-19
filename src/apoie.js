import './styles/variables.css';
import './styles/base.css';
import './styles/apoie.css';

const form = document.getElementById('apoieForm');
const feedback = document.getElementById('apoieFeedback');
const steps = [...document.querySelectorAll('.apoie-step')];
const progressSteps = [...document.querySelectorAll('[data-progress-step]')];
const progressLine = document.querySelector('.apoie-progress-line span');
const dueDaySelect = document.querySelector('[data-due-day]');
const paymentPanels = [...document.querySelectorAll('[data-payment-panel]')];

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

function formatCardNumber(value) {
  return onlyDigits(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatCardExpiry(value) {
  return onlyDigits(value).slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2');
}

function showStep(stepNumber) {
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
    fieldset.querySelectorAll('input').forEach((input) => {
      input.disabled = !isActive;
    });
  });

  clearErrors();
}

function validateStepOne() {
  clearErrors();

  const fields = [...activeFieldset().querySelectorAll('input[required]')]
    .filter((input) => !input.disabled);

  return validateRequired(fields, 'Preencha os dados obrigatórios do apoiador.')
    && validateRadio('contact_preference', 'Escolha uma preferência de contato.');
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

  if (form.querySelector('input[name="payment_method"]:checked')?.value === 'credit_card') {
    const cardFields = [...form.querySelectorAll('[data-card-visual]')];
    if (!validateRequired(cardFields, 'Preencha os dados visuais do cartão para continuar.')) return false;
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
  const documentType = donorType === 'pessoa_juridica' ? 'cnpj' : 'cpf';
  const amount = data.get('amount');
  const isSingle = data.get('donation_type') === 'single';

  // Futuro: este payload será enviado ao Supabase e à API de pagamento.
  // Cartão deve ser tokenizado pelo provedor de pagamento. Nunca salvar dados sensíveis de cartão no Supabase.
  // Campos visuais de cartão nunca entram neste payload e não devem ser salvos ou logados.
  return {
    donor_type: donorType,
    name: data.get('name') || '',
    company_name: data.get('company_name') || '',
    responsible_name: data.get('responsible_name') || '',
    document_type: documentType,
    document: data.get(documentType) || '',
    email: data.get('email') || '',
    phone: data.get('phone') || '',
    birth_date: data.get('birth_date') || '',
    contact_preference: data.get('contact_preference'),
    payment_method: data.get('payment_method'),
    donation_type: data.get('donation_type'),
    due_day: isSingle ? null : data.get('due_day'),
    recurrence_period: isSingle ? null : data.get('recurrence_period'),
    amount,
    custom_amount: amount === 'custom' ? data.get('custom_amount') : null,
    privacy_accepted: data.get('privacy_accepted') === 'on',
    terms_accepted: data.get('terms_accepted') === 'on',
    source: 'apoie_page',
    status: 'pending_payment_setup',
  };
}

function populateDueDays() {
  dueDaySelect.innerHTML = Array.from({ length: 28 }, (_, index) => {
    const day = index + 1;
    return `<option value="${day}">${day}</option>`;
  }).join('');
}

function initApoiePage() {
  if (!form) return;

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
    if (name === 'card_number_visual') event.target.value = formatCardNumber(event.target.value);
    if (name === 'card_cvv_visual') event.target.value = onlyDigits(event.target.value).slice(0, 4);
    if (name === 'card_expiry_visual') event.target.value = formatCardExpiry(event.target.value);
    event.target.closest('.is-invalid')?.classList.remove('is-invalid');
  });

  form.querySelector('[data-action="next"]').addEventListener('click', () => {
    if (!validateStepOne()) return;
    showStep(2);
  });

  form.querySelector('[data-action="back"]').addEventListener('click', () => {
    showStep(1);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateStepTwo()) return;

    window.flamedulaDonationIntentPayload = buildDonationIntentPayload();
    setFeedback('Cadastro de apoio recebido. Em breve, a FlaMedula poderá entrar em contato com as próximas instruções.', 'success');
    form.classList.add('is-complete');
  });
}

window.buildDonationIntentPayload = buildDonationIntentPayload;
initApoiePage();
