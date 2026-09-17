const viewer = document.querySelector("[data-case-viewer]");
const comparisonVideo = document.querySelector(".carla-feature video");
const playbackStatus = document.querySelector("[data-playback-status]");
const speedControl = document.querySelector("[data-playback-speed]");
const viewButtons = [...document.querySelectorAll("[data-video-view]")];
let pendingPlayback = null;
let loadTimer;
const setPlaybackStatus = message => { if (playbackStatus) playbackStatus.textContent = message; };
function applyPlayback() {
  if (!comparisonVideo || comparisonVideo.readyState < 1 || !pendingPlayback) return;
  const state = pendingPlayback;
  pendingPlayback = null;
  comparisonVideo.currentTime = Math.min(state.time, Math.max(0, comparisonVideo.duration - 0.01));
  comparisonVideo.playbackRate = state.rate;
  if (state.play) comparisonVideo.play().catch(() => setPlaybackStatus("Press play to continue."));
  else comparisonVideo.pause();
}
if (comparisonVideo) {
  comparisonVideo.addEventListener("loadedmetadata", applyPlayback);
  comparisonVideo.addEventListener("loadeddata", () => { clearTimeout(loadTimer); setPlaybackStatus(""); });
  comparisonVideo.addEventListener("error", () => {
    clearTimeout(loadTimer);
    setPlaybackStatus("This view could not load. Try another view or open the full-size video.");
  });
  for (const button of viewButtons) {
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-pressed") === "true" && !comparisonVideo.error) return;
      pendingPlayback = pendingPlayback || { time: comparisonVideo.currentTime, play: !comparisonVideo.paused, rate: comparisonVideo.playbackRate };
      for (const option of viewButtons) option.setAttribute("aria-pressed", String(option === button));
      comparisonVideo.closest("figure").dataset.view = button.dataset.videoView;
      comparisonVideo.style.aspectRatio = button.dataset.videoRatio;
      comparisonVideo.setAttribute("aria-label", `${button.textContent}. Base Planner above; DriveCAST below.`);
      comparisonVideo.poster = button.dataset.videoPoster;
      document.querySelector("[data-video-original]").href = button.dataset.videoSrc;
      comparisonVideo.src = button.dataset.videoSrc;
      setPlaybackStatus("Loading view at the same playback time…");
      clearTimeout(loadTimer);
      loadTimer = setTimeout(() => setPlaybackStatus("Loading is taking longer than expected. You can open the full-size video."), 15000);
      comparisonVideo.load();
    });
  }
  speedControl?.addEventListener("change", () => {
    comparisonVideo.playbackRate = Number(speedControl.value);
    if (pendingPlayback) pendingPlayback.rate = Number(speedControl.value);
  });
}
for (const button of document.querySelectorAll("[data-comparison-seek]")) {
  button.addEventListener("click", () => {
    if (!comparisonVideo) return;
    pendingPlayback = { time: Number(button.dataset.comparisonSeek), play: true, rate: Number(speedControl?.value || 1) };
    if (comparisonVideo.readyState >= 1) {
      applyPlayback();
    } else {
      comparisonVideo.load();
    }
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

// Preserve normal new-tab links when the browser cannot provide a modal viewer.
const figureDialog = document.querySelector(".figure-dialog");
if (figureDialog && typeof figureDialog.showModal === "function") {
  let figureTrigger = null;
  const expanded = figureDialog.querySelector("[data-figure-expanded]");
  const caption = figureDialog.querySelector("[data-figure-caption]");
  const original = figureDialog.querySelector("[data-figure-original]");
  for (const link of document.querySelectorAll(".architecture-card, .case-stage, .planning-feature, .result-gallery a")) {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      figureTrigger = link;
      const source = link.querySelector("img");
      expanded.src = link.href;
      expanded.alt = source.alt;
      caption.textContent = source.alt;
      original.href = link.href;
      figureDialog.showModal();
      document.body.classList.add("figure-open");
    });
  }
  figureDialog.querySelector("[data-figure-close]").addEventListener("click", () => figureDialog.close());
  figureDialog.addEventListener("click", (event) => {
    if (event.target !== figureDialog) return;
    const rect = figureDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) figureDialog.close();
  });
  figureDialog.addEventListener("close", () => {
    document.body.classList.remove("figure-open");
    figureTrigger?.focus({ preventScroll: true });
  });
}

const sectionLinks = [...document.querySelectorAll("nav a")];
if ("IntersectionObserver" in window) {
  const visibleSections = new Set();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleSections.add(entry.target.id);
      else visibleSections.delete(entry.target.id);
    }
    const current = sectionLinks.find(link => visibleSections.has(link.hash.slice(1)));
    for (const link of sectionLinks) {
      if (link === current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }, { rootMargin: "-120px 0px -40% 0px", threshold: 0 });
  for (const link of sectionLinks) {
    const section = document.querySelector(link.hash);
    if (section) observer.observe(section);
  }
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
