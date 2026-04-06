// Fetch data and display ideas
document.getElementById("generate").addEventListener("click", function () {
  // Get all checked location checkboxes
  const locationCheckboxes = document.querySelectorAll('input[name="location"]:checked');
  const selectedLocations = Array.from(locationCheckboxes).map(cb => cb.value);

  // Get all checked energy checkboxes
  const energyCheckboxes = document.querySelectorAll('input[name="energy"]:checked');
  const selectedEnergies = Array.from(energyCheckboxes).map(cb => cb.value);

  // Show loading message
  const ideasDiv = document.getElementById("ideas");
  ideasDiv.innerHTML = "<p>Loading activities...</p>";

  // Fetch the data from the activities.json file
  fetch("activities.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log(`Loaded ${data.length} activities from JSON`);
      console.log(`Selected locations: ${selectedLocations.join(", ")}`);
      console.log(`Selected energies: ${selectedEnergies.join(", ")}`);

      const filteredActivities = data.filter(activity => {
        // If no locations selected, show nothing. If locations selected, must match one of them
        const matchesLocation = selectedLocations.length === 0 ? false : selectedLocations.includes(activity.location);
        // If no energies selected, show nothing. If energies selected, must match one of them
        const matchesEnergy = selectedEnergies.length === 0 ? false : selectedEnergies.includes(activity.energy);
        return matchesLocation && matchesEnergy;
      });

      console.log(`Filtered to ${filteredActivities.length} activities`);
      displayIdeas(filteredActivities);
    })
    .catch(error => {
      console.error("Error fetching activities:", error);
      ideasDiv.innerHTML = `<p style="color: red;">Error loading activities: ${error.message}. Please make sure you're viewing this page through a web server (not file://). See console for details.</p>`;
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
