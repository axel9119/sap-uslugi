/* ==========================================================
   Главный скрипт: рендер контента, модалки, заказы, оплата.
   ========================================================== */

let currentOrderFiles = [];
let currentOrderParams = {};
let currentOrderService = null;
let priceState = { size: null, variants: {} };

function fmt(n) { return `${n} ₽`; }
function isStaticPreview() { return location.protocol === "file:"; }

/* ---------------- Топбар / базовые иконки ---------------- */
function initChrome() {
  document.getElementById("tb-address").textContent = CONTACT.address + " · " + CONTACT.hours1;
  const mail = document.getElementById("tb-mail");
  mail.textContent = CONTACT.email;
  const max = document.getElementById("tb-max");
  max.innerHTML = icon("max");
  max.href = CONTACT.maxHref;

  document.querySelectorAll(".modal-close").forEach((b) => (b.innerHTML = icon("close")));
  document.querySelectorAll(".editor-overlay-close").forEach((b) => (b.innerHTML = icon("close")));

  document.getElementById("navToggle").addEventListener("click", () => {
    document.getElementById("mainNav").classList.toggle("open");
  });
  document.querySelectorAll(".main-nav a").forEach((a) =>
    a.addEventListener("click", () => document.getElementById("mainNav").classList.remove("open"))
  );

  document.getElementById("navCallBtn").addEventListener("click", () => openModal("modalCall"));

  const cartBtn = document.getElementById("cartBtn");
  if (cartBtn) cartBtn.addEventListener("click", () => openCartModal());
  Cart.updateBadge();

  const stampBtn = document.getElementById("stampConstructorBtn");
  if (stampBtn) stampBtn.addEventListener("click", () => openStandaloneStampConstructor());

  document.querySelectorAll(".modal-overlay").forEach((ov) => {
    ov.addEventListener("click", (e) => { if (e.target === ov) closeModal(ov.id); });
    ov.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal(ov.id)));
  });

  document.querySelectorAll(".editor-overlay-close").forEach((b) =>
    b.addEventListener("click", () => document.getElementById(b.dataset.editorClose).classList.remove("open"))
  );
}

function openModal(id) { document.getElementById(id).classList.add("open"); }
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

/* ---------------- Промо-акции ---------------- */
async function renderPromos() {
  const wrap = document.getElementById("promoRow");
  if (!wrap) return;
  let promos = [];
  try {
    const res = await fetch("/api/promos");
    promos = await res.json();
  } catch (e) {
    // Сайт открыт как локальный файл (без сервера) — используем резервные данные
    promos = window.PROMOS_STATIC || [];
  }
  wrap.innerHTML = promos.filter(p => p.active).map((p) => `
    <div class="promo-card">
      <div class="promo-badge">${p.badge}</div>
      <div>
        <h3>${p.title}</h3>
        <p>${p.text}</p>
      </div>
    </div>
  `).join("");
}

/* ---------------- Преимущества ---------------- */
function renderAdvantages() {
  const el = document.getElementById("advantagesGrid");
  if (!el) return;
  el.innerHTML = ADVANTAGES.map((a) => `
    <div class="advantage-card reveal">
      <div class="advantage-icon">${icon(a.icon)}</div>
      <h3>${a.title}</h3>
      <p>${a.text}</p>
    </div>
  `).join("");
  initScrollReveal();
}

/* ---------------- Сетка услуг (онлайн) ---------------- */
function renderServices(list, targetId) {
  const el = document.getElementById(targetId || "servicesGrid");
  if (!el) return;
  const items = list || ONLINE_SERVICES;
  el.innerHTML = items.map((s) => `
    <div class="service-card reveal">
      ${s.image ? `
      <div class="service-photo">
        <img src="${s.image}" alt="${s.title}" loading="lazy">
        <div class="service-icon">${icon(s.icon)}</div>
        ${s.badge ? `<span class="badge-constructor badge-on-photo">${s.badge}</span>` : ""}
      </div>` : `
      <div class="service-icon service-icon-standalone">${icon(s.icon)}</div>
      ${s.badge ? `<span class="badge-constructor">${s.badge}</span>` : ""}`}
      <div class="service-card-body">
        <h3>${s.title}</h3>
        <div class="desc">${s.desc}</div>
        <div class="service-price">от ${s.priceFrom} ₽ <small>/ ${s.priceUnit}</small></div>
        <button class="btn btn-primary btn-block" data-order="${s.id}">Заказать</button>
      </div>
    </div>
  `).join("");
  el.querySelectorAll("[data-order]").forEach((btn) =>
    btn.addEventListener("click", () => openOrderModal(btn.dataset.order))
  );
  initScrollReveal();
}

/* ---------------- Офлайн-услуги ---------------- */
function renderOffline(list, targetId) {
  const el = document.getElementById(targetId || "offlineGrid");
  if (!el) return;
  const items = list || OFFLINE_SERVICES;
  el.innerHTML = items.map((s) => `
    <button class="offline-card reveal" data-offline="${s.id}">
      <div class="off-icon">${icon(s.icon)}</div>
      <h4>${s.title}</h4>
      <div class="price">от ${s.price} ₽</div>
      <div class="offline-tag">Только офлайн</div>
    </button>
  `).join("");
  el.querySelectorAll("[data-offline]").forEach((btn) =>
    btn.addEventListener("click", () => openOfflineModal(btn.dataset.offline))
  );
  initScrollReveal();
}

/* ---------------- Скролл-анимации появления ---------------- */
let _revealObserver = null;
function initScrollReveal() {
  if (!("IntersectionObserver" in window)) return;
  if (!_revealObserver) {
    _revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          _revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => _revealObserver.observe(el));
}

function openOfflineModal(id) {
  const s = OFFLINE_SERVICES.find((x) => x.id === id);
  if (!s) return;
  document.getElementById("offlineModalContent").innerHTML = `
    <div class="advantage-icon" style="margin-bottom:16px;">${icon(s.icon)}</div>
    <h3>${s.title}</h3>
    <p class="modal-sub">${s.blurb}</p>
    <div class="offline-modal-price">от ${s.price} ₽</div>
    <p style="color:var(--gray-700); font-size:.9rem;">Эта услуга выполняется только очно в нашем центре — оформить заказ на сайте нельзя, но можно уточнить детали заранее.</p>
    <div class="offline-modal-contact">
      <strong>${CONTACT.address}</strong><br>
      ${CONTACT.hours1}, ${CONTACT.hours2}
    </div>
    <div class="order-actions">
      <a href="${CONTACT.phoneHref}" class="btn btn-primary">Позвонить: ${CONTACT.phone}</a>
      <a href="mailto:${CONTACT.email}" class="btn btn-outline">Написать на почту</a>
    </div>
  `;
  openModal("modalOffline");
}

/* ---------------- Заказ услуги (онлайн) ---------------- */
function ratioFromSize(label) {
  const m = String(label).match(/(\d+)\D+(\d+)/);
  return m ? +m[1] / +m[2] : 1;
}

function openOrderModal(id) {
  const s = ONLINE_SERVICES.find((x) => x.id === id);
  if (!s) return;
  currentOrderService = s;
  currentOrderFiles = [];
  currentOrderParams = {};
  priceState = { size: null, variants: {} };

  document.getElementById("orderModalContent").innerHTML = buildOrderFormHTML(s);
  wireOrderForm(s);
  openModal("modalOrder");
}

function buildOrderFormHTML(s) {
  let html = `
    <div class="service-icon">${icon(s.icon)}</div>
    <h3>${s.title}</h3>
    <p class="modal-sub">${s.desc}</p>
  `;

  if (s.variantGroups) {
    s.variantGroups.forEach((g) => {
      html += `
        <div class="form-row">
          <label>${g.label}</label>
          <div class="chip-group" data-variant-group="${g.key}">
            ${g.options.map((o, i) => `<button type="button" class="chip${i === 0 ? " active" : ""}" data-price="${o.price ?? ""}" data-label="${o.label}">${o.label}${o.price ? ` · ${o.price} ₽` : ""}</button>`).join("")}
          </div>
        </div>
      `;
    });
  }

  if (s.paperOptions) {
    html += `
      <div class="form-row">
        <label>Бумага</label>
        <div class="chip-group" data-variant-group="paper">
          ${s.paperOptions.map((o, i) => `<button type="button" class="chip${i === 0 ? " active" : ""}" data-price="" data-label="${o}">${o}</button>`).join("")}
        </div>
      </div>
    `;
  }

  if (s.sizes) {
    html += `
      <div class="form-row">
        <label>Размер и цена ${s.sizesNote ? `<span class="hint">(${s.sizesNote})</span>` : ""}</label>
        <table class="price-table" id="sizeTable">
          <thead><tr><th>Формат</th><th>Цена</th><th></th></tr></thead>
          <tbody>
            ${s.sizes.map((sz, i) => `
              <tr data-size-row data-label="${sz.label}" data-price="${sz.price}" class="${i === 0 ? "chip active" : ""}" style="cursor:pointer;">
                <td>${sz.label}</td><td class="price">${sz.price} ₽</td>
                <td>${i === 0 ? icon("check") : ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  if (s.sizeChart) {
    html += `
      <div class="form-row">
        <label>Таблица размеров футболок</label>
        <table class="price-table">
          <thead><tr><th>Размер</th><th>Обхват груди, см</th></tr></thead>
          <tbody>${s.sizeChart.map((r) => `<tr><td>${r.size}</td><td>${r.chest}</td></tr>`).join("")}</tbody>
        </table>
      </div>
    `;
  }

  if (s.hasEditor) {
    html += `
      <button type="button" class="editor-open-btn" id="openEditorBtn">${icon("editor")} ${s.editorType === "stamp" ? "Открыть конструктор печати" : "Открыть фоторедактор"}</button>
    `;
  }

  html += `
    <div class="form-row" style="margin-top:16px;">
      <label>Файлы и изображения</label>
      <div class="dropzone" id="dropzone">
        <div class="dz-icon">${icon("upload")}</div>
        <div class="dz-title">Нажмите, чтобы прикрепить файлы</div>
        <div class="dz-sub">JPG, PNG, PDF — можно несколько файлов</div>
        <input type="file" id="fileInput" multiple style="display:none;">
      </div>
      <div class="file-list" id="fileList"></div>
    </div>

    <div class="form-row">
      <label>Примечания</label>
      <textarea id="orderNotes" placeholder="${s.notesPlaceholder || "Комментарий к заказу"}"></textarea>
    </div>

    <div class="order-summary" id="orderSummary">
      Ориентировочная стоимость: <strong>от ${s.priceFrom} ₽</strong>
    </div>

    <div class="order-actions">
      <button type="button" class="btn btn-primary btn-block" id="submitOrderBtn">${icon("cart")} Добавить в корзину</button>
    </div>
  `;

  return html;
}

function updateSummary(s) {
  const el = document.getElementById("orderSummary");
  if (!el) return;
  const price = computePrice(s);
  el.innerHTML = price
    ? `Ориентировочная стоимость: <strong>${price} ₽</strong>`
    : `Ориентировочная стоимость: <strong>от ${s.priceFrom} ₽</strong>`;
}

function computePrice(s) {
  if (priceState.size != null) return priceState.size;
  const variantPrices = Object.values(priceState.variants).filter((v) => v != null);
  if (variantPrices.length) return variantPrices[variantPrices.length - 1];
  return null;
}

function renderFileList() {
  const wrap = document.getElementById("fileList");
  if (!wrap) return;
  wrap.innerHTML = currentOrderFiles.map((f, i) => `
    <span class="file-chip">📎 ${f.name.length > 22 ? f.name.slice(0, 19) + "…" : f.name}
      <button type="button" data-remove-file="${i}">×</button>
    </span>
  `).join("");
  wrap.querySelectorAll("[data-remove-file]").forEach((b) =>
    b.addEventListener("click", () => { currentOrderFiles.splice(+b.dataset.removeFile, 1); renderFileList(); })
  );
}

function wireOrderForm(s) {
  document.querySelectorAll("[data-variant-group]").forEach((group) => {
    const key = group.dataset.variantGroup;
    group.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        const price = chip.dataset.price ? +chip.dataset.price : null;
        priceState.variants[key] = price;
        currentOrderParams[key] = chip.dataset.label;
        updateSummary(s);
      });
      // инициализация первого выбора
    });
    const firstActive = group.querySelector(".chip.active");
    if (firstActive) {
      const price = firstActive.dataset.price ? +firstActive.dataset.price : null;
      priceState.variants[key] = price;
      currentOrderParams[key] = firstActive.dataset.label;
    }
  });

  const sizeTable = document.getElementById("sizeTable");
  if (sizeTable) {
    const rows = sizeTable.querySelectorAll("[data-size-row]");
    rows.forEach((row) => {
      row.addEventListener("click", () => {
        rows.forEach((r) => { r.classList.remove("active"); r.lastElementChild.innerHTML = ""; });
        row.classList.add("active");
        row.lastElementChild.innerHTML = icon("check");
        priceState.size = +row.dataset.price;
        currentOrderParams.size = row.dataset.label;
        updateSummary(s);
      });
    });
    const first = rows[0];
    if (first) { priceState.size = +first.dataset.price; currentOrderParams.size = first.dataset.label; }
  }

  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    currentOrderFiles.push(...Array.from(e.target.files));
    renderFileList();
  });

  const editorBtn = document.getElementById("openEditorBtn");
  if (editorBtn) {
    editorBtn.addEventListener("click", () => {
      if (s.editorType === "stamp") {
        StampConstructor.open((files, params) => {
          currentOrderFiles.push(...files);
          currentOrderParams.stamp = params;
          renderFileList();
        });
      } else {
        const ratio = s.sizes ? ratioFromSize(currentOrderParams.size || s.sizes[0].label) : 1;
        PhotoEditor.open({ title: s.title, mode: s.editorType, ratio }, (files) => {
          currentOrderFiles.push(...files);
          renderFileList();
        });
      }
    });
  }

  updateSummary(s);
  document.getElementById("submitOrderBtn").addEventListener("click", () => addToCartFromModal(s));
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/* ---------------- Конструктор печатей — отдельная точка входа ---------------- */
function openStandaloneStampConstructor() {
  const s = (typeof ONLINE_SERVICES !== "undefined" && ONLINE_SERVICES.find((x) => x.id === "stamps")) || {
    id: "stamps", title: "Печати и штампы", icon: "stamp", priceFrom: 1000,
  };
  StampConstructor.open(async (files, params) => {
    try {
      const b64files = await Promise.all(files.map(async (f) => ({
        name: f.name, type: f.type, dataBase64: await fileToBase64(f),
      })));
      Cart.add({
        service: s.id,
        serviceTitle: s.title,
        icon: s.icon,
        price: s.priceFrom,
        approxPrice: true,
        needsConsult: false,
        params: { stamp: params },
        notes: "",
        files: b64files,
      });
      showCartToast(s.title);
    } catch (e) {
      alert("Не удалось добавить макет печати в корзину. Попробуйте ещё раз.");
    }
  });
}

/* ---------------- Добавление в корзину ---------------- */
async function addToCartFromModal(s) {
  const notes = document.getElementById("orderNotes").value.trim();
  const btn = document.getElementById("submitOrderBtn");
  btn.disabled = true; btn.textContent = "Добавляем…";

  try {
    const files = await Promise.all(currentOrderFiles.map(async (f) => ({
      name: f.name,
      type: f.type,
      dataBase64: await fileToBase64(f),
    })));

    Cart.add({
      service: s.id,
      serviceTitle: s.title,
      icon: s.icon,
      price: computePrice(s) || s.priceFrom,
      approxPrice: computePrice(s) == null,
      needsConsult: !!s.afterSubmitNote,
      params: currentOrderParams,
      notes,
      files,
    });

    closeModal("modalOrder");
    showCartToast(s.title);
  } catch (e) {
    alert("Не удалось добавить в корзину. Попробуйте ещё раз.");
  }
  btn.disabled = false; btn.innerHTML = `${icon("cart")} Добавить в корзину`;
}

function showCartToast(title) {
  let toast = document.getElementById("cartToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cartToast";
    toast.className = "cart-toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <div class="cart-toast-inner">
      ${icon("check")}
      <span>«${title}» добавлено в корзину</span>
      <button type="button" id="cartToastOpen">Открыть корзину</button>
    </div>
  `;
  toast.classList.add("show");
  document.getElementById("cartToastOpen").addEventListener("click", () => {
    toast.classList.remove("show");
    openCartModal();
  });
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 4000);
}

/* ---------------- Модалка корзины ---------------- */
function openCartModal() {
  renderCartModal();
  openModal("modalCart");
}

function cartItemLine(it) {
  const lineTotal = (it.price || 0) * it.qty;
  const paramsText = Object.values(it.params || {})
    .filter((v) => typeof v === "string")
    .join(" · ");
  return `
    <div class="cart-item">
      <div class="cart-item-icon">${icon(it.icon || "photo")}</div>
      <div class="cart-item-body">
        <div class="cart-item-title">${it.serviceTitle}</div>
        ${paramsText ? `<div class="cart-item-params">${paramsText}</div>` : ""}
        ${it.needsConsult ? `<div class="cart-item-params">Точная цена — по согласованию с оператором</div>` : ""}
        ${it.files && it.files.length ? `<div class="cart-item-params">Файлов: ${it.files.length}</div>` : ""}
      </div>
      <div class="cart-item-qty">
        <button type="button" data-qty-minus="${it.id}">${icon("minus")}</button>
        <span>${it.qty}</span>
        <button type="button" data-qty-plus="${it.id}">${icon("plus")}</button>
      </div>
      <div class="cart-item-price">${it.approxPrice ? "от " : ""}${lineTotal} ₽</div>
      <button type="button" class="cart-item-remove" data-remove-cart="${it.id}">${icon("trash")}</button>
    </div>
  `;
}

function renderCartModal() {
  const items = Cart.getAll();
  const el = document.getElementById("cartModalContent");

  if (!items.length) {
    el.innerHTML = `
      <h3>Корзина пуста</h3>
      <p class="modal-sub">Добавьте услуги из каталога — соберём заказ и оформим одним шагом.</p>
      <a href="uslugi.html" class="btn btn-primary">Перейти к услугам</a>
    `;
    return;
  }

  const total = Cart.total();
  el.innerHTML = `
    <h3>Ваша корзина</h3>
    <p class="modal-sub">Проверьте состав заказа и оставьте контакты — свяжемся для подтверждения.</p>
    <div class="cart-list">${items.map(cartItemLine).join("")}</div>
    <div class="order-summary" style="display:flex; justify-content:space-between; align-items:center;">
      <span>Итого:</span>
      <strong style="font-size:1.2rem;">${total} ₽</strong>
    </div>
    <div class="form-row" style="margin-top:18px;">
      <label>Как к вам обращаться? *</label>
      <input type="text" id="cartName" placeholder="Имя">
    </div>
    <div class="form-row">
      <label>Телефон *</label>
      <input type="tel" id="cartPhone" placeholder="+7 900 000-00-00">
    </div>
    <div class="form-row">
      <label>Комментарий к заказу</label>
      <textarea id="cartNotes" placeholder="Например, удобное время для звонка"></textarea>
    </div>
    <div class="order-actions">
      <button type="button" class="btn btn-outline" id="cartClearBtn">Очистить корзину</button>
      <button type="button" class="btn btn-primary btn-block" id="cartCheckoutBtn">Оформить заказ</button>
    </div>
  `;

  el.querySelectorAll("[data-qty-plus]").forEach((b) =>
    b.addEventListener("click", () => {
      const it = items.find((x) => x.id === b.dataset.qtyPlus);
      Cart.setQty(b.dataset.qtyPlus, (it.qty || 1) + 1);
      renderCartModal();
    })
  );
  el.querySelectorAll("[data-qty-minus]").forEach((b) =>
    b.addEventListener("click", () => {
      const it = items.find((x) => x.id === b.dataset.qtyMinus);
      Cart.setQty(b.dataset.qtyMinus, (it.qty || 1) - 1);
      renderCartModal();
    })
  );
  el.querySelectorAll("[data-remove-cart]").forEach((b) =>
    b.addEventListener("click", () => { Cart.remove(b.dataset.removeCart); renderCartModal(); })
  );
  document.getElementById("cartClearBtn").addEventListener("click", () => {
    if (confirm("Очистить корзину?")) { Cart.clear(); renderCartModal(); }
  });
  document.getElementById("cartCheckoutBtn").addEventListener("click", () => checkoutCart());
}

async function checkoutCart() {
  const name = document.getElementById("cartName").value.trim();
  const phone = document.getElementById("cartPhone").value.trim();
  const notes = document.getElementById("cartNotes").value.trim();
  if (!phone) { alert("Укажите номер телефона"); return; }

  const items = Cart.getAll();
  const total = Cart.total();
  const btn = document.getElementById("cartCheckoutBtn");
  btn.disabled = true; btn.textContent = "Оформляем…";

  if (isStaticPreview()) {
    showCartSuccess({ id: "preview-" + Date.now(), price: total }, items);
    return;
  }

  try {
    const payload = {
      items: items.map((it) => ({
        service: it.service, serviceTitle: it.serviceTitle, qty: it.qty,
        price: it.price, params: it.params, notes: it.notes, files: it.files,
      })),
      name, phone, notes,
    };
    const res = await fetch("/api/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      showCartSuccess(data.order, items);
    } else {
      alert("Не удалось оформить заказ: " + (data.error || "ошибка сервера"));
      btn.disabled = false; btn.textContent = "Оформить заказ";
    }
  } catch (e) {
    alert("Ошибка сети. Попробуйте ещё раз.");
    btn.disabled = false; btn.textContent = "Оформить заказ";
  }
}

function showCartSuccess(order, items) {
  const needsConsult = items.some((it) => it.needsConsult);
  document.getElementById("cartModalContent").innerHTML = `
    <div class="form-success">
      <div class="ok-icon">${icon("check")}</div>
      <h3>Заказ №${order.id.slice(0, 8)} принят</h3>
      <p style="color:var(--gray-700);">Мы получили ваш заказ (${items.length} ${items.length === 1 ? "позиция" : "позиции"}) и файлы. Свяжемся с вами для подтверждения деталей.${needsConsult ? " По части позиций точную цену согласует оператор." : ""}</p>
      <div class="order-summary" style="text-align:left;">
        Сумма к оплате: <strong>${order.price} ₽</strong>
      </div>
      <div class="order-actions" style="justify-content:center;">
        <button class="btn btn-primary" id="payBtn">Оплатить онлайн</button>
      </div>
      <div id="payResult"></div>
    </div>
  `;
  Cart.clear();

  document.getElementById("payBtn").addEventListener("click", async () => {
    const payBtn = document.getElementById("payBtn");
    payBtn.disabled = true; payBtn.textContent = "Обработка…";
    if (isStaticPreview()) {
      document.getElementById("payResult").innerHTML = `
        <div class="offline-modal-contact" style="margin-top:14px; text-align:left;">
          <span class="badge-constructor">Демо онлайн-оплаты</span><br>
          Это предпросмотр без сервера — запустите <code>node server.js</code>, чтобы протестировать приём заказов и оплату по-настоящему.
        </div>`;
      payBtn.disabled = false; payBtn.textContent = "Оплатить онлайн";
      return;
    }
    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, amount: order.price }),
      });
      const data = await res.json();
      document.getElementById("payResult").innerHTML = `
        <div class="offline-modal-contact" style="margin-top:14px; text-align:left;">
          ${data.demo ? '<span class="badge-constructor">Демо онлайн-оплаты</span><br>' : ""}
          ${data.message || "Заявка на оплату создана."}
        </div>
      `;
    } catch (e) {
      document.getElementById("payResult").innerHTML = `<p style="color:var(--accent-dark);">Ошибка при обращении к платёжному сервису.</p>`;
    }
    payBtn.disabled = false; payBtn.textContent = "Оплатить онлайн";
  });
}

/* ---------------- Обратный звонок ---------------- */
function wireCallForm() {
  document.getElementById("formCall").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());

    if (isStaticPreview()) {
      document.querySelector("#modalCall .modal").innerHTML = `
        <button class="modal-close" data-close>${icon("close")}</button>
        <div class="form-success">
          <div class="ok-icon">${icon("check")}</div>
          <h3>Это предпросмотр</h3>
          <p style="color:var(--gray-700);">Форма готова, но сайт открыт как файл, без сервера. Запустите <code>node server.js</code>, чтобы заявки реально сохранялись.</p>
        </div>`;
      document.querySelector("#modalCall [data-close]").addEventListener("click", () => closeModal("modalCall"));
      return;
    }

    try {
      const res = await fetch("/api/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        document.querySelector("#modalCall .modal").innerHTML = `
          <button class="modal-close" data-close>${icon("close")}</button>
          <div class="form-success">
            <div class="ok-icon">${icon("check")}</div>
            <h3>Заявка отправлена!</h3>
            <p style="color:var(--gray-700);">Перезвоним вам в ближайшее рабочее время.</p>
          </div>
        `;
        document.querySelector("#modalCall [data-close]").addEventListener("click", () => closeModal("modalCall"));
      }
    } catch (err) {
      alert("Ошибка сети, попробуйте позвонить нам напрямую: " + CONTACT.phone);
    }
  });
}

/* ---------------- Форма отзыва ---------------- */
function wireReviewForm() {
  const form = document.getElementById("formReview");
  if (!form) return;
  let reviewPhoto = null;

  const fileInput = document.getElementById("reviewPhotoInput");
  const fileLabel = document.getElementById("reviewPhotoLabel");
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      reviewPhoto = fileInput.files[0] || null;
      if (fileLabel) fileLabel.textContent = reviewPhoto ? reviewPhoto.name : "Прикрепить фото (необязательно)";
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("reviewName").value.trim();
    const email = document.getElementById("reviewEmail").value.trim();
    const text = document.getElementById("reviewText").value.trim();
    const resultBox = document.getElementById("reviewFormResult");
    if (!name || !text) { alert("Заполните имя и текст отзыва"); return; }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = "Отправляем…";

    if (isStaticPreview()) {
      resultBox.innerHTML = `<div class="offline-modal-contact"><span class="badge-constructor">Демо</span> Форма готова — отзывы реально сохранятся после запуска <code>node server.js</code>.</div>`;
      btn.disabled = false; btn.textContent = "Отправить отзыв";
      form.reset();
      return;
    }

    try {
      const payload = { name, email, text };
      if (reviewPhoto) {
        payload.photo = { name: reviewPhoto.name, type: reviewPhoto.type, dataBase64: await fileToBase64(reviewPhoto) };
      }
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        resultBox.innerHTML = `<div class="offline-modal-contact">Спасибо! Отзыв отправлен на модерацию и скоро появится на сайте.</div>`;
        form.reset();
        reviewPhoto = null;
        if (fileLabel) fileLabel.textContent = "Прикрепить фото (необязательно)";
      } else {
        resultBox.innerHTML = `<p style="color:var(--accent-dark);">${data.error || "Не удалось отправить отзыв"}</p>`;
      }
    } catch (err) {
      resultBox.innerHTML = `<p style="color:var(--accent-dark);">Ошибка сети. Попробуйте ещё раз.</p>`;
    }
    btn.disabled = false; btn.textContent = "Отправить отзыв";
  });
}

/* ---------------- Инициализация ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  initLayout();
  initChrome();
  renderPromos();
  renderAdvantages();
  renderServices();
  renderOffline();
  wireCallForm();
  wireReviewForm();
  initScrollReveal();
});
