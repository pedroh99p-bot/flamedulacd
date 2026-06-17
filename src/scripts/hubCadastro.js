const DONOR_ERROR_ID = 'donor-form-feedback';
const DONOR_SUBMIT_TEXT = 'Enviar meu cadastro';
const DONOR_LOADING_TEXT = 'Enviando...';
const DONOR_REQUIRED_FIELDS = [
  'nome',
  'telefone',
  'cidade',
  'estado',
  'blood_donor_status',
  'redome_status',
  'contact_preference',
];

function getDonorForm() {
  return document.getElementById('form-donor');
}

function getFormValue(form, name) {
  const field = form?.elements?.[name];
  return typeof field?.value === 'string' ? field.value.trim() : '';
}

function getCheckedValue(form, name) {
  return form?.querySelector(`input[name="${name}"]:checked`)?.value || '';
}

function getCheckboxValue(form, name) {
  return Boolean(form?.querySelector(`input[name="${name}"]`)?.checked);
}

function setDonorIntroVisible(visible) {
  const intro = document.querySelector('#panel-donor .donor-form-intro');
  if (intro) intro.style.display = visible ? 'block' : 'none';
}

function resetSubmitButton(form) {
  const submitButton = form?.querySelector('button[type="submit"]');
  if (!submitButton) return;

  submitButton.disabled = false;
  submitButton.textContent = DONOR_SUBMIT_TEXT;
}

function setFieldInvalid(form, name, invalid) {
  const fields = form?.querySelectorAll(`[name="${name}"]`);
  const group = form?.querySelector(`[data-field-group="${name}"]`);

  fields?.forEach((field) => {
    field.classList.toggle('is-invalid', invalid);
    field.closest('.form-group, .checkbox-group')?.classList.toggle('is-invalid', invalid);

    if (invalid) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', DONOR_ERROR_ID);
    } else {
      field.removeAttribute('aria-invalid');
      if (field.getAttribute('aria-describedby') === DONOR_ERROR_ID) {
        field.removeAttribute('aria-describedby');
      }
    }
  });

  group?.classList.toggle('is-invalid', invalid);
  group?.querySelector('.radio-card-grid')?.classList.toggle('is-invalid', invalid);
}

function clearFormErrors(form) {
  const feedback = document.getElementById(DONOR_ERROR_ID);
  if (feedback) {
    feedback.textContent = '';
    feedback.classList.remove('is-error');
  }

  [
    ...DONOR_REQUIRED_FIELDS,
    'email',
    'medula_interest',
    'consent_lgpd',
  ].forEach((name) => setFieldInvalid(form, name, false));
}

function focusFirstInvalidField(form, fields) {
  const firstField = fields
    .map((name) => form?.querySelector(`[name="${name}"]`))
    .find(Boolean);

  firstField?.focus({ preventScroll: false });
}

function showFormError(message, form, fields = []) {
  const feedback = document.getElementById(DONOR_ERROR_ID);
  if (feedback) {
    feedback.textContent = message || 'Não foi possível enviar agora. Confira os dados e tente novamente.';
    feedback.classList.add('is-error');
  }

  fields.forEach((name) => setFieldInvalid(form, name, true));
  focusFirstInvalidField(form, fields);
}

function showFormSuccess(type) {
  const form = document.getElementById(`form-${type}`);
  if (form) form.style.display = 'none';

  if (type === 'donor') {
    setDonorIntroVisible(false);
  }

  const success = document.getElementById(`success-${type}`);
  if (success) success.style.display = 'block';
}

export function buildDonorPayload(form) {
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
    created_context: {
      page: 'home',
      form: 'donor_lead',
    },
  };
}

export function validateDonorPayload(payload) {
  const missingFields = DONOR_REQUIRED_FIELDS.filter((field) => !payload[field]);

  if (payload.redome_status === 'nao' || payload.redome_status === 'nao_tenho_certeza') {
    if (!payload.medula_interest) missingFields.push('medula_interest');
  }

  if (missingFields.length) {
    return {
      valid: false,
      message: 'Preencha os campos obrigatórios para continuar.',
      fields: missingFields,
    };
  }

  if (!payload.consent_lgpd) {
    return {
      valid: false,
      message: 'Para enviar, é necessário autorizar o contato.',
      fields: ['consent_lgpd'],
    };
  }

  if (payload.contact_preference === 'email' && !payload.email) {
    return {
      valid: false,
      message: 'Informe um e-mail para usar este canal de contato.',
      fields: ['email'],
    };
  }

  return { valid: true, message: '', fields: [] };
}

