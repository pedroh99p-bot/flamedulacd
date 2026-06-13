export function setupVideoReelsPlayer(wrapperId, videoId, centerBtnId, playBtnId, muteBtnId, progressContId, progressFillId, isIntro = false) {
  const wrapper = document.getElementById(wrapperId);
  const video = document.getElementById(videoId);
  if (!wrapper || !video) return;

  let centerBtn;
  let playBtn;
  let muteBtn;
  let progCont;
  let progFill;

  if (!isIntro) {
    centerBtn = document.getElementById(centerBtnId);
    playBtn = document.getElementById(playBtnId);
    muteBtn = document.getElementById(muteBtnId);
    progCont = document.getElementById(progressContId);
    progFill = document.getElementById(progressFillId);
  } else {
    playBtn = wrapper.querySelector('.reels-play-btn');
    muteBtn = wrapper.querySelector('.reels-mute-btn');
    progCont = wrapper.querySelector('.reels-progress-container');
    progFill = wrapper.querySelector('.reels-progress-filled');
    centerBtn = wrapper.querySelector('.play-btn-center');
  }

  function playWithUi() {
    try {
      const playAttempt = video.play();
      Promise.resolve(playAttempt)
        .then(() => {
          wrapper.classList.remove('paused');
          if (playBtn) playBtn.textContent = '\u23f8';
        })
        .catch(() => {
          wrapper.classList.add('paused');
          if (playBtn) playBtn.textContent = '\u25b6';
        });
    } catch {
      wrapper.classList.add('paused');
      if (playBtn) playBtn.textContent = '\u25b6';
    }
  }

  function togglePlay() {
    if (video.paused) {
      playWithUi();
    } else {
      video.pause();
      wrapper.classList.add('paused');
      if (playBtn) playBtn.textContent = '\u25b6';
    }
  }

  function toggleMute() {
    video.muted = !video.muted;
    if (muteBtn) muteBtn.textContent = video.muted ? '\ud83d\udd07' : '\ud83d\udd0a';
  }

  video.addEventListener('timeupdate', () => {
    if (!video.duration || !progFill) return;
    progFill.style.width = `${(video.currentTime / video.duration) * 100}%`;
  });

  if (progCont) {
    progCont.addEventListener('click', (event) => {
      if (!video.duration) return;
      const rect = progCont.getBoundingClientRect();
      video.currentTime = ((event.clientX - rect.left) / rect.width) * video.duration;
    });
  }

  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (centerBtn) centerBtn.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);
  if (muteBtn) muteBtn.addEventListener('click', toggleMute);

  video.addEventListener('ended', () => {
    wrapper.classList.add('paused');
    if (playBtn) playBtn.textContent = '\u25b6';
    if (progFill) progFill.style.width = '100%';
  });
}

export function initInfoVideoCtas() {
  const watchButton = document.getElementById('watchInfoVideoBtn');
  const cadastroButton = document.getElementById('startCadastroBtn');
  const faqButton = document.getElementById('videoFaqBtn');
  const video = document.getElementById('infoVideo');
  const wrapper = document.getElementById('vidWrapperInfo');

  if (watchButton && video && wrapper) {
    watchButton.addEventListener('click', () => {
      video.muted = false;
      try {
        Promise.resolve(video.play())
          .then(() => {
            wrapper.classList.remove('paused');
            const playBtn = document.getElementById('playPauseBtnInfo');
            if (playBtn) playBtn.textContent = '\u23f8';
          })
          .catch(() => {
            wrapper.classList.add('paused');
          });
      } catch {
        wrapper.classList.add('paused');
      }
    });
  }

  if (cadastroButton) {
    cadastroButton.addEventListener('click', () => {
      document.getElementById('hub-cadastro')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (faqButton) {
    faqButton.addEventListener('click', () => {
      document.getElementById('educacional')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
}
