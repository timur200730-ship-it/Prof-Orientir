/* === STATE === */
const KEY = "profgid_v1";

const defaultState = () => ({
  theme: "indigo",
  mode: "auto",
  initialInterests: "",
  dreamLife: Array.from({length: 8}, () => ({text: ""})),
  ikigai: {
    love: Array(10).fill(""),
    goodAt: Array(10).fill(""),
    valuedFor: Array(10).fill(""),
    overlap: ""
  },
  mbti: { answers: {}, traits: "" },
  talents: [],
  motivation: {},
  fiveLives: Array.from({length: 5}, () => ({profession: "", qualities: "", needs: ""})),
  workConditions: { schedule: "", field: "", location: "", salary: "", prestige: 3, notes: "" },
  smartGoal: { specific: "", measurable: "", achievable: "", relevant: "", timeBound: "" },
  actionPlan: [],
  finalNotes: ""
});

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {}
  return defaultState();
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function setPath(path, value) {
  const parts = path.split(".");
  let cur = state;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!(p in cur) || cur[p] == null) cur[p] = isNaN(+parts[i+1]) ? {} : [];
    cur = cur[p];
  }
  cur[parts.at(-1)] = value;
  save();
}
function getPath(path) { return path.split(".").reduce((o, p) => o?.[p], state); }

/* === HELPERS === */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* === THEME === */
function applyTheme() {
  document.documentElement.dataset.theme = state.theme || "indigo";
  const mode = state.mode || "auto";
  if (mode === "auto") document.documentElement.removeAttribute("data-mode");
  else document.documentElement.dataset.mode = mode;

  // sync theme-color meta (актуально для Android Chrome)
  const colors = {
    indigo: "#6366f1", emerald: "#10b981", rose: "#f43f5e",
    amber: "#f59e0b", cyan: "#06b6d4", violet: "#8b5cf6", sunset: "#f97316"
  };
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", colors[state.theme] || "#6366f1");
}

/* === ROUTER === */
function route() {
  const [_, page = "start", sub] = (location.hash || "#/start").split("/");
  $$(".bottomnav a").forEach(a => a.classList.toggle("active", a.dataset.tab === page));
  const main = $("#main");
  const title = $("#title");
  main.innerHTML = "";

  const tabs = {
    start: () => { title.textContent = "ПрофГид"; renderStart(main); },
    block1: () => { title.textContent = "Таланты"; renderBlock1(main, sub || "dream"); },
    block2: () => { title.textContent = "Профессии"; renderBlock2(main, sub || "lives"); },
    block3: () => { title.textContent = "Цель"; renderBlock3(main, sub || "compare"); },
    profile: () => { title.textContent = "Профиль"; renderProfile(main); }
  };
  (tabs[page] || tabs.start)();
  window.scrollTo({ top: 0, behavior: "instant" });
}
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => { mountIcons(); applyTheme(); route(); });

/* === GLOBAL EVENTS === */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.path) setPath(el.dataset.path, el.value);
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.path) setPath(el.dataset.path, el.value);
});
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;

  if (a === "open-settings") openSettings();
  if (a === "close-settings") closeSettings();
  if (a === "set-theme") { state.theme = el.dataset.v; save(); applyTheme(); renderSheet(); }
  if (a === "set-mode") { state.mode = el.dataset.v; save(); applyTheme(); renderSheet(); }

  if (a === "toggle-talent") {
    const id = el.dataset.id;
    state.talents = state.talents.includes(id)
      ? state.talents.filter(x => x !== id)
      : [...state.talents, id];
    save();
    route();
    if (navigator.vibrate) navigator.vibrate(10);
  }
  if (a === "mbti-answer") {
    state.mbti.answers[el.dataset.q] = el.dataset.v;
    save();
    route();
    if (navigator.vibrate) navigator.vibrate(10);
  }
  if (a === "motivation-score") {
    state.motivation[el.dataset.q] = +el.dataset.v;
    save();
    route();
    if (navigator.vibrate) navigator.vibrate(10);
  }
  if (a === "prestige-score") {
    state.workConditions.prestige = +el.dataset.v;
    save(); route();
  }
  if (a === "add-action") {
    state.actionPlan.push({ step: "", deadline: "", status: "todo" });
    save(); route();
  }
  if (a === "remove-action") {
    state.actionPlan.splice(+el.dataset.i, 1); save(); route();
  }
  if (a === "reset") {
    if (confirm("Удалить все данные и начать заново?")) {
      localStorage.removeItem(KEY);
      state = defaultState();
      applyTheme();
      location.hash = "#/start";
      route();
    }
  }
  if (a === "export") {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
    const a2 = document.createElement("a");
    a2.href = URL.createObjectURL(blob);
    a2.download = `profgid-${Date.now()}.json`;
    a2.click();
  }
});

