/* ============================================================
 *  Что на что заменять в файлах. Сами адреса — в config.js.
 *  from — список подстрок, которые ищем; to — на что меняем.
 *  Заменяются ВСЕ вхождения каждой подстроки.
 * ============================================================ */
const CONFIG = {
  // Раздел 1 — AmneziaVPN (один файл)
  amneziavpn: { from: SERVER.oldIps, to: SERVER.newIp },
  // Раздел 2 — AmneziaWG (через файл), zip-архив с файлами
  amneziawg: { from: SERVER.oldIps, to: SERVER.newIp },
};

/* ------------------------------------------------------------ */

function replaceAll(text, from, to) {
  let count = 0;
  for (const f of [].concat(from)) {
    if (!f || f === to) continue;
    const parts = text.split(f);
    count += parts.length - 1;
    text = parts.join(to);
  }
  return { text, count };
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function canShareFiles(files) {
  try {
    return !!(navigator.canShare && navigator.canShare({ files }));
  } catch {
    return false;
  }
}

async function shareFiles(files) {
  try {
    await navigator.share({ files });
  } catch (e) {
    if (e && e.name !== 'AbortError') console.warn(e);
  }
}

// octet-stream — чтобы iOS/Android скачивали файл, а не открывали его как текст
const BIN = 'application/octet-stream';

function pluralFiles(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} файл`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} файла`;
  return `${n} файлов`;
}

/* ---------------- обработка ---------------- */

async function processSingle(file, cfg) {
  const src = await file.text();
  const { text, count } = replaceAll(src, cfg.from, cfg.to);
  if (count === 0) {
    if (src.includes(cfg.to)) {
      throw new Error('Этот файл уже обновлён — в нём новый адрес сервера. Ничего делать не нужно.');
    }
    throw new Error('В файле не найдено, что заменять. Проверьте, что выбрали правильный файл.');
  }
  return [{ name: file.name, blob: new Blob([text], { type: BIN }), count }];
}

async function processZip(file, cfg) {
  if (typeof JSZip === 'undefined') {
    throw new Error('Не удалось загрузить модуль для чтения архивов. Проверьте интернет и обновите страницу.');
  }
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error('Не получилось открыть архив. Нужен файл .zip.');
  }

  const entries = Object.values(zip.files).filter((e) => {
    if (e.dir) return false;
    const base = e.name.split('/').pop();
    return base && !base.startsWith('.') && !e.name.startsWith('__MACOSX/');
  });
  if (entries.length === 0) throw new Error('Архив пустой.');

  const used = new Set();
  const out = [];
  for (const e of entries) {
    let name = e.name.split('/').pop();
    // одинаковые имена из разных папок
    if (used.has(name)) {
      const dot = name.lastIndexOf('.');
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : '';
      let i = 2;
      while (used.has(`${stem} (${i})${ext}`)) i++;
      name = `${stem} (${i})${ext}`;
    }
    used.add(name);

    const bytes = await e.async('uint8array');
    const src = new TextDecoder('utf-8').decode(bytes);
    const { text, count } = replaceAll(src, cfg.from, cfg.to);
    // если заменять нечего — отдаём файл байт-в-байт как был
    const blob = new Blob([count ? text : bytes], { type: BIN });
    out.push({ name, blob, count, updated: !count && src.includes(cfg.to) });
  }

  if (!out.some((f) => f.count > 0)) {
    if (out.some((f) => f.updated)) {
      throw new Error('Эти файлы уже обновлены — в них новый адрес сервера. Ничего делать не нужно.');
    }
    throw new Error('Ни в одном файле архива не найдено, что заменять. Проверьте, что выбрали правильный архив.');
  }
  return out;
}

async function downloadAll(files) {
  for (let i = 0; i < files.length; i++) {
    downloadBlob(files[i].blob, files[i].name);
    // пауза, чтобы браузер не склеил/заблокировал несколько загрузок подряд
    if (i < files.length - 1) await sleep(600);
  }
}

/* ---------------- UI ---------------- */

