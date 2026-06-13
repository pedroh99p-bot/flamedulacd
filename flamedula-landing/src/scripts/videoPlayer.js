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

  function togglePlay() {
    if (video.paused) {
      video.play();
      wrapper.classList.remove('paused');
      if (playBtn) playBtn.textContent = '\u23f8';
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
