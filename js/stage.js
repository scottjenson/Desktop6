/* Letterbox scaling for #stage.
   Demo 2 renders a fixed 3440×1440 desktop and CSS-scales it to fit the viewport,
   centered, with black bars top/bottom. Demo 3 reproduces that EXACTLY so the two
   demos line up across a tab switch: everything inside #stage is authored in
   desktop-px, and we scale the whole stage by min(viewportW/3440, viewportH/1440). */

const DESKTOP_W = 3440;
const DESKTOP_H = 1440;

function fitStage() {
  const scale = Math.min(window.innerWidth / DESKTOP_W, window.innerHeight / DESKTOP_H);
  document.documentElement.style.setProperty('--stage-scale', scale);
}

fitStage();
window.addEventListener('resize', fitStage);
