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
}
