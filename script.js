const works = window.PORTFOLIO_PROJECTS;
const AUTO_MS = 7000;
const HOVER_SWITCH_MS = 700;

const stage = document.querySelector('#stage');
const viewport = document.querySelector('#viewport');
const leftZone = document.querySelector('#leftZone');
const rightZone = document.querySelector('#rightZone');
const leftLabel = document.querySelector('#leftLabel');
const rightLabel = document.querySelector('#rightLabel');
const kicker = document.querySelector('#kicker');
const title = document.querySelector('#title');
const desc = document.querySelector('#desc');
const currentNo = document.querySelector('#currentNo');
const dots = document.querySelector('#dots');
const progressFill = document.querySelector('#progressFill');
const floatingContact = document.querySelector('#floatingContact');
const hero = document.querySelector('.hero');

let activeIndex = 0;
let autoTimer = null;
let hoverTimer = null;
let switching = false;

/* Adaptive header: new entries in works are analyzed automatically. */
const header = document.querySelector('.topbar');
const headerImageCache = new Map();
let headerRequest = 0;
let headerResizeTimer;

function loadHeaderImage(url) {
  if (!headerImageCache.has(url)) {
    const pending = new Promise((resolve) => {
      const img = new Image();
      let settled = false;
      let timeout;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        img.onload = img.onerror = null;
        resolve(value);
      };
      // HTTP images must permit canvas access; file:// has a visual fallback.
      if (/^https?:/.test(url)) img.crossOrigin = 'anonymous';
      img.onload = () => finish(img);
      img.onerror = () => finish(null);
      timeout = setTimeout(() => finish(null), 6000);
      img.src = url;
    });
    headerImageCache.set(url, pending);
  }
  return headerImageCache.get(url);
}

function headerForeground(rgb) {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? '#000' : '#fff';
}

function sampleHeaderColor(img) {
  if (!img.naturalWidth || !img.naturalHeight) throw new Error('Empty image');
  const slide = viewport.querySelector('.slide');
  const width = slide ? slide.offsetWidth : stage.clientWidth;
  const height = stage.clientHeight;
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  if (!(scale > 0)) throw new Error('Empty viewport');
  // Match the centered cover crop, then sample the visible upper 18%.
  const cropWidth = Math.min(img.naturalWidth, width / scale);
  const cropHeight = Math.min(img.naturalHeight, height / scale);
  const sx = (img.naturalWidth - cropWidth) / 2;
  const sy = (img.naturalHeight - cropHeight) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 16;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas unavailable');
  // Composite transparent artwork onto the same dark panel as the slider.
  context.fillStyle = '#111';
  context.fillRect(0, 0, 64, 16);
  context.drawImage(img, sx, sy, cropWidth, cropHeight * 0.18, 0, 0, 64, 16);
  const pixels = context.getImageData(0, 0, 64, 16).data;
  const rgb = [0, 0, 0];
  for (let i = 0; i < pixels.length; i += 4) {
    rgb[0] += pixels[i];
    rgb[1] += pixels[i + 1];
    rgb[2] += pixels[i + 2];
  }
  return rgb.map((sum) => Math.round(sum / (pixels.length / 4)));
}

async function updateAdaptiveHeader(source) {
  if (!header) return;
  const request = ++headerRequest;
  let url;
  try {
    url = new URL(source, document.baseURI).href;
    const img = await loadHeaderImage(url);
    if (request !== headerRequest) return;
    if (!img) throw new Error('Image unavailable for sampling');
    const rgb = sampleHeaderColor(img);
    header.style.setProperty('--header-bg', `rgb(${rgb.join(', ')})`);
    header.style.setProperty('--header-fg', headerForeground(rgb));
    header.style.setProperty('--header-image', 'none');
  } catch (_) {
    if (request !== headerRequest) return;
    // Canvas can be blocked on file:// or third-party hosts. Still adapt
    // visually using the image with a dark overlay and readable white type.
    header.style.setProperty('--header-bg', '#202020');
    header.style.setProperty('--header-fg', '#fff');
    header.style.setProperty('--header-image', url
      ? `linear-gradient(rgba(0,0,0,.68), rgba(0,0,0,.68)), url(${JSON.stringify(url)})`
      : 'none');
  }
}

