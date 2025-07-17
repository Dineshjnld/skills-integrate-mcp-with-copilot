document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const loginBtn = document.getElementById("login-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginMessage = document.getElementById("login-message");
  const closeBtn = document.querySelector(".close-btn");
  const loginStatus = document.getElementById("login-status");
  const teacherNameSpan = document.getElementById("teacher-name");
  const logoutBtn = document.getElementById("logout-btn");
  const authNotice = document.getElementById("auth-notice");
  
  // Authentication state
  let authToken = localStorage.getItem("authToken");
  let isAuthenticated = false;

  // Authentication functions
  async function verifyAuth() {
    if (!authToken) {
      updateUIForAuth(false);
      return false;
    }

    try {
      const response = await fetch("/auth/verify", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const result = await response.json();
        updateUIForAuth(true, result.teacher_name);
        return true;
      } else {
        localStorage.removeItem("authToken");
        authToken = null;
        updateUIForAuth(false);
        return false;
      }
    } catch (error) {
      console.error("Auth verification error:", error);
      updateUIForAuth(false);
      return false;
    }
  }

  function updateUIForAuth(authenticated, teacherName = "") {
    isAuthenticated = authenticated;
    
    if (authenticated) {
      // Show logged in state
      loginBtn.classList.add("hidden");
      loginStatus.classList.remove("hidden");
      teacherNameSpan.textContent = teacherName;
      authNotice.classList.add("hidden");
      
      // Enable form
      signupForm.classList.remove("disabled-form");
      document.getElementById("email").disabled = false;
      document.getElementById("activity").disabled = false;
      document.querySelector("#signup-form button").disabled = false;
      document.querySelector("#signup-form button").textContent = "Sign Up";
      
      // Show delete buttons
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.classList.add("visible");
      });
    } else {
      // Show logged out state
      loginBtn.classList.remove("hidden");
      loginStatus.classList.add("hidden");
      authNotice.classList.remove("hidden");
      
      // Disable form
      signupForm.classList.add("disabled-form");
      document.getElementById("email").disabled = true;
      document.getElementById("activity").disabled = true;
      document.querySelector("#signup-form button").disabled = true;
      document.querySelector("#signup-form button").textContent = "Sign Up (Teacher Login Required)";
      
      // Hide delete buttons
      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.classList.remove("visible");
      });
    }
  }
  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      
      // Clear activity select options (except the first one)
      while (activitySelect.children.length > 1) {
        activitySelect.removeChild(activitySelect.lastChild);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn ${isAuthenticated ? 'visible' : ''}" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!isAuthenticated) {
      showMessage("Please log in as a teacher to unregister students.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          localStorage.removeItem("authToken");
          authToken = null;
          updateUIForAuth(false);
          showMessage("Authentication expired. Please log in again.", "error");
        } else {
          showMessage(result.detail || "An error occurred", "error");
        }
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      showMessage("Please log in as a teacher to register students.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          localStorage.removeItem("authToken");
          authToken = null;
          updateUIForAuth(false);
          showMessage("Authentication expired. Please log in again.", "error");
        } else {
          showMessage(result.detail || "An error occurred", "error");
        }
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Helper function to show messages
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // Login modal event handlers
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
    document.getElementById("username").focus();
  });

  closeBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
    loginForm.reset();
    loginMessage.classList.add("hidden");
  });

  // Close modal when clicking outside
  loginModal.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
      loginForm.reset();
      loginMessage.classList.add("hidden");
    }
  });

  // Login form submission
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
      });

      const result = await response.json();

      if (response.ok) {
        authToken = result.token;
        localStorage.setItem("authToken", authToken);
        updateUIForAuth(true, result.teacher_name);
        loginModal.classList.add("hidden");
        loginForm.reset();
        loginMessage.classList.add("hidden");
        showMessage(`Welcome, ${result.teacher_name}!`, "success");
        fetchActivities(); // Refresh to show delete buttons
      } else {
        loginMessage.textContent = result.detail || "Login failed";
        loginMessage.className = "error";
        loginMessage.classList.remove("hidden");
      }
    } catch (error) {
      loginMessage.textContent = "Login failed. Please try again.";
      loginMessage.className = "error";
      loginMessage.classList.remove("hidden");
      console.error("Login error:", error);
    }
  });

  // Logout functionality
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("authToken");
    authToken = null;
    updateUIForAuth(false);
    showMessage("Logged out successfully.", "info");
    fetchActivities(); // Refresh to hide delete buttons
  });

  // Initialize app
  async function initApp() {
    await verifyAuth();
    fetchActivities();
  }

  initApp();
});
