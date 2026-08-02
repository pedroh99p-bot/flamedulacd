import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/animations.css';
import './styles/responsive.css';
import './styles/dedeco-chat.css';

import { initPreloader } from './scripts/preloader.js';
import { initIntroVideo } from './scripts/introVideo.js';
import { initHubCadastro } from './scripts/hubCadastro.js';
import { initInfoVideoCtas, setupVideoReelsPlayer } from './scripts/videoPlayer.js';
import { renderAmbassadors } from './scripts/carousels.js';
import { setupScrollReveal } from './scripts/counters.js';
import { initFaq } from './scripts/faq.js';
import { initLandingPublicContent } from './scripts/publicContent.js';
import { initNavbarMenu } from './scripts/navbarMenu.js';
import { initRedomeSection } from './scripts/redome.js';
import { initSmoothScroll } from './scripts/smoothScroll.js';
import { initDedecoChat } from './scripts/dedecoChat.js';

initHubCadastro();
initFaq();
initIntroVideo();
initPreloader();
initNavbarMenu();
initRedomeSection();
initSmoothScroll();
initDedecoChat();

document.addEventListener('DOMContentLoaded', () => {
  initLandingPublicContent();
  renderAmbassadors();
  setupScrollReveal();
  setupVideoReelsPlayer('vidWrapperInfo', 'infoVideo', 'playBtnCenterInfo', 'playPauseBtnInfo', 'muteBtnInfo', 'vidProgressContainerInfo', 'vidProgressFilledInfo');
  initInfoVideoCtas();
});