function setupProcessor(root) {
  const mode = root.dataset.mode; // 'single' | 'zip'
  const cfg = CONFIG[root.dataset.config];
  const input = root.querySelector('.file-input');
  const pickBtn = root.querySelector('.act-pick');
  const result = root.querySelector('.result');
  const status = root.querySelector('.status');
  const dlBtn = root.querySelector('.act-download');
  const shareBtn = root.querySelector('.act-share');
  const resetBtn = root.querySelector('.act-reset');
  const list = root.querySelector('.file-list');
  const errorEl = root.querySelector('.error');

  let processed = [];

  // На Android без фильтра типов Chrome предлагает камеру/диктофон и просит к ним доступ.
  // На iOS фильтр не ставим: там он мешал открыть окно выбора.
  if (/Android/i.test(navigator.userAgent) && root.dataset.androidAccept) {
    input.accept = root.dataset.androidAccept;
  }

  // pickBtn — это <label> с <input type="file"> внутри: окно выбора открывает сам браузер
  const pickText = pickBtn.querySelector('.pick-text');
  const pickLabel = pickText.textContent;
  const setBusy = (busy) => {
    pickBtn.classList.toggle('busy', busy);
    input.disabled = busy;
    pickText.textContent = busy ? 'Обрабатываю…' : pickLabel;
  };

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function reset() {
    processed = [];
    input.value = '';
    result.hidden = true;
    pickBtn.hidden = false;
    setBusy(false);
    if (list) list.innerHTML = '';
    showError('');
  }

  function renderList() {
    if (!list) return;
    list.innerHTML = '';
    for (const f of processed) {
      const li = document.createElement('li');
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = f.name;
      li.appendChild(name);
      if (!f.count) {
        const w = document.createElement('span');
        w.className = 'warn';
        w.textContent = 'без изменений';
        li.appendChild(w);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Скачать';
      b.addEventListener('click', () => downloadBlob(f.blob, f.name));
      li.appendChild(b);
      list.appendChild(li);
    }
  }

  pickBtn.addEventListener('click', () => showError(''));

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    showError('');
    setBusy(true);

    try {
      processed = mode === 'zip' ? await processZip(file, cfg) : await processSingle(file, cfg);
    } catch (e) {
      reset();
      showError(e.message || String(e));
      return;
    }

    // Показываем результат: кнопка «Загрузить» → «Скачать»
    pickBtn.hidden = true;
    result.hidden = false;
    status.textContent =
      mode === 'zip'
        ? `Готово: ${pluralFiles(processed.length)}. Загрузка началась — если нет, нажмите кнопку ниже.`
        : 'Готово! Загрузка началась — если нет, нажмите кнопку ниже.';

    // Подсказка, которая нужна только после успешной обработки (doneNote в steps.js)
    const doneNote = typeof STEPS !== 'undefined' && (STEPS[root.dataset.steps] || {}).doneNote;
    if (doneNote) {
      let p = result.querySelector('.done-note');
      if (!p) {
        p = document.createElement('p');
        p.className = 'done-note';
        status.after(p);
      }
      p.innerHTML = doneNote;
    }

    const shareable = processed.map((f) => new File([f.blob], f.name, { type: BIN }));
    shareBtn.hidden = !canShareFiles(shareable);
    shareBtn.onclick = () => shareFiles(shareable);

    renderList();

    // Пробуем скачать автоматически
    try {
      await downloadAll(processed);
    } catch (e) {
      console.warn('auto-download failed', e);
    }
  });

  dlBtn.addEventListener('click', () => downloadAll(processed));
  resetBtn.addEventListener('click', reset);
}

/* Поле со значением и кнопкой «Скопировать» */

// Классическое копирование, работает и в Chrome на iPhone (там navigator.clipboard часто недоступен).
// Должно вызываться синхронно прямо в обработчике нажатия.
function legacyCopy(text) {
  // временный <span> с текстом, выделяем его диапазоном и копируем (без фокуса и клавиатуры)
  const span = document.createElement('span');
  span.textContent = text;
  span.style.cssText = 'position:fixed;top:0;left:0;white-space:pre;opacity:0;' +
    'user-select:text;-webkit-user-select:text;pointer-events:none;';
  document.body.appendChild(span);
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(range);
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* ignore */ }
  sel.removeAllRanges();
  span.remove();
  return ok;
}

