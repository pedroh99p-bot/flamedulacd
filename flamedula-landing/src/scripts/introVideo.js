import { setupVideoReelsPlayer } from './videoPlayer.js';

let introPlayerInitialized = false;

function getIntroElements() {
  return {
    introOverlay: document.getElementById('intro-overlay'),
    introVideo: document.getElementById('introVideo'),
    introContainer: document.getElementById('containerIntroVideo'),
    enterButton: document.getElementById('btn-enter-site')
  };
}

function markIntroSeen() {
  try {
    sessionStorage.setItem('flamedula_intro_seen', 'true');
  } catch (error) {
    console.warn('Nao foi possivel salvar o estado do video de entrada.', error);
  }
}

export function hasSeenIntro() {
  try {
    return sessionStorage.getItem('flamedula_intro_seen');
  } catch (error) {
    return false;
  }
}

export function closeIntroOverlay() {
  const { introOverlay, introVideo } = getIntroElements();
  if (!introOverlay) {
    document.body.classList.remove('is-loading');
    markIntroSeen();
    return;
  }

  introOverlay.style.opacity = '0';
  setTimeout(() => {
    introOverlay.style.display = 'none';
    document.body.classList.remove('is-loading');
    markIntroSeen();
    if (introVideo) introVideo.pause();
  }, 500);
}

export function initIntroVideo() {
  const { enterButton } = getIntroElements();
  if (enterButton) enterButton.addEventListener('click', closeIntroOverlay);
}

export function showIntroVideoOverlay() {
  const { introOverlay, introVideo, introContainer } = getIntroElements();

  if (!introOverlay) {
    document.body.classList.remove('is-loading');
    return;
  }

  introOverlay.style.display = 'flex';
  void introOverlay.offsetWidth;
  introOverlay.classList.add('active-slide-up');

  if (!introVideo) return;

  introVideo.muted = false;
  const playPromise = introVideo.play();

  if (playPromise !== undefined) {
    playPromise.catch((error) => {
      console.log('Autoplay com audio bloqueado. Tentando fallback mutado...', error);
      introVideo.muted = true;
      const muteBtn = document.querySelector('#containerIntroVideo .reels-mute-btn');
      if (muteBtn) muteBtn.textContent = '\ud83d\udd07';

      introVideo.play().catch(() => {
        const playCenter = document.querySelector('#containerIntroVideo .play-btn-center');
        const playBtn = document.querySelector('#containerIntroVideo .reels-play-btn');
        if (playCenter) {
          playCenter.style.display = 'flex';
          playCenter.style.opacity = '1';
          playCenter.style.pointerEvents = 'auto';
        }
        if (playBtn) playBtn.textContent = '\u25b6';
        if (introContainer) introContainer.classList.add('paused');
      });
    });
  }

  const playCenter = document.querySelector('#containerIntroVideo .play-btn-center');
  const playBtn = document.querySelector('#containerIntroVideo .reels-play-btn');
  if (playCenter) playCenter.style.display = 'none';
  if (playBtn) playBtn.textContent = '\u23f8';

  if (!introPlayerInitialized) {
    setupVideoReelsPlayer('containerIntroVideo', 'introVideo', null, null, null, null, null, true);
    introPlayerInitialized = true;
  }
}
