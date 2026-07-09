/* ==========================================================
   Простой фоторедактор на canvas: кадрирование под нужный
   формат, яркость/контраст/насыщенность, поворот, перетаскивание.
   Используется для печати фото, магнитов, холста, кружек, футболок.
   ========================================================== */

const PhotoEditor = (() => {
  const CANVAS_W = 860;
  const CANVAS_H = 560;

  let state = null;
  let canvas, ctx;
  let onDoneCb = null;
  let config = null;

  function parseRatio(label) {
    const m = String(label).match(/(\d+[.,]?\d*)\s*[×xX]\s*(\d+[.,]?\d*)/);
    if (!m) return 1;
    const w = parseFloat(m[1].replace(",", "."));
    const h = parseFloat(m[2].replace(",", "."));
    return w / h;
  }

  function printAreaFor(mode, ratio) {
    if (mode === "tshirt") {
      const h = 360, w = h * (30 / 42);
      return { x: (CANVAS_W - w) / 2, y: (CANVAS_H - h) / 2 + 10, w, h };
    }
    if (mode === "mug") {
      const w = 620, h = w / (21 / 9.5);
      return { x: (CANVAS_W - w) / 2, y: (CANVAS_H - h) / 2, w, h };
    }
    // photo / canvas / magnet — по выбранному соотношению сторон
    const r = ratio || 1;
    let w = CANVAS_W - 120, h = w / r;
    if (h > CANVAS_H - 60) { h = CANVAS_H - 60; w = h * r; }
    return { x: (CANVAS_W - w) / 2, y: (CANVAS_H - h) / 2, w, h };
  }

  function drawShirt(area) {
    ctx.save();
    ctx.strokeStyle = "#cdd9db";
    ctx.lineWidth = 2;
    const cx = CANVAS_W / 2;
    const top = area.y - 90;
    ctx.beginPath();
    ctx.moveTo(cx - 30, top);
    ctx.lineTo(cx - 100, top + 30);
    ctx.lineTo(cx - 140, top + 90);
    ctx.lineTo(cx - 100, top + 130);
    ctx.lineTo(cx - 80, top + 100);
    ctx.lineTo(cx - 80, top + 430);
    ctx.lineTo(cx + 80, top + 430);
    ctx.lineTo(cx + 80, top + 100);
    ctx.lineTo(cx + 100, top + 130);
    ctx.lineTo(cx + 140, top + 90);
    ctx.lineTo(cx + 100, top + 30);
    ctx.lineTo(cx + 30, top);
    ctx.quadraticCurveTo(cx, top + 34, cx - 30, top);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const ratio = config.mode === "photo" ? state.ratio : null;
    const area = printAreaFor(config.mode, ratio);

    if (config.mode === "tshirt") drawShirt(area);

    if (state.img) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();

      const cx = area.x + area.w / 2 + state.offsetX;
      const cy = area.y + area.h / 2 + state.offsetY;
      ctx.translate(cx, cy);
      ctx.rotate((state.rotation * Math.PI) / 180);

      const swapped = state.rotation % 180 !== 0;
      const iw = swapped ? state.img.height : state.img.width;
      const ih = swapped ? state.img.width : state.img.height;
      const coverScale = Math.max(area.w / iw, area.h / ih) * state.scale;
      const dw = state.img.width * coverScale;
      const dh = state.img.height * coverScale;

      ctx.filter = `brightness(${100 + state.brightness}%) contrast(${100 + state.contrast}%) saturate(${state.saturation}%)`;
      ctx.drawImage(state.img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = "#8fa6aa";
      ctx.font = "20px Manrope, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Загрузите фотографию", area.x + area.w / 2, area.y + area.h / 2);
      ctx.restore();
    }

    // рамка области печати
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "#468996";
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.w, area.h);
    ctx.restore();

    state._area = area;
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        state.img = img;
        state.scale = 1;
        state.offsetX = 0;
        state.offsetY = 0;
        draw();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    state.originalFile = file;
  }

  function bindDrag() {
    let dragging = false, lastX = 0, lastY = 0;
    const toCanvasDelta = (dxClient, dyClient) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      return [dxClient * scaleX, dyClient * scaleY];
    };
    const start = (x, y) => { dragging = true; lastX = x; lastY = y; };
    const move = (x, y) => {
      if (!dragging || !state.img) return;
      const [dx, dy] = toCanvasDelta(x - lastX, y - lastY);
      state.offsetX += dx;
      state.offsetY += dy;
      lastX = x; lastY = y;
      draw();
    };
    const end = () => { dragging = false; };

    canvas.addEventListener("mousedown", (e) => start(e.clientX, e.clientY));
    window.addEventListener("mousemove", (e) => move(e.clientX, e.clientY));
    window.addEventListener("mouseup", end);
    canvas.addEventListener("touchstart", (e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }, { passive: true });
    canvas.addEventListener("touchmove", (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }, { passive: true });
    canvas.addEventListener("touchend", end);
  }

  function buildPanel() {
    const panel = document.getElementById("photoEditorPanel");
    panel.innerHTML = `
      <h3 style="margin-bottom:4px;">${config.title || "Фоторедактор"}</h3>
      <p class="modal-sub">Перетащите фото мышью, чтобы выбрать нужную область.</p>
      <div class="editor-toolbar">
        <label class="btn btn-outline btn-sm" style="cursor:pointer;">
          Загрузить фото
          <input type="file" accept="image/*" id="peFileInput" style="display:none;">
        </label>
        <button class="btn btn-outline btn-sm" id="peRotateBtn">Повернуть 90°</button>
        <button class="btn btn-outline btn-sm" id="peResetBtn">Сбросить</button>
      </div>
      <div class="editor-canvas-wrap">
        <canvas id="peCanvas" width="${CANVAS_W}" height="${CANVAS_H}"></canvas>
      </div>
      <div class="editor-controls">
        <div>
          <label>Масштаб</label>
          <input type="range" id="peScale" min="50" max="250" value="100">
        </div>
        <div>
          <label>Яркость</label>
          <input type="range" id="peBrightness" min="-60" max="60" value="0">
        </div>
        <div>
          <label>Контраст</label>
          <input type="range" id="peContrast" min="-60" max="60" value="0">
        </div>
        <div>
          <label>Насыщенность</label>
          <input type="range" id="peSaturation" min="0" max="200" value="100">
        </div>
      </div>
      <div class="order-actions">
        <button class="btn btn-outline" id="peCancelBtn">Отмена</button>
        <button class="btn btn-primary" id="peDoneBtn">Готово, добавить в заказ</button>
      </div>
    `;
    canvas = document.getElementById("peCanvas");
    ctx = canvas.getContext("2d");
    bindDrag();

    document.getElementById("peFileInput").addEventListener("change", (e) => {
      if (e.target.files[0]) loadFile(e.target.files[0]);
    });
    document.getElementById("peRotateBtn").addEventListener("click", () => {
      state.rotation = (state.rotation + 90) % 360;
      draw();
    });
    document.getElementById("peResetBtn").addEventListener("click", () => {
      state.scale = 1; state.offsetX = 0; state.offsetY = 0; state.rotation = 0;
      state.brightness = 0; state.contrast = 0; state.saturation = 100;
      document.getElementById("peScale").value = 100;
      document.getElementById("peBrightness").value = 0;
      document.getElementById("peContrast").value = 0;
      document.getElementById("peSaturation").value = 100;
      draw();
    });
    document.getElementById("peScale").addEventListener("input", (e) => {
      state.scale = e.target.value / 100; draw();
    });
    document.getElementById("peBrightness").addEventListener("input", (e) => {
      state.brightness = +e.target.value; draw();
    });
    document.getElementById("peContrast").addEventListener("input", (e) => {
      state.contrast = +e.target.value; draw();
    });
    document.getElementById("peSaturation").addEventListener("input", (e) => {
      state.saturation = +e.target.value; draw();
    });
    document.getElementById("peCancelBtn").addEventListener("click", closeEditor);
    document.getElementById("peDoneBtn").addEventListener("click", finish);

    if (config.file) loadFile(config.file);
  }

  function finish() {
    if (!state.img) { alert("Сначала загрузите фотографию"); return; }
    canvas.toBlob((blob) => {
      const mockupFile = new File([blob], `${config.mode}-design.jpg`, { type: "image/jpeg" });
      const files = [mockupFile];
      if (config.mode === "tshirt" && state.originalFile) {
        files.push(state.originalFile);
      }
      closeEditor();
      if (onDoneCb) onDoneCb(files);
    }, "image/jpeg", 0.92);
  }

  function closeEditor() {
    document.getElementById("photoEditorOverlay").classList.remove("open");
  }

  function open(cfg, onDone) {
    config = cfg || {};
    onDoneCb = onDone;
    state = {
      img: null, scale: 1, offsetX: 0, offsetY: 0, rotation: 0,
      brightness: 0, contrast: 0, saturation: 100,
      ratio: cfg.ratio || 1, originalFile: null,
    };
    document.getElementById("photoEditorOverlay").classList.add("open");
    buildPanel();
    draw();
  }

  return { open };
})();