async function copyText(text) {
  let ok = legacyCopy(text); // сразу, пока браузер считает это нажатием пользователя
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      ok = true;
    }
  } catch { /* остаётся результат legacyCopy */ }
  return ok;
}

// Если скопировать не вышло — выделяем текст, чтобы его можно было скопировать долгим нажатием
function selectText(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function makeCopyBox(value) {
  const box = document.createElement('div');
  box.className = 'copy-box';
  const code = document.createElement('code');
  code.textContent = value;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Скопировать';
  let timer;
  btn.addEventListener('click', async () => {
    const ok = await copyText(value);
    if (!ok) selectText(code);
    btn.textContent = ok ? 'Скопировано ✓' : 'Не вышло — зажмите адрес и скопируйте';
    btn.classList.toggle('done', ok);
    clearTimeout(timer);
    timer = setTimeout(() => {
      btn.textContent = 'Скопировать';
      btn.classList.remove('done');
    }, 2000);
  });
  box.append(code, btn);
  return box;
}

/* Собираем шаги из steps.js; нумерация после кнопки продолжает список до неё */
function renderSteps() {
  if (typeof STEPS === 'undefined') return;
  document.querySelectorAll('ol.steps[data-steps]').forEach((ol) => {
    const sec = STEPS[ol.dataset.steps] || {};
    const items = sec[ol.dataset.part] || [];
    if (ol.dataset.part === 'after') ol.start = (sec.before || []).length + 1;
    ol.hidden = items.length === 0;
    for (const step of items) {
      const li = document.createElement('li');
      if (step.text) {
        const p = document.createElement('p');
        p.innerHTML = step.text;
        li.appendChild(p);
      }
      if (step.note) {
        const n = document.createElement('p');
        n.className = 'step-note';
        n.innerHTML = step.note;
        li.appendChild(n);
      }
      if (step.copy) li.appendChild(makeCopyBox(step.copy));
      if (step.img) {
        const img = document.createElement('img');
        img.src = step.img;
        img.alt = '';
        img.loading = 'lazy';
        li.appendChild(img);
      }
      ol.appendChild(li);
    }
  });
  // Блок с кнопкой — отдельный пункт: before → [кнопка] → after в одном списке
  document.querySelectorAll('.processor[data-steps]').forEach((el) => {
    const key = el.dataset.steps;
    const before = document.querySelector(`ol.steps[data-steps="${key}"][data-part="before"]`);
    const after = document.querySelector(`ol.steps[data-steps="${key}"][data-part="after"]`);
    if (!before) return;

    const li = document.createElement('li');
    li.className = 'step-action';
    const p = document.createElement('p');
    p.innerHTML = (STEPS[key] || {}).hint || 'Загрузите файл.';
    li.appendChild(p);
    li.appendChild(el); // переносим блок с кнопкой внутрь пункта
    before.appendChild(li);
    before.hidden = false;

    if (after) {
      while (after.firstChild) before.appendChild(after.firstChild);
      after.remove();
    }
  });
}

/* Если фото ещё не загружено — показываем заглушку с путём, куда его положить */
function setupImagePlaceholders() {
  document.querySelectorAll('.steps img').forEach((img) => {
    const swap = () => {
      const div = document.createElement('div');
      div.className = 'img-missing';
      div.textContent = `Фото: ${img.getAttribute('src')}`;
      img.replaceWith(div);
    };
    if (img.complete && img.naturalWidth === 0) {
      swap(); // уже упало до подключения скрипта
    } else {
      img.addEventListener('error', swap, { once: true });
    }
  });
}

renderSteps();
document.querySelectorAll('.processor').forEach(setupProcessor);
setupImagePlaceholders();
