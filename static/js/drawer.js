document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('overlay');

  function toggleDrawer() {
    drawer.classList.toggle('open');
    overlay.classList.toggle('show');
  }

  hamburger.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', toggleDrawer);
});
