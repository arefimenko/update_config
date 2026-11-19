/* ============================================================
 *  ШАГИ ИНСТРУКЦИЙ
 *
 *  before — шаги ДО кнопки «Загрузить файл»
 *  hint   — текст пункта с кнопкой (кнопка — отдельный пункт)
 *  doneNote — подсказка, которая появляется только после успешной обработки файла
 *  after  — шаги ПОСЛЕ кнопки
 *  Количество шагов любое: просто добавляйте/удаляйте строки.
 *  Нумерация считается сама и продолжается после кнопки.
 *
 *  Каждый шаг: { img: 'путь к фото', text: 'подпись' }
 *  img можно не указывать — тогда будет шаг только с текстом.
 *  note — необязательная сноска мелким серым текстом под подписью.
 *  copy — необязательное значение с кнопкой «Скопировать».
 *  В text можно использовать <b>жирный</b>.
 * ============================================================ */
const STEPS = {
  // ---------- 1. AmneziaVPN ----------
  amneziavpn: {
    before: [
      { img: 'img/amneziavpn/1.jpeg', text: 'Откройте AmneziaVPN и нажмите на <b>шестерёнку</b> внизу экрана.' },
      { img: 'img/amneziavpn/2.jpeg', text: 'Выберите <b>Backup</b>.' },
      { img: 'img/amneziavpn/3.jpeg', text: 'Нажмите <b>Make a backup</b>.' },
      { img: 'img/amneziavpn/4.jpeg', text: 'Сохраните файл на ваш телефон.', note: 'В зависимости от телефона сохранение файла может выглядеть по-другому.' },
    ],
    hint: 'Нажмите кнопку ниже и выберите файл, который только что сохранили.',
    doneNote: '⚠️ Выберите, куда сохранить файл, чтобы потом легко его найти. Если телефон не спросил — ищите файл в <b>Загрузках</b> или в папке вашего браузера.<br><br>Файл может называться с цифрой, например <b>AmneziaVPN (1).backup</b> — это нормально, это тот же исправленный файл.',
    after: [
      { text: 'Исправленный файл <b>AmneziaVPN.backup</b> скачается на телефон.' },
      { img: 'img/amneziavpn/5.jpeg', text: 'Вернитесь в приложение AmneziaVPN и нажмите <b>Restore from backup</b>' },
      { img: 'img/amneziavpn/6.jpeg', text: 'Выберите скачанный файл и нажмите <b>Continue</b>. Готово — можно подключаться.' },
    ],
  },

  // ---------- 2. AmneziaWG (для ленивых) ----------
  amneziawgLazy: {
    before: [
      { img: 'img/amneziawg-lazy/1.jpeg', text: 'Откройте AmneziaWG и нажмите <b>Settings</b>.' },
      { img: 'img/amneziawg-lazy/2.jpeg', text: 'Нажмите <b>Export zip archive</b>.' },
      { img: 'img/amneziawg-lazy/3.jpeg', text: 'Введите код-пароль от телефона.' },
      { img: 'img/amneziawg-lazy/4.jpeg', text: 'Сохраните архив на ваш телефон.', note: 'В зависимости от телефона сохранение файла может выглядеть по-другому.' },
    ],
    hint: 'Нажмите кнопку ниже и выберите архив, который только что сохранили.',
    doneNote: '⚠️ Выберите, куда сохранить файлы, чтобы потом легко их найти. Если телефон не спросил — ищите файлы в <b>Загрузках</b> или в папке вашего браузера.',
    after: [
      { text: 'Исправленные файлы <b>&lt;название_впн&gt;.conf</b> скачаются на телефон.' },
      { img: 'img/amneziawg-lazy/delete-1.jpeg', text: 'Вернитесь в приложение AmneziaWG и нажмите на ваш VPN.' },
      { img: 'img/amneziawg-lazy/delete-2.jpeg', text: 'Пролистайте вниз и нажмите <b>Delete tunnel</b>.' },
      { img: 'img/amneziawg-lazy/delete-3.jpeg', text: 'Подтвердите удаление — нажмите <b>Delete</b>.' },
      { img: 'img/amneziawg-lazy/add-1.jpeg', text: 'Нажмите <b>Add a tunnel</b>.' },
      { img: 'img/amneziawg-lazy/add-2.jpeg', text: 'Выберите <b>Create from file or archive</b> и выберите скачанные файлы.' },
      { img: 'img/amneziawg-lazy/add-3.jpeg', text: 'Разрешите добавление VPN — нажмите <b>Allow</b>. Готово — можно подключаться.' },
    ],
  },

  // ---------- 3. AmneziaWG (только инструкция) ----------
  amneziawg: {
    before: [
      { text: 'Скопируйте новый адрес сервера — он понадобится в конце.', copy: SERVER.newIp + ':' + SERVER.port },
      { img: 'img/amneziawg/1.jpeg', text: 'Откройте AmneziaWG и нажмите на ваш VPN.' },
      { img: 'img/amneziawg/2.jpeg', text: 'Нажмите <b>Edit</b>.' },
      { img: 'img/amneziawg/3.jpeg', text: 'Введите код-пароль от телефона.' },
      { img: 'img/amneziawg/4.jpeg', text: 'Пролистайте вниз до раздела <b>Peer</b> и нажмите на поле <b>Endpoint</b>.' },
      { img: 'img/amneziawg/5.jpeg', text: 'Сотрите старый адрес, вставьте скопированный и нажмите <b>Save</b>. Готово — можно подключаться.', copy: SERVER.newIp + ':' + SERVER.port },
    ],
  },
};
