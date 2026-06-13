import { hasSeenIntro, showIntroVideoOverlay } from './introVideo.js';

export function initPreloader() {
  window.addEventListener('load', () => {
    const preloader = document.getElementById('flamedula-preloader');

    setTimeout(() => {
      if (preloader) preloader.classList.add('preloader-hidden');

      setTimeout(() => {
        if (preloader) preloader.style.display = 'none';

        if (!hasSeenIntro()) {
          showIntroVideoOverlay();
        } else {
          document.body.classList.remove('is-loading');
        }
      }, 600);
    }, 2200);
  });
}
