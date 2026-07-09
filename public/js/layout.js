/* ==========================================================
   Общие шапка / подвал / модалки — переиспользуются на всех
   страницах сайта. Без fetch и без абсолютных путей, поэтому
   работает как через сервер, так и при открытии файла напрямую.
   ========================================================== */

const NAV_LINKS = [
  { href: "index.html", key: "home", label: "Главная" },
  { href: "o-kompanii.html", key: "about", label: "О компании" },
  { href: "uslugi.html", key: "services", label: "Услуги" },
  { href: "galereya.html", key: "gallery", label: "Галерея" },
  { href: "otzyvy.html", key: "reviews", label: "Отзывы" },
  { href: "kontakty.html", key: "contacts", label: "Контакты" },
];

function renderHeader(active) {
  return `
  <div class="topbar">
    <div class="container">
      <div class="topbar-left">
        <span id="tb-address"></span>
        <span>пн–пт 09:00–19:00, сб-вс 10:00–18:00</span>
      </div>
      <div class="topbar-right">
        <a href="mailto:sap-uslugi@yandex.ru" id="tb-mail"></a>
        <div class="topbar-messengers">
          <a href="#" title="MAX" id="tb-max"></a>
        </div>
      </div>
    </div>
  </div>

  <header class="site-header">
    <div class="container">
      <a href="index.html" class="brand">
        <img src="https://sap-uslugi.ru/img/logo.png" alt="ФотоКопиЦентр" onerror="this.style.display='none'">
        <span class="brand-name">ФотоКопиЦентр<span>печать • фото • сувениры</span></span>
      </a>
      <nav class="main-nav" id="mainNav">
        ${NAV_LINKS.map((l) => `<a href="${l.href}"${l.key === active ? ' class="active"' : ""}>${l.label}</a>`).join("")}
        <button class="btn btn-primary btn-sm" id="navCallBtn">Заказать звонок</button>
      </nav>
      <div class="header-cta">
        <a href="tel:+79285330470" class="header-phone">+7 928 533-04-70<span>Позвонить сейчас</span></a>
        <button class="cart-btn" id="stampConstructorBtn" title="Конструктор печатей онлайн" aria-label="Конструктор печатей">
          ${icon("stamp")}
        </button>
        <button class="cart-btn" id="cartBtn" aria-label="Корзина">
          ${icon("cart")}
          <span class="cart-badge" id="cartBadge" style="display:none;">0</span>
        </button>
        <button class="nav-toggle" id="navToggle" aria-label="Меню"></button>
      </div>
    </div>
  </header>
  `;
}

function renderFooter() {
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">
            <img src="https://sap-uslugi.ru/img/logo.png" alt="ФотоКопиЦентр" onerror="this.style.display='none'">
            <strong>ФотоКопиЦентр</strong>
          </div>
          <p>Печать фотографий, сувенирная продукция, печати и штампы, ксерокопия и другие услуги копицентра в Волгограде.</p>
          <div class="footer-social">
            <a href="#" title="MAX">${icon("max")}</a>
            <a href="mailto:sap-uslugi@yandex.ru" title="Почта">${icon("mail")}</a>
          </div>
        </div>
        <div>
          <h4>Разделы</h4>
          <ul class="footer-list">
            ${NAV_LINKS.map((l) => `<li><a href="${l.href}">${l.label}</a></li>`).join("")}
          </ul>
        </div>
        <div>
          <h4>Связаться</h4>
          <ul class="footer-list">
            <li><a href="tel:+79285330470">+7 928 533-04-70</a></li>
            <li><a href="mailto:sap-uslugi@yandex.ru">sap-uslugi@yandex.ru</a></li>
            <li>г. Волгоград, ул. Ангарская, 114</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026, ФотоКопиЦентр</span>
        <span>Информация на сайте носит ознакомительный характер и не является офертой</span>
      </div>
    </div>
  </footer>
  `;
}

function renderModals() {
  return `
  <div class="modal-overlay" id="modalCall">
    <div class="modal">
      <button class="modal-close" data-close></button>
      <h3>Заказать звонок</h3>
      <p class="modal-sub">Оставьте номер — перезвоним в ближайшее рабочее время.</p>
      <form id="formCall">
        <div class="form-row">
          <label>Как к вам обращаться?</label>
          <input type="text" name="name" placeholder="Имя">
        </div>
        <div class="form-row">
          <label>Ваш телефон *</label>
          <input type="tel" name="phone" placeholder="+7 900 000-00-00" required>
        </div>
        <div class="form-row">
          <label>Сообщение</label>
          <textarea name="message" placeholder="Коротко опишите вопрос"></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Отправить</button>
      </form>
    </div>
  </div>

  <div class="modal-overlay" id="modalOffline">
    <div class="modal">
      <button class="modal-close" data-close></button>
      <div id="offlineModalContent"></div>
    </div>
  </div>

  <div class="modal-overlay" id="modalOrder">
    <div class="modal modal-wide">
      <button class="modal-close" data-close></button>
      <div id="orderModalContent"></div>
    </div>
  </div>

  <div class="modal-overlay" id="modalCart">
    <div class="modal modal-wide">
      <button class="modal-close" data-close></button>
      <div id="cartModalContent"></div>
    </div>
  </div>

  <div class="editor-overlay" id="photoEditorOverlay">
    <button class="editor-overlay-close" data-editor-close="photoEditorOverlay" aria-label="Закрыть"></button>
    <div class="editor-panel" id="photoEditorPanel"></div>
  </div>

  <div class="editor-overlay" id="stampEditorOverlay">
    <button class="editor-overlay-close" data-editor-close="stampEditorOverlay" aria-label="Закрыть"></button>
    <div class="editor-panel" id="stampEditorPanel"></div>
  </div>
  `;
}

function initLayout() {
  const active = document.body.dataset.page || "home";
  document.getElementById("headerMount").innerHTML = renderHeader(active);
  document.getElementById("footerMount").innerHTML = renderFooter();
  document.getElementById("modalsMount").innerHTML = renderModals();
}
