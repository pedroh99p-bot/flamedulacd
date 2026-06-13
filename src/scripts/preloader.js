import { showIntroVideoOverlay } from './introVideo.js';

export function initPreloader() {
  window.addEventListener('load', () => {
    const preloader = document.getElementById('flamedula-preloader');

    setTimeout(() => {
      if (preloader) preloader.classList.add('preloader-hidden');

      setTimeout(() => {
        if (preloader) preloader.style.display = 'none';

        showIntroVideoOverlay();
      }, 600);
    }, 2200);
  });
}
