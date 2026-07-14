export function initPreloader() {
  const preloader = document.getElementById('flamedula-preloader');
  document.body.classList.remove('is-loading');
  if (!preloader) return;

  window.setTimeout(() => {
    preloader.classList.add('preloader-hidden');
    window.setTimeout(() => {
      preloader.hidden = true;
      preloader.style.display = 'none';
    }, 250);
  }, 200);
}