/* === SETTINGS SHEET === */
function openSettings() {
  renderSheet();
  $("#settingsSheet").classList.add("open");
  $("#sheetBackdrop").classList.add("open");
}
function closeSettings() {
  $("#settingsSheet").classList.remove("open");
  $("#sheetBackdrop").classList.remove("open");
}
function renderSheet() {
  const themes = [
    ["indigo","Indigo"],["emerald","Emerald"],["rose","Rose"],["amber","Amber"],
    ["cyan","Cyan"],["violet","Violet"],["sunset","Sunset"]
  ];
  const modes = [
    ["light","Светлая", "sun"],
    ["dark","Тёмная", "moon"],
    ["auto","Авто", "monitor"]
  ];
  $("#settingsSheet").innerHTML = `
    <h3>Настройки</h3>

    <p class="muted" style="font-size:13px;margin:0 0 10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Цветовая тема</p>
    <div class="theme-grid">
      ${themes.map(([k, l]) => `
        <div class="theme-swatch swatch-${k} ${state.theme===k?'selected':''}" data-action="set-theme" data-v="${k}" title="${l}"></div>
      `).join("")}
    </div>

    <p class="muted" style="font-size:13px;margin:0 0 10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">Режим</p>
    <div class="mode-row">
      ${modes.map(([k, l, ico]) => `
        <button class="mode-btn ${state.mode===k?'active':''}" data-action="set-mode" data-v="${k}">
          ${icon(ico)}<span>${l}</span>
        </button>
      `).join("")}
    </div>

    <div class="divider"></div>
    <button class="btn secondary" data-action="close-settings">Готово</button>
  `;
}

/* === PAGES === */

function renderStart(main) {
  const hasProgress = state.initialInterests || state.dreamLife[0].text;
  const talentsCount = state.talents.length;
  const completed = countCompleted();

  main.innerHTML = `
    <h2>Привет 👋</h2>
    <p class="lead">Твой личный профориентационный дневник. Пройди три блока — и в конце будет чёткий план.</p>

    <div class="stats-row">
      <div class="stat"><div class="val">${talentsCount}</div><div class="label">Талантов</div></div>
      <div class="stat"><div class="val">${state.fiveLives.filter(l=>l.profession).length}</div><div class="label">Профессий</div></div>
      <div class="stat"><div class="val">${completed}%</div><div class="label">Готово</div></div>
    </div>

    <div class="card">
      <label>Какие профессии ты уже рассматриваешь?</label>
      <p class="muted" style="font-size:13px;margin:0 0 10px">Пиши через запятую. Что в них нравится? Это твоя отправная точка.</p>
      <textarea data-path="initialInterests" placeholder="Например: программист, психолог, дизайнер">${esc(state.initialInterests)}</textarea>
    </div>

    <div class="card accent">
      <h3 style="margin-top:0">Как проходить</h3>
      <ol style="padding-left:20px; font-size:14px; line-height:1.8; margin:0; color:var(--text-2)">
        <li><b>Блок 1</b> — исследуй свои таланты и мотивацию</li>
        <li><b>Блок 2</b> — познакомься с профессиями и условиями работы</li>
        <li><b>Блок 3</b> — поставь SMART-цель и составь план</li>
      </ol>
    </div>

    <button class="btn" onclick="location.hash='#/block1'">${hasProgress ? "Продолжить" : "Начать"} ${icon("arrow_right","ic-sm")}</button>
  `;
}

function countCompleted() {
  let total = 0, done = 0;
  total++; if (state.initialInterests) done++;
  total++; if (state.dreamLife.some(d => d.text)) done++;
  total++; if (state.ikigai.overlap) done++;
  total++; if (Object.keys(state.mbti.answers).length === 28) done++;
  total++; if (state.talents.length) done++;
  total++; if (Object.keys(state.motivation).length) done++;
  total++; if (state.fiveLives.some(l => l.profession)) done++;
  total++; if (state.workConditions.schedule) done++;
  total++; if (state.smartGoal.specific) done++;
  total++; if (state.actionPlan.length) done++;
  return Math.round(done / total * 100);
}

/* === BLOCK 1 === */
function renderBlock1(main, sub) {
  const tabs = [["dream","Жизнь мечты"],["ikigai","Икигай"],["mbti","MBTI"],["talents","Таланты"],["motivation","Мотивация"]];
  main.innerHTML = `
    <div class="segmented">
      ${tabs.map(([k, l]) => `<button class="${k===sub?'active':''}" onclick="location.hash='#/block1/${k}'">${l}</button>`).join("")}
    </div>
    <div id="sub"></div>
  `;
  const box = $("#sub", main);
  if (sub === "dream") renderDream(box);
  else if (sub === "ikigai") renderIkigai(box);
  else if (sub === "mbti") renderMBTI(box);
  else if (sub === "talents") renderTalents(box);
  else if (sub === "motivation") renderMotivation(box);
}

function renderDream(box) {
  box.innerHTML = `
    <h2>Жизнь моей мечты</h2>
    <p class="lead">Опиши 8 пунктов, как ты представляешь идеальную жизнь. Детализируй: где, с кем, чем занимаешься.</p>
    ${state.dreamLife.map((item, i) => `
      <div class="card">
        <label>Пункт ${i+1}</label>
        <textarea data-path="dreamLife.${i}.text" placeholder="${
          i===0 ? 'В каком городе ты живёшь? Это дом или квартира?' :
          i===1 ? 'Чем занимаешься в течение дня?' :
          i===2 ? 'Кто рядом с тобой?' :
          i===3 ? 'Сколько ты зарабатываешь в месяц?' :
          'Ещё один важный пункт...'
        }">${esc(item.text)}</textarea>
      </div>
    `).join("")}
    <div class="card accent">
      <h3 style="margin-top:0">💡 Наводящие вопросы</h3>
      <p style="margin:0; font-size:14px; color:var(--text-2)">
        В каком городе хочешь жить?<br>
        Дом, квартира или что-то другое?<br>
        Чем занимаешься в течение дня?<br>
        Кто рядом?<br>
        Сколько хочешь зарабатывать и на что тратить?<br>
        Что бы делал(а), если бы не нужно было думать о деньгах?
      </p>
    </div>
  `;
}

function renderIkigai(box) {
  const list = (key, placeholder) => state.ikigai[key].map((v, i) => `
    <div class="list-item">
      <span class="num">${i+1}</span>
      <input data-path="ikigai.${key}.${i}" value="${esc(v)}" placeholder="${i===0 ? placeholder : ''}">
    </div>
  `).join("");

  box.innerHTML = `
    <h2>Икигай</h2>
    <p class="lead">Три списка по 10 пунктов. Потом отметь, что повторяется — это твой потенциал.</p>
    <div class="card">
      <h3 style="margin-top:0">❤️ Что я люблю делать?</h3>
      ${list("love", "Даже если за это не платят")}
    </div>
    <div class="card">
      <h3 style="margin-top:0">💪 Что у меня хорошо получается?</h3>
      ${list("goodAt", "Что даётся легче других")}
    </div>
    <div class="card">
      <h3 style="margin-top:0">🌟 За что меня ценят другие?</h3>
      ${list("valuedFor", "Что говорят друзья, родители, учителя")}
    </div>
    <div class="card accent">
      <h3 style="margin-top:0">🎯 Твой потенциал</h3>
      <p class="muted" style="font-size:13.5px;margin:0 0 10px">Выпиши 5 качеств или занятий, которые встречаются в нескольких списках.</p>
      <textarea data-path="ikigai.overlap" placeholder="Например: творчество, помощь людям, системность, общение, обучение">${esc(state.ikigai.overlap)}</textarea>
    </div>
  `;
}

function getMbtiType() {
  const done = Object.keys(state.mbti.answers).length;
  if (done < 28) return null;
  const get = (scale, first, second) => {
    let a = 0, b = 0;
    MBTI_QUESTIONS.forEach((q, i) => {
      if (q.s !== scale) return;
      if (state.mbti.answers[i] === "a") a++;
      else if (state.mbti.answers[i] === "b") b++;
    });
    return a >= b ? first : second;
  };
  return get("EI","E","I") + get("SN","S","N") + get("TF","T","F") + get("JP","J","P");
}

function renderMBTI(box) {
  const total = MBTI_QUESTIONS.length;
  const done = Object.keys(state.mbti.answers).length;
  const pct = Math.round(done / total * 100);
  const type = getMbtiType();
  let typeHtml = "";
  if (type) {
    const info = MBTI_DESCRIPTIONS[type];
    typeHtml = `
      <div class="result-box">
        <strong>${type} — ${info.name}</strong>
        ${info.text}
        <p style="margin:10px 0 0; font-size:14px; color:var(--text-2)"><b>Направления:</b> ${info.jobs}</p>
      </div>
      <div class="card">
        <label>Какие 2–3 качества из описания точно про тебя?</label>
        <textarea data-path="mbti.traits" placeholder="Выпиши своими словами">${esc(state.mbti.traits)}</textarea>
      </div>
    `;
  }
  box.innerHTML = `
    <h2>Тип личности</h2>
    <p class="lead">28 вопросов. Выбирай вариант, который описывает тебя чаще всего.</p>
    <div class="progress"><div style="width:${pct}%"></div></div>
    ${MBTI_QUESTIONS.map((q, i) => `
      <div class="card q-card">
        <div class="q-text">${i+1}. ${q.q}</div>
        <div class="q-option ${state.mbti.answers[i]==='a'?'selected':''}" data-action="mbti-answer" data-q="${i}" data-v="a"><b>A.</b> ${q.a}</div>
        <div class="q-option ${state.mbti.answers[i]==='b'?'selected':''}" data-action="mbti-answer" data-q="${i}" data-v="b"><b>Б.</b> ${q.b}</div>
      </div>
    `).join("")}
    ${typeHtml}
  `;
}

function renderTalents(box) {
  box.innerHTML = `
    <h2>Карточки талантов</h2>
    <p class="lead">Выбери те, что на 100% про тебя. Их можно менять в любой момент.</p>
    <div class="card-grid">
      ${TALENTS.map(t => `
        <div class="talent-card ${state.talents.includes(t.id)?'selected':''}" data-action="toggle-talent" data-id="${t.id}">
          <span class="check-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
          <strong>${t.name}</strong>
          <small>${t.desc}</small>
        </div>
      `).join("")}
    </div>
    <p class="text-center muted" style="margin-top:16px;font-size:14px">Выбрано: <b>${state.talents.length}</b> из ${TALENTS.length}</p>
  `;
}

