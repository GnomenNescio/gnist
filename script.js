// ─────────────────────────────────────────────────────────────────────
// Gnist: Activity Finder
// ─────────────────────────────────────────────────────────────────────

// ── State ────────────────────────────────────────────────────────────
let activitiesCache = null;
let pinnedActivity = null;

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
  const panel   = document.getElementById(panelId);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    closeAllDropdowns();
    if (!isOpen) openDropdown(trigger, panel);
  });

  panel.addEventListener('click',     (e) => e.stopPropagation());
  panel.addEventListener('mousedown', (e) => e.stopPropagation());
}

setupDropdown('location-trigger', 'location-panel');
setupDropdown('energy-trigger',   'energy-panel');
setupDropdown('conditions-trigger',   'conditions-panel');

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

// ── Trigger labels ───────────────────────────────────────────────────
const GROUP_NAMES = { location: 'Location', energy: 'Energy', conditions: 'Conditions' };

function updateTriggerLabel(labelElId, group) {
  const labelEl   = document.getElementById(labelElId);
  const selected  = getSelected(group);
  const total     = getAllValues(group).length;
  const groupName = GROUP_NAMES[group] || group;

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
  updateTriggerLabel('energy-label-text',   'energy');
  updateTriggerLabel('conditions-label-text',   'conditions');
  document.querySelectorAll('.dropdown-actions').forEach(div => {
    div.hidden = getSelected(div.dataset.group).length === 0;
  });
}

// ── Clear action ─────────────────────────────────────────────────────
document.querySelectorAll('.dropdown-action').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll(`.dropdown-item[data-group="${btn.dataset.group}"]`).forEach(item => {
      setItemState(item, false);
    });
    updateAllLabels();
    pinnedActivity = null;
    document.getElementById('show-all-button').hidden = true;
    applyFilters();
  });
});

// ── Drag-to-select ───────────────────────────────────────────────────
let dragActive = false;
let dragMode   = null;

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.userSelect = 'none';
    dragActive = true;
    dragMode   = item.classList.contains('selected') ? 'deselect' : 'select';
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
    dragMode   = item.classList.contains('selected') ? 'deselect' : 'select';
    setItemState(item, dragMode === 'select');
  }, { passive: false });

  item.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setItemState(item, !item.classList.contains('selected'));
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
  dragMode   = null;
  document.body.style.userSelect = '';
  updateAllLabels();
  pinnedActivity = null;
  document.getElementById('show-all-button').hidden = true;
  applyFilters();
}

document.addEventListener('mouseup',  finishDrag);
document.addEventListener('touchend', finishDrag);

