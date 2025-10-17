document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activity = name; // used to find card later

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="availability-count">${spotsLeft}</span> spots left</p>

          <!-- Participants section -->
          <div class="participants-section">
            <h5>Participantes</h5>
            <ul class="participants-list" aria-live="polite"></ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Populate participants list with delete icon using helper
        const participantsListEl = activityCard.querySelector(".participants-list");
        if (Array.isArray(details.participants) && details.participants.length > 0) {
          details.participants.forEach((participant) => {
            createParticipantListItem(name, participant, participantsListEl);
          });
        } else {
          const emptyLi = document.createElement("li");
          emptyLi.className = "participant-empty";
          emptyLi.textContent = "Aún no hay participantes.";
          participantsListEl.appendChild(emptyLi);
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Helper to create a participant list item with delete button and handler
  function createParticipantListItem(activityName, participant, participantsListEl) {
    const li = document.createElement("li");
    li.className = "participant-item";

    const span = document.createElement("span");
    span.className = "participant-email";
    span.textContent = participant;

    const btn = document.createElement("button");
    btn.className = "participant-delete";
    btn.setAttribute("aria-label", `Unregister ${participant} from ${activityName}`);
    btn.title = "Remove participant";
    btn.innerHTML = "&times;";

    // Click handler to unregister participant
    btn.addEventListener("click", async () => {
      try {
        const resp = await fetch(
          `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(participant)}`,
          { method: "POST" }
        );

        const data = await resp.json();
        if (resp.ok) {
          // Remove item from DOM
          li.remove();

          // If list becomes empty, show empty state
          if (participantsListEl.querySelectorAll('.participant-item').length === 0) {
            const emptyLi = document.createElement("li");
            emptyLi.className = "participant-empty";
            emptyLi.textContent = "Aún no hay participantes.";
            participantsListEl.appendChild(emptyLi);
          }

          // update availability count (+1)
          const card = document.querySelector(`[data-activity="${CSS.escape(activityName)}"]`);
          if (card) {
            const availEl = card.querySelector('.availability-count');
            if (availEl) {
              const val = parseInt(availEl.textContent, 10) || 0;
              availEl.textContent = val + 1;
            }
          }

          messageDiv.textContent = data.message || 'Participant removed.';
          messageDiv.className = 'message success';
          messageDiv.classList.remove('hidden');
          setTimeout(() => messageDiv.classList.add('hidden'), 3000);
        } else {
          messageDiv.textContent = data.detail || 'Failed to remove participant.';
          messageDiv.className = 'message error';
          messageDiv.classList.remove('hidden');
        }
      } catch (err) {
        console.error('Error unregistering participant:', err);
        messageDiv.textContent = 'Failed to remove participant.';
        messageDiv.className = 'message error';
        messageDiv.classList.remove('hidden');
      }
    });

    li.appendChild(span);
    li.appendChild(btn);
    participantsListEl.appendChild(li);
    return li;
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        // Update UI: add participant to the corresponding activity card
        const card = document.querySelector(`[data-activity="${CSS.escape(activity)}"]`);
        if (card) {
          const participantsListEl = card.querySelector('.participants-list');
          // If the empty state is present, remove it
          const empty = participantsListEl.querySelector('.participant-empty');
          if (empty) empty.remove();
          // Create new participant item
          createParticipantListItem(activity, email, participantsListEl);

          // Decrement availability count
          const availEl = card.querySelector('.availability-count');
          if (availEl) {
            const val = parseInt(availEl.textContent, 10) || 0;
            availEl.textContent = Math.max(0, val - 1);
          }
        }

        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