function renderMotivation(box) {
  const scores = {};
  Object.entries(state.motivation).forEach(([i, v]) => {
    const s = MOTIVATION_QUESTIONS[i]?.s;
    if (s) scores[s] = (scores[s] || 0) + v;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 2);

  box.innerHTML = `
    <h2>Что тобой движет?</h2>
    <p class="lead">Оцени от 1 (совсем не про меня) до 5 (это точно про меня).</p>
    ${MOTIVATION_QUESTIONS.map((q, i) => `
      <div class="card">
        <div class="q-text">${i+1}. ${q.t}</div>
        <div class="scale-row">
          ${[1,2,3,4,5].map(v => `<button class="${state.motivation[i]===v?'selected':''}" data-action="motivation-score" data-q="${i}" data-v="${v}">${v}</button>`).join("")}
        </div>
      </div>
    `).join("")}
    ${sorted.length ? `
      <div class="result-box">
        <strong>Твои ведущие мотивы</strong>
        ${sorted.map(([k, v]) => `<div style="margin:4px 0">• ${MOTIVATION_LABELS[k]} <span class="muted">(${v} б.)</span></div>`).join("")}
        <p style="margin:12px 0 0; font-size:14px; color:var(--text-2)">Подумай: как профессия из твоего списка закрывает этот мотив?</p>
      </div>
    ` : ""}
  `;
}

/* === BLOCK 2 === */
function renderBlock2(main, sub) {
  const tabs = [["lives","5 жизней"],["conditions","Условия"],["catalog","Каталог"]];
  main.innerHTML = `
    <div class="segmented">
      ${tabs.map(([k, l]) => `<button class="${k===sub?'active':''}" onclick="location.hash='#/block2/${k}'">${l}</button>`).join("")}
    </div>
    <div id="sub"></div>
  `;
  const box = $("#sub", main);
  if (sub === "lives") renderLives(box);
  else if (sub === "conditions") renderConditions(box);
  else if (sub === "catalog") renderCatalog(box);
}

function renderLives(box) {
  box.innerHTML = `
    <h2>5 жизней</h2>
    <p class="lead">Если бы можно было прожить 5 жизней — кем бы ты стал(а)? В каждой подумай: что у тебя уже есть и что тебе это даст.</p>
    ${state.fiveLives.map((l, i) => `
      <div class="card">
        <h3 style="margin-top:0">Жизнь ${i+1}</h3>
        <label>Профессия или занятие</label>
        <input data-path="fiveLives.${i}.profession" value="${esc(l.profession)}" placeholder="Например: архитектор">
        <label>Какие мои сегодняшние качества помогут?</label>
        <textarea data-path="fiveLives.${i}.qualities" placeholder="Например: усидчивость, чувство вкуса">${esc(l.qualities)}</textarea>
        <label>Какие потребности закроет эта работа?</label>
        <textarea data-path="fiveLives.${i}.needs" placeholder="Деньги, статус, свобода, творчество…">${esc(l.needs)}</textarea>
      </div>
    `).join("")}
  `;
}

function renderConditions(box) {
  const c = state.workConditions;
  box.innerHTML = `
    <h2>Условия работы</h2>
    <p class="lead">Что для тебя важно? Это поможет отсеять неподходящие варианты.</p>
    <div class="card">
      <label>График</label>
      <select data-path="workConditions.schedule">
        <option value="">— выбери —</option>
        <option value="5/2" ${c.schedule==='5/2'?'selected':''}>5/2, офис</option>
        <option value="shift" ${c.schedule==='shift'?'selected':''}>Сменный / вахта</option>
        <option value="flex" ${c.schedule==='flex'?'selected':''}>Гибкий / удалёнка</option>
        <option value="project" ${c.schedule==='project'?'selected':''}>Проектный / фриланс</option>
      </select>
      <label>Направление деятельности</label>
      <select data-path="workConditions.field">
        <option value="">— выбери —</option>
        ${["IT и данные","Инженерия","Медицина и помощь","Дизайн и креатив","Бизнес и право","Рабочие и сервисные"]
          .map(s => `<option ${c.field===s?'selected':''}>${s}</option>`).join("")}
      </select>
      <label>Геолокация</label>
      <select data-path="workConditions.location">
        <option value="">— выбери —</option>
        <option value="office" ${c.location==='office'?'selected':''}>Офис</option>
        <option value="remote" ${c.location==='remote'?'selected':''}>Удалённо из дома</option>
        <option value="field" ${c.location==='field'?'selected':''}>Выезды / объекты</option>
        <option value="anywhere" ${c.location==='anywhere'?'selected':''}>Не важно</option>
      </select>
      <label>Желаемый уровень дохода</label>
      <select data-path="workConditions.salary">
        <option value="">— выбери —</option>
        <option value="30-60" ${c.salary==='30-60'?'selected':''}>30–60 тыс. ₽</option>
        <option value="60-100" ${c.salary==='60-100'?'selected':''}>60–100 тыс. ₽</option>
        <option value="100-200" ${c.salary==='100-200'?'selected':''}>100–200 тыс. ₽</option>
        <option value="200+" ${c.salary==='200+'?'selected':''}>от 200 тыс. ₽</option>
      </select>
      <label>Насколько важен престиж?</label>
      <div class="scale-row">
        ${[1,2,3,4,5].map(v => `<button class="${c.prestige===v?'selected':''}" data-action="prestige-score" data-v="${v}">${v}</button>`).join("")}
      </div>
      <label style="margin-top:16px">Заметки</label>
      <textarea data-path="workConditions.notes" placeholder="Что ещё важно? Смысл, свобода, команда…">${esc(c.notes)}</textarea>
    </div>
    <div class="card accent">
      <h3 style="margin-top:0">💡 Что важно знать про зарплату</h3>
      <p style="font-size:13.5px; margin:0; color:var(--text-2); line-height:1.7">
        <b>Оклад</b> — фиксированная часть, платят всегда.<br>
        <b>Премия / бонус</b> — переменная часть за результат.<br>
        <b>Белая зарплата</b> — официальная, с налогами и взносами, видна в трудовой.<br>
        <b>Серая</b> — часть «в конверте». Риски: нет больничных, отпускных, пенсионных накоплений, сложно получить кредит.<br>
        <b>Гросс и нет</b> — оклад до вычета НДФЛ (13%) и сумма на руки.
      </p>
    </div>
  `;
}

function renderCatalog(box) {
  box.innerHTML = `
    <h2>Каталог профессий</h2>
    <p class="lead">36 вариантов — от IT до рабочих специальностей. Нажми, чтобы узнать детали.</p>
    <div class="toolbar">
      <input id="profSearch" placeholder="Поиск..." oninput="filterCatalog()">
      <select id="profSphere" onchange="filterCatalog()">
        <option value="">Все сферы</option>
        ${[...new Set(PROFESSIONS.map(p => p.sphere))].map(s => `<option>${s}</option>`).join("")}
      </select>
    </div>
    <div id="profList">
      ${PROFESSIONS.map(p => `
        <div class="card prof-card" data-title="${esc(p.title.toLowerCase())}" data-sphere="${esc(p.sphere)}">
          <h4>${esc(p.title)}</h4>
          <span class="sphere">${esc(p.sphere)}</span>
          <div class="desc">${esc(p.desc)}</div>
          <details>
            <summary>Подробнее</summary>
            <p><b>Качества:</b> ${p.qualities.map(esc).join(", ")}</p>
            <p><b>Условия и зарплата:</b> ${esc(p.conditions)}</p>
            <p><b>Как попасть:</b> ${esc(p.path)}</p>
          </details>
        </div>
      `).join("")}
    </div>
  `;
}
function filterCatalog() {
  const q = $("#profSearch").value.toLowerCase();
  const s = $("#profSphere").value;
  $$(".prof-card").forEach(c => {
    const okQ = c.dataset.title.includes(q);
    const okS = !s || c.dataset.sphere === s;
    c.style.display = okQ && okS ? "" : "none";
  });
}

/* === BLOCK 3 === */
function renderBlock3(main, sub) {
  const tabs = [["compare","Сравнение"],["smart","SMART-цель"],["plan","План"]];
  main.innerHTML = `
    <div class="segmented">
      ${tabs.map(([k, l]) => `<button class="${k===sub?'active':''}" onclick="location.hash='#/block3/${k}'">${l}</button>`).join("")}
    </div>
    <div id="sub"></div>
  `;
  const box = $("#sub", main);
  if (sub === "compare") renderCompare(box);
  else if (sub === "smart") renderSmart(box);
  else if (sub === "plan") renderPlan(box);
}

function renderCompare(box) {
  const lives = state.fiveLives.filter(l => l.profession.trim());
  const type = getMbtiType();
  box.innerHTML = `
    <h2>Сравнение «до» и «после»</h2>
    <p class="lead">Посмотри, как изменились твои представления о профессиях.</p>
    <div class="card">
      <h3 style="margin-top:0">Было (в начале)</h3>
      <p style="margin:0">${esc(state.initialInterests || "— не заполнено")}</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Стало — твои таланты</h3>
      ${state.talents.length ? `<p style="margin:0">${state.talents.map(id => TALENTS.find(t=>t.id===id)?.name).filter(Boolean).join(", ")}</p>` : "<p class='muted' style='margin:0'>— пока не выбраны</p>"}
    </div>
    <div class="card">
      <h3 style="margin-top:0">Стало — твой потенциал</h3>
      <p style="margin:0">${esc(state.ikigai.overlap || "— пока не заполнено")}</p>
    </div>
    ${type ? `<div class="card"><h3 style="margin-top:0">Тип личности</h3><p style="margin:0"><b>${type}</b> — ${MBTI_DESCRIPTIONS[type].name}. ${esc(state.mbti.traits || "Рефлексия не заполнена.")}</p></div>` : ""}
    ${lives.length ? `
      <div class="card">
        <h3 style="margin-top:0">Профессии из «5 жизней»</h3>
        ${lives.map(l => `<p style="margin:6px 0"><b>${esc(l.profession)}</b>${l.needs ? ` — ${esc(l.needs)}` : ""}</p>`).join("")}
      </div>
    ` : ""}
    <div class="card">
      <h3 style="margin-top:0">Рефлексия</h3>
      <label>Что изменилось? Какие варианты откликаются сильнее?</label>
      <textarea data-path="finalNotes" placeholder="Напиши своими словами...">${esc(state.finalNotes)}</textarea>
    </div>
  `;
}

function renderSmart(box) {
  const s = state.smartGoal;
  const hints = {
    specific: "Например: поступить на бюджет на «Программную инженерию» в вуз X",
    measurable: "Например: сдать ЕГЭ по информатике на 80+",
    achievable: "Например: уже есть сильная математика, нужно подтянуть программирование",
    relevant: "Например: связано с моими талантами в логике и системном мышлении",
    timeBound: "Например: к августу 2027 года"
  };
  box.innerHTML = `
    <h2>SMART-цель</h2>
    <p class="lead">Одна конкретная цель на 1–3 года. Заполни все пять полей.</p>
    <div class="card">
      <label><b>S</b> — конкретная: чего именно хочешь достичь?</label>
      <textarea data-path="smartGoal.specific" placeholder="${hints.specific}">${esc(s.specific)}</textarea>
      <label><b>M</b> — измеримая: как поймёшь, что достиг(ла)?</label>
      <textarea data-path="smartGoal.measurable" placeholder="${hints.measurable}">${esc(s.measurable)}</textarea>
      <label><b>A</b> — достижимая: что уже есть, чего не хватает?</label>
      <textarea data-path="smartGoal.achievable" placeholder="${hints.achievable}">${esc(s.achievable)}</textarea>
      <label><b>R</b> — значимая: почему это важно именно тебе?</label>
      <textarea data-path="smartGoal.relevant" placeholder="${hints.relevant}">${esc(s.relevant)}</textarea>
      <label><b>T</b> — во времени: к какому сроку?</label>
      <textarea data-path="smartGoal.timeBound" placeholder="${hints.timeBound}">${esc(s.timeBound)}</textarea>
    </div>
  `;
}

function renderPlan(box) {
  box.innerHTML = `
    <h2>План действий</h2>
    <p class="lead">Разбей цель на 3–7 конкретных шагов с дедлайнами.</p>
    ${state.actionPlan.length === 0 ? `<p class="muted">Пока нет шагов. Добавь первый.</p>` : ""}
    ${state.actionPlan.map((a, i) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <b>Шаг ${i+1}</b>
          <button data-action="remove-action" data-i="${i}" style="background:transparent;border:none;color:#ef4444;cursor:pointer;font-size:13px;font-weight:600">Удалить</button>
        </div>
        <label>Что сделать</label>
        <input data-path="actionPlan.${i}.step" value="${esc(a.step)}" placeholder="Например: записаться на пробный ЕГЭ">
        <label>К какому сроку</label>
        <input type="date" data-path="actionPlan.${i}.deadline" value="${esc(a.deadline)}">
        <label>Статус</label>
        <select data-path="actionPlan.${i}.status">
          <option value="todo" ${a.status==='todo'?'selected':''}>Не начато</option>
          <option value="inprogress" ${a.status==='inprogress'?'selected':''}>В процессе</option>
          <option value="done" ${a.status==='done'?'selected':''}>Готово</option>
        </select>
      </div>
    `).join("")}
    <button class="btn secondary" data-action="add-action">${icon("plus","ic-sm")} Добавить шаг</button>
  `;
}

/* === PROFILE === */
function renderProfile(main) {
  const d = state;
  main.innerHTML = `
    <h2>Мой профиль</h2>
    <p class="lead">Всё, что ты собрал(а). Данные хранятся только на этом устройстве.</p>
    <div class="card">
      <h3 style="margin-top:0">Старт</h3>
      <p style="margin:0"><b>Интересовали:</b> ${esc(d.initialInterests || "—")}</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Таланты и потенциал</h3>
      <p><b>Таланты:</b> ${d.talents.length ? d.talents.map(id=>TALENTS.find(t=>t.id===id)?.name).filter(Boolean).join(", ") : "—"}</p>
      <p><b>Икигай:</b> ${esc(d.ikigai.overlap || "—")}</p>
      <p><b>Тип личности:</b> ${esc(d.mbti.traits || (Object.keys(d.mbti.answers).length ? "пройден" : "—"))}</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Профессии и цель</h3>
      <p><b>5 жизней:</b> ${d.fiveLives.filter(l=>l.profession).map(l=>esc(l.profession)).join(", ") || "—"}</p>
      <p><b>SMART-цель:</b> ${esc(d.smartGoal.specific || "—")}</p>
      <p><b>Шагов в плане:</b> ${d.actionPlan.length}</p>
    </div>
    <button class="btn" data-action="export">${icon("download","ic-sm")} Скачать профиль (JSON)</button>
    <div style="height:10px"></div>
    <button class="btn danger" data-action="reset">${icon("trash","ic-sm")} Удалить все данные</button>
  `;
}

/* === PWA install === */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installBtn").classList.remove("hidden");
});
document.addEventListener("click", (e) => {
  if (e.target.closest("#installBtn")) {
    (async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      $("#installBtn").classList.add("hidden");
    })();
  }
});

/* === SW registration === */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
