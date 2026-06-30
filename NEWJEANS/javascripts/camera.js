// camera.js
const video = document.getElementById('liveVideo');
const canvas = document.getElementById('finalCanvas');
const ctx = canvas.getContext('2d');
const takePhotoBtn = document.getElementById('takePhoto');
const readyBtn = document.getElementById('readyButton');
const countdownEl = document.getElementById('countdownTimer');
const downloadBtn = document.getElementById('downloadBtn');
const stageInfo = document.getElementById('stageInfo');
const frameChooser = document.getElementById('frameChooser');
const frameOverlay = document.getElementById('frameOverlay');
const decoratePanel = document.getElementById('decoratePanel');
const stickerPalette = document.getElementById('stickerPalette');
const clearStickersBtn = document.getElementById('clearStickers');

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
  { name: 'Dessert 1', src: 'Assets--/desserts1.png' },
  { name: 'Dessert 2', src: 'Assets--/desserts3.png' },
  { name: 'Dessert 3', src: 'Assets--/desserts3choco.png' },
  { name: 'Cat', src: 'Assets--/excited%20cat.png' }
];

let stream;
let currentFrame = 0;
let selectedFrameIndex = 0;
let selectedSticker = null;
let decorationMode = false;
let decorations = [];
let baseDataUrl = '';
const baseImage = new Image();

const updateStage = () => {
  if (!stageInfo) return;
  if (currentFrame < FRAMES) {
    stageInfo.textContent = `Camera ready for frame ${currentFrame + 1} of ${FRAMES}.`;
  } else if (!decorationMode) {
    stageInfo.textContent = 'All 3 frames captured. Press Decorate to add stickers.';
  } else {
    stageInfo.textContent = 'Choose a sticker, then click the strip to place it.';
  }
};

const buildFrameChooser = () => {
  if (!frameChooser) return;
  frameChooser.innerHTML = FRAME_OPTIONS.map((frame, index) =>
    `<img src="${frame.src}" class="frame-option" data-index="${index}" title="${frame.name}" alt="${frame.name}" />`
  ).join('');
  Array.from(frameChooser.children).forEach(el => {
    el.addEventListener('click', () => selectFrame(Number(el.dataset.index)));
  });
  selectFrame(0);
};

const selectFrame = index => {
  selectedFrameIndex = index;
  if (frameOverlay) frameOverlay.src = FRAME_OPTIONS[index].src;
  Array.from(frameChooser.children).forEach((el, idx) => {
    el.classList.toggle('selected', idx === index);
  });
};

const buildStickerPalette = () => {
  if (!stickerPalette) return;
  stickerPalette.innerHTML = STICKER_OPTIONS.map((sticker, index) =>
    `<img src="${sticker.src}" class="sticker-thumb" data-index="${index}" title="${sticker.name}" alt="${sticker.name}" />`
  ).join('');
  Array.from(stickerPalette.children).forEach(el => {
    el.addEventListener('click', () => {
      selectedSticker = STICKER_OPTIONS[Number(el.dataset.index)];
      Array.from(stickerPalette.children).forEach(child => child.classList.toggle('selected', child === el));
    });
  });
};

const drawBaseAndDecorations = () => {
  if (!baseDataUrl || !ctx) return;
  const draw = () => {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(baseImage, 0, 0, WIDTH, HEIGHT);
    decorations.forEach(item => drawStickerObject(item));
  };
  baseImage.onload = draw;
  if (baseImage.complete) draw();
  baseImage.src = baseDataUrl;
};

const drawStickerObject = item => {
  const img = new Image();
  img.onload = () => ctx.drawImage(img, item.x, item.y, item.width, item.height);
  img.src = item.src;
};

const placeSticker = (pageX, pageY) => {
  if (!decorationMode || !selectedSticker || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((pageX - rect.left) / rect.width) * WIDTH;
  const y = ((pageY - rect.top) / rect.height) * HEIGHT;
  decorations.push({
    src: selectedSticker.src,
    x: Math.max(0, Math.min(WIDTH - 120, x - 60)),
    y: Math.max(0, Math.min(HEIGHT - 120, y - 60)),
    width: 120,
    height: 120
  });
  if (clearStickersBtn) clearStickersBtn.style.display = 'inline-block';
  drawBaseAndDecorations();
};

const openDecoratePanel = () => {
  if (currentFrame < FRAMES) return;
  decorationMode = true;
  if (decoratePanel) decoratePanel.style.display = 'block';
  updateStage();
};

const finalizeStripe = () => {
  const frame = new Image();
  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, WIDTH, HEIGHT);
    baseDataUrl = canvas.toDataURL('image/png');
    baseImage.src = baseDataUrl;
    takePhotoBtn.disabled = true;
    if (readyBtn) {
      readyBtn.style.display = 'inline-block';
      readyBtn.disabled = false;
      readyBtn.textContent = 'Decorate';
    }
    if (downloadBtn) downloadBtn.style.display = 'inline-block';
    updateStage();
  };
  frame.src = FRAME_OPTIONS[selectedFrameIndex].src;
};

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(mediaStream => {
      stream = mediaStream;
      video.srcObject = stream;
      video.addEventListener('loadedmetadata', () => {
        video.play();
        takePhotoBtn.disabled = false;
        updateStage();
      });
    })
    .catch(err => {
      console.error('Error accessing camera:', err);
      if (stageInfo) stageInfo.textContent = 'Camera unavailable. Please allow camera access or upload instead.';
    });
}

function startCountdown() {
  if (!countdownEl) return;
  let count = 3;
  countdownEl.style.display = 'block';
  countdownEl.textContent = count;

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
      countdownEl.textContent = count;
    } else {
      clearInterval(interval);
      countdownEl.style.display = 'none';
      capturePhoto();
    }
  }, 1000);
}

function capturePhoto() {
  if (!video || !ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
  const yOffset = currentFrame * FRAME_HEIGHT;
  const targetAspect = WIDTH / FRAME_HEIGHT;
  const videoAspect = video.videoWidth / video.videoHeight;
  let sx = 0;
  let sy = 0;
  let sw = video.videoWidth;
  let sh = video.videoHeight;

  if (videoAspect > targetAspect) {
    sw = video.videoHeight * targetAspect;
    sx = (video.videoWidth - sw) / 2;
  } else {
    sh = video.videoWidth / targetAspect;
    sy = (video.videoHeight - sh) / 2;
  }

  ctx.drawImage(video, sx, sy, sw, sh, 0, yOffset, WIDTH, FRAME_HEIGHT);
  currentFrame += 1;

  if (currentFrame >= FRAMES) {
    finalizeStripe();
  } else {
    updateStage();
  }
}

const downloadPhoto = () => {
  if (!canvas) return;
  canvas.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'photobooth-strip.png';
    a.click();
  }, 'image/png');
};

if (readyBtn) {
  readyBtn.addEventListener('click', openDecoratePanel);
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', downloadPhoto);
}

if (takePhotoBtn) {
  takePhotoBtn.addEventListener('click', startCountdown);
}

if (canvas) {
  canvas.addEventListener('click', e => {
    if (decorationMode) placeSticker(e.pageX, e.pageY);
  });
}

if (clearStickersBtn) {
  clearStickersBtn.addEventListener('click', () => {
    decorations = [];
    selectedSticker = null;
    Array.from(stickerPalette.children).forEach(child => child.classList.remove('selected'));
    clearStickersBtn.style.display = 'none';
    drawBaseAndDecorations();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  buildFrameChooser();
  buildStickerPalette();
  updateStage();
  startCamera();
});