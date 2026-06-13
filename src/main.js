import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/animations.css';
import './styles/responsive.css';

import { initPreloader } from './scripts/preloader.js';
import { initIntroVideo } from './scripts/introVideo.js';
import { initHubCadastro } from './scripts/hubCadastro.js';
import { initInfoVideoCtas, setupVideoReelsPlayer } from './scripts/videoPlayer.js';
import { initHeroCarousel, renderActions, renderAmbassadors, renderTeam, renderTestimonials } from './scripts/carousels.js';
import { renderMetrics, setupScrollReveal } from './scripts/counters.js';
import { initFaq } from './scripts/faq.js';
import { initSmoothScroll } from './scripts/smoothScroll.js';

initHubCadastro();
initFaq();
initIntroVideo();
initPreloader();
initSmoothScroll();

document.addEventListener('DOMContentLoaded', () => {
  initHeroCarousel();
  renderMetrics();
  renderTeam();
  renderAmbassadors();
  renderActions();
  renderTestimonials();
  setupScrollReveal();
  setupVideoReelsPlayer('vidWrapperInfo', 'infoVideo', null, 'playPauseBtnInfo', 'muteBtnInfo', 'vidProgressContainerInfo', 'vidProgressFilledInfo');
  initInfoVideoCtas();
});
