export function setSubmitting(button, submitting, submittingText = 'Enviando...') {
  if (!button) return;
  if (submitting) {
    button.dataset.defaultText = button.textContent;
    button.textContent = submittingText;
    button.disabled = true;
    return;
  }

  button.disabled = false;
  if (button.dataset.defaultText) {
    button.textContent = button.dataset.defaultText;
  }
}

export function applyFieldErrors(container, fieldErrors = {}) {
  Object.entries(fieldErrors).forEach(([name, message]) => {
    const field = container.querySelector(`[name="${name}"]`);
    if (!field) return;

    field.setAttribute('aria-invalid', 'true');
    const target = field.closest('label, fieldset, .form-group') || field;
    target.classList.add('is-invalid');
    if (message) {
      field.setAttribute('title', message);
    }
  });
}
