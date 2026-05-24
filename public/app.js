const state = {
  events: [],
  weekStart: startOfWeek(new Date()),
};

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const eventForm = document.getElementById('event-form');
const loginError = document.getElementById('login-error');
const eventError = document.getElementById('event-error');
const calendarGrid = document.getElementById('calendar-grid');
const agendaList = document.getElementById('agenda-list');
const weekLabel = document.getElementById('week-label');
const eventCount = document.getElementById('event-count');
const eventDate = document.getElementById('event-date');

function pad(value) {
  return String(value).padStart(2, '0');
}

function toISO(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromISO(value) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + offset);
  return next;
}

function formatDate(date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatWeek(start) {
  const end = addDays(start, 6);
  return `${formatDate(start)} - ${formatDate(end)}, ${end.getFullYear()}`;
}

function byDateTimePriority(left, right) {
  return (
    left.date.localeCompare(right.date) ||
    String(left.time || '99:99').localeCompare(String(right.time || '99:99')) ||
    Number(left.priority || 1) - Number(right.priority || 1) ||
    Number(left.id) - Number(right.id)
  );
}

function showLogin() {
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

function showApp() {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
}

function setError(node, message) {
  node.textContent = message || '';
}

async function api(path, options = {}) {
  const init = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  };

  if (options.body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(path, init);
  let data = null;

  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const details = data && Array.isArray(data.details) ? data.details.join(', ') : null;
    const message = details || (data && data.error) || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function checkSession() {
  try {
    const session = await api('/api/session');

    if (session.authenticated) {
      showApp();
      await loadEvents();
      return;
    }
  } catch (err) {
    setError(loginError, 'Session check failed');
  }

  showLogin();
}

async function loadEvents() {
  const from = toISO(state.weekStart);
  const to = toISO(addDays(state.weekStart, 6));
  const data = await api(`/api/events?from=${from}&to=${to}`);
  state.events = Array.isArray(data.events) ? data.events : [];
  render();
}

function eventMeta(event) {
  const parts = [];

  parts.push(event.time || 'All day');

  if (event.symbol) {
    parts.push(event.symbol);
  }

  if (event.market) {
    parts.push(event.market);
  }

  if (event.category) {
    parts.push(event.category);
  }

  return parts.join(' / ');
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = `event-card p${Number(event.priority || 1)}`;

  const titleRow = document.createElement('div');
  titleRow.className = 'event-title-row';

  const title = document.createElement('div');
  title.className = 'event-title';
  title.textContent = event.title || 'Untitled event';

  const priority = document.createElement('span');
  priority.className = 'priority-pill';
  priority.textContent = String(Number(event.priority || 1));

  titleRow.append(title, priority);
  card.append(titleRow);

  const meta = document.createElement('div');
  meta.className = 'event-meta';
  meta.textContent = eventMeta(event);
  card.append(meta);

  if (event.notes) {
    const notes = document.createElement('div');
    notes.className = 'event-notes';
    notes.textContent = event.notes;
    card.append(notes);
  }

  return card;
}

function createEmptyState(message) {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.textContent = message;
  return empty;
}

function renderCalendar() {
  calendarGrid.replaceChildren();
  weekLabel.textContent = formatWeek(state.weekStart);

  const today = toISO(new Date());

  for (let index = 0; index < 7; index += 1) {
    const date = addDays(state.weekStart, index);
    const iso = toISO(date);
    const column = document.createElement('section');
    column.className = iso === today ? 'day-column today' : 'day-column';

    const head = document.createElement('header');
    head.className = 'day-head';

    const name = document.createElement('span');
    name.className = 'day-name';
    name.textContent = dayNames[index];

    const dateText = document.createElement('span');
    dateText.className = 'day-date';
    dateText.textContent = String(date.getDate());

    head.append(name, dateText);
    column.append(head);

    const dayEvents = document.createElement('div');
    dayEvents.className = 'day-events';

    const events = state.events
      .filter((event) => event.date === iso)
      .slice()
      .sort(byDateTimePriority);

    if (events.length === 0) {
      dayEvents.append(createEmptyState('No events'));
    } else {
      events.forEach((event) => dayEvents.append(createEventCard(event)));
    }

    column.append(dayEvents);
    calendarGrid.append(column);
  }
}

function createAgendaRow(event) {
  const row = document.createElement('article');
  row.className = 'agenda-row';

  const content = document.createElement('div');

  const title = document.createElement('div');
  title.className = 'event-title';
  title.textContent = event.title || 'Untitled event';

  const meta = document.createElement('div');
  meta.className = 'event-meta';
  meta.textContent = `${formatDate(fromISO(event.date))} / ${eventMeta(event)} / P${Number(
    event.priority || 1,
  )}`;

  content.append(title, meta);

  const remove = document.createElement('button');
  remove.className = 'delete-button';
  remove.type = 'button';
  remove.textContent = 'Del';
  remove.addEventListener('click', () => deleteEvent(event));

  row.append(content, remove);
  return row;
}

function renderAgenda() {
  agendaList.replaceChildren();
  eventCount.textContent = `${state.events.length} event${state.events.length === 1 ? '' : 's'}`;

  if (state.events.length === 0) {
    agendaList.append(createEmptyState('No events this week'));
    return;
  }

  state.events
    .slice()
    .sort(byDateTimePriority)
    .forEach((event) => agendaList.append(createAgendaRow(event)));
}

function render() {
  renderCalendar();
  renderAgenda();
}

async function deleteEvent(event) {
  const confirmed = window.confirm(`Delete "${event.title}"?`);

  if (!confirmed) {
    return;
  }

  try {
    await api(`/api/events/${event.id}`, { method: 'DELETE' });
    await loadEvents();
  } catch (err) {
    setError(eventError, err.message);
  }
}

function eventPayload() {
  return {
    title: document.getElementById('event-title').value,
    date: document.getElementById('event-date').value,
    time: document.getElementById('event-time').value,
    priority: document.getElementById('event-priority').value,
    symbol: document.getElementById('event-symbol').value,
    market: document.getElementById('event-market').value,
    category: document.getElementById('event-category').value,
    notes: document.getElementById('event-notes').value,
  };
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError(loginError, '');

  try {
    await api('/api/auth/login', {
      method: 'POST',
      body: { key: document.getElementById('admin-key').value },
    });
    document.getElementById('admin-key').value = '';
    showApp();
    await loadEvents();
  } catch (err) {
    setError(loginError, 'Invalid admin key');
  }
});

eventForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setError(eventError, '');

  const payload = eventPayload();

  try {
    await api('/api/events', {
      method: 'POST',
      body: payload,
    });
    eventForm.reset();
    eventDate.value = payload.date;
    state.weekStart = startOfWeek(fromISO(payload.date));
    await loadEvents();
  } catch (err) {
    setError(eventError, err.message);
  }
});

document.getElementById('prev-week').addEventListener('click', async () => {
  state.weekStart = addDays(state.weekStart, -7);
  await loadEvents();
});

document.getElementById('next-week').addEventListener('click', async () => {
  state.weekStart = addDays(state.weekStart, 7);
  await loadEvents();
});

document.getElementById('today-week').addEventListener('click', async () => {
  state.weekStart = startOfWeek(new Date());
  eventDate.value = toISO(new Date());
  await loadEvents();
});

document.getElementById('logout-button').addEventListener('click', async () => {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    state.events = [];
    render();
    showLogin();
  }
});

eventDate.value = toISO(new Date());
checkSession();
