(function() {
  const HABITS_KEY = 'ht_habits';
  const COMPLETIONS_KEY = 'ht_completions';
  let habits = [];
  let completions = {};
  let editMode = false;
  let currentView = 'hoy';
  let monthOffset = 0; // 0 = mes actual
  let pendingDelete = null;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function dateKey(d) { return d.toLocaleDateString('en-CA'); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function load() {
    try { habits = JSON.parse(localStorage.getItem(HABITS_KEY) || '[]'); } catch (e) { habits = []; }
    try { completions = JSON.parse(localStorage.getItem(COMPLETIONS_KEY) || '{}'); } catch (e) { completions = {}; }
  }

  function saveHabits() { localStorage.setItem(HABITS_KEY, JSON.stringify(habits)); }
  function saveCompletions() { localStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions)); }

  function isDone(habitId, dKey) { return !!(completions[dKey] && completions[dKey][habitId]); }

  function toggleDone(habitId, dKey) {
    if (!completions[dKey]) completions[dKey] = {};
    if (completions[dKey][habitId]) delete completions[dKey][habitId];
    else completions[dKey][habitId] = true;
    saveCompletions();
  }

  function computeStreak(habitId) {
    let d = new Date();
    let streak = 0;
    if (!isDone(habitId, dateKey(d))) d.setDate(d.getDate() - 1);
    while (isDone(habitId, dateKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  function activeHabits() { return habits.filter(h => !h.archived); }

  function renderHeader() {
    const now = new Date();
    const weekday = now.toLocaleDateString('es-CL', { weekday: 'long' });
    const full = now.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    $('#ht-weekday').textContent = weekday;
    $('#ht-date-full').textContent = full;

    const list = activeHabits();
    const today = dateKey(now);
    const doneCount = list.filter(h => isDone(h.id, today)).length;
    $('#ht-progress-count').textContent = doneCount + '/' + list.length;
    const pct = list.length ? (doneCount / list.length) * 100 : 0;
    $('#ht-progress-bar').style.width = pct + '%';
  }

  function renderToday() {
    const list = activeHabits();
    const today = dateKey(new Date());
    const wrap = $('#ht-habit-list');
    wrap.innerHTML = '';
    
    if (list.length === 0) {
      wrap.innerHTML = '<div class="ht-empty">Aún no tienes hábitos.<br/>Agrega el primero abajo 👇</div>';
      return;
    }

    list.forEach(h => {
      const done = isDone(h.id, today);
      const streak = computeStreak(h.id);
      const row = document.createElement('div');
      row.className = 'ht-habit-row';
      row.innerHTML = `
        <div class="ht-check ${done ? 'done' : ''}" data-id="${h.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <div class="ht-habit-main">
          <div class="ht-habit-name ${done ? 'done' : ''}" data-id="${h.id}">${h.name}</div>
          ${streak >= 2 ? `<div class="ht-streak">🔥 ${streak} días seguidos</div>` : ''}
        </div>
        ${editMode ? `
        <div class="ht-row-edit-btns">
          <button class="ht-icon-btn" data-rename="${h.id}" title="Renombrar">✎</button>
          <button class="ht-icon-btn danger" data-delete="${h.id}" title="Eliminar">🗑</button>
        </div>` : ''}
      `;
      wrap.appendChild(row);
    });

    wrap.querySelectorAll('.ht-check').forEach(el => {
      el.addEventListener('click', () => { toggleDone(el.getAttribute('data-id'), today); renderAll(); });
    });
    
    if (editMode) {
      wrap.querySelectorAll('[data-rename]').forEach(btn => {
        btn.addEventListener('click', () => startRename(btn.getAttribute('data-rename')));
      });
      wrap.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', () => handleDeleteClick(btn));
      });
    }
  }

function startRename(id) {
    const nameEl = document.querySelector(`.ht-habit-name[data-id="${id}"]`);
    if (!nameEl) return;
    const habit = habits.find(h => h.id === id);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = habit.name;
    nameEl.replaceWith(input);
    input.focus();
    input.select();
    
    const commit = () => {
      const val = input.value.trim();
      if (val) habit.name = val;
      saveHabits();
      renderAll();
    };
    
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  }
