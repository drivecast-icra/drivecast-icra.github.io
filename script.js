const viewer = document.querySelector("[data-case-viewer]");
const comparisonVideo = document.querySelector(".carla-feature video");
for (const button of document.querySelectorAll("[data-comparison-seek]")) {
  button.addEventListener("click", () => {
    if (!comparisonVideo) return;
    comparisonVideo.currentTime = Number(button.dataset.comparisonSeek);
    comparisonVideo.play().catch(() => { comparisonVideo.controls = true; });
  });
}

if (viewer) {
  const buttons = [...viewer.querySelectorAll("[data-case-src]")];
  const image = viewer.querySelector("[data-case-image]");
  const link = viewer.querySelector("[data-case-link]");
  const title = viewer.querySelector(".case-caption [data-case-title]");

  for (const button of buttons) {
    button.addEventListener("click", () => {
      for (const option of buttons) {
        const active = option === button;
        option.classList.toggle("is-active", active);
        option.setAttribute("aria-pressed", String(active));
      }

      image.src = button.dataset.caseSrc;
      image.alt = button.dataset.caseAlt;
      link.href = button.dataset.caseSrc;
      title.textContent = button.dataset.caseTitle;
    });
  }
}

const rolloutAnimation = document.querySelector("[data-rollout-animation]");
const rolloutToggle = document.querySelector("[data-rollout-toggle]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (rolloutAnimation && rolloutToggle && reducedMotion.matches) {
  rolloutAnimation.src = rolloutAnimation.dataset.posterSrc;
  rolloutToggle.textContent = "Play animation";
  rolloutToggle.setAttribute("aria-label", "Play reconstruction animation");
}

if (rolloutAnimation && rolloutToggle) {
  rolloutToggle.addEventListener("click", () => {
    const isPaused = rolloutAnimation.src.includes(rolloutAnimation.dataset.posterSrc);

    if (isPaused) {
      rolloutAnimation.src = `${rolloutAnimation.dataset.animationSrc}?restart=${Date.now()}`;
      rolloutToggle.textContent = "Pause animation";
      rolloutToggle.setAttribute("aria-label", "Pause reconstruction animation");
    } else {
      rolloutAnimation.src = rolloutAnimation.dataset.posterSrc;
      rolloutToggle.textContent = "Play animation";
      rolloutToggle.setAttribute("aria-label", "Play reconstruction animation");
    }
  });
}
