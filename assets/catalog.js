// Встроенный каталог. q — запрос для поиска на MakerWorld (каталог Bambu Lab).
// h — примерное время печати на Bambu (часы), lvl: 1 быстро · 2 средне · 3 долго
export const CATEGORIES = [
  { id: 'all', label: 'Всё', icon: '✦' },
  { id: 'toys', label: 'Игрушки', icon: '🧸' },
  { id: 'fidget', label: 'Антистресс', icon: '🌀' },
  { id: 'games', label: 'Игры', icon: '🎲' },
  { id: 'desk', label: 'Для стола', icon: '🖥️' },
  { id: 'home', label: 'Для дома', icon: '🏠' },
  { id: 'gifts', label: 'Подарки', icon: '🎁' },
];

export const CATALOG = [
  { id: 'flexi-dragon', t: 'Гибкий дракон', c: 'toys', e: '🐉', h: 6, lvl: 3, q: 'flexi dragon', d: 'Печатается сразу подвижным, без сборки. Хит у детей.', hue: 150 },
  { id: 'axolotl', t: 'Аксолотль на шарнирах', c: 'toys', e: '🦎', h: 2, lvl: 2, q: 'articulated axolotl', d: 'Мягко гнётся, отлично смотрится в розовом.', hue: 330 },
  { id: 'flexi-cat', t: 'Гибкий котик', c: 'toys', e: '🐱', h: 2, lvl: 2, q: 'flexi cat articulated', d: 'Котик, который двигается каждой частью.', hue: 30 },
  { id: 'octopus', t: 'Осьминожка', c: 'toys', e: '🐙', h: 1.5, lvl: 1, q: 'articulated octopus', d: 'Маленький и быстрый. Можно сразу несколько.', hue: 280 },
  { id: 'shark', t: 'Акула на шарнирах', c: 'toys', e: '🦈', h: 3, lvl: 2, q: 'articulated shark', d: 'Виляет хвостом. Круто в синем или сером.', hue: 205 },
  { id: 'trex', t: 'Скелет динозавра', c: 'toys', e: '🦖', h: 4, lvl: 3, q: 't-rex skeleton print in place', d: 'Большой подвижный T-Rex.', hue: 95 },
  { id: 'turtle', t: 'Черепашка', c: 'toys', e: '🐢', h: 1, lvl: 1, q: 'articulated turtle', d: 'Шевелит лапками. Быстро печатается.', hue: 120 },
  { id: 'rocket', t: 'Ракета', c: 'toys', e: '🚀', h: 2, lvl: 2, q: 'rocket toy', d: 'Для космических миссий на ковре.', hue: 15 },
  { id: 'benchy', t: 'Кораблик Benchy', c: 'toys', e: '⛵', h: 1, lvl: 1, q: 'benchy', d: 'Легендарный тестовый кораблик 3D-печати.', hue: 190 },

  { id: 'gear-spinner', t: 'Спиннер с шестерёнками', c: 'fidget', e: '⚙️', h: 1, lvl: 1, q: 'gear fidget spinner', d: 'Крутится и щёлкает шестерёнками.', hue: 45 },
  { id: 'infinity-cube', t: 'Бесконечный куб', c: 'fidget', e: '🧊', h: 1.5, lvl: 2, q: 'infinity cube fidget', d: 'Складывается бесконечно. Затягивает.', hue: 185 },
  { id: 'clicker', t: 'Кликер-кнопка', c: 'fidget', e: '⌨️', h: 0.5, lvl: 1, q: 'fidget clicker', d: 'Щёлк-щёлк — антистресс в кармане.', hue: 260 },
  { id: 'fidget-slider', t: 'Слайдер-антистресс', c: 'fidget', e: '🌀', h: 1, lvl: 1, q: 'fidget slider', d: 'Двигается туда-сюда с приятным клацанием.', hue: 310 },
  { id: 'gyro', t: 'Гироскоп-кольцо', c: 'fidget', e: '💫', h: 1, lvl: 1, q: 'gyro ring fidget print in place', d: 'Кольца крутятся друг в друге.', hue: 50 },

  { id: 'marble-run', t: 'Мраморная трасса', c: 'games', e: '🎢', h: 8, lvl: 3, q: 'marble run', d: 'Шарики катятся по горкам. Долго, но того стоит.', hue: 345 },
  { id: 'chess', t: 'Шахматы', c: 'games', e: '♟️', h: 10, lvl: 3, q: 'chess set', d: 'Полный набор фигур. Печатаем в два цвета.', hue: 0 },
  { id: 'puzzle-box', t: 'Коробка-головоломка', c: 'games', e: '🧩', h: 3, lvl: 2, q: 'puzzle box', d: 'Открой, если сможешь. Внутрь можно спрятать сюрприз.', hue: 75 },
  { id: 'catapult', t: 'Мини-катапульта', c: 'games', e: '🏹', h: 2, lvl: 2, q: 'mini catapult', d: 'Стреляет шариками из бумаги.', hue: 25 },
  { id: 'labyrinth', t: 'Лабиринт с шариком', c: 'games', e: '🌐', h: 4, lvl: 3, q: 'maze ball labyrinth', d: 'Проведи шарик к центру.', hue: 230 },

  { id: 'phone-stand', t: 'Подставка для телефона', c: 'desk', e: '📱', h: 1, lvl: 1, q: 'phone stand', d: 'Чтобы смотреть мультики без рук.', hue: 210 },
  { id: 'headphones', t: 'Держатель наушников', c: 'desk', e: '🎧', h: 3, lvl: 2, q: 'headphone stand', d: 'Аккуратное место для наушников.', hue: 270 },
  { id: 'pencil-cup', t: 'Стакан для карандашей', c: 'desk', e: '✏️', h: 2, lvl: 1, q: 'pencil holder', d: 'Для ручек, карандашей и фломастеров.', hue: 55 },
  { id: 'gamepad', t: 'Держатель геймпада', c: 'desk', e: '🎮', h: 2, lvl: 2, q: 'controller holder', d: 'Геймпад всегда на месте.', hue: 290 },
  { id: 'cable', t: 'Органайзер для проводов', c: 'desk', e: '🔌', h: 0.5, lvl: 1, q: 'cable organizer', d: 'Зарядки больше не падают со стола.', hue: 160 },

  { id: 'planter', t: 'Кашпо для цветка', c: 'home', e: '🪴', h: 3, lvl: 2, q: 'planter pot', d: 'Красивый горшок с поддоном.', hue: 110 },
  { id: 'vase', t: 'Спиральная ваза', c: 'home', e: '🏺', h: 2, lvl: 1, q: 'spiral vase', d: 'Печатается одной стенкой — очень эффектно.', hue: 20 },
  { id: 'hooks', t: 'Крючки на стену', c: 'home', e: '🪝', h: 0.5, lvl: 1, q: 'wall hook', d: 'Для ключей, рюкзаков и полотенец.', hue: 200 },
  { id: 'lamp', t: 'Ночник-абажур', c: 'home', e: '💡', h: 5, lvl: 3, q: 'lamp shade', d: 'Под светодиодную свечку или гирлянду.', hue: 45 },

  { id: 'keychain', t: 'Брелок с именем', c: 'gifts', e: '🔑', h: 0.5, lvl: 1, q: 'name keychain', d: 'Напиши имя в комментарии — сделаем.', hue: 140 },
  { id: 'bookmark', t: 'Закладка для книги', c: 'gifts', e: '🔖', h: 0.5, lvl: 1, q: 'bookmark', d: 'Тонкая и прочная. Можно с именем.', hue: 350 },
  { id: 'heart-box', t: 'Шкатулка-сердце', c: 'gifts', e: '💝', h: 2, lvl: 2, q: 'heart box', d: 'Подарок для мамы или бабушки.', hue: 335 },
  { id: 'star', t: 'Звезда-украшение', c: 'gifts', e: '⭐', h: 1, lvl: 1, q: 'star ornament', d: 'Ёлочная игрушка или подвеска.', hue: 48 },
];

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

export const mwUrl = (q) => `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(q)}`;
