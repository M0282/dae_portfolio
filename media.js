// Only explicit files are rendered. Never guess sequential image filenames.
document.querySelectorAll('img').forEach((img) => {
  const initial = img.getAttribute('src');
  const decoded = decodeURI(initial);
  const candidates = [...new Set([decoded.normalize('NFC'), decoded.normalize('NFD')])]
    .filter((path) => path !== decoded);
  if (img.dataset.preview) candidates.push(img.dataset.preview);
  const recover = () => {
    const next = candidates.shift();
    if (next) { img.src = next; return; }
    img.hidden = true;
    if (!img.alt) return;
    const note = document.createElement('p');
    note.className = 'media-load-error';
    note.textContent = '画像を読み込めません。';
    img.parentElement.appendChild(note);
  };
  img.addEventListener('error', recover);
  if (img.complete && !img.naturalWidth) recover();
});
document.querySelectorAll('video').forEach((video) => {
  const showError = () => {
    const note = video.closest('figure').querySelector('.video-fallback');
    if (note) note.hidden = false;
  };
  video.addEventListener('error', showError);
  video.querySelectorAll('source').forEach((source) => source.addEventListener('error', showError));
});

// Fit the stack to its visible images so portrait photos do not leave an
// invisible wide box between the artwork and its caption.
document.querySelectorAll('.home-page .work-stack').forEach((stack) => {
  const images = [...stack.querySelectorAll('.stack-image')];
  const arrange = () => {
    if (images.some((img) => !img.naturalWidth)) return;
    const positions = [[0.18, 0.16], [0, 0], [0.32, 0.07]];
    const boxes = images.map((img, index) => {
      const ratio = img.naturalWidth / img.naturalHeight;
      const height = Math.min(1, 1.35 / ratio);
      const [x, y] = positions[index] || positions[2];
      return { img, x, y, width: height * ratio, height };
    });
    const width = Math.max(...boxes.map((box) => box.x + box.width));
    const height = Math.max(...boxes.map((box) => box.y + box.height));
    stack.style.setProperty('--stack-width', `${Math.round(width * 495)}px`);
    stack.style.setProperty('--stack-ratio', `${width} / ${height}`);
    boxes.forEach((box) => {
      Object.assign(box.img.style, {
        left: `${box.x / width * 100}%`, right: 'auto',
        top: `${box.y / height * 100}%`,
        width: `${box.width / width * 100}%`,
        height: `${box.height / height * 100}%`,
      });
    });
    stack.classList.add('stack-ready');
  };
  images.forEach((img) => img.addEventListener('load', arrange));
  arrange();
});

// A pointer over an exposed rear photograph raises THAT photograph. No click
// interception: the enclosing project link continues to open the detail page.
const canPreviewPhoto = window.matchMedia('(hover: hover) and (pointer: fine)');
document.querySelectorAll('.home-page .work-stack').forEach((stack) => {
  const images = [...stack.querySelectorAll('.stack-image')];
  const reset = () => images.forEach((image) => image.classList.remove('is-front'));
  stack.addEventListener('pointerover', (event) => {
    if (!canPreviewPhoto.matches || event.pointerType === 'touch') return;
    const image = event.target.closest('.stack-image');
    if (!image || !stack.contains(image)) return;
    images.forEach((item) => item.classList.toggle('is-front', item === image));
  });
  stack.addEventListener('pointerleave', reset);
  stack.addEventListener('pointercancel', reset);
  canPreviewPhoto.addEventListener('change', reset);
});
