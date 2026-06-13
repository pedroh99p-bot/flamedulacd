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
  const cadastroButton = document.getElementById('startCadastroBtn');
  const video = document.getElementById('infoVideo');
  const wrapper = document.getElementById('vidWrapperInfo');
  const playBtn = document.getElementById('playPauseBtnInfo');
  const muteBtn = document.getElementById('muteBtnInfo');
  let hasTriedViewportPlay = false;
  let userPaused = false;
  let internalPlayAttempt = false;

  const updateAudioUi = () => {
    if (!video || !muteBtn) return;
    const hasAudio = !video.muted && video.volume > 0;
    muteBtn.textContent = hasAudio ? '\ud83d\udd0a' : '\ud83d\udd07';
  };

  const playInfoVideo = async ({ withAudio }) => {
    if (!video || !wrapper) return false;

    internalPlayAttempt = true;
    video.volume = 1;
    video.muted = !withAudio;

    try {
      await video.play();
      wrapper.classList.remove('paused');
      if (playBtn) playBtn.textContent = '\u23f8';
      updateAudioUi();
      return true;
    } catch {
      wrapper.classList.add('paused');
      if (playBtn) playBtn.textContent = '\u25b6';
      updateAudioUi();
      return false;
    } finally {
      window.setTimeout(() => {
        internalPlayAttempt = false;
      }, 0);
    }
  };

  if (cadastroButton) {
    cadastroButton.addEventListener('click', () => {
      document.getElementById('hub-cadastro')?.scrollIntoView({ behavior: 'smooth' });
    });
  }

  if (!video || !wrapper) return;

  video.addEventListener('volumechange', updateAudioUi);
  video.addEventListener('pause', () => {
    if (!internalPlayAttempt) userPaused = true;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || hasTriedViewportPlay || userPaused || entry.intersectionRatio < 0.5) return;

      hasTriedViewportPlay = true;
      playInfoVideo({ withAudio: true }).then((playedWithAudio) => {
        if (playedWithAudio) return;

        playInfoVideo({ withAudio: false });
      });
    }, { threshold: [0, 0.5, 0.75] });

    observer.observe(wrapper);
  }
}