export function updateDonorConditionalFields() {
  const form = getDonorForm();
  if (!form) return;

  const redomeStatus = getCheckedValue(form, 'redome_status');
  const medulaGroup = document.getElementById('medula-interest-group');
  const redomeNote = document.getElementById('redome-positive-note');
  const shouldAskMedula = redomeStatus === 'nao' || redomeStatus === 'nao_tenho_certeza';
  const shouldShowPositiveNote = redomeStatus === 'sim';

  if (medulaGroup) {
    medulaGroup.classList.toggle('is-hidden', !shouldAskMedula);
    medulaGroup.classList.toggle('is-visible', shouldAskMedula);
    medulaGroup.querySelectorAll('input[name="medula_interest"]').forEach((input) => {
      input.required = shouldAskMedula;
      if (!shouldAskMedula) input.checked = false;
    });
  }

  if (redomeNote) {
    redomeNote.classList.toggle('is-visible', shouldShowPositiveNote);
  }

  if (!shouldAskMedula) {
    setFieldInvalid(form, 'medula_interest', false);
  }
}

function updateContactPreferenceState() {
  const form = getDonorForm();
  if (!form) return;

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

function handleDonorFieldInteraction(event) {
  const form = getDonorForm();
  const fieldName = event.target?.name;
  if (!form || !fieldName) return;

  setFieldInvalid(form, fieldName, false);

  const hasActiveErrors = Boolean(document.getElementById(DONOR_ERROR_ID)?.textContent);
  if (hasActiveErrors) {
    const payload = buildDonorPayload(form);
    if (validateDonorPayload(payload).valid) clearFormErrors(form);
  }
}

function initDonorForm() {
  const form = getDonorForm();
  if (!form || form.dataset.ready === 'true') return;

  form.dataset.ready = 'true';

  form.querySelectorAll('input[name="redome_status"]').forEach((input) => {
    input.addEventListener('change', updateDonorConditionalFields);
  });

  form.querySelectorAll('input[name="contact_preference"]').forEach((input) => {
    input.addEventListener('change', updateContactPreferenceState);
  });

  form.addEventListener('input', handleDonorFieldInteraction);
  form.addEventListener('change', handleDonorFieldInteraction);

  updateDonorConditionalFields();
  updateContactPreferenceState();
}

function handleDonorSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget || getDonorForm();
  if (!form || form.dataset.submitting === 'true') return;

  clearFormErrors(form);
  updateDonorConditionalFields();
  updateContactPreferenceState();

  const payload = buildDonorPayload(form);
  const validation = validateDonorPayload(payload);

  if (!validation.valid) {
    showFormError(validation.message, form, validation.fields);
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  form.dataset.submitting = 'true';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = DONOR_LOADING_TEXT;
  }

  window.setTimeout(() => {
    try {
      if (import.meta.env?.DEV) {
        console.info('[FlaMedula] donor_leads payload', payload);
      }
      showFormSuccess('donor');
    } catch (error) {
      console.error(error);
      showFormError('Não foi possível enviar agora. Confira os dados e tente novamente.', form);
    } finally {
      form.dataset.submitting = 'false';
      resetSubmitButton(form);
    }
  }, 450);
}

export function openPanel(type) {
  if (type === 'redome') {
    document.getElementById('atualiza-redome')?.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const hubGrid = document.getElementById('hubGrid');
  if (hubGrid) hubGrid.style.display = 'none';

  ['donor', 'patient', 'support'].forEach((panel) => {
    const panelEl = document.getElementById(`panel-${panel}`);
    if (panelEl) panelEl.style.display = 'none';
  });

  const activePanel = document.getElementById(`panel-${type}`);
  if (activePanel) activePanel.style.display = 'block';

  const form = document.getElementById(`form-${type}`);
  if (form) form.style.display = 'block';

  const success = document.getElementById(`success-${type}`);
  if (success) success.style.display = 'none';

  if (type === 'donor') {
    initDonorForm();
    clearFormErrors(form);
    setDonorIntroVisible(true);
    updateDonorConditionalFields();
    updateContactPreferenceState();
    resetSubmitButton(form);
  }
}

export function closePanels() {
  ['donor', 'patient', 'support'].forEach((panel) => {
    const panelEl = document.getElementById(`panel-${panel}`);
    if (panelEl) panelEl.style.display = 'none';
  });

  const hubGrid = document.getElementById('hubGrid');
  if (hubGrid) hubGrid.style.display = 'grid';

  document.getElementById('hub-cadastro')?.scrollIntoView({ behavior: 'smooth' });
}

export function handleFormSubmit(event, type) {
  if (type === 'donor') {
    handleDonorSubmit(event);
    return;
  }

  event.preventDefault();

  const form = document.getElementById(`form-${type}`);
  if (form) form.style.display = 'none';

  const panel = document.getElementById(`panel-${type}`);
  const panelBody = panel?.querySelector('div:not(.panel-header):not(.success-msg)');
  if (panelBody) panelBody.style.display = 'none';

  const success = document.getElementById(`success-${type}`);
  if (success) success.style.display = 'block';
}

export function initHubCadastro() {
  window.openPanel = openPanel;
  window.closePanels = closePanels;
  window.handleFormSubmit = handleFormSubmit;

  initDonorForm();
}