document.addEventListener('touchmove', (e) => {
  if (!dragActive) return;
  const touch  = e.touches[0];
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

// ── Filter logic (handles array location and conditions fields) ──────────
function getFiltered(data) {
  const locs    = getSelected('location');
  const energies = getSelected('energy');
  const conditionss  = getSelected('conditions');

  const totalLocs    = getAllValues('location').length;
  const totalEnergies = getAllValues('energy').length;
  const totalSeasons  = getAllValues('conditions').length;

  // A group is "active" only on partial selection
  const locActive    = locs.length > 0 && locs.length < totalLocs;
  const enActive     = energies.length > 0 && energies.length < totalEnergies;
  const conditionsActive = conditionss.length > 0 && conditionss.length < totalSeasons;

  return data.filter(activity => {
    // Normalise location and conditions to arrays
    const actLocs    = Array.isArray(activity.location) ? activity.location : [activity.location];
    const actSeasons = Array.isArray(activity.conditions)   ? activity.conditions   : [activity.conditions];

    const matchesLoc    = locActive    ? actLocs.some(l => locs.includes(l))       : true;
    const matchesEn     = enActive     ? energies.includes(activity.energy)         : true;
    const matchesSeason = conditionsActive ? actSeasons.some(s => conditionss.includes(s)) : true;

    return matchesLoc && matchesEn && matchesSeason;
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

// ── DOM construction ─────────────────────────────────────────────────
function locClass(loc) {
  return 'loc-' + loc.toLowerCase().replace(/\s+/g, '-');
}

function buildBadge(text, kind) {
  const span = document.createElement('span');
  span.className = 'badge badge-' + kind;
  if (kind === 'location') span.classList.add(locClass(text));
  span.textContent = text;
  return span;
}

function buildMetaItem(label, value) {
  const span    = document.createElement('span');
  const labelEl = document.createElement('span');
  labelEl.className   = 'meta-label';
  labelEl.textContent = label + ':';
  span.appendChild(labelEl);
  span.append(' ' + value);
  return span;
}

function buildCard(activity, index) {
  const locs = Array.isArray(activity.location) ? activity.location : [activity.location];

  const card = document.createElement('article');
  card.className = 'idea-card';
  // Accent colour driven by first location
  card.classList.add(locClass(locs[0]));
  card.style.animationDelay = Math.min(index, 12) * 0.025 + 's';

  // Coloured accent strip
  const accent = document.createElement('div');
  accent.className = 'accent';
  accent.setAttribute('aria-hidden', 'true');
  card.appendChild(accent);

  // Title
  const h3 = document.createElement('h3');
  h3.textContent = activity.title;
  card.appendChild(h3);



  // Description
  const desc = document.createElement('p');
  desc.className   = 'card-desc';
  desc.textContent = activity.description || 'No description available.';
  card.appendChild(desc);

  // Meta footer
  const meta = document.createElement('footer');
  meta.className = 'card-meta';
  if (activity.toys) meta.appendChild(buildMetaItem('Toys', activity.toys));
  card.appendChild(meta);

  return card;
}

function displayIdeas(activities) {
  const ideasDiv = document.getElementById('ideas');
  ideasDiv.textContent = '';

  if (activities.length === 0) {
    const p = document.createElement('p');
    p.className   = 'placeholder';
    p.textContent = 'No ideas match your filters. Try adjusting them!';
    ideasDiv.appendChild(p);
    return;
  }

  activities.forEach((activity, i) => ideasDiv.appendChild(buildCard(activity, i)));
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

// ── Mobile bottom bar ────────────────────────────────────────────────
// On mobile, the desktop #filters nav is hidden via CSS and replaced by
// a fixed bottom bar. The bottom sheets mirror the desktop dropdown items
// so selecting in either place updates the same underlying state.

function isMobile() {
  return window.matchMedia('(max-width: 640px)').matches;
}

function syncBottomLabel(group) {
  const labelEl = document.getElementById('bottom-' + group + '-label');
  if (!labelEl) return;
  const selected  = getSelected(group);
  const total     = getAllValues(group).length;
  const groupName = GROUP_NAMES[group] || group;
  if (selected.length === 0 || selected.length === total) {
    labelEl.textContent = groupName;
  } else if (selected.length <= 2) {
    labelEl.textContent = selected.join(', ');
  } else {
    labelEl.textContent = selected.length + ' selected';
  }
}

function syncAllBottomLabels() {
  ['energy', 'location', 'conditions'].forEach(syncBottomLabel);
}

function closeAllBottomSheets() {
  document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.bottom-trigger').forEach(t => t.setAttribute('aria-expanded', 'false'));
}

function buildBottomSheet(group) {
  const sheet = document.getElementById('bottom-sheet-' + group);
  if (!sheet || sheet.dataset.built) return;

  // Clear action
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'dropdown-actions';
  actionsDiv.dataset.group = group;
  actionsDiv.hidden = true;
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'dropdown-action';
  clearBtn.dataset.group = group;
  clearBtn.textContent = 'Clear';
  clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    document.querySelectorAll(`.dropdown-item[data-group="${group}"]`).forEach(item => {
      setItemState(item, false);
    });
    // Sync cloned items
    sheet.querySelectorAll('.bottom-item').forEach(item => {
      item.classList.remove('selected');
      item.setAttribute('aria-checked', 'false');
      item.querySelector('.check').classList.remove('selected-check');
    });
    actionsDiv.hidden = true;
    updateAllLabels();
    syncAllBottomLabels();
    pinnedActivity = null;
    document.getElementById('show-all-button').hidden = true;
    applyFilters();
  });
  actionsDiv.appendChild(clearBtn);
  sheet.appendChild(actionsDiv);

  // Clone items from the desktop panel
  const desktopItems = document.querySelectorAll(`.dropdown-item[data-group="${group}"]`);
  desktopItems.forEach(original => {
    const clone = document.createElement('div');
    clone.className = 'bottom-item' + (original.classList.contains('selected') ? ' selected' : '');
    clone.setAttribute('role', 'checkbox');
    clone.setAttribute('aria-checked', original.getAttribute('aria-checked'));
    clone.setAttribute('tabindex', '0');
    clone.dataset.group = group;
    clone.dataset.value = original.dataset.value;

    const check = document.createElement('span');
    check.className = 'check';
    check.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = original.querySelector('.item-label').textContent;
    clone.appendChild(check);
    clone.appendChild(label);

    clone.addEventListener('click', () => {
      const nowSelected = !clone.classList.contains('selected');
      // Update desktop item
      setItemState(original, nowSelected);
      // Update clone
      if (nowSelected) {
        clone.classList.add('selected');
        clone.setAttribute('aria-checked', 'true');
      } else {
        clone.classList.remove('selected');
        clone.setAttribute('aria-checked', 'false');
      }
      const anySelected = getSelected(group).length > 0;
      actionsDiv.hidden = !anySelected;
      updateAllLabels();
      syncAllBottomLabels();
      pinnedActivity = null;
      document.getElementById('show-all-button').hidden = true;
      applyFilters();
    });

    sheet.appendChild(clone);
  });

  sheet.dataset.built = 'true';
}

function initBottomBar() {
  const bar = document.getElementById('bottom-filter-bar');
  if (!bar) return;

  // Show bar only on mobile (CSS also handles this, JS ensures initial state)
  if (isMobile()) bar.style.display = 'flex';

  ['energy', 'location', 'conditions'].forEach(group => buildBottomSheet(group));

  document.querySelectorAll('.bottom-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const group   = trigger.dataset.group;
      const sheet   = document.getElementById('bottom-sheet-' + group);
      const isOpen  = sheet.classList.contains('open');
      closeAllBottomSheets();
      if (!isOpen) {
        sheet.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Close sheets on outside tap
  document.addEventListener('click', closeAllBottomSheets);

  window.matchMedia('(max-width: 640px)').addEventListener('change', (e) => {
    bar.style.display = e.matches ? 'flex' : 'none';
    if (!e.matches) closeAllBottomSheets();
  });
}

syncAllBottomLabels();
initBottomBar();

// ── Initial render ───────────────────────────────────────────────────
updateAllLabels();
applyFilters();
