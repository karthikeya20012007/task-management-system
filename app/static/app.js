/* ═══════════════════════════════════════════════════
   TASKFLOW — app.js
   Production-level vanilla JS
   All task CRUD · Socket.IO · Toasts · Filters · Analytics
   ═══════════════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────── */
const State = {
    filter: 'all',
    priorityFilter: '',
    searchQuery: '',
    tasks: [],          // populated from DOM on init
};

/* ─────────────────────────────────────────────────
   CSRF TOKEN  (read from meta tag injected by Flask)
───────────────────────────────────────────────── */
function getCSRF() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.getAttribute('content') : '';
}

/* ─────────────────────────────────────────────────
   API HELPER
───────────────────────────────────────────────── */
function scrollToAnalytics(event) {

    event.preventDefault();

    const section = document.getElementById('analyticsSection');

    if (!section) return;

    section.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function scrollToTasks(event) {

    event.preventDefault();

    const section = document.getElementById('tasksSection');

    if (!section) return;

    section.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

async function api(method, url, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRF(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);

    // Session expired → redirect
    if (res.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthenticated');
    }
    if (res.status === 403) {
        showToast('Permission denied', 'error');
        throw new Error('Forbidden');
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
}

/* ─────────────────────────────────────────────────
   TOAST NOTIFICATIONS
───────────────────────────────────────────────── */
function showToast(message, type = 'success', title = null) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const iconMap = {
        success: 'bi-check-circle-fill toast-icon-success',
        error: 'bi-x-circle-fill toast-icon-error',
        info: 'bi-info-circle-fill toast-icon-info',
        warning: 'bi-exclamation-triangle-fill toast-icon-warn',
    };
    const titleMap = {
        success: title || 'Success',
        error: title || 'Error',
        info: title || 'Info',
        warning: title || 'Warning',
    };

    const id = `toast-${Date.now()}`;
    const html = `
    <div id="${id}" class="toast tf-toast align-items-center" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
      <div class="toast-header">
        <i class="bi ${iconMap[type] || iconMap.info} me-2"></i>
        <strong class="me-auto">${titleMap[type]}</strong>
        <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">${escapeHtml(message)}</div>
    </div>`;

    container.insertAdjacentHTML('beforeend', html);
    const el = document.getElementById(id);
    const toast = new bootstrap.Toast(el, { autohide: true, delay: 4000 });
    toast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

/* ─────────────────────────────────────────────────
   BUTTON LOADING STATE
───────────────────────────────────────────────── */
function setLoading(btn, loading) {
    if (!btn) return;
    const textEl = btn.querySelector('.btn-text');
    const loaderEl = btn.querySelector('.btn-loader');
    if (!textEl || !loaderEl) return;
    btn.disabled = loading;
    textEl.classList.toggle('d-none', loading);
    loaderEl.classList.toggle('d-none', !loading);
}

/* ─────────────────────────────────────────────────
   ESCAPE HTML (XSS prevention)
───────────────────────────────────────────────── */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ─────────────────────────────────────────────────
   ADD TASK
───────────────────────────────────────────────── */
async function addTask() {
    const titleEl = document.getElementById('addTitle');
    const descEl = document.getElementById('addDesc');
    const btn = document.getElementById('addTaskBtn');

    const title = titleEl.value.trim();
    if (!title) {
        titleEl.classList.add('is-invalid');
        titleEl.focus();
        return;
    }
    titleEl.classList.remove('is-invalid');

    // Read selected priority
    const activeBtn = document.querySelector('.prio-btn.active');
    const priority = activeBtn ? activeBtn.dataset.priority : 'medium';

    setLoading(btn, true);
    try {
        const task = await api('POST', '/tasks', {
            title,
            description: descEl.value.trim(),
            priority,
        });

        // Close modal, clear form
        bootstrap.Modal.getInstance(document.getElementById('addTaskModal'))?.hide();
        titleEl.value = '';
        descEl.value = '';
        document.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.prio-medium')?.classList.add('active');

        // Inject card into DOM
        prependTaskCard(task);
        updateAnalytics();
        showToast(`"${task.title}" created`, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

/* ─────────────────────────────────────────────────
   OPEN EDIT MODAL
───────────────────────────────────────────────── */
function openEditModal(id, title, description, priority, status) {
    document.getElementById('editTaskId').value = id;
    document.getElementById('editTitle').value = title;
    document.getElementById('editDesc').value = description || '';
    document.getElementById('editPriority').value = priority || 'medium';
    document.getElementById('editStatus').value = status || 'pending';
    new bootstrap.Modal(document.getElementById('editTaskModal')).show();
}

/* ─────────────────────────────────────────────────
   SAVE EDIT
───────────────────────────────────────────────── */
async function saveEdit() {
    const id = parseInt(document.getElementById('editTaskId').value, 10);
    const title = document.getElementById('editTitle').value.trim();
    const desc = document.getElementById('editDesc').value.trim();
    const priority = document.getElementById('editPriority').value;
    const status = document.getElementById('editStatus').value;
    const btn = document.getElementById('editTaskBtn');

    if (!title) {
        document.getElementById('editTitle').classList.add('is-invalid');
        return;
    }
    document.getElementById('editTitle').classList.remove('is-invalid');

    setLoading(btn, true);
    try {
        const updated = await api('PUT', `/tasks/${id}`, { title, description: desc, priority, status });

        bootstrap.Modal.getInstance(document.getElementById('editTaskModal'))?.hide();
        replaceTaskCard(id, updated);
        updateAnalytics();
        showToast('Task updated', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

/* ─────────────────────────────────────────────────
   OPEN DELETE MODAL
───────────────────────────────────────────────── */
function openDeleteModal(id, title) {
    document.getElementById('deleteTaskId').value = id;
    document.getElementById('deleteTaskName').textContent = `"${title}"`;
    new bootstrap.Modal(document.getElementById('deleteTaskModal')).show();
}

/* ─────────────────────────────────────────────────
   CONFIRM DELETE
───────────────────────────────────────────────── */
async function confirmDelete() {
    const id = parseInt(document.getElementById('deleteTaskId').value, 10);
    const btn = document.getElementById('confirmDeleteBtn');

    setLoading(btn, true);
    try {
        await api('DELETE', `/tasks/${id}`);

        bootstrap.Modal.getInstance(document.getElementById('deleteTaskModal'))?.hide();
        removeTaskCard(id);
        updateAnalytics();
        showToast('Task deleted', 'info');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setLoading(btn, false);
    }
}

/* ─────────────────────────────────────────────────
   COMPLETE TASK
───────────────────────────────────────────────── */
async function completeTask(id, buttonEl) {
    const card = document.querySelector(`.task-card[data-task-id="${id}"]`);
    if (!card) return;

    buttonEl.disabled = true;
    buttonEl.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving…`;

    try {
        const updated = await api('PUT', `/tasks/${id}`, { status: 'completed' });
        replaceTaskCard(id, updated);
        updateAnalytics();
        showToast('Task completed! 🎉', 'success');
    } catch (err) {
        buttonEl.disabled = false;
        buttonEl.innerHTML = `<i class="bi bi-check2 me-1"></i>Complete`;
        showToast(err.message, 'error');
    }
}

/* ─────────────────────────────────────────────────
   DOM HELPERS — build task card HTML
───────────────────────────────────────────────── */
function buildTaskCardHTML(task) {

    const priority = (task.priority || 'medium').toLowerCase();
    const status = (task.status || 'pending').toLowerCase();
    const description = task.description || '';

    const isDone = status === 'completed';

    const statusLabel = isDone
        ? `<i class="bi bi-check-circle-fill me-1"></i>Completed`
        : `<i class="bi bi-hourglass-split me-1"></i>Pending`;

    const completeBtn = isDone
        ? ''
        : `
        <button class="btn btn-complete" onclick="completeTask(${task.id}, this)">
            <i class="bi bi-check2 me-1"></i>Complete
        </button>
        `;

    const desc = description
        ? `<p class="task-desc">${escapeHtml(description)}</p>`
        : '';

    return `
    <div class="task-card ${isDone ? 'task-done' : ''}"
         data-task-id="${task.id}"
         data-status="${escapeHtml(status)}"
         data-priority="${escapeHtml(priority)}">

      <div class="task-card-header">

        <span class="priority-badge priority-${escapeHtml(priority)}">
          ${escapeHtml(priority)}
        </span>

        <div class="task-actions">

          <button class="task-action-btn btn-edit"
              onclick="openEditModal(
                  ${task.id},
                  '${escapeHtml(task.title || '').replace(/'/g, "\\'")}',
                  '${escapeHtml(description).replace(/'/g, "\\'")}',
                  '${escapeHtml(priority)}',
                  '${escapeHtml(status)}'
              )"
              title="Edit task">
            <i class="bi bi-pencil"></i>
          </button>

          <button class="task-action-btn btn-delete"
              onclick="openDeleteModal(
                  ${task.id},
                  '${escapeHtml(task.title || '').replace(/'/g, "\\'")}'
              )"
              title="Delete task">
            <i class="bi bi-trash3"></i>
          </button>

        </div>
      </div>

      <div class="task-card-body">
        <h5 class="task-title">${escapeHtml(task.title || 'Untitled Task')}</h5>
        ${desc}
      </div>

      <div class="task-card-footer">
        <span class="status-chip status-${escapeHtml(status)}">
          ${statusLabel}
        </span>

        ${completeBtn}
      </div>
    </div>
    `;
}
function prependTaskCard(task) {
    const grid = document.getElementById('taskGrid');
    const empty = document.getElementById('emptyState');
    if (empty) empty.remove();

    grid.insertAdjacentHTML('afterbegin', buildTaskCardHTML(task));
    applyFilters(); // respect active filter
    updateSidebarBadge();
}

function replaceTaskCard(id, task) {
    const existing = document.querySelector(`.task-card[data-task-id="${id}"]`);
    if (!existing) return;
    existing.outerHTML = buildTaskCardHTML(task);
    applyFilters();
    updateSidebarBadge();
}

function removeTaskCard(id) {
    const card = document.querySelector(`.task-card[data-task-id="${id}"]`);
    if (!card) return;
    card.style.transition = 'opacity 0.25s, transform 0.25s';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.96)';
    setTimeout(() => {
        card.remove();
        if (!document.querySelector('.task-card')) showEmptyState();
    }, 260);
    updateSidebarBadge();
}

function showEmptyState() {
    const grid = document.getElementById('taskGrid');
    grid.innerHTML = `
    <div class="empty-state" id="emptyState">
      <div class="empty-icon">
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect width="64" height="64" rx="16" fill="url(#eg2)"/>
          <path d="M20 32h24M20 24h24M20 40h16" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
          <defs>
            <linearGradient id="eg2" x1="0" y1="0" x2="64" y2="64">
              <stop stop-color="#6C63FF" stop-opacity="0.3"/>
              <stop offset="1" stop-color="#3ECFCF" stop-opacity="0.3"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h4>No tasks here</h4>
      <p>Adjust your filter or create a new task</p>
      <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTaskModal">
        <i class="bi bi-plus-lg me-1"></i>Add Task
      </button>
    </div>`;
}

/* ─────────────────────────────────────────────────
   FILTERS & SEARCH
───────────────────────────────────────────────── */
function applyFilters() {
    const cards = document.querySelectorAll('.task-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const status = card.dataset.status;
        const priority = card.dataset.priority;
        const title = card.querySelector('.task-title')?.textContent.toLowerCase() || '';
        const desc = card.querySelector('.task-desc')?.textContent.toLowerCase() || '';

        const matchFilter = State.filter === 'all' || status === State.filter;
        const matchPriority = !State.priorityFilter || priority === State.priorityFilter;
        const matchSearch = !State.searchQuery ||
            title.includes(State.searchQuery) ||
            desc.includes(State.searchQuery);

        const visible = matchFilter && matchPriority && matchSearch;
        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
    });

    // Show empty hint if everything filtered out
    const emptyState = document.getElementById('emptyState');
    if (!emptyState) {
        const grid = document.getElementById('taskGrid');
        if (visibleCount === 0 && grid) {
            const hint = document.getElementById('filterEmptyHint');
            if (!hint) {
                grid.insertAdjacentHTML('beforeend',
                    `<div class="empty-state" id="filterEmptyHint">
             <div class="empty-icon"><i class="bi bi-funnel" style="font-size:2.5rem;color:var(--text-muted)"></i></div>
             <h4>No matches</h4>
             <p>Try adjusting your filters</p>
           </div>`);
            }
        } else {
            document.getElementById('filterEmptyHint')?.remove();
        }
    }
}

/* ─────────────────────────────────────────────────
   ANALYTICS REFRESH
───────────────────────────────────────────────── */
async function updateAnalytics() {
    try {
        const data = await api('GET', '/analytics');
        animateValue('statTotal', data.total_tasks ?? 0);
        animateValue('statCompleted', data.completed_tasks ?? 0);
        animateValue('statPending', data.pending_tasks ?? 0);

        const pct = data.completion_percentage ?? 0;
        const pctEl = document.getElementById('statPct');
        if (pctEl) pctEl.textContent = `${pct}%`;

        // Update ring
        const ring = document.getElementById('ringFill');
        if (ring) {
            const circumference = 100.53;
            ring.style.strokeDashoffset = circumference - (pct / 100 * circumference);
        }

        // Sidebar badge
        const badge = document.getElementById('sidebarPending');
        if (badge) badge.textContent = data.pending_tasks ?? 0;

    } catch (_) { /* non-fatal */ }
}

function animateValue(elId, target) {
    const el = document.getElementById(elId);
    if (!el) return;
    const start = parseInt(el.textContent, 10) || 0;
    const duration = 600;
    const startTs = performance.now();

    function step(ts) {
        const progress = Math.min((ts - startTs) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * ease);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function updateSidebarBadge() {
    const pending = document.querySelectorAll('.task-card[data-status="pending"]').length;
    const badge = document.getElementById('sidebarPending');
    if (badge) badge.textContent = pending;
}

/* ─────────────────────────────────────────────────
   SOCKET.IO — real-time new task notifications
───────────────────────────────────────────────── */
function initSocket() {
    if (typeof io === 'undefined') return;

    const socket = io({ transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
        console.log('[TaskFlow] Socket connected:', socket.id);
    });


    socket.on('disconnect', () => {
        console.log('[TaskFlow] Socket disconnected');
    });

    socket.on('connect_error', (err) => {
        console.warn('[TaskFlow] Socket error:', err.message);
    });
}

/* ─────────────────────────────────────────────────
   SCROLL HELPERS (sidebar nav)
───────────────────────────────────────────────── */
function scrollToTasks(e) {
    e?.preventDefault();
    document.getElementById('tasksSection')?.scrollIntoView({ behavior: 'smooth' });
    closeSidebar();
}
function scrollToAnalytics(e) {
    e?.preventDefault();
    document.getElementById('analyticsSection')?.scrollIntoView({ behavior: 'smooth' });
    closeSidebar();
}

/* ─────────────────────────────────────────────────
   SIDEBAR MOBILE TOGGLE
───────────────────────────────────────────────── */
function openSidebarMobile() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebarOverlay')?.classList.remove('d-none');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebarOverlay')?.classList.add('d-none');
    document.body.style.overflow = '';
}

/* ─────────────────────────────────────────────────
   DATE DISPLAY
───────────────────────────────────────────────── */
function setCurrentDate() {
    const el = document.getElementById('currentDate');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
}

/* ─────────────────────────────────────────────────
   PRIORITY SELECTOR (Add Task Modal)
───────────────────────────────────────────────── */
function initPrioritySelector() {
    document.querySelectorAll('.prio-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

/* ─────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

    setCurrentDate();
    initPrioritySelector();
    initSocket();

    /* Sidebar toggles */
    document.getElementById('sidebarOpen')?.addEventListener('click', openSidebarMobile);
    document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    /* Filter chips */
    document.querySelectorAll('.chip[data-filter]').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('chip-active'));
            this.classList.add('chip-active');
            State.filter = this.dataset.filter;
            applyFilters();
        });
    });

    /* Priority filter dropdown */
    document.getElementById('priorityFilter')?.addEventListener('change', function () {
        State.priorityFilter = this.value;
        applyFilters();
    });

    /* Search input */
    let searchTimeout;
    document.getElementById('searchInput')?.addEventListener('input', function () {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            State.searchQuery = this.value.trim().toLowerCase();
            applyFilters();
        }, 220);
    });

    /* Notification bell clears dot */
    document.getElementById('notifBell')?.addEventListener('click', () => {
        document.getElementById('notifDot')?.classList.add('d-none');
    });

    /* Clear validation on input */
    document.getElementById('addTitle')?.addEventListener('input', function () {
        this.classList.remove('is-invalid');
    });
    document.getElementById('editTitle')?.addEventListener('input', function () {
        this.classList.remove('is-invalid');
    });

    /* Reset add modal on close */
    document.getElementById('addTaskModal')?.addEventListener('hidden.bs.modal', () => {
        document.getElementById('addTitle').value = '';
        document.getElementById('addDesc').value = '';
        document.getElementById('addTitle').classList.remove('is-invalid');
        document.querySelectorAll('.prio-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.prio-medium')?.classList.add('active');
    });

    /* Enter key submits add modal */
    document.getElementById('addTitle')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') addTask();
    });
    document.getElementById('editTitle')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') saveEdit();
    });

});