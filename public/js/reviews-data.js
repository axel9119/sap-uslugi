// Реальные отзывы клиентов (перенесены с текущего сайта sap-uslugi.ru)
const REVIEWS = [
  {
    name: "Баскач",
    rating: 5,
    text: "Вы просто лучшие! Отличное руководство и замечательные сотрудники! Очень срочно нужно было сделать футболку с принтом для подарка, обратился к ним, качество принта и футболки очень хорошее! Сделали очень быстро! Спасибо большое, теперь буду обращаться только к вам!",
  },
  {
    name: "Оксана М.",
    rating: 5,
    text: "Отличный фотокопицентр, ребята помогли быстро решить проблему и предложили свои корректировки в кратчайшие сроки. Было бы 10 звёзд, поставила бы 10. Спасибо за проделанную работу.",
  },
  {
    name: "Анна В.",
    rating: 5,
    text: "Заказывала подушку и очень осталась довольна результатом, ребята молодцы, очень быстро всё сделали!",
  },
  {
    name: "Dlover M.",
    rating: 5,
    text: "Делали фото на холсте, качество супер! Знатоки своего дела, так держать!",
  },
  {
    name: "Валерия Ф.",
    rating: 5,
    text: "Делала фото на паспорт. Получилась отличная фотография, всё обработали так, как попросила. Приятный молодой человек, который делал фото. Цена хорошая — за 4 фотографии 250 р.",
  },
  {
    name: "Дарья Г.",
    rating: 5,
    text: "Огромный спектр услуг. Можно делать заказы не выходя из дома. Приветливый персонал. Цены доступные. Обращаюсь только к ним. Если придётся переехать с Ангарского — всё равно буду пользоваться их услугами!",
  },
  {
    name: "Данила Сацкевич",
    rating: 5,
    text: "Ребята молодцы, делают всё быстро, качественно и, главное, дёшево.",
  },
  {
    name: "Авамисова",
    rating: 5,
    text: "Очень хорошая и быстрая печать и ксерокопия. Работает отзывчивый и доброжелательный персонал, который быстро и качественно проконсультирует.",
  },
];

function starsHTML(n) {
  return Array.from({ length: 5 }, (_, i) => `<span class="star${i < n ? " filled" : ""}">★</span>`).join("");
}

function reviewCard(r) {
  const initial = r.name.trim().charAt(0).toUpperCase();
  return `
    <div class="review-card reveal">
      <div class="review-head">
        <div class="review-avatar">${initial}</div>
        <div>
          <div class="review-name">${r.name}</div>
          <div class="review-stars">${starsHTML(r.rating)}</div>
        </div>
      </div>
      <p class="review-text">${r.text}</p>
    </div>
  `;
}

function renderReviewsTeaser() {
  const el = document.getElementById("reviewsTeaser");
  if (!el) return;
  el.innerHTML = REVIEWS.slice(0, 3).map(reviewCard).join("");
  if (typeof initScrollReveal === "function") initScrollReveal();
}

function renderAllReviews() {
  const el = document.getElementById("reviewsAll");
  if (!el) return;
  el.innerHTML = REVIEWS.map(reviewCard).join("");
  if (typeof initScrollReveal === "function") initScrollReveal();
}
