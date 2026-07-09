// Примеры работ. Временно подключены с текущего сайта sap-uslugi.ru —
// после получения свежих фото от заказчика достаточно заменить ссылки в этом файле.
const GALLERY = [
  { src: "https://sap-uslugi.ru/assets/galleries/8/gal2-big.jpg", tag: "Печать фото", cat: "photo" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/gal4-big.jpg", tag: "Сувениры", cat: "souvenir" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/gal3-big(2).jpg", tag: "Широкоформатная печать", cat: "print" },
  { src: "https://sap-uslugi.ru/assets/galleries/37/xxxl.jpg", tag: "Печать на холсте", cat: "souvenir" },
  { src: "https://sap-uslugi.ru/assets/galleries/38/xxxl-1.jpg", tag: "Печать на холсте", cat: "souvenir" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-0b07ab1e4e6f81a95c292ad7a5339ce33bcc06840ac098780e012d97e9930f06_36fecbcf3e43e6cb.jpg", tag: "Печати и штампы", cat: "stamps" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-1a615c7d6382a02ca1c57ca1a7b4bb87fdda48ccab055de57bfaabb5a2f94f2c_35ae8af2680caf7d.jpg", tag: "Сувениры", cat: "souvenir" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-3dee833edd368b4834369c0471473ceb6f59b803e1e6eeb504a90d4362a6985e_43fd4d32303d8d0a.jpg", tag: "Печать фото", cat: "photo" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-5a5d5b20274094cd6523de63d710e146eafe3f08cb5d8cf49937a777b3bedb57_7b406924d7adee4b.jpg", tag: "Широкоформатная печать", cat: "print" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-6e40930252a6aabd6d052610dd3d5fa61461171153891f3e05eb35cc9e0efa4d_7cbdd7680356533.jpg", tag: "Печати и штампы", cat: "stamps" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-24de7e306f217913bd50c8ed7eddce9e0d453b13dd6251b8f489a5830ec8a161_2c7656e3fb78b335.jpg", tag: "Сувениры", cat: "souvenir" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-29c21bc5ee38c85494566a6cc7d89bc0a3cdb3f7fd1a673d081a65d437215535_8cda58f5507bb14c.jpg", tag: "Печать фото", cat: "photo" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-89fe0f1533f276ed1f62797e073369e3a6d918ce6bff2f538fc4a5f9acd2b233_bccd9e51d4b17015.jpg", tag: "Широкоформатная печать", cat: "print" },
  { src: "https://sap-uslugi.ru/assets/galleries/8/0-02-05-12dc05c28f21f22ee2ceebc519a41b4c6d865acc6813ab4f5077d3ad87bc4db5_f917599e8ad7283c.jpg", tag: "Сувениры", cat: "souvenir" },
];

function galleryItemHTML(g) {
  return `
    <div class="gallery-item reveal" data-cat="${g.cat}">
      <img src="${g.src}" alt="${g.tag}" loading="lazy" onerror="this.closest('.gallery-item').style.display='none'">
      <span class="tag">${g.tag}</span>
    </div>
  `;
}

function renderGallery(filter) {
  const el = document.getElementById("galleryGrid");
  if (!el) return;
  const items = !filter || filter === "all" ? GALLERY : GALLERY.filter((g) => g.cat === filter);
  el.innerHTML = items.map(galleryItemHTML).join("");
  if (typeof initScrollReveal === "function") initScrollReveal();
}
