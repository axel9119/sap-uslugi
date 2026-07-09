/* ==========================================================
   Конструктор печатей и штампов: форма, размер, оснастка,
   строки текста (с изгибом по кругу), логотип/факсимиле в центр.
   Итоговый макет экспортируется в JPG.
   ========================================================== */

const StampConstructor = (() => {
  const CANVAS_SIZE = 640;

  const SIZES = {
    circle: ["Ø 38 мм", "Ø 40 мм", "Ø 45 мм", "Ø 50 мм"],
    oval: ["38×58 мм", "45×70 мм"],
    rect: ["38×14 мм", "58×22 мм", "70×30 мм"],
  };
  const MOUNTS = ["Карманная", "Автоматическая", "Ручная (дерево)"];
  const INK_COLORS = { "Синий": "#233a8c", "Фиолетовый": "#4b2e83", "Чёрный": "#1c1c1c", "Красный": "#8c1f2b" };

  let canvas, ctx;
  let state, onDoneCb;

  function defaultState() {
    return {
      shape: "circle",
      size: SIZES.circle[1],
      mount: MOUNTS[0],
      ink: "Синий",
      lines: ["НАЗВАНИЕ ОРГАНИЗАЦИИ", "г. Волгоград"],
      lineOffsets: [0, 0],
      lineScales: [1, 1],
      centerMode: "none", // none | logo | facsimile
      centerImg: null,
    };
  }

  // Насколько выбранный размер (мм) большой относительно других вариантов
  // для этой же формы — 0 (самый маленький) .. 1 (самый большой).
  // Используется, чтобы реальный размер печати влиял на масштаб макета.
  function sizeRatio(shape, sizeLabel) {
    const opts = SIZES[shape].map((s) => Number((s.match(/\d+/) || [0])[0]));
    const cur = Number((sizeLabel.match(/\d+/) || [0])[0]);
    const min = Math.min(...opts), max = Math.max(...opts);
    return max === min ? 0.5 : (cur - min) / (max - min);
  }

  // Рисует текст дугой по кругу вокруг текущего начала координат (центр печати).
  // bottom=false — дуга сверху (текст читается слева направо, буквы «смотрят» наружу вверх).
  // bottom=true  — дуга снизу (текст тоже читается слева направо, буквы стоят прямо, не вверх ногами).
  // Угловой шаг каждой буквы считается по её реальной ширине (ctx.measureText),
  // а не одинаковым для всех — иначе узкие буквы/пробелы/точки «повисают» с лишним
  // просветом, а широкие буквы налезают друг на друга, и дуга выглядит неровной.
  function drawCurvedText(text, radius, bottom) {
    ctx.save();
    const letters = text.split("");
    const dir = bottom ? -1 : 1;
    const gap = 3;
    const stepAngles = letters.map((ch) => ((ctx.measureText(ch).width || 6) + gap) / radius);
    const totalAngle = stepAngles.reduce((a, b) => a + b, 0);
    ctx.rotate((-dir * totalAngle) / 2);
    for (let i = 0; i < letters.length; i++) {
      ctx.rotate((dir * stepAngles[i]) / 2);
      ctx.save();
      ctx.translate(0, bottom ? radius : -radius);
      ctx.fillText(letters[i], 0, 0);
      ctx.restore();
      ctx.rotate((dir * stepAngles[i]) / 2);
    }
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const ink = INK_COLORS[state.ink] || "#233a8c";
    const cx = CANVAS_SIZE / 2, cy = CANVAS_SIZE / 2;

    ctx.save();
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.font = "700 20px Manrope, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const off = (i) => (state.lineOffsets && state.lineOffsets[i]) || 0;
    const scl = (i) => (state.lineScales && state.lineScales[i]) || 1;

    if (state.shape === "circle" || state.shape === "oval") {
      // Реальный выбранный размер (мм) масштабирует итоговый круг/овал на макете.
      const ratio = sizeRatio(state.shape, state.size);
      const R = state.shape === "oval" ? 175 + ratio * 55 : 185 + ratio * 70;
      const scaleY = state.shape === "oval" ? 0.62 : 1;
      ctx.translate(cx, cy);
      ctx.scale(1, scaleY);

      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, R - 16, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, R - 90, 0, Math.PI * 2); ctx.stroke();

      const lines = state.lines.filter((l) => l.trim());
      const textR = R - 50;
      // off(0) > 0 — верхняя строка сдвигается наружу/вверх, к внешнему краю.
      if (lines[0]) {
        ctx.save(); ctx.scale(1, 1 / scaleY);
        ctx.font = `700 ${Math.round(26 * scl(0))}px Manrope, sans-serif`;
        drawCurvedText(lines[0].toUpperCase(), (textR + off(0)) * scaleY, false);
        ctx.restore();
      }
      // off(1) > 0 — нижняя строка сдвигается наружу/вниз, к внешнему краю.
      if (lines[1]) {
        ctx.save(); ctx.scale(1, 1 / scaleY);
        ctx.font = `600 ${Math.round(22 * scl(1))}px Manrope, sans-serif`;
        drawCurvedText(lines[1].toUpperCase(), (textR - 15 + off(1)) * scaleY, true);
        ctx.restore();
      }
      if (lines[2]) {
        ctx.save(); ctx.scale(1, 1 / scaleY);
        ctx.font = `600 ${Math.round(20 * scl(2))}px Manrope, sans-serif`;
        ctx.fillText(lines[2], 0, -6 + off(2));
        ctx.restore();
      }
      if (lines[3]) {
        ctx.save(); ctx.scale(1, 1 / scaleY);
        ctx.font = `600 ${Math.round(18 * scl(3))}px Manrope, sans-serif`;
        ctx.fillText(lines[3], 0, 20 + off(3));
        ctx.restore();
      }

      // центр: лого/факсимиле
      if (state.centerMode !== "none" && state.centerImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, R - 100, 0, Math.PI * 2);
        ctx.clip();
        const s = Math.max(((R - 100) * 2) / state.centerImg.width, ((R - 100) * 2) / state.centerImg.height);
        const iw = state.centerImg.width * s, ih = state.centerImg.height * s;
        ctx.globalAlpha = 0.92;
        ctx.drawImage(state.centerImg, -iw / 2, -ih / 2, iw, ih);
        ctx.restore();
      }
      ctx.restore();
    } else {
      // rect — размер (мм) напрямую задаёт пропорции прямоугольника на макете.
      const [mmW, mmH] = (state.size.match(/\d+/g) || [70, 30]).map(Number);
      const pxPerMM = 6.2;
      const w = Math.min(480, mmW * pxPerMM);
      const h = Math.min(220, mmH * pxPerMM);
      ctx.lineWidth = 5;
      ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - w / 2 + 10, cy - h / 2 + 10, w - 20, h - 20);

      const lines = state.lines.filter((l) => l.trim());
      const startY = cy - ((lines.length - 1) * 26) / 2;
      lines.forEach((line, i) => {
        const base = i === 0 ? 24 : 19;
        ctx.font = `${i === 0 ? 700 : 600} ${Math.round(base * scl(i))}px Manrope, sans-serif`;
        ctx.fillText(line, cx, startY + i * 30 + off(i));
      });

      if (state.centerMode !== "none" && state.centerImg) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        const boxW = 70, boxH = 70;
        ctx.beginPath();
        ctx.rect(cx - w / 2 + 14, cy - boxH / 2, boxW, boxH);
        ctx.clip();
        const s = Math.max(boxW / state.centerImg.width, boxH / state.centerImg.height);
        const iw = state.centerImg.width * s, ih = state.centerImg.height * s;
        ctx.drawImage(state.centerImg, cx - w / 2 + 14 + boxW / 2 - iw / 2, cy - ih / 2, iw, ih);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // screenDir: -1 = сдвинуть строку визуально вверх, +1 = визуально вниз.
  // Для дуговых строк это по факту меняет радиус (ближе/дальше от центра печати),
  // для прямых строк в центре — обычное смещение по Y.
  function adjustLineOffset(i, screenDir) {
    const step = 4;
    if (!state.lineOffsets) state.lineOffsets = [];
    const cur = state.lineOffsets[i] || 0;
    const delta = i === 0 ? -screenDir * step : screenDir * step;
    state.lineOffsets[i] = Math.max(-50, Math.min(50, cur + delta));
    draw();
  }

  // dir: +1 — увеличить размер строки, -1 — уменьшить.
  function adjustLineScale(i, dir) {
    if (!state.lineScales) state.lineScales = [];
    const cur = state.lineScales[i] || 1;
    state.lineScales[i] = Math.max(0.6, Math.min(1.8, +(cur + dir * 0.1).toFixed(2)));
    draw();
  }

  function renderLines() {
    const wrap = document.getElementById("stLines");
    wrap.innerHTML = state.lines.map((line, i) => `
      <div class="stamp-line-row">
        <input type="text" data-line="${i}" value="${line.replace(/"/g, "&quot;")}" placeholder="Строка текста">
        <div class="stamp-line-move">
          <button type="button" data-move-up="${i}" title="Сдвинуть строку вверх">▲</button>
          <button type="button" data-move-down="${i}" title="Сдвинуть строку вниз">▼</button>
        </div>
        <div class="stamp-line-move" title="Размер текста">
          <button type="button" data-size-up="${i}" title="Увеличить текст">+</button>
          <button type="button" data-size-down="${i}" title="Уменьшить текст">−</button>
        </div>
        <button type="button" data-remove-line="${i}" title="Удалить строку">×</button>
      </div>
    `).join("");
    wrap.querySelectorAll("input[data-line]").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        state.lines[+e.target.dataset.line] = e.target.value;
        draw();
      });
    });
    wrap.querySelectorAll("[data-move-up]").forEach((btn) => {
      btn.addEventListener("click", (e) => adjustLineOffset(+e.target.dataset.moveUp, -1));
    });
    wrap.querySelectorAll("[data-move-down]").forEach((btn) => {
      btn.addEventListener("click", (e) => adjustLineOffset(+e.target.dataset.moveDown, 1));
    });
    wrap.querySelectorAll("[data-size-up]").forEach((btn) => {
      btn.addEventListener("click", (e) => adjustLineScale(+e.target.dataset.sizeUp, 1));
    });
    wrap.querySelectorAll("[data-size-down]").forEach((btn) => {
      btn.addEventListener("click", (e) => adjustLineScale(+e.target.dataset.sizeDown, -1));
    });
    wrap.querySelectorAll("[data-remove-line]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const idx = +e.target.dataset.removeLine;
        state.lines.splice(idx, 1);
        if (state.lineOffsets) state.lineOffsets.splice(idx, 1);
        if (state.lineScales) state.lineScales.splice(idx, 1);
        renderLines(); draw();
      });
    });
  }

  function chipGroup(id, options, active, onPick) {
    return `<div class="chip-group" id="${id}">` +
      options.map((o) => `<button type="button" class="chip${o === active ? " active" : ""}" data-val="${o}">${o}</button>`).join("") +
      `</div>`;
  }

  function wireChipGroup(id, onPick) {
    const el = document.getElementById(id);
    el.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        el.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        onPick(chip.dataset.val);
      });
    });
  }

  function buildPanel() {
    const panel = document.getElementById("stampEditorPanel");
    panel.innerHTML = `
      <h3 style="margin-bottom:4px;">Конструктор печати</h3>
      <p class="modal-sub">Соберите макет — он приложится к заказу в формате JPG.</p>
      <div class="stamp-layout">
        <div class="stamp-preview-wrap">
          <canvas id="stCanvas" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" style="max-width:100%;height:auto;background:#fff;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.12);"></canvas>
        </div>
        <div>
          <div class="form-row">
            <label>Форма печати</label>
            ${chipGroup("stShape", ["circle", "oval", "rect"].map((s) => ({ circle: "Круглая", oval: "Овальная", rect: "Прямоугольная" }[s])), { circle: "Круглая", oval: "Овальная", rect: "Прямоугольная" }[state.shape])}
          </div>
          <div class="form-row">
            <label>Размер</label>
            <div id="stSizeWrap"></div>
          </div>
          <div class="form-row">
            <label>Оснастка</label>
            ${chipGroup("stMount", MOUNTS, state.mount)}
          </div>
          <div class="form-row">
            <label>Цвет мастики</label>
            ${chipGroup("stInk", Object.keys(INK_COLORS), state.ink)}
          </div>
          <div class="form-row">
            <label>Текст на печати</label>
            <div class="stamp-lines" id="stLines"></div>
            <button type="button" class="btn btn-outline btn-sm" id="stAddLine">+ Добавить строку</button>
          </div>
          <div class="form-row">
            <label>Центр печати</label>
            ${chipGroup("stCenterMode", ["Нет", "Логотип", "Факсимиле (подпись)"], { none: "Нет", logo: "Логотип", facsimile: "Факсимиле (подпись)" }[state.centerMode])}
            <div style="margin-top:8px;" id="stCenterUploadWrap"></div>
          </div>
        </div>
      </div>
      <div class="order-actions">
        <button class="btn btn-outline" id="stCancelBtn">Отмена</button>
        <button class="btn btn-primary" id="stDoneBtn">Готово, добавить в заказ</button>
      </div>
    `;
    canvas = document.getElementById("stCanvas");
    ctx = canvas.getContext("2d");

    renderSizeChips();
    renderLines();
    renderCenterUpload();

    const shapeMap = { "Круглая": "circle", "Овальная": "oval", "Прямоугольная": "rect" };
    wireChipGroup("stShape", (val) => {
      state.shape = shapeMap[val];
      state.size = SIZES[state.shape][0];
      renderSizeChips();
      draw();
    });
    wireChipGroup("stMount", (val) => { state.mount = val; });
    wireChipGroup("stInk", (val) => { state.ink = val; draw(); });

    const centerMap = { "Нет": "none", "Логотип": "logo", "Факсимиле (подпись)": "facsimile" };
    wireChipGroup("stCenterMode", (val) => {
      state.centerMode = centerMap[val];
      renderCenterUpload();
      draw();
    });

    document.getElementById("stAddLine").addEventListener("click", () => {
      if (state.lines.length >= 4) return;
      state.lines.push("");
      if (!state.lineOffsets) state.lineOffsets = [];
      state.lineOffsets.push(0);
      if (!state.lineScales) state.lineScales = [];
      state.lineScales.push(1);
      renderLines(); draw();
    });
    document.getElementById("stCancelBtn").addEventListener("click", closeEditor);
    document.getElementById("stDoneBtn").addEventListener("click", finish);

    draw();
  }

  function renderSizeChips() {
    const wrap = document.getElementById("stSizeWrap");
    wrap.innerHTML = chipGroup("stSize", SIZES[state.shape], state.size);
    wireChipGroup("stSize", (val) => { state.size = val; draw(); });
  }

  function renderCenterUpload() {
    const wrap = document.getElementById("stCenterUploadWrap");
    if (state.centerMode === "none") { wrap.innerHTML = ""; return; }
    wrap.innerHTML = `<label class="btn btn-outline btn-sm" style="cursor:pointer;">Загрузить изображение<input type="file" accept="image/*" id="stCenterFile" style="display:none;"></label>`;
    document.getElementById("stCenterFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => { state.centerImg = img; draw(); };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function finish() {
    canvas.toBlob((blob) => {
      const file = new File([blob], "pechat-maket.jpg", { type: "image/jpeg" });
      const params = { shape: state.shape, size: state.size, mount: state.mount, ink: state.ink, lines: state.lines, center: state.centerMode };
      closeEditor();
      if (onDoneCb) onDoneCb([file], params);
    }, "image/jpeg", 0.95);
  }

  function closeEditor() {
    document.getElementById("stampEditorOverlay").classList.remove("open");
  }

  function open(onDone) {
    state = defaultState();
    onDoneCb = onDone;
    document.getElementById("stampEditorOverlay").classList.add("open");
    buildPanel();
  }

  return { open };
})();
