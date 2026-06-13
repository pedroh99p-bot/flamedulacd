import { setupVideoReelsPlayer } from './videoPlayer.js';

let introPlayerInitialized = false;

function getIntroElements() {
  return {
    introOverlay: document.getElementById('intro-overlay'),
    introVideo: document.getElementById('introVideo'),
    introContainer: document.getElementById('containerIntroVideo'),
    enterButton: document.getElementById('btn-enter-site'),
    skipButton: document.getElementById('btn-skip-intro'),
    watchWithAudioButton: document.getElementById('btn-watch-with-audio'),
    audioToggleButton: document.getElementById('btn-toggle-intro-audio')
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

function updateIntroAudioUi() {
  const { introVideo, watchWithAudioButton, audioToggleButton } = getIntroElements();
  if (!introVideo) return;

  const hasAudio = !introVideo.muted && introVideo.volume > 0;

  if (watchWithAudioButton) {
    watchWithAudioButton.textContent = hasAudio ? 'Assistindo com áudio' : 'Assistir com áudio';
  }

  if (audioToggleButton) {
    audioToggleButton.hidden = false;
    audioToggleButton.textContent = hasAudio ? 'Silenciar' : 'Ativar áudio';
    audioToggleButton.classList.toggle('is-audio-on', hasAudio);
  }
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

async function playIntroWithAudio() {
  const success = await playIntro({ withAudio: true });
  if (!success) {
    const { audioToggleButton } = getIntroElements();
    if (audioToggleButton) {
      audioToggleButton.hidden = false;
      audioToggleButton.textContent = 'Ativar áudio';
    }
  }
}

async function toggleIntroAudio() {
  const { introVideo } = getIntroElements();
  if (!introVideo) return;

  if (introVideo.muted || introVideo.volume === 0) {
    await playIntroWithAudio();
  } else {
    introVideo.muted = true;
    updateIntroAudioUi();
  }
}

export function initIntroVideo() {
  const { enterButton, skipButton, watchWithAudioButton, audioToggleButton, introVideo } = getIntroElements();
  if (enterButton) enterButton.addEventListener('click', closeIntroOverlay);
  if (skipButton) skipButton.addEventListener('click', closeIntroOverlay);
  if (watchWithAudioButton) watchWithAudioButton.addEventListener('click', playIntroWithAudio);
  if (audioToggleButton) audioToggleButton.addEventListener('click', toggleIntroAudio);
  if (introVideo) introVideo.addEventListener('volumechange', updateIntroAudioUi);
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

  playIntro({ withAudio: true }).then((playedWithAudio) => {
    if (playedWithAudio) return;

    introVideo.muted = true;
    const muteBtn = document.querySelector('#containerIntroVideo .reels-mute-btn');
    if (muteBtn) muteBtn.textContent = '\ud83d\udd07';

    playIntro({ withAudio: false }).then((playedMuted) => {
      if (playedMuted) return;

      if (playCenter) {
        playCenter.style.display = 'flex';
        playCenter.style.opacity = '1';
        playCenter.style.pointerEvents = 'auto';
      }
      if (playBtn) playBtn.textContent = '\u25b6';
      if (introContainer) introContainer.classList.add('paused');
      updateIntroAudioUi();
    });
  });

  updateIntroAudioUi();
}
