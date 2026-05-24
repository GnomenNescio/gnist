// ─────────────────────────────────────────────────────────────────────
// Gnist: Activity Finder
// ─────────────────────────────────────────────────────────────────────

// ── State ────────────────────────────────────────────────────────────
let activitiesCache = null;
let pinnedActivity = null; // when "Surprise me" picks one, we pin it here

// ── Dropdown open/close ──────────────────────────────────────────────
function openDropdown(trigger, panel) {
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
}

function closeDropdown(trigger, panel) {
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (panel) closeDropdown(trigger, panel);
  });
}

function setupDropdown(triggerId, panelId) {
  const trigger = document.getElementById(triggerId);
  const panel = document.getElementById(panelId);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    closeAllDropdowns();
    if (!isOpen) openDropdown(trigger, panel);
  });

  panel.addEventListener('click', (e) => e.stopPropagation());
  panel.addEventListener('mousedown', (e) => e.stopPropagation());
}

setupDropdown('location-trigger', 'location-panel');
setupDropdown('energy-trigger', 'energy-panel');

document.addEventListener('click', closeAllDropdowns);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openTrigger = document.querySelector('.dropdown-trigger[aria-expanded="true"]');
    closeAllDropdowns();
    if (openTrigger) openTrigger.focus();
  }
});

// ── Selection helpers ────────────────────────────────────────────────
function setItemState(item, selected) {
  if (selected) {
    item.classList.add('selected');
    item.setAttribute('aria-checked', 'true');
  } else {
    item.classList.remove('selected');
    item.setAttribute('aria-checked', 'false');
  }
}

function getSelected(group) {
  return Array.from(document.querySelectorAll(`.dropdown-item[data-group="${group}"].selected`))
    .map(el => el.dataset.value);
}

function getAllValues(group) {
  return Array.from(document.querySelectorAll(`.dropdown-item[data-group="${group}"]`))
    .map(el => el.dataset.value);
}

// ── Trigger label ────────────────────────────────────────────────────
function updateTriggerLabel(labelElId, group) {
  const labelEl = document.getElementById(labelElId);
  const selected = getSelected(group);
  const total = getAllValues(group).length;
  const groupName = group === 'location' ? 'Location' : 'Energy';

  if (selected.length === 0 || selected.length === total) {
    labelEl.textContent = groupName;
  } else if (selected.length <= 2) {
    labelEl.textContent = selected.join(', ');
  } else {
    labelEl.textContent = `${selected.length} selected`;
  }
}

function updateAllLabels() {
  updateTriggerLabel('location-label-text', 'location');
  updateTriggerLabel('energy-label-text', 'energy');
  document.querySelectorAll('.dropdown-actions').forEach(div => {
    const group = div.dataset.group;
    div.hidden = getSelected(group).length === 0;
  });
}

// ── Clear action ─────────────────────────────────────────────────────
document.querySelectorAll('.dropdown-action').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const group = btn.dataset.group;
    document.querySelectorAll(`.dropdown-item[data-group="${group}"]`).forEach(item => {
      setItemState(item, false);
    });
    updateAllLabels();
    pinnedActivity = null;
    document.getElementById('show-all-button').hidden = true;
    applyFilters();
  });
});

// ── Drag-to-select on items ──────────────────────────────────────────
let dragActive = false;
let dragMode = null;

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = 'none';
    dragActive = true;
    dragMode = item.classList.contains('selected') ? 'deselect' : 'select';
    setItemState(item, dragMode === 'select');
  });

  item.addEventListener('mouseenter', () => {
    if (dragActive) setItemState(item, dragMode === 'select');
  });

  item.addEventListener('touchstart', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = 'none';
    dragActive = true;
    dragMode = item.classList.contains('selected') ? 'deselect' : 'select';
    setItemState(item, dragMode === 'select');
  }, { passive: false });

  item.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const nowSelected = !item.classList.contains('selected');
      setItemState(item, nowSelected);
      updateAllLabels();
      pinnedActivity = null;
      document.getElementById('show-all-button').hidden = true;
      applyFilters();
    }
  });
});

function finishDrag() {
  if (!dragActive) return;
  dragActive = false;
  dragMode = null;
  document.body.style.userSelect = '';
  updateAllLabels();
  pinnedActivity = null;
  document.getElementById('show-all-button').hidden = true;
  applyFilters();
}

document.addEventListener('mouseup', finishDrag);
document.addEventListener('touchend', finishDrag);

document.addEventListener('touchmove', (e) => {
  if (!dragActive) return;
  const touch = e.touches[0];
  const target = document.elementFromPoint(touch.clientX, touch.clientY);
  if (target && target.classList.contains('dropdown-item')) {
    setItemState(target, dragMode === 'select');
  }
}, { passive: false });

// ── Data loading ─────────────────────────────────────────────────────
function getActivities() {
  if (activitiesCache) return Promise.resolve(activitiesCache);
  return fetch('activities.json')
    .then(r => {
      if (!r.ok) throw new Error('Could not load activities.json (' + r.status + ')');
      return r.json();
    })
    .then(data => { activitiesCache = data; return data; });
}

// ── Filter & display ─────────────────────────────────────────────────
function getFiltered(data) {
  const locs = getSelected('location');
  const energies = getSelected('energy');
  const totalLocs = getAllValues('location').length;
  const totalEnergies = getAllValues('energy').length;

  // empty selection OR all selected = "no filter active" for that group
  const locActive = locs.length > 0 && locs.length < totalLocs;
  const enActive = energies.length > 0 && energies.length < totalEnergies;

  return data.filter(activity => {
    const matchesLoc = locActive ? locs.includes(activity.location) : true;
    const matchesEn = enActive ? energies.includes(activity.energy) : true;
    return matchesLoc && matchesEn;
  });
}

function applyFilters() {
  getActivities()
    .then(data => {
      const filtered = getFiltered(data);
      updateMatchCount(filtered.length);

      if (pinnedActivity && filtered.some(a => a.title === pinnedActivity.title)) {
        displayIdeas([pinnedActivity]);
      } else {
        pinnedActivity = null;
        document.getElementById('show-all-button').hidden = true;
        displayIdeas(filtered);
      }
    })
    .catch(err => {
      console.error('Error loading activities:', err);
      const ideasDiv = document.getElementById('ideas');
      ideasDiv.textContent = '';
      const p = document.createElement('p');
      p.className = 'placeholder';
      p.textContent = 'Could not load activities. Please refresh the page.';
      ideasDiv.appendChild(p);
    });
}

function updateMatchCount(count) {
  const el = document.getElementById('match-count');
  el.textContent = '';
  if (pinnedActivity) {
    el.append('Showing 1 of ', strong(String(count)), ' matching idea' + (count === 1 ? '' : 's'));
  } else if (count === 0) {
    el.textContent = 'No matches with the current filters';
  } else {
    el.append(strong(String(count)), ' idea' + (count === 1 ? '' : 's') + ' found');
  }
}

function strong(text) {
  const s = document.createElement('strong');
  s.textContent = text;
  return s;
}

// ── DOM construction (safe — no innerHTML with data) ─────────────────
function buildBadge(text, kind) {
  const span = document.createElement('span');
  span.className = 'badge badge-' + kind;
  if (kind === 'location') {
    span.classList.add('loc-' + text.toLowerCase());
  }
  span.textContent = text;
  return span;
}

function buildMetaItem(label, value) {
  const span = document.createElement('span');
  const labelEl = document.createElement('span');
  labelEl.className = 'meta-label';
  labelEl.textContent = label + ':';
  span.appendChild(labelEl);
  span.append(' ' + value);
  return span;
}

function buildCard(activity, index) {
  const card = document.createElement('article');
  card.className = 'idea-card';
  if (activity.location) {
    card.classList.add('loc-' + activity.location.toLowerCase());
  }
  card.style.animationDelay = Math.min(index, 12) * 0.025 + 's';

  // Coloured accent strip at the top
  const accent = document.createElement('div');
  accent.className = 'accent';
  accent.setAttribute('aria-hidden', 'true');
  card.appendChild(accent);

  // Title
  const h3 = document.createElement('h3');
  h3.textContent = activity.title;
  card.appendChild(h3);

  // Badges row
  const badges = document.createElement('div');
  badges.className = 'badges';
  if (activity.location) badges.appendChild(buildBadge(activity.location, 'location'));
  if (activity.energy) badges.appendChild(buildBadge(activity.energy, 'energy'));
  card.appendChild(badges);

  // Description
  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = activity.description || 'No description available.';
  card.appendChild(desc);

  // Meta footer (no divider above per design)
  const meta = document.createElement('footer');
  meta.className = 'card-meta';
  meta.appendChild(buildMetaItem('Best for', activity.age || 'All ages'));
  meta.appendChild(buildMetaItem('Toys', activity.toys || 'None'));
  card.appendChild(meta);

  return card;
}

function displayIdeas(activities) {
  const ideasDiv = document.getElementById('ideas');
  ideasDiv.textContent = '';

  if (activities.length === 0) {
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = 'No ideas match your filters. Try adjusting them!';
    ideasDiv.appendChild(p);
    return;
  }

  activities.forEach((activity, i) => {
    ideasDiv.appendChild(buildCard(activity, i));
  });
}

// ── Surprise me / Show all ───────────────────────────────────────────
document.getElementById('surprise-button').addEventListener('click', () => {
  getActivities().then(data => {
    const filtered = getFiltered(data);
    if (filtered.length === 0) return;
    pinnedActivity = filtered[Math.floor(Math.random() * filtered.length)];
    document.getElementById('show-all-button').hidden = filtered.length <= 1;
    updateMatchCount(filtered.length);
    displayIdeas([pinnedActivity]);
  });
});

document.getElementById('show-all-button').addEventListener('click', () => {
  pinnedActivity = null;
  document.getElementById('show-all-button').hidden = true;
  applyFilters();
});

// ── Initial render ───────────────────────────────────────────────────
updateAllLabels();
applyFilters();
