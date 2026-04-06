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
function updateTriggerLabel(labelElId, checkboxName) {
  const checked = Array.from(document.querySelectorAll(`input[name="${checkboxName}"]:checked`))
    .map(cb => cb.value);
  const labelEl = document.getElementById(labelElId);
  const all = document.querySelectorAll(`input[name="${checkboxName}"]`).length;
  if (checked.length === 0) {
    labelEl.textContent = checkboxName === 'location' ? 'Location' : 'Energy';
  } else if (checked.length === all) {
    labelEl.textContent = checkboxName === 'location' ? 'Location' : 'Energy';
  } else if (checked.length <= 2) {
    labelEl.textContent = checked.join(', ');
  } else {
    labelEl.textContent = `${checked.length} selected`;
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
  const selectedLocations = Array.from(document.querySelectorAll('input[name="location"]:checked')).map(cb => cb.value);
  const selectedEnergies = Array.from(document.querySelectorAll('input[name="energy"]:checked')).map(cb => cb.value);

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

document.querySelectorAll('input[name="location"], input[name="energy"]').forEach(cb => {
  cb.addEventListener('change', function () {
    updateTriggerLabel('location-label-text', 'location');
    updateTriggerLabel('energy-label-text', 'energy');
    applyFilters();
  });
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

