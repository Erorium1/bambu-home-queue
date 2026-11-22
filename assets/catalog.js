// Каталог: реальные модели с MakerWorld (Bambu Lab).
// img — обложка с CDN MakerWorld (если пусто, сайт попробует подтянуть её сам через /api/preview)
// h — примерное время печати одной штуки, часы
export const MW_HOME = 'https://makerworld.com/ru';
const CDN = 'https://makerworld.bblmw.com/makerworld/model/';

export const CATEGORIES = [
  { id: 'all', label: 'Все' },
  { id: 'toys', label: 'Игрушки' },
  { id: 'fidget', label: 'Антистресс' },
  { id: 'games', label: 'Игры' },
  { id: 'desk', label: 'Рабочий стол' },
  { id: 'home', label: 'Для дома' },
];

export const CATALOG = [
  { id: 'dragon', t: 'Гибкий дракон', c: 'toys', h: 3, mw: 3127143, img: 'USfbb3c654c22746/design/6d017b9d9c8b4076.jpg', d: 'Печатается сразу подвижным, без поддержек и сборки.' },
  { id: 'shark', t: 'Акула на шарнирах', c: 'toys', h: 1.3, mw: 463778, d: 'Оригинальная Articulated Shark — одна из самых популярных моделей MakerWorld.' },
  { id: 'axolotl', t: 'Кристальный аксолотль', c: 'toys', h: 2, mw: 2296638, img: 'US1067bf992e868d/design/420d0842661bfbea.png', d: 'Подвижный, без поддержек, можно в один или несколько цветов.' },
  { id: 'axolotl2', t: 'Аксолотль на шарнирах', c: 'toys', h: 2, mw: 2660128, d: 'Несколько размеров, печать без AMS.' },
  { id: 'cats', t: 'Гибкие котики', c: 'toys', h: 0.6, mw: 2203998, d: 'Короткая и длинная версии, печать около 40 минут.' },
  { id: 'octopus', t: 'Осьминог', c: 'toys', h: 1, mw: 1956534, img: 'USb419cce49b0282/design/2025-11-03_cfc4a4fe411078.jpg', d: 'Маленький осьминог с подвижными щупальцами.' },
  { id: 'octopus2', t: 'Осьминог детализированный', c: 'toys', h: 3.8, mw: 1013703, d: 'Крупнее, с фактурной головой. Печатается одной деталью.' },
  { id: 'benchy', t: 'Кораблик 3DBenchy', c: 'toys', h: 0.5, mw: 15106, img: 'US3f9fe757a16d44/design/2023-09-20_cfa497eb38848.jpg', d: 'Классическая тестовая модель 3D-печати.' },

  { id: 'cube', t: 'Бесконечный куб', c: 'fidget', h: 3, mw: 888012, d: 'Складывается бесконечно. Есть версии в 1 и 3 цвета.' },
  { id: 'planetary', t: 'Спиннер с планетарной передачей', c: 'fidget', h: 1.5, mw: 1932158, d: 'Рабочая планетарная передача, печатается собранной.' },
  { id: 'gear-ring', t: 'Кольцо-спиннер с шестернями', c: 'fidget', h: 0.5, mw: 3099664, img: 'US151d3200d6c7bb/design/5b261bdb014bdae9.jpg', d: 'Лёгкий карманный спиннер, около 6 г пластика.' },

  { id: 'marble', t: 'Модульная мраморная трасса', c: 'games', h: 6, mw: 879349, img: 'DSM00000000879349/design/2024-12-14_7580fc43e4efc.png', d: 'Детали печатаются плоско и собираются в любую трассу.' },
  { id: 'chess', t: 'Шахматы, турнирные пропорции', c: 'games', h: 8, mw: 2527178, img: 'DSM00000002527178/design/9d6b34037bc3ccf8.jpg', d: 'Классический набор фигур, печатается в двух цветах.' },
  { id: 'chess-travel', t: 'Дорожные шахматы с доской', c: 'games', h: 8.3, mw: 2915700, d: 'Компактная доска и фигуры, без AMS.' },

  { id: 'phone', t: 'Подставка для телефона', c: 'desk', h: 2, mw: 2944494, img: 'US700308606350ae/design/b89f8f7d71ec5076.jpg', d: 'Держит телефон вертикально и горизонтально.' },
  { id: 'pencil', t: 'Стакан для ручек', c: 'desk', h: 2, mw: 2325995, img: 'DSM00000002325995/design/5c48b86e5ff50a7a.png', d: 'Простой и аккуратный органайзер для стола.' },
  { id: 'organizer', t: 'Органайзер для стола', c: 'desk', h: 4, mw: 2548565, img: 'USc3a14e3235ba94/669905306/instance/945f1f48a44065f8.png', d: 'Ручки, ножницы, степлер и лоток для мелочей.' },
  { id: 'headphones', t: 'Подставка для наушников', c: 'desk', h: 5.4, mw: 1539604, d: 'Минималистичная, печатается одной деталью.' },

  { id: 'incurva', t: 'Кашпо с автополивом Incurva', c: 'home', h: 4, mw: 2543366, img: 'USbfef966dff239/design/d38d07ea7dfcd1b0.png', d: 'Для зелени на подоконнике, полив через фитиль.' },
  { id: 'planter', t: 'Кашпо с автополивом, модерн', c: 'home', h: 5, mw: 2315160, img: 'US83126b4e35328d/design/068e606c7ef58256.png', d: 'Полностью печатное, без дополнительных деталей.' },
  { id: 'vase', t: 'Ваза Helix', c: 'home', h: 2, mw: 2969947, img: 'US8c0ebc8d6ffca4/design/28e7f561017adca8.png', d: 'Печатается в режиме вазы одной стенкой.' },
].map((m) => ({
  ...m,
  url: `https://makerworld.com/ru/models/${m.mw}`,
  img: m.img ? `${CDN}${m.img}?x-oss-process=image/resize,w_640/format,webp` : '',
}));

export const COLORS = [
  { n: 'Любой', v: 'any' },
  { n: 'Белый', v: '#f3f2ee' },
  { n: 'Чёрный', v: '#1b1c1e' },
  { n: 'Серый', v: '#8a8e93' },
  { n: 'Красный', v: '#e3342f' },
  { n: 'Оранжевый', v: '#ff7a1a' },
  { n: 'Жёлтый', v: '#ffd21f' },
  { n: 'Зелёный', v: '#00ae42' },
  { n: 'Мятный', v: '#6fe3c1' },
  { n: 'Голубой', v: '#5cc8ff' },
  { n: 'Синий', v: '#2a62e8' },
  { n: 'Фиолетовый', v: '#8a4dff' },
  { n: 'Розовый', v: '#ff6fb5' },
  { n: 'Коричневый', v: '#8b5a2b' },
  { n: 'Мультицвет', v: 'multi' },
];

export const mwSearch = (q) => `https://makerworld.com/ru/search/models?keyword=${encodeURIComponent(q)}`;
