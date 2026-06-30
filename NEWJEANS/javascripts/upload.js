// clear local storage
window.addEventListener('DOMContentLoaded', () => localStorage.removeItem('photoStrip'));

const WIDTH = 1176;
const HEIGHT = 1470;
const FRAMES = 3;
const FRAME_HEIGHT = HEIGHT / FRAMES;

const FRAME_OPTIONS = [
  { name: 'brown', src: 'Assets--/frames/brown.png' },
  { name: 'yellow', src: 'Assets--/frames/yellow.png' },
  { name: 'mint', src: 'Assets--/frames/mintblue.png' },
  { name: 'Pink', src: 'Assets--/frames/pink.png' }
];

const STICKER_OPTIONS = [
  { name: 'Dessert 1', src: 'Assets--/stickers/desserts1.png' },
  { name: 'Dessert 2', src: 'Assets--/stickers/desserts3.png' },
  { name: 'Dessert 3', src: 'Assets--/stickers/desserts3choco.png' },
  { name: 'Cat', src: 'Assets--/stickers/excited%20cat.png' }
];

const elements = {
  canvas: document.getElementById('finalCanvas'),
  ctx: document.getElementById('finalCanvas').getContext('2d'),
  uploadInput: document.getElementById('uploadPhotoInput'),
  uploadBtn: document.getElementById('uploadPhoto'),
  readyBtn: document.getElementById('readyButton'),
  downloadBtn: document.getElementById('downloadBtn'),
  stageInfo: document.getElementById('stageInfo'),
  frameChooser: document.getElementById('frameChooser'),
  frameOverlay: document.getElementById('frameOverlay'),
  decoratePanel: document.getElementById('decoratePanel'),
  stickerPalette: document.getElementById('stickerPalette'),
  clearStickers: document.getElementById('clearStickers')
};

let currentFrame = 0;
let selectedFrameIndex = 0;
let selectedSticker = null;
let decorationMode = false;
let decorations = [];
let baseDataUrl = '';
const baseImage = new Image();

const updateStage = () => {
  if (!elements.stageInfo) return;
  if (currentFrame < FRAMES) {
    elements.stageInfo.textContent = `Upload image ${currentFrame + 1} of ${FRAMES} to fill the strip.`;
  } else if (!decorationMode) {
    elements.stageInfo.textContent = 'Your photobooth strip is ready. Press Decorate to add stickers.';
  } else {
    elements.stageInfo.textContent = 'Choose a sticker, then click the strip to place it.';
  }
};

const buildFrameChooser = () => {
  if (!elements.frameChooser) return;
  elements.frameChooser.innerHTML = FRAME_OPTIONS.map((frame, index) =>
    `<img src="${frame.src}" class="frame-option" data-index="${index}" title="${frame.name}" alt="${frame.name}" />`
  ).join('');
  Array.from(elements.frameChooser.children).forEach(el => {
    el.addEventListener('click', () => selectFrame(Number(el.dataset.index)));
  });
  selectFrame(0);
};

const selectFrame = index => {
  selectedFrameIndex = index;
  if (elements.frameOverlay) elements.frameOverlay.src = FRAME_OPTIONS[index].src;
  Array.from(elements.frameChooser.children).forEach((el, idx) => {
    el.classList.toggle('selected', idx === index);
  });
};

const buildStickerPalette = () => {
  if (!elements.stickerPalette) return;
  elements.stickerPalette.innerHTML = STICKER_OPTIONS.map((sticker, index) =>
    `<img src="${sticker.src}" class="sticker-thumb" data-index="${index}" title="${sticker.name}" alt="${sticker.name}" />`
  ).join('');
  Array.from(elements.stickerPalette.children).forEach(el => {
    el.addEventListener('click', () => {
      selectedSticker = STICKER_OPTIONS[Number(el.dataset.index)];
      Array.from(elements.stickerPalette.children).forEach(child => child.classList.toggle('selected', child === el));
    });
  });
};

const drawBaseAndDecorations = () => {
  if (!baseDataUrl || !elements.ctx) return;
  baseImage.onload = () => {
    elements.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    elements.ctx.drawImage(baseImage, 0, 0, WIDTH, HEIGHT);
    decorations.forEach(item => drawStickerObject(item));
  };
  if (baseImage.complete) {
    elements.ctx.clearRect(0, 0, WIDTH, HEIGHT);
    elements.ctx.drawImage(baseImage, 0, 0, WIDTH, HEIGHT);
    decorations.forEach(item => drawStickerObject(item));
  } else {
    baseImage.src = baseDataUrl;
  }
};

