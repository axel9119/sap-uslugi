/* ==========================================================
   Корзина заказов. Хранится в localStorage, поэтому позиции не
   теряются при переходе между страницами сайта.
   ========================================================== */

const Cart = (() => {
  const KEY = "sap_cart_v1";

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {
      // корзина с крупными фото может не влезть в лимит localStorage —
      // тогда просто не сохраняем между страницами, но текущая сессия работает
      console.warn("Не удалось сохранить корзину (возможно, превышен лимит localStorage)", e);
    }
    updateBadge();
  }

  function getAll() {
    return load();
  }

  function add(item) {
    const items = load();
    items.push({
      id: (crypto.randomUUID ? crypto.randomUUID() : "item-" + Date.now() + "-" + Math.random().toString(16).slice(2)),
      qty: 1,
      ...item,
    });
    save(items);
    return items;
  }

  function remove(id) {
    const items = load().filter((it) => it.id !== id);
    save(items);
    return items;
  }

  function setQty(id, qty) {
    const items = load().map((it) => (it.id === id ? { ...it, qty: Math.max(1, qty) } : it));
    save(items);
    return items;
  }

  function clear() {
    save([]);
  }

  function count() {
    return load().reduce((sum, it) => sum + (it.qty || 1), 0);
  }

  function total() {
    return load().reduce((sum, it) => sum + (it.price || 0) * (it.qty || 1), 0);
  }

  function updateBadge() {
    const badge = document.getElementById("cartBadge");
    if (!badge) return;
    const n = count();
    badge.textContent = n;
    badge.style.display = n > 0 ? "flex" : "none";
  }

  return { getAll, add, remove, setQty, clear, count, total, updateBadge };
})();
