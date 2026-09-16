const viewer = document.querySelector("[data-case-viewer]");

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

const rolloutVideo = document.querySelector("[data-rollout-video]");
const rolloutToggle = document.querySelector("[data-rollout-toggle]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (rolloutVideo && reducedMotion.matches) {
  rolloutVideo.autoplay = false;
  rolloutVideo.pause();
  rolloutToggle.textContent = "Play animation";
  rolloutToggle.setAttribute("aria-label", "Play reconstruction animation");
}

if (rolloutVideo && rolloutToggle) {
  rolloutToggle.addEventListener("click", () => {
    if (rolloutVideo.paused) {
      rolloutVideo.play();
      rolloutToggle.textContent = "Pause animation";
      rolloutToggle.setAttribute("aria-label", "Pause reconstruction animation");
    } else {
      rolloutVideo.pause();
      rolloutToggle.textContent = "Play animation";
      rolloutToggle.setAttribute("aria-label", "Play reconstruction animation");
    }
  });
}
