/* === STATE === */
const KEY = "profgid_v1";

const defaultState = () => ({
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
function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
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
function getPath(path) {
  return path.split(".").reduce((o, p) => o?.[p], state);
}

/* === HELPERS === */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

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
    block3: () => { title.textContent = "Выбор"; renderBlock3(main, sub || "compare"); },
    profile: () => { title.textContent = "Профиль"; renderProfile(main); }
  };
  (tabs[page] || tabs.start)();
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

/* === EVENT DELEGATION === */
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.path) setPath(el.dataset.path, el.value);
});
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const a = el.dataset.action;

  if (a === "toggle-talent") {
    const id = el.dataset.id;
    state.talents = state.talents.includes(id)
      ? state.talents.filter(x => x !== id)
      : [...state.talents, id];
    save();
    el.classList.toggle("selected");
  }
  if (a === "mbti-answer") {
    state.mbti.answers[el.dataset.q] = el.dataset.v;
    save();
    $$(`[data-q="${el.dataset.q}"]`).forEach(b => b.classList.remove("selected"));
    el.classList.add("selected");
  }
  if (a === "motivation-score") {
    state.motivation[el.dataset.q] = +el.dataset.v;
    save();
    el.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("selected"));
    el.classList.add("selected");
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

/* === PAGES === */

function renderStart(main) {
  const hasProgress = state.initialInterests || state.dreamLife[0].text;
  main.innerHTML = `
    <h2>Привет! 👋</h2>
    <p class="lead">Это твой личный профориентационный дневник. Пройди три блока — и в конце у тебя будет чёткий план действий. Всё сохраняется только на этом устройстве.</p>

    <div class="card">
      <h3>Какие профессии ты уже рассматриваешь?</h3>
      <p class="lead" style="font-size:14px">Пиши через запятую. Что в них нравится? Это твоя отправная точка.</p>
      <textarea data-path="initialInterests" placeholder="Например: программист, психолог, дизайнер">${esc(state.initialInterests)}</textarea>
    </div>

    <div class="card">
      <h3>Как проходить</h3>
      <ol style="padding-left:20px; font-size:14px; line-height:1.8">
        <li><b>Блок 1</b> — исследуй свои таланты и мотивацию</li>
        <li><b>Блок 2</b> — познакомься с профессиями и условиями работы</li>
        <li><b>Блок 3</b> — сравни «до» и «после», поставь SMART-цель и составь план</li>
      </ol>
    </div>

    ${hasProgress ? `<button class="btn" onclick="location.hash='#/block1'">Продолжить → Блок 1</button>` : `<button class="btn" onclick="location.hash='#/block1'">Начать → Блок 1</button>`}
  `;
}

function renderBlock1(main, sub) {
  const tabs = [
    ["dream", "Жизнь мечты"],
    ["ikigai", "Икигай"],
    ["mbti", "MBTI"],
    ["talents", "Таланты"],
    ["motivation", "Мотивация"]
  ];
  main.innerHTML = `
    <div class="tabs">
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
    <p class="lead">Опиши 8 пунктов, как ты представляешь свою идеальную жизнь. Детализируй: где ты, с кем, чем занимаешься.</p>

    ${state.dreamLife.map((item, i) => `
      <div class="card">
        <label>Пункт ${i+1}</label>
        <textarea data-path="dreamLife.${i}.text" placeholder="${i===0 ? 'В каком городе ты живёшь? Это дом или квартира?' : i===1 ? 'Чем занимаешься в течение дня?' : i===2 ? 'Кто рядом с тобой?' : i===3 ? 'Сколько ты зарабатываешь в месяц?' : 'Ещё один важный для тебя пункт...'}">${esc(item.text)}</textarea>
      </div>
    `).join("")}

    <div class="card" style="background: color-mix(in srgb, var(--primary) 8%, var(--card))">
      <h3 style="margin-top:0">💡 Наводящие вопросы</h3>
      <p style="margin:0; font-size:14px">
        В каком городе или стране ты хочешь жить?<br>
        Дом, квартира или что-то другое?<br>
        Чем занимаешься в течение дня?<br>
        Кто рядом с тобой?<br>
        Сколько хочешь зарабатывать? На что тратить?<br>
        Что бы ты делал(а), если бы не нужно было думать о деньгах?
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
    <h2>Икигай — твоё предназначение</h2>
    <p class="lead">Заполни три списка по 10 пунктов. Потом отметь, что повторяется — это твой потенциал.</p>

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

    <div class="card">
      <h3 style="margin-top:0">🎯 Твой потенциал</h3>
      <p class="lead" style="font-size:14px">Посмотри на все 30 пунктов выше. Выпиши через запятую 5 качеств или занятий, которые встречаются в нескольких списках. Это твой потенциал.</p>
      <textarea data-path="ikigai.overlap" placeholder="Например: творчество, помощь людям, системность, общение, обучение">${esc(state.ikigai.overlap)}</textarea>
    </div>
  `;
}

function renderMBTI(box) {
  const total = MBTI_QUESTIONS.length;
  const done = Object.keys(state.mbti.answers).length;
  const pct = Math.round(done / total * 100);

  let typeHtml = "";
  if (done === total) {
    const get = (scale, first, second) => {
      let a = 0, b = 0;
      MBTI_QUESTIONS.forEach((q, i) => {
        if (q.s !== scale) return;
        if (state.mbti.answers[i] === "a") a++; else if (state.mbti.answers[i] === "b") b++;
      });
      return a >= b ? first : second;
    };
    const type = get("EI","E","I") + get("SN","S","N") + get("TF","T","F") + get("JP","J","P");
    const info = MBTI_DESCRIPTIONS[type];
    typeHtml = `
      <div class="result-box">
        <strong>${type} — ${info.name}</strong>
        ${info.text}
        <p style="margin:10px 0 0; font-size:14px"><b>Подходящие направления:</b> ${info.jobs}</p>
      </div>
      <div class="card">
        <label>Какие 2–3 качества из описания точно про тебя?</label>
        <textarea data-path="mbti.traits" placeholder="Выпиши своими словами">${esc(state.mbti.traits)}</textarea>
      </div>
    `;
  }

  box.innerHTML = `
    <h2>Тип личности (упрощённый MBTI)</h2>
    <p class="lead">28 вопросов. Выбирай вариант, который описывает тебя чаще всего. Нет правильных ответов.</p>
    <div class="progress"><div style="width:${pct}%"></div></div>

    ${MBTI_QUESTIONS.map((q, i) => `
      <div class="card q-card">
        <div class="q-text">${i+1}. ${q.q}</div>
        <div class="q-option ${state.mbti.answers[i]==='a'?'selected':''}" data-action="mbti-answer" data-q="${i}" data-v="a">A. ${q.a}</div>
        <div class="q-option ${state.mbti.answers[i]==='b'?'selected':''}" data-action="mbti-answer" data-q="${i}" data-v="b">Б. ${q.b}</div>
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
          <strong>${t.name}</strong>
          <small>${t.desc}</small>
        </div>
      `).join("")}
    </div>
    <p style="margin-top:16px; color:var(--muted); font-size:14px">Выбрано: ${state.talents.length} из ${TALENTS.length}</p>
  `;
}

function renderMotivation(box) {
  const scores = {};
  Object.values(state.motivation).forEach(v => {});
  Object.entries(state.motivation).forEach(([i, v]) => {
    const s = MOTIVATION_QUESTIONS[i]?.s;
    if (s) scores[s] = (scores[s] || 0) + v;
  });
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 2);

  box.innerHTML = `
    <h2>Что тобой движет?</h2>
    <p class="lead">Оцени по шкале от 1 (совсем не про меня) до 5 (это точно про меня).</p>

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
        ${sorted.map(([k, v]) => `<div>• ${MOTIVATION_LABELS[k]} (${v} б.)</div>`).join("")}
        <p style="margin:10px 0 0; font-size:14px">Подумай: как профессия из твоего списка закрывает этот мотив?</p>
      </div>
    ` : ""}
  `;
}

function renderBlock2(main, sub) {
  const tabs = [
    ["lives", "5 жизней"],
    ["conditions", "Условия работы"],
    ["catalog", "Каталог профессий"]
  ];
  main.innerHTML = `
    <div class="tabs">
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
        <label>Какие мои сегодняшние качества помогут в этой профессии?</label>
        <textarea data-path="fiveLives.${i}.qualities" placeholder="Например: усидчивость, чувство вкуса">${esc(l.qualities)}</textarea>
        <label>Какие мои потребности закроет эта работа?</label>
        <textarea data-path="fiveLives.${i}.needs" placeholder="Деньги, статус, свобода, творчество…">${esc(l.needs)}</textarea>
      </div>
    `).join("")}
  `;
}

function renderConditions(box) {
  const c = state.workConditions;
  const opt = (val, label) => `<option value="${val}" ${c.schedule===val?'selected':''}>${label}</option>`;
  box.innerHTML = `
    <h2>Подбор условий работы</h2>
    <p class="lead">Что для тебя важно в работе? Это поможет отсеять неподходящие варианты в каталоге.</p>

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

      <label>Насколько важен престиж? (1 — не важен, 5 — очень)</label>
      <div class="scale-row">
        ${[1,2,3,4,5].map(v => `<button class="${c.prestige===v?'selected':''}" onclick="setPath('workConditions.prestige',${v});render();">${v}</button>`).join("")}
      </div>

      <label style="margin-top:16px">Заметки</label>
      <textarea data-path="workConditions.notes" placeholder="Что ещё важно? Например: чтобы был смысл, свобода, команда…">${esc(c.notes)}</textarea>
    </div>

    <div class="card" style="background: color-mix(in srgb, var(--primary) 8%, var(--card))">
      <h3 style="margin-top:0">💡 Что важно знать про зарплату</h3>
      <p style="font-size:14px; margin:0">
        <b>Оклад</b> — фиксированная часть, которую платят всегда.<br>
        <b>Премия / бонус</b> — переменная часть за результат.<br>
        <b>Белая зарплата</b> — официальная, с неё платят налоги и взносы, она видна в трудовой.<br>
        <b>Серая</b> — часть или всё «в конверте». Риски: нет больничных, отпускных, пенсионных накоплений, сложно получить кредит или визу.<br>
        <b>Гросс и нет</b> — оклад до вычета НДФЛ (13%) и сумма, которую получают на руки.
      </p>
    </div>
  `;
}

function renderCatalog(box) {
  box.innerHTML = `
    <h2>Каталог профессий</h2>
    <p class="lead">Нажми на профессию, чтобы увидеть детали. Здесь 36 вариантов — от IT до рабочих специальностей.</p>
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
          <div class="sphere">${esc(p.sphere)}</div>
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

function renderBlock3(main, sub) {
  const tabs = [
    ["compare", "Сравнение"],
    ["smart", "SMART-цель"],
    ["plan", "План действий"]
  ];
  main.innerHTML = `
    <div class="tabs">
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
  const typeInfo = (() => {
    const done = Object.keys(state.mbti.answers).length;
    if (done < MBTI_QUESTIONS.length) return null;
    const get = (scale, first, second) => {
      let a = 0, b = 0;
      MBTI_QUESTIONS.forEach((q, i) => {
        if (q.s !== scale) return;
        if (state.mbti.answers[i] === "a") a++; else if (state.mbti.answers[i] === "b") b++;
      });
      return a >= b ? first : second;
    };
    return get("EI","E","I") + get("SN","S","N") + get("TF","T","F") + get("JP","J","P");
  })();

  box.innerHTML = `
    <h2>Сравнение «до» и «после»</h2>
    <p class="lead">Посмотри, как изменились твои представления о профессиях.</p>

    <div class="card">
      <h3 style="margin-top:0">Было (в начале)</h3>
      <p style="margin:0">${esc(state.initialInterests || "— не заполнено")}</p>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Стало — твои таланты</h3>
      ${state.talents.length ? `<p style="margin:0">${state.talents.map(id => TALENTS.find(t=>t.id===id)?.name).filter(Boolean).join(", ")}</p>` : "<p style='margin:0;color:var(--muted)'>— пока не выбраны</p>"}
    </div>

    <div class="card">
      <h3 style="margin-top:0">Стало — твой потенциал (Икигай)</h3>
      <p style="margin:0">${esc(state.ikigai.overlap || "— пока не заполнено")}</p>
    </div>

    ${typeInfo ? `<div class="card"><h3 style="margin-top:0">Твой тип личности</h3><p style="margin:0"><b>${typeInfo}</b> — ${MBTI_DESCRIPTIONS[typeInfo].name}. ${esc(state.mbti.traits || "Рефлексия не заполнена.")}</p></div>` : ""}

    ${lives.length ? `
      <div class="card">
        <h3 style="margin-top:0">Профессии из «5 жизней»</h3>
        ${lives.map(l => `<p style="margin:6px 0"><b>${esc(l.profession)}</b>${l.needs ? ` — закроет потребность: ${esc(l.needs)}` : ""}</p>`).join("")}
      </div>
    ` : ""}

    <div class="card">
      <h3 style="margin-top:0">Рефлексия</h3>
      <label>Что изменилось в твоих представлениях о профессиях? Какие варианты откликаются сильнее, а какие — уже нет?</label>
      <textarea data-path="finalNotes" placeholder="Напиши своими словами...">${esc(state.finalNotes)}</textarea>
    </div>
  `;
}

function renderSmart(box) {
  const s = state.smartGoal;
  const hints = {
    specific: "Например: поступить на бюджет на направление «Программная инженерия» в вуз X",
    measurable: "Например: сдать ЕГЭ по информатике на 80+",
    achievable: "Например: у меня уже есть сильная математика, но нужно подтянуть программирование",
    relevant: "Например: это связано с моими талантами в логике и системном мышлении",
    timeBound: "Например: к августу 2027 года"
  };
  box.innerHTML = `
    <h2>SMART-цель</h2>
    <p class="lead">Сформулируй одну конкретную цель на ближайшие 1–3 года. Заполни все пять полей.</p>

    <div class="card">
      <label><b>S</b> — Specific (конкретная): чего именно ты хочешь достичь?</label>
      <textarea data-path="smartGoal.specific" placeholder="${hints.specific}">${esc(s.specific)}</textarea>

      <label><b>M</b> — Measurable (измеримая): как поймёшь, что достиг(ла)?</label>
      <textarea data-path="smartGoal.measurable" placeholder="${hints.measurable}">${esc(s.measurable)}</textarea>

      <label><b>A</b> — Achievable (достижимая): что уже есть и чего не хватает?</label>
      <textarea data-path="smartGoal.achievable" placeholder="${hints.achievable}">${esc(s.achievable)}</textarea>

      <label><b>R</b> — Relevant (значимая): почему это важно именно для тебя?</label>
      <textarea data-path="smartGoal.relevant" placeholder="${hints.relevant}">${esc(s.relevant)}</textarea>

      <label><b>T</b> — Time-bound (во времени): к какому сроку?</label>
      <textarea data-path="smartGoal.timeBound" placeholder="${hints.timeBound}">${esc(s.timeBound)}</textarea>
    </div>
  `;
}

function renderPlan(box) {
  box.innerHTML = `
    <h2>План действий</h2>
    <p class="lead">Разбей цель на 3–7 конкретных шагов. У каждого — дедлайн и статус.</p>

    ${state.actionPlan.length === 0 ? `<p style="color:var(--muted)">Пока нет шагов. Добавь первый.</p>` : ""}

    ${state.actionPlan.map((a, i) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <b>Шаг ${i+1}</b>
          <button data-action="remove-action" data-i="${i}" style="background:transparent;border:none;color:var(--danger);cursor:pointer;font-size:14px">Удалить</button>
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

    <button class="btn secondary" data-action="add-action">+ Добавить шаг</button>
  `;
}

function renderProfile(main) {
  const d = state;
  main.innerHTML = `
    <h2>Мой профиль</h2>
    <p class="lead">Здесь всё, что ты собрал(а). Данные хранятся только на этом устройстве.</p>

    <div class="card">
      <h3 style="margin-top:0">Старт</h3>
      <p style="margin:0"><b>Интересовали профессии:</b> ${esc(d.initialInterests || "—")}</p>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Таланты и потенциал</h3>
      <p><b>Карточки талантов:</b> ${d.talents.length ? d.talents.map(id=>TALENTS.find(t=>t.id===id)?.name).filter(Boolean).join(", ") : "—"}</p>
      <p><b>Икигай (потенциал):</b> ${esc(d.ikigai.overlap || "—")}</p>
      <p><b>Тип личности:</b> ${esc(d.mbti.traits || (Object.keys(d.mbti.answers).length ? "тест пройден" : "—"))}</p>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Профессии и цель</h3>
      <p><b>5 жизней:</b> ${d.fiveLives.filter(l=>l.profession).map(l=>esc(l.profession)).join(", ") || "—"}</p>
      <p><b>SMART-цель:</b> ${esc(d.smartGoal.specific || "—")}</p>
      <p><b>Шагов в плане:</b> ${d.actionPlan.length}</p>
    </div>

    <button class="btn" data-action="export">📥 Скачать профиль (JSON)</button>
    <div style="height:10px"></div>
    <button class="btn danger" data-action="reset">Удалить все данные</button>
  `;
}

/* === PWA install === */
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("#installBtn").classList.remove("hidden");
});
$("#installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("#installBtn").classList.add("hidden");
});

/* === SW registration === */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js"));
}