window.addEventListener('resize', () => {
  clearTimeout(headerResizeTimer);
  headerResizeTimer = setTimeout(() => updateAdaptiveHeader(works[activeIndex].image), 160);
});

function wrap(i) { return (i + works.length) % works.length; }

function build() {
  viewport.innerHTML = '';
  dots.innerHTML = '';

  works.forEach((work, i) => {
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.dataset.index = i;
    slide.setAttribute('aria-hidden', i === activeIndex ? 'false' : 'true');
    const bg = document.createElement('div'); bg.className = 'slide-bg'; slide.appendChild(bg);
    viewport.appendChild(slide);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'dot';
    dot.setAttribute('aria-label', `${i + 1}번 작품 보기`);
    dot.addEventListener('click', () => switchTo(i));
    dots.appendChild(dot);
  });

  applyState();
}

function applyState() {
  const prev = wrap(activeIndex - 1);
  const next = wrap(activeIndex + 1);

  document.querySelectorAll('.slide').forEach((slide) => {
    const i = Number(slide.dataset.index);
    slide.dataset.pos = i === activeIndex ? 'center' : i === prev ? 'left' : i === next ? 'right' : 'far';
    slide.setAttribute('aria-hidden', i === activeIndex ? 'false' : 'true');
    if (i === activeIndex || i === prev || i === next) slide.firstElementChild.style.backgroundImage = `url(${JSON.stringify(works[i].image)})`;
  });

  const work = works[activeIndex];
  updateAdaptiveHeader(work.image);
  kicker.textContent = work.kicker;
  title.innerHTML = work.titleHtml;
  document.querySelector('#projectLink').href = work.url;
  desc.textContent = work.desc;
  currentNo.textContent = String(activeIndex + 1).padStart(2, '0');
  leftLabel.textContent = works[prev].title;
  rightLabel.textContent = works[next].title;
  [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
}

function switchTo(index) {
  if (switching || index === activeIndex) {
    clearPeek();
    restartAuto();
    return;
  }
  switching = true;
  clearHoverTimer();
  activeIndex = wrap(index);
  applyState();
  clearPeek();
  setTimeout(() => { switching = false; }, 700);
  restartAuto();
}

function switchRelative(direction) { switchTo(activeIndex + direction); }
function clearPeek() { stage.classList.remove('peek-left', 'peek-right'); }
function clearHoverTimer() { clearTimeout(hoverTimer); hoverTimer = null; }

function startPeek(direction) {
  if (switching) return;
  clearHoverTimer();
  pauseAuto();
  stage.classList.toggle('peek-left', direction < 0);
  stage.classList.toggle('peek-right', direction > 0);
  hoverTimer = setTimeout(() => switchRelative(direction), HOVER_SWITCH_MS);
}

function leavePeek() {
  clearHoverTimer();
  clearPeek();
  restartAuto();
}

function resetProgress() {
  progressFill.classList.remove('run');
  progressFill.style.setProperty('--auto-ms', `${AUTO_MS}ms`);
  void progressFill.offsetWidth;
  progressFill.classList.add('run');
}

function pauseAuto() {
  clearTimeout(autoTimer);
  progressFill.classList.remove('run');
}

function restartAuto() {
  pauseAuto();
  if (document.hidden || window.scrollY > hero.offsetHeight) return;
  resetProgress();
  autoTimer = setTimeout(() => switchRelative(1), AUTO_MS);
}

leftZone.addEventListener('mouseenter', () => startPeek(-1));
rightZone.addEventListener('mouseenter', () => startPeek(1));
leftZone.addEventListener('mouseleave', leavePeek);
rightZone.addEventListener('mouseleave', leavePeek);
leftZone.addEventListener('click', () => switchRelative(-1));
rightZone.addEventListener('click', () => switchRelative(1));
document.querySelector('#prevBtn').addEventListener('click', () => switchRelative(-1));
document.querySelector('#nextBtn').addEventListener('click', () => switchRelative(1));

// The unobstructed slide center opens the active project.
stage.addEventListener('click', (event) => {
  if (!event.target.closest('a, button, .bottom-ui')) window.location.href = works[activeIndex].url;
});
stage.addEventListener('dragstart', (e) => e.preventDefault());

/* 초기에는 HERO 오른쪽 아래, 스크롤하면 오른쪽 위에 붙어서 따라옴 */
function updateFloatingContact() {
  if (!floatingContact || window.innerWidth <= 700) return;
  const heroHeight = hero.offsetHeight;
  const elementHeight = floatingContact.offsetHeight || 126;
  // 첫 화면에서는 우측 하단 슬라이드 화살표/도트보다 충분히 위에 배치한다.
  // bottom-ui의 버튼 영역과 약 28px 정도 간격이 생기도록 여유를 둔다.
  const firstScreenBottomGap = 96;
  const startTop = Math.max(160, window.innerHeight - elementHeight - firstScreenBottomGap);
  const dockTop = 104;
  const travel = Math.max(1, startTop - dockTop);
  const progress = Math.min(1, window.scrollY / travel);
  const top = startTop - (startTop - dockTop) * progress;
  floatingContact.style.top = `${top}px`;

  // 밝은 섹션에서도 보이도록 difference를 사용하지만, footer 근처에서는 살짝 투명하게.
  const footer = document.querySelector('#contact');
  if (footer) {
    const footerRect = footer.getBoundingClientRect();
    floatingContact.style.opacity = footerRect.top < 260 ? '0.34' : '1';
  }
}

window.addEventListener('scroll', updateFloatingContact, { passive: true });
window.addEventListener('resize', updateFloatingContact);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseAuto();
  else restartAuto();
});

window.addEventListener('keydown', (e) => {
  if (window.scrollY > hero.offsetHeight || /INPUT|TEXTAREA|VIDEO|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowLeft') switchRelative(-1);
  if (e.key === 'ArrowRight') switchRelative(1);
});

build();
restartAuto();
updateFloatingContact();

/* HERO 하단 그라데이션: 스크롤 위치에 직접 연동되어 위로 올리면 복원된다. */
(() => {
  if (!hero) return;
  let framePending = false;
  let lastOpacity = '';

  function updateHeroFade() {
    framePending = false;
    const rect = hero.getBoundingClientRect();
    // 화면 높이의 약 42%를 내리면 Works 배경색과 완전히 이어진다.
    const fadeDistance = Math.max(1, Math.min(rect.height * 0.42, window.innerHeight * 0.42));
    const progress = Math.max(0, Math.min(1, -rect.top / fadeDistance));
    const opacity = (1 - Math.pow(1 - progress, 2)).toFixed(4);
    if (opacity !== lastOpacity) {
      hero.style.setProperty('--hero-fade-opacity', opacity);
      lastOpacity = opacity;
    }
  }

  function scheduleHeroFade() {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(updateHeroFade);
  }

  window.addEventListener('scroll', scheduleHeroFade, { passive: true });
  window.addEventListener('resize', scheduleHeroFade);
  window.addEventListener('pageshow', scheduleHeroFade);
  window.addEventListener('load', scheduleHeroFade);
  updateHeroFade();
})();

// Stop the slideshow while reading projects or watching videos below it.
let heroVisible = true;
window.addEventListener('scroll', () => {
  const visible = window.scrollY < hero.offsetHeight;
  if (visible !== heroVisible) { heroVisible = visible; visible ? restartAuto() : pauseAuto(); }
}, { passive: true });

// Pause rotation while the project link has keyboard focus.
document.querySelector('#projectLink').addEventListener('focus', pauseAuto);
document.querySelector('#projectLink').addEventListener('blur', restartAuto);
