import { setupVideoReelsPlayer } from './videoPlayer.js';

let introPlayerInitialized = false;

function getIntroElements() {
  return {
    introOverlay: document.getElementById('intro-overlay'),
    introVideo: document.getElementById('introVideo'),
    introContainer: document.getElementById('containerIntroVideo'),
    continueButton: document.getElementById('btn-continue-site')
  };
}

export function closeIntroOverlay() {
  const { introOverlay, introVideo } = getIntroElements();
  if (!introOverlay) {
    document.body.classList.remove('is-loading');
    return;
  }

  introOverlay.style.opacity = '0';
  setTimeout(() => {
    introOverlay.style.display = 'none';
    document.body.classList.remove('is-loading');
    if (introVideo) introVideo.pause();
  }, 500);
}

function updateIntroAudioUi() {
  const { introVideo } = getIntroElements();
  const muteBtn = document.querySelector('#containerIntroVideo .reels-mute-btn');
  if (!introVideo || !muteBtn) return;

  const hasAudio = !introVideo.muted && introVideo.volume > 0;
  muteBtn.textContent = hasAudio ? '\ud83d\udd0a' : '\ud83d\udd07';
}

async function playIntro({ withAudio }) {
  const { introVideo, introContainer } = getIntroElements();
  if (!introVideo) return false;

  introVideo.volume = 1;
  introVideo.muted = !withAudio;

  try {
    await introVideo.play();
    if (introContainer) introContainer.classList.remove('paused');
    updateIntroAudioUi();
    return true;
  } catch {
    if (introContainer) introContainer.classList.add('paused');
    updateIntroAudioUi();
    return false;
  }
}

export function initIntroVideo() {
  const { continueButton, introVideo } = getIntroElements();
  if (continueButton) continueButton.addEventListener('click', closeIntroOverlay);
  if (introVideo) {
    introVideo.muted = true;
    introVideo.defaultMuted = true;
    introVideo.addEventListener('volumechange', updateIntroAudioUi);
  }
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

  const playCenter = document.querySelector('#containerIntroVideo .play-btn-center');
  const playBtn = document.querySelector('#containerIntroVideo .reels-play-btn');
  if (playCenter) playCenter.style.display = 'none';
  if (playBtn) playBtn.textContent = '\u23f8';

  if (!introPlayerInitialized) {
    setupVideoReelsPlayer('containerIntroVideo', 'introVideo', null, null, null, null, null, true);
    introPlayerInitialized = true;
  }

  playIntro({ withAudio: false }).then((playedMuted) => {
    if (playedMuted) return;

    const muteBtn = document.querySelector('#containerIntroVideo .reels-mute-btn');
    if (muteBtn) muteBtn.textContent = '\ud83d\udd07';

    if (playCenter) {
      playCenter.style.display = 'flex';
      playCenter.style.opacity = '1';
      playCenter.style.pointerEvents = 'auto';
    }
    if (playBtn) playBtn.textContent = '\u25b6';
    if (introContainer) introContainer.classList.add('paused');
    updateIntroAudioUi();
  });

  updateIntroAudioUi();
}
