// ── Dropdown toggle logic ──────────────────────────────────────────────
function openDropdown(trigger, panel) {
  panel.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
}

function closeDropdown(trigger, panel) {
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
}

function setupDropdown(triggerId, panelId) {
  const trigger = document.getElementById(triggerId);
  const panel = document.getElementById(panelId);

  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    const isOpen = !panel.hidden;
    // Close all dropdowns first
    closeAllDropdowns();
    if (!isOpen) openDropdown(trigger, panel);
  });
}

function closeAllDropdowns() {
  document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (panel) closeDropdown(trigger, panel);
  });
}

// Close dropdowns when clicking outside
document.addEventListener('click', function () {
  closeAllDropdowns();
});

setupDropdown('location-trigger', 'location-panel');
setupDropdown('energy-trigger', 'energy-panel');

// ── Label summary helpers ──────────────────────────────────────────────
function updateTriggerLabel(labelElId, group) {
  const selected = Array.from(document.querySelectorAll(`.dropdown-item[data-group="${group}"].selected`))
    .map(el => el.dataset.value);
  const labelEl = document.getElementById(labelElId);
  const all = document.querySelectorAll(`.dropdown-item[data-group="${group}"]`).length;
  if (selected.length === 0) {
    labelEl.textContent = group === 'location' ? 'Location' : 'Energy';
  } else if (selected.length === all) {
    labelEl.textContent = group === 'location' ? 'Location' : 'Energy';
  } else if (selected.length <= 2) {
    labelEl.textContent = selected.join(', ');
  } else {
    labelEl.textContent = `${selected.length} selected`;
  }
}

// ── Activities cache ───────────────────────────────────────────────────
let activitiesCache = null;

function getActivities() {
  if (activitiesCache) return Promise.resolve(activitiesCache);
  return fetch('activities.json')
    .then(response => response.json())
    .then(data => { activitiesCache = data; return data; });
}

function applyFilters() {
  const selectedLocations = Array.from(document.querySelectorAll('.dropdown-item[data-group="location"].selected')).map(el => el.dataset.value);
  const selectedEnergies = Array.from(document.querySelectorAll('.dropdown-item[data-group="energy"].selected')).map(el => el.dataset.value);

  getActivities()
    .then(data => {
      const filtered = data.filter(activity => {
        const matchesLocation = selectedLocations.length === 0 ? false : selectedLocations.includes(activity.location);
        const matchesEnergy = selectedEnergies.length === 0 ? false : selectedEnergies.includes(activity.energy);
        return matchesLocation && matchesEnergy;
      });
      displayIdeas(filtered);
    })
    .catch(error => {
      console.error('Error fetching activities:', error);
    });
}

// ── Drag-to-select logic ───────────────────────────────────────────────
let dragActive = false;
let dragMode = null; // 'select' or 'deselect'

function toggleItem(item, mode) {
  if (mode === 'select') {
    item.classList.add('selected');
    item.setAttribute('aria-checked', 'true');
  } else {
    item.classList.remove('selected');
    item.setAttribute('aria-checked', 'false');
  }
}

document.querySelectorAll('.dropdown-item').forEach(item => {
  item.addEventListener('mousedown', function (e) {
    e.preventDefault(); // prevent text selection
    dragActive = true;
    dragMode = item.classList.contains('selected') ? 'deselect' : 'select';
    toggleItem(item, dragMode);
  });

  item.addEventListener('mouseenter', function () {
    if (dragActive) {
      toggleItem(item, dragMode);
    }
  });

  item.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      const mode = item.classList.contains('selected') ? 'deselect' : 'select';
      toggleItem(item, mode);
      updateTriggerLabel('location-label-text', 'location');
      updateTriggerLabel('energy-label-text', 'energy');
      applyFilters();
    }
  });
});

document.addEventListener('mouseup', function () {
  if (dragActive) {
    dragActive = false;
    dragMode = null;
    updateTriggerLabel('location-label-text', 'location');
    updateTriggerLabel('energy-label-text', 'energy');
    applyFilters();
  }
});

// ── Display ideas ──────────────────────────────────────────────────────
function displayIdeas(activities) {
  const ideasDiv = document.getElementById('ideas');
  ideasDiv.innerHTML = '';

  if (activities.length === 0) {
    ideasDiv.innerHTML = '<p>No ideas match your filters. Try adjusting them!</p>';
  } else {
    activities.forEach(activity => {
      const ideaCard = document.createElement('div');
      ideaCard.className = 'idea-card';
      ideaCard.innerHTML = `<h3>${activity.title}</h3>
                            <p>${activity.description || 'No description available'}</p>
                            <p><strong>Best for:</strong> ${activity.age || 'All ages'}</p>
                            <p><strong>Toys:</strong> ${activity.toys || 'None'}</p>`;
      ideasDiv.appendChild(ideaCard);
    });
  }
}

// ── Run initial filter on page load ───────────────────────────────────
applyFilters();

