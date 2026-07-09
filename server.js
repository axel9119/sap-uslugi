/**
 * ФотоКопиЦентр — новый сайт (прототип рабочего сайта).
 * Написано БЕЗ внешних npm-зависимостей (только встроенные модули Node.js),
 * чтобы сайт запускался сразу командой `node server.js` — без npm install
 * и без выхода в интернет.
 *
 * Что умеет сервер:
 *  - отдаёт статические файлы сайта (папка /public)
 *  - принимает заказы (JSON, файлы в base64) и сохраняет их в data/orders.json,
 *    а сами файлы — в папку /uploads
 *  - принимает заявки на обратный звонок (data/callbacks.json)
 *  - отдаёт список текущих акций (data/promos.json) — можно редактировать
 *    вручную, в дальнейшем эти же акции можно будет использовать в Яндекс.Директе
 *
 * ВАЖНО про онлайн-оплату:
 * Реальный приём платежей требует подключения платёжного провайдера
 * (например ЮKassa / CloudPayments / Т-Касса) с реквизитами продавца.
 * Эндпоинт /api/pay подготовлен как точка интеграции — сейчас он создаёт
 * "заявку на оплату" и возвращает демо-ответ. Когда заказчик пришлёт
 * реквизиты продавца и API-ключи, здесь подключается реальный SDK.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const CALLBACKS_FILE = path.join(DATA_DIR, "callbacks.json");
const PROMOS_FILE = path.join(DATA_DIR, "promos.json");
const REVIEWS_FILE = path.join(DATA_DIR, "reviews-inbox.json");

for (const dir of [DATA_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
for (const f of [ORDERS_FILE, CALLBACKS_FILE, REVIEWS_FILE]) {
  if (!fs.existsSync(f)) fs.writeFileSync(f, "[]", "utf8");
}
if (!fs.existsSync(PROMOS_FILE)) fs.writeFileSync(PROMOS_FILE, "[]", "utf8");

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Тело запроса слишком большое"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  rel = decodeURIComponent(rel.split("?")[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Страница не найдена");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function serveUpload(req, res, pathname) {
  const rel = decodeURIComponent(pathname.replace("/uploads/", ""));
  const filePath = path.normalize(path.join(UPLOAD_DIR, rel));
  if (!filePath.startsWith(UPLOAD_DIR)) { res.writeHead(403); res.end("Forbidden"); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

async function handleApi(req, res, pathname) {
  // ---------- GET /api/promos ----------
  if (pathname === "/api/promos" && req.method === "GET") {
    return sendJSON(res, 200, readJSON(PROMOS_FILE));
  }

  // ---------- GET /api/orders (для оператора) ----------
  if (pathname === "/api/orders" && req.method === "GET") {
    return sendJSON(res, 200, readJSON(ORDERS_FILE));
  }

  // ---------- POST /api/callback ----------
  if (pathname === "/api/callback" && req.method === "POST") {
    let body;
    try {
      const buf = await readBody(req, 1 * 1024 * 1024);
      body = JSON.parse(buf.toString("utf8") || "{}");
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: "Некорректный запрос" });
    }
    if (!body.phone) return sendJSON(res, 400, { ok: false, error: "Укажите телефон" });
    const list = readJSON(CALLBACKS_FILE);
    const entry = {
      id: crypto.randomUUID(),
      name: body.name || "",
      phone: body.phone,
      message: body.message || "",
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    writeJSON(CALLBACKS_FILE, list);
    return sendJSON(res, 200, { ok: true, id: entry.id });
  }

  // ---------- POST /api/review ----------
  if (pathname === "/api/review" && req.method === "POST") {
    let body;
    try {
      const buf = await readBody(req, 20 * 1024 * 1024);
      body = JSON.parse(buf.toString("utf8") || "{}");
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: "Некорректный запрос" });
    }
    if (!body.name || !body.text) return sendJSON(res, 400, { ok: false, error: "Заполните имя и текст отзыва" });

    let photo = null;
    if (body.photo && body.photo.dataBase64) {
      try {
        const ext = path.extname(body.photo.name || "") || guessExt(body.photo.type);
        const id = crypto.randomBytes(6).toString("hex");
        const storedName = `${Date.now()}_${id}${ext}`;
        fs.writeFileSync(path.join(UPLOAD_DIR, storedName), Buffer.from(body.photo.dataBase64, "base64"));
        photo = `/uploads/${storedName}`;
      } catch (e) { /* игнорируем повреждённый файл */ }
    }

    const list = readJSON(REVIEWS_FILE);
    const entry = {
      id: crypto.randomUUID(),
      name: body.name,
      email: body.email || "",
      text: body.text,
      photo,
      status: "pending", // модерация перед публикацией
      createdAt: new Date().toISOString(),
    };
    list.push(entry);
    writeJSON(REVIEWS_FILE, list);
    return sendJSON(res, 200, { ok: true, id: entry.id });
  }

  // ---------- POST /api/order ----------
  // Поддерживает два формата тела запроса:
  //  1) Старый — один товар: { service, serviceTitle, price, params, notes, files:[...] }
  //  2) Корзина — несколько товаров: { items: [{service, serviceTitle, price, qty, params, notes, files:[...]}], name, phone, notes }
  if (pathname === "/api/order" && req.method === "POST") {
    let body;
    try {
      const buf = await readBody(req, 120 * 1024 * 1024); // до ~120 МБ (несколько base64-файлов в корзине)
      body = JSON.parse(buf.toString("utf8") || "{}");
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: "Некорректный запрос или превышен размер файлов" });
    }

    function saveFiles(files) {
      const saved = [];
      for (const f of files || []) {
        try {
          const ext = path.extname(f.name || "") || guessExt(f.type);
          const id = crypto.randomBytes(6).toString("hex");
          const storedName = `${Date.now()}_${id}${ext}`;
          const buf = Buffer.from(f.dataBase64, "base64");
          fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buf);
          saved.push({
            originalName: f.name || storedName,
            storedName,
            url: `/uploads/${storedName}`,
            size: buf.length,
            mimetype: f.type || "",
          });
        } catch (e) {
          // пропускаем повреждённый файл, но не роняем весь заказ
        }
      }
      return saved;
    }

    function parseParams(p) {
      try { return typeof p === "string" ? JSON.parse(p) : (p || {}); } catch (e) { return {}; }
    }

    let order;

    if (Array.isArray(body.items) && body.items.length) {
      const items = body.items.map((it) => {
        const qty = Math.max(1, parseInt(it.qty, 10) || 1);
        return {
          service: it.service || "unknown",
          serviceTitle: it.serviceTitle || "",
          qty,
          price: it.price || null,
          lineTotal: it.price ? it.price * qty : null,
          params: parseParams(it.params),
          notes: it.notes || "",
          files: saveFiles(it.files),
        };
      });
      const total = items.reduce((sum, it) => sum + (it.lineTotal || 0), 0);

      order = {
        id: crypto.randomUUID(),
        type: "cart",
        items,
        name: body.name || "",
        phone: body.phone || "",
        notes: body.notes || "",
        price: total,
        status: "new",
        createdAt: new Date().toISOString(),
      };
    } else {
      order = {
        id: crypto.randomUUID(),
        type: "single",
        service: body.service || "unknown",
        serviceTitle: body.serviceTitle || "",
        name: body.name || "",
        phone: body.phone || "",
        params: parseParams(body.params),
        notes: body.notes || "",
        price: body.price || null,
        files: saveFiles(body.files),
        status: "new",
        createdAt: new Date().toISOString(),
      };
    }

    const list = readJSON(ORDERS_FILE);
    list.push(order);
    writeJSON(ORDERS_FILE, list);

    return sendJSON(res, 200, { ok: true, order });
  }

  // ---------- POST /api/pay (заглушка платёжного шлюза) ----------
  if (pathname === "/api/pay" && req.method === "POST") {
    let body;
    try {
      const buf = await readBody(req, 200 * 1024);
      body = JSON.parse(buf.toString("utf8") || "{}");
    } catch (e) {
      return sendJSON(res, 400, { ok: false, error: "Некорректный запрос" });
    }
    if (!body.orderId) return sendJSON(res, 400, { ok: false, error: "orderId обязателен" });

    const fakePaymentId = "demo_" + crypto.randomBytes(8).toString("hex");
    return sendJSON(res, 200, {
      ok: true,
      demo: true,
      message: "Платёжный шлюз ещё не подключён. Это заглушка — реальная оплата появится после подключения провайдера (ЮKassa / CloudPayments / Т-Касса).",
      paymentId: fakePaymentId,
      amount: body.amount || null,
    });
  }

  return sendJSON(res, 404, { ok: false, error: "Не найдено" });
}

function guessExt(mime) {
  const map = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "application/pdf": ".pdf" };
  return map[mime] || "";
}

const server = http.createServer((req, res) => {
  const pathname = req.url.split("?")[0];

  if (pathname.startsWith("/api/")) {
    handleApi(req, res, pathname).catch((err) => {
      console.error(err);
      sendJSON(res, 500, { ok: false, error: "Внутренняя ошибка сервера" });
    });
    return;
  }
  if (pathname.startsWith("/uploads/")) {
    return serveUpload(req, res, pathname);
  }
  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`ФотоКопиЦентр — сервер запущен: http://localhost:${PORT}`);
});
