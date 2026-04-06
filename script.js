// Fetch data and display ideas
document.getElementById("generate").addEventListener("click", function () {
  // Get all checked location checkboxes
  const locationCheckboxes = document.querySelectorAll('input[name="location"]:checked');
  const selectedLocations = Array.from(locationCheckboxes).map(cb => cb.value);

  // Get all checked energy checkboxes
  const energyCheckboxes = document.querySelectorAll('input[name="energy"]:checked');
  const selectedEnergies = Array.from(energyCheckboxes).map(cb => cb.value);

  // Fetch the data from the activities.json file
  fetch("activities.json")
    .then(response => response.json())
    .then(data => {
      const filteredActivities = data.filter(activity => {
        // If no locations selected, show nothing. If locations selected, must match one of them
        const matchesLocation = selectedLocations.length === 0 ? false : selectedLocations.includes(activity.location);
        // If no energies selected, show nothing. If energies selected, must match one of them
        const matchesEnergy = selectedEnergies.length === 0 ? false : selectedEnergies.includes(activity.energy);
        return matchesLocation && matchesEnergy;
      });

      displayIdeas(filteredActivities);
    })
    .catch(error => {
      console.error("Error fetching activities:", error);
    });
});

// Display ideas in the results section
function displayIdeas(activities) {
  const ideasDiv = document.getElementById("ideas");
  ideasDiv.innerHTML = ""; // Clear previous results

  if (activities.length === 0) {
    ideasDiv.innerHTML = "<p>No ideas match your filters. Try adjusting them!</p>";
  } else {
    activities.forEach(activity => {
      const ideaCard = document.createElement("div");
      ideaCard.className = "idea-card";
      ideaCard.innerHTML = `<h3>${activity.title}</h3>
                            <p>${activity.description || "No description available"}</p>
                            <p><strong>Best for:</strong> ${activity.age || "All ages"}</p>
                            <p><strong>Toys:</strong> ${activity.toys || "None"}</p>`;
      ideasDiv.appendChild(ideaCard);
    });
  }
}
