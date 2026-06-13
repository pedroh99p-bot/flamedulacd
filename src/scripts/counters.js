const metricsData = [
  { label: 'Doadores cadastrados', value: 328, suffix: 'pessoas adicionadas \u00e0 rede' },
  { label: 'Interessados em medula', value: 146, suffix: 'querem receber orienta\u00e7\u00e3o' },
  { label: 'Atualiza\u00e7\u00f5es REDOME', value: 89, suffix: 'pessoas orientadas' },
  { label: 'Casos recebidos', value: 24, suffix: 'an\u00e1lise inicial' }
];

export function renderMetrics() {
  const grid = document.getElementById('metricsGrid');
  if (!grid) return;

  metricsData.forEach((metric) => {
    grid.innerHTML += `<div class="metric-card-premium"><div class="metric-number" data-target="${metric.value}">0</div><h4 style="font-size:1rem; font-weight:600; color:white; margin-bottom:4px;">${metric.label}</h4><span style="font-size:0.8rem; color:rgba(255,255,255,0.6); line-height:1.2;">${metric.suffix}</span></div>`;
  });
}

export function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        if (entry.target.querySelector('.metric-number')) animateMetrics(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-up').forEach((element) => observer.observe(element));
  setupEducationalTimelineProgress();
}

function setupEducationalTimelineProgress() {
  const timeline = document.querySelector('.edu-timeline');
  if (!timeline) return;

  const updateProgress = () => {
    const rect = timeline.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const start = viewportHeight * 0.82;
    const end = viewportHeight * 0.22;
    const rawProgress = (start - rect.top) / (start - end + rect.height * 0.55);
    const progress = Math.min(Math.max(rawProgress, 0), 1);

    timeline.style.setProperty('--timeline-progress', progress.toFixed(3));
  };

  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

function animateMetrics(container) {
  container.querySelectorAll('.metric-number').forEach((element) => {
    if (element.classList.contains('counted')) return;

    element.classList.add('counted');
    const target = +element.getAttribute('data-target');
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      element.innerText = Math.floor(easeOutQuart * target);

      if (progress < 1) requestAnimationFrame(update);
      else element.innerText = target;
    }

    requestAnimationFrame(update);
  });
}