const drawStickerObject = item => {
  const img = new Image();
  img.onload = () => {
    elements.ctx.drawImage(img, item.x, item.y, item.width, item.height);
  };
  img.src = item.src;
};

const placeSticker = (pageX, pageY) => {
  if (!decorationMode || !selectedSticker || !elements.canvas) return;
  const rect = elements.canvas.getBoundingClientRect();
  const x = ((pageX - rect.left) / rect.width) * WIDTH;
  const y = ((pageY - rect.top) / rect.height) * HEIGHT;
  decorations.push({
    src: selectedSticker.src,
    x: Math.max(0, Math.min(WIDTH - 120, x - 60)),
    y: Math.max(0, Math.min(HEIGHT - 120, y - 60)),
    width: 120,
    height: 120
  });
  elements.clearStickers.style.display = 'inline-block';
  drawBaseAndDecorations();
};

const openDecoratePanel = () => {
  if (currentFrame < FRAMES) return;
  decorationMode = true;
  if (elements.decoratePanel) elements.decoratePanel.style.display = 'block';
  updateStage();
};

const redrawCanvas = () => {
  if (!baseDataUrl) return;
  baseImage.src = baseDataUrl;
  if (baseImage.complete) drawBaseAndDecorations();
};

const drawPhoto = img => {
  const { ctx } = elements;
  const yOffset = currentFrame * FRAME_HEIGHT;
  const imgAspect = img.width / img.height;
  const targetAspect = WIDTH / FRAME_HEIGHT;
  let sx, sy, sw, sh;

  if (imgAspect > targetAspect) {
    sh = img.height;
    sw = img.height * targetAspect;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = img.width / targetAspect;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, yOffset, WIDTH, FRAME_HEIGHT);
  currentFrame += 1;
  if (currentFrame >= FRAMES) {
    finalizePhotoStrip();
  } else {
    updateStage();
  }
};

const finalizePhotoStrip = () => {
  const { ctx, readyBtn, downloadBtn, uploadBtn } = elements;
  const frame = new Image();
  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);
    baseDataUrl = elements.canvas.toDataURL('image/png');
    baseImage.src = baseDataUrl;
    uploadBtn.style.display = 'none';
    readyBtn.style.display = 'inline-block';
    readyBtn.disabled = false;
    if (elements.readyBtn) elements.readyBtn.textContent = 'Decorate';
    downloadBtn.style.display = 'inline-block';
    updateStage();
  };
  frame.src = FRAME_OPTIONS[selectedFrameIndex].src;
};

const downloadPhoto = () => {
  const { canvas } = elements;
  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photobooth-strip.png';
    a.click();
  }, 'image/png');
};

if (elements.uploadBtn) {
  elements.uploadBtn.addEventListener('click', () => elements.uploadInput.click());
}

if (elements.uploadInput) {
  elements.uploadInput.addEventListener('change', e => {
    const files = Array.from(e.target.files).slice(0, FRAMES - currentFrame);
    if (!files.length) return;

    files.forEach(file => {
      const img = new Image();
      img.onload = () => drawPhoto(img);
      img.src = URL.createObjectURL(file);
    });

    elements.uploadInput.value = '';
  });
}

if (elements.downloadBtn) {
  elements.downloadBtn.addEventListener('click', downloadPhoto);
}

if (elements.readyBtn) {
  elements.readyBtn.addEventListener('click', openDecoratePanel);
}

if (elements.canvas) {
  elements.canvas.addEventListener('click', e => {
    if (decorationMode) {
      placeSticker(e.pageX, e.pageY);
    }
  });
}

if (elements.clearStickers) {
  elements.clearStickers.addEventListener('click', () => {
    decorations = [];
    selectedSticker = null;
    Array.from(elements.stickerPalette.children).forEach(child => child.classList.remove('selected'));
    elements.clearStickers.style.display = 'none';
    redrawCanvas();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  buildFrameChooser();
  buildStickerPalette();
  updateStage();
});

document.addEventListener('DOMContentLoaded', () => {
  const logo = document.querySelector('.logo');
  if (logo) logo.addEventListener('click', () => window.location.href = 'index.html');
});