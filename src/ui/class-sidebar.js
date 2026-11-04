import {
  iconStar,
  iconGift,
  iconPlus,
  iconEdit,
  iconChevron,
  iconTrash,
  iconReset,
  iconCheck,
  iconTrophy,
  iconGrip,
  iconMedal,
} from './icons.js';
import { openPopover, closePopover, getOpenPopover, escapeHtml } from './popover.js';
import { MAX_CLASS_NAME_LENGTH, CLASS_COLORS, STAR_SPEEDS, rankClasses } from '../game/storage.js';

const HISTORY_PREVIEW = 5;

function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Left sidebar with every class / club. Each one keeps its own star jar and prize,
 * and the lifetime stars turn it into a leaderboard the kids can see on the board.
 */
export class ClassSidebar {
  /**
   * @param {object} state  shared app state ({ classes, activeClass, settings })
   * @param {object} callbacks
   * @param {(name: string) => void} callbacks.onSelect
   * @param {(name: string) => boolean} callbacks.onAdd
   * @param {(oldName: string, newName: string) => boolean} callbacks.onRename
   * @param {(name: string) => void} callbacks.onDelete
   * @param {(name: string, toIndex: number) => void} callbacks.onReorder
   * @param {(goal: number, reward: string) => void} callbacks.onGoalChange
   * @param {(color: string) => void} callbacks.onColorChange
   * @param {(seconds: number) => void} callbacks.onStarSpeedChange
   * @param {() => void} callbacks.onAddStar
   * @param {() => void} callbacks.onAddTask
   * @param {() => void} callbacks.onResetStars
   * @param {(collapsed: boolean) => void} callbacks.onCollapseChange
   * @param {(sort: 'manual' | 'stars') => void} callbacks.onSortChange
   */
  constructor(state, callbacks) {
    this.state = state;
    this.callbacks = callbacks;
    this.isAdding = false;
    this.editingClass = null;
    this.drag = null;
    this.velocity = { vx: 0, vy: 0 };
    this.lastMoveTime = 0;
    this.isMovingWindow = false;

    this.el = document.createElement('aside');
    this.el.className = 'class-sidebar liquid-glass-surface';
    document.body.appendChild(this.el);

    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.class-card-grip')) {
        this.onDragStart(e);
      } else {
        this.onWindowDragStart(e);
      }
    });
    this.render();
    this.applySavedPosition();
  }

  applySavedPosition() {
    const pos = this.state.settings.sidebarPos;
    if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
      const currentW = this.el.offsetWidth || 240;
      const currentH = this.el.offsetHeight || 180;
      const maxLeft = Math.max(8, window.innerWidth - currentW - 8);
      const maxTop = Math.max(8, window.innerHeight - currentH - 8);
      const safeX = Math.max(8, Math.min(maxLeft, pos.x));
      const safeY = Math.max(8, Math.min(maxTop, pos.y));
      this.el.style.left = `${safeX}px`;
      this.el.style.top = `${safeY}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    } else {
      this.el.style.left = '';
      this.el.style.top = '';
      this.el.style.right = '';
      this.el.style.bottom = '';
    }
  }

  getPhysicalRect() {
    const rect = this.el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    // Zero out velocity if the pointer hasn't moved in the last 45ms so held windows never impart stale velocity
    const now = performance.now();
    if (!this.isMovingWindow || now - this.lastMoveTime > 45) {
      this.velocity.vx = 0;
      this.velocity.vy = 0;
    }

    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      vx: this.velocity.vx,
      vy: this.velocity.vy,
      isMoving: Boolean(this.isMovingWindow),
    };
  }

  onWindowDragStart(e) {
    if (e.target.closest('button, input, .class-card, a, .class-card-grip, .sidebar-add-form')) return;

    const rect = this.el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialLeft = rect.left;
    const initialTop = rect.top;

    let lastX = initialLeft;
    let lastY = initialTop;
    let lastTime = performance.now();
    this.velocity = { vx: 0, vy: 0 };
    this.lastMoveTime = lastTime;
    this.isMovingWindow = true;
    this.el.classList.add('window-dragging');

    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const now = performance.now();
      const dt = Math.max(0.008, (now - lastTime) / 1000);

      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      const currentW = this.el.offsetWidth || rect.width;
      const currentH = this.el.offsetHeight || rect.height;
      const maxLeft = Math.max(8, window.innerWidth - currentW - 8);
      const maxTop = Math.max(8, window.innerHeight - currentH - 8);
      const newLeft = Math.max(8, Math.min(maxLeft, initialLeft + deltaX));
      const newTop = Math.max(8, Math.min(maxTop, initialTop + deltaY));

      this.velocity = {
        vx: (newLeft - lastX) / dt,
        vy: (newTop - lastY) / dt,
      };

      lastX = newLeft;
      lastY = newTop;
      lastTime = now;
      this.lastMoveTime = now;

      this.el.style.left = `${newLeft}px`;
      this.el.style.top = `${newTop}px`;
      this.el.style.right = 'auto';
      this.el.style.bottom = 'auto';
    };

    const onUp = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);

      this.isMovingWindow = false;
      this.el.classList.remove('window-dragging');

      const currentRect = this.el.getBoundingClientRect();
      this.state.settings.sidebarPos = {
        x: Math.round(currentRect.left),
        y: Math.round(currentRect.top),
      };
      this.callbacks.onSaveState?.();
      this.velocity = { vx: 0, vy: 0 };
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  get collapsed() {
    return Boolean(this.state.settings.sidebarCollapsed);
  }

  get sortByStars() {
    return this.state.settings.sidebarSort === 'stars';
  }

  /** Class names in display order: the teacher's order, or the leaderboard. */
  orderedNames() {
    const { classes } = this.state;
    const names = Object.keys(classes);
    if (!this.sortByStars) return names;
    return names
      .map((n, i) => ({ n, i, t: classes[n].totalStars || 0 }))
      .sort((a, b) => b.t - a.t || a.i - b.i)
      .map((x) => x.n);
  }

  render() {
    const { classes, activeClass } = this.state;
    const places = rankClasses(classes);
    this.el.classList.toggle('collapsed', this.collapsed);
    this.el.classList.toggle('sorted', this.sortByStars);

    this.el.innerHTML = `
      <div class="sidebar-head">
        <span class="sidebar-title">${this.sortByStars ? 'Рейтинг класів' : 'Мої класи'}</span>
        <button class="sidebar-head-btn ${this.sortByStars ? 'active' : ''}" data-action="sort"
          title="${this.sortByStars ? 'Повернути мій порядок (можна перетягувати)' : 'Показати рейтинг: хто зібрав найбільше зірок'}">
          ${iconTrophy()}
        </button>
        <button class="sidebar-head-btn" data-action="collapse" title="${this.collapsed ? 'Розгорнути список' : 'Згорнути список'}">
          ${iconChevron(this.collapsed ? 'right' : 'left')}
        </button>
      </div>

      <div class="sidebar-list">
        ${this.orderedNames().map((name) => this.renderCard(name, classes[name], name === activeClass, places[name])).join('')}
      </div>

      ${this.isAdding && !this.collapsed ? `
        <form class="sidebar-add-form">
          <input type="text" class="text-input" id="sidebar-new-class" maxlength="${MAX_CLASS_NAME_LENGTH}" placeholder="Напр. 5-А або Роботи" autocomplete="off">
          <button type="submit" class="sidebar-add-ok" title="Додати">${iconCheck()}</button>
        </form>
      ` : `
        <button class="sidebar-add-btn" data-action="add" title="Додати клас або гурток">
          ${iconPlus()} <span>Додати</span>
        </button>
      `}
    `;

    if (this.isAdding) {
      const input = this.el.querySelector('#sidebar-new-class');
      input?.focus();
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.isAdding = false;
          this.render();
        }
      });
      this.el.querySelector('.sidebar-add-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (input?.value || '').trim();
        if (!name) return;
        if (this.callbacks.onAdd(name)) {
          this.isAdding = false;
          this.render();
        } else {
          input.classList.add('input-error');
          input.select();
        }
      });
    }
  }

  renderCard(name, c, isActive, place) {
    const stars = c.stars || 0;
    const goal = c.goal || 20;
    const pct = Math.min(100, Math.round((stars / goal) * 100));
    const safe = escapeHtml(name);
    return `
      <div class="class-card ${isActive ? 'active' : ''} ${stars >= goal ? 'complete' : ''}" data-class="${safe}" style="--class-color:${escapeHtml(c.color)}">
        ${this.sortByStars ? '' : `<span class="class-card-grip" title="Перетягніть, щоб змінити порядок">${iconGrip()}</span>`}
        <button class="class-card-main" data-action="select" title="${isActive ? 'Активний клас' : `Перемкнути на ${safe}`}">
          <span class="class-card-top">
            ${place ? `<span class="class-card-medal" title="${place} місце за зірками">${iconMedal(place)}</span>` : ''}
            <span class="class-card-name">${safe}</span>
          </span>
          <span class="class-card-meter">
            <span class="class-card-progress"><span style="width:${pct}%"></span></span>
            <span class="class-card-stars" title="Зірок у банці / ціль">${iconStar(true)}<b>${stars}</b><small>/${goal}</small></span>
          </span>
          <span class="class-card-bottom">
            <span class="class-card-reward">${iconGift()}<span>${escapeHtml(c.reward)}</span></span>
            <span class="class-card-total" title="Зірок за весь час">${iconTrophy()}${c.totalStars || 0}</span>
          </span>
        </button>
        <button class="class-card-edit" data-action="edit" title="Ціль, приз і статистика ${safe}">
          ${iconEdit()}
        </button>
      </div>
    `;
  }

  onClick(e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const card = target.closest('.class-card');
    // dataset returns the unescaped attribute value, i.e. the real class name
    const name = card && Object.hasOwn(this.state.classes, card.dataset.class) ? card.dataset.class : null;

    switch (target.dataset.action) {
      case 'collapse':
        closePopover();
        this.callbacks.onCollapseChange(!this.collapsed);
        this.render();
        this.applySavedPosition();
        break;
      case 'sort':
        closePopover();
        this.callbacks.onSortChange(this.sortByStars ? 'manual' : 'stars');
        this.render();
        break;
      case 'add':
        if (this.collapsed) this.callbacks.onCollapseChange(false);
        this.isAdding = true;
        this.render();
        this.applySavedPosition();
        break;
      case 'select':
        if (name && name !== this.state.activeClass) this.callbacks.onSelect(name);
        break;
      case 'edit':
        if (!name) return;
        if (name !== this.state.activeClass) this.callbacks.onSelect(name);
        this.openEditor();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Drag to reorder (pointer events, so it works on touch boards too)
  // ---------------------------------------------------------------------------

  onDragStart(e) {
    const grip = e.target.closest('.class-card-grip');
    if (!grip || this.sortByStars) return;
    const card = grip.closest('.class-card');
    const list = this.el.querySelector('.sidebar-list');
    if (!card || !list) return;

    e.preventDefault();
    closePopover();
    card.classList.add('dragging');
    this.drag = { card, startIndex: [...list.children].indexOf(card) };

    const onMove = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      const siblings = [...list.children].filter((c) => c !== card);
      const before = siblings.find((c) => {
        const r = c.getBoundingClientRect();
        return ev.clientY < r.top + r.height / 2;
      });
      list.insertBefore(card, before || null);
    };
    // Listen on window: the grip may move under the pointer while cards reorder
    const onUp = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      card.classList.remove('dragging');
      const toIndex = [...list.children].indexOf(card);
      const { startIndex } = this.drag;
      this.drag = null;
      if (toIndex !== -1 && toIndex !== startIndex) this.callbacks.onReorder(card.dataset.class, toIndex);
      this.render();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }

  // ---------------------------------------------------------------------------
  // Class editor popover
  // ---------------------------------------------------------------------------

  openEditor() {
    const name = this.state.activeClass;
    const c = this.state.classes[name];
    const card = this.findCard(name);
    if (!c || !card) return;
    const canDelete = Object.keys(this.state.classes).length > 1;
    this.editingClass = name;

    openPopover({
      anchor: card,
      side: 'right',
      title: 'Налаштування класу',
      width: 360,
      html: `
        <div class="field-row">
          <label class="field field-grow">
            <span class="field-label">Назва</span>
            <input type="text" class="text-input" id="ce-name" maxlength="${MAX_CLASS_NAME_LENGTH}" value="${escapeHtml(name)}">
          </label>
        </div>

        <div class="field">
          <span class="field-label">Колір</span>
          <div class="color-swatches">
            ${CLASS_COLORS.map((col) => `
              <button type="button" class="color-swatch ${c.color === col ? 'active' : ''}" data-color="${col}" style="--swatch:${col}" title="Обрати колір"></button>
            `).join('')}
          </div>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Ціль (зірок)</span>
            <div class="stepper">
              <button type="button" class="stepper-btn" data-step="-5">−</button>
              <input type="number" class="num-input" id="ce-goal" min="3" max="200" value="${c.goal}">
              <button type="button" class="stepper-btn" data-step="5">+</button>
            </div>
          </label>
          <label class="field field-grow">
            <span class="field-label">Приз</span>
            <input type="text" class="text-input" id="ce-reward" maxlength="40" value="${escapeHtml(c.reward)}" placeholder="5 хв мультика">
          </label>
        </div>

        <div class="field">
          <span class="field-label">Одна зірка за … тиші</span>
          <div class="liquid-glass-pillbar panel-pillbar" id="ce-speed">
            ${STAR_SPEEDS.map((sec) => `
              <button type="button" class="liquid-glass-tab ${c.secondsPerStar === sec ? 'active' : ''}" data-speed="${sec}">
                ${sec} с${sec === STAR_SPEEDS[0] ? ' (легко)' : sec === STAR_SPEEDS[STAR_SPEEDS.length - 1] ? ' (важко)' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="jar-now">
          <div class="jar-now-count">${iconStar(true)} <b id="ce-stars">${c.stars}</b> / <span id="ce-goal-label">${c.goal}</span></div>
          <button type="button" class="chip-btn-gold" id="ce-add-star" title="Клавіша S">+1 зірка</button>
        </div>

        <div class="class-stats-strip">
          <div class="stat-cell"><span class="stat-val" id="ce-total">${c.totalStars || 0}</span><span class="stat-lbl">Усього зірок</span></div>
          <button type="button" class="stat-cell stat-cell-interactive" id="ce-add-task" title="Зарахувати виконане завдання">
            <span class="stat-val-row"><span class="stat-val" id="ce-tasks">${c.tasksCompleted || 0}</span><span class="stat-plus-badge">+1</span></span>
            <span class="stat-lbl">Завдань</span>
          </button>
          <div class="stat-cell"><span class="stat-val" id="ce-goals">${c.goalsReached || 0}</span><span class="stat-lbl">Призів</span></div>
          <div class="stat-cell"><span class="stat-val" id="ce-quiet">${Math.floor((c.quietSeconds || 0) / 60)}</span><span class="stat-lbl">Хв тиші</span></div>
        </div>

        <div class="field">
          <span class="field-label">Отримані призи</span>
          <ul class="prize-history" id="ce-history">${this.renderHistory(c)}</ul>
        </div>

        <div class="popover-actions">
          <button type="button" class="action-btn secondary" id="ce-reset" title="Банка стане порожньою. Загальна статистика залишиться.">
            ${iconReset()} <span>Нова банка (0 зірок)</span>
          </button>
          ${canDelete ? `<button type="button" class="icon-danger-btn" id="ce-delete" title="Видалити клас">${iconTrash()}</button>` : ''}
        </div>
      `,
      onMount: (el) => this.bindEditor(el, name),
      onClose: () => {
        this.editingClass = null;
      },
    });
  }

  renderHistory(c) {
    const history = c.prizeHistory || [];
    if (history.length === 0) {
      return '<li class="prize-history-empty">Ще немає. Наберіть ціль — і приз з\'явиться тут.</li>';
    }
    const rows = history.slice(0, HISTORY_PREVIEW).map((p) => `
      <li>${iconGift()}<span>${escapeHtml(p.reward)}</span><time>${formatDate(p.date)}</time></li>
    `).join('');
    const more = history.length > HISTORY_PREVIEW
      ? `<li class="prize-history-empty">і ще ${history.length - HISTORY_PREVIEW}…</li>`
      : '';
    return rows + more;
  }

  bindEditor(el, originalName) {
    let name = originalName;
    const inName = el.querySelector('#ce-name');
    const inGoal = el.querySelector('#ce-goal');
    const inReward = el.querySelector('#ce-reward');

    inName.addEventListener('change', () => {
      if (inName.value.trim() === name) return;
      if (this.callbacks.onRename(name, inName.value)) {
        name = this.state.activeClass;
        this.editingClass = name;
        inName.value = name;
        inName.classList.remove('input-error');
        this.render();
      } else {
        inName.classList.add('input-error');
      }
    });
    inName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') inName.blur();
    });

    el.querySelectorAll('.color-swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.color-swatch').forEach((b) => b.classList.toggle('active', b === btn));
        this.callbacks.onColorChange(btn.dataset.color);
        this.render();
      });
    });

    el.querySelectorAll('[data-speed]').forEach((btn) => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('active', b === btn));
        this.callbacks.onStarSpeedChange(parseInt(btn.dataset.speed, 10));
      });
    });

    const commitGoal = () => {
      const goal = Math.max(3, Math.min(200, parseInt(inGoal.value, 10) || 20));
      inGoal.value = goal;
      this.callbacks.onGoalChange(goal, inReward.value.trim() || 'Нагорода');
      this.render();
      this.refreshEditor();
    };
    inGoal.addEventListener('change', commitGoal);
    inReward.addEventListener('change', commitGoal);
    el.querySelectorAll('.stepper-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        inGoal.value = (parseInt(inGoal.value, 10) || 20) + parseInt(btn.dataset.step, 10);
        commitGoal();
      });
    });

    el.querySelector('#ce-add-star').addEventListener('click', () => this.callbacks.onAddStar());
    el.querySelector('#ce-add-task').addEventListener('click', () => this.callbacks.onAddTask());
    el.querySelector('#ce-reset').addEventListener('click', () => this.callbacks.onResetStars());
    el.querySelector('#ce-delete')?.addEventListener('click', () => {
      if (window.confirm(`Видалити «${name}» разом зі зірками та статистикою?`)) {
        closePopover();
        this.callbacks.onDelete(name);
      }
    });
  }

  /** Refreshes numbers inside an open class editor without rebuilding it (keeps input focus). */
  refreshEditor() {
    const el = getOpenPopover();
    const c = this.state.classes[this.state.activeClass];
    if (!el || !c || !el.querySelector('#ce-name')) return;
    const set = (id, v) => {
      const node = el.querySelector(id);
      if (node) node.textContent = v;
    };
    set('#ce-stars', c.stars || 0);
    set('#ce-goal-label', c.goal);
    set('#ce-total', c.totalStars || 0);
    set('#ce-tasks', c.tasksCompleted || 0);
    set('#ce-goals', c.goalsReached || 0);
    set('#ce-quiet', Math.floor((c.quietSeconds || 0) / 60));
    const history = el.querySelector('#ce-history');
    if (history) history.innerHTML = this.renderHistory(c);
  }

  /** Full refresh after any class data change. */
  update() {
    // The editor belongs to one class; close it if another class became active
    if (this.editingClass && this.editingClass !== this.state.activeClass) closePopover();
    // Don't rebuild while the teacher is typing a new class name or dragging a card
    if (!this.isAdding && !this.drag) this.render();
    this.refreshEditor();
  }

  findCard(name) {
    return [...this.el.querySelectorAll('.class-card')].find((c) => c.dataset.class === name) || null;
  }
}
