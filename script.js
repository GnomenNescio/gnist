// Fetch data and display ideas
document.getElementById("generate").addEventListener("click", function () {
  const locationFilter = document.getElementById("location").value;
  const energyFilter = document.getElementById("energy").value;

  // Fetch the data from the activities.json file
  fetch("activities.json")
    .then(response => response.json())
    .then(data => {
      const filteredActivities = data.filter(activity => {
        const matchesLocation = locationFilter === "All" || activity.location === locationFilter;
        const matchesEnergy = energyFilter === "All" || activity.energy === energyFilter;
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
