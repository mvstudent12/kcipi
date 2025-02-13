//===================================
//Populates the request clearance modal
//====================================

// Get all buttons that trigger the modal
const modalButtons = document.querySelectorAll(
  '[data-bs-toggle="modal"][data-bs-target="#clearanceModal"]'
);

// Add event listener to each button
modalButtons.forEach((button) => {
  button.addEventListener("click", function () {
    // Get the dynamic data from the button's data-attributes
    const route = button.getAttribute("data-route");
    const category = button.getAttribute("data-category");

    // Update the modal title
    const dataCategory = document.getElementById("data-category");
    dataCategory.textContent = category;

    // Update the form action URL dynamically
    const clearanceModal = document.getElementById("clearance-form");
    clearanceModal.action = route;
  });
});

//===================================
//Populates the edit clearance modal
//====================================
// Get all buttons that trigger the modal
const editButtons = document.querySelectorAll(
  '[data-bs-toggle="modal"][data-bs-target="#editModal"]'
);

// Add event listener to each button
editButtons.forEach((button) => {
  button.addEventListener("click", function () {
    // Get the dynamic data from the button's data-attributes
    const route = button.getAttribute("data-route");
    const category = button.getAttribute("data-category");

    // Update the modal title
    const dataCategory = document.getElementById("edit-data-category");

    dataCategory.textContent = category;

    // Update the form action URL dynamically
    const editForm = document.getElementById("edit-form");
    editForm.action = route;
  });
});

//===================================
//Populates the Add notes clearance modal
//====================================

// Get all buttons that trigger the modal
const addNotesButtons = document.querySelectorAll(
  '[data-bs-toggle="modal"][data-bs-target="#addNotes"]'
);

// Add event listener to each button
addNotesButtons.forEach((button) => {
  button.addEventListener("click", function () {
    // Get the dynamic data from the button's data-attributes
    const route = button.getAttribute("data-route");
    const category = button.getAttribute("data-category");
    const residentID = button.getAttribute("data-residentID");
    const notesCategory = button.getAttribute("data-notes-category");

    // Update the modal title
    const dataCategory = document.getElementById("addNotes-data-category");
    dataCategory.textContent = category;

    // Update the form action URL dynamically
    const addNotesForm = document.getElementById("addNotes-form");
    addNotesForm.action = route;

    // Get previous notes container
    let previousNotes = document.getElementById("previousNotes");

    // Fetch previous notes
    fetch(`/clearance/findNotes/${residentID}/${notesCategory}`)
      .then((response) => response.json())
      .then((data) => {
        let notesContent = ""; // Build notes content as a string

        if (data.notes.length > 0) {
          data.notes.forEach((note) => {
            notesContent += `
              <span>${new Date(
                note.createdAt
              ).toLocaleString()}</span> - <span class="text-capitalize">${
              note.createdBy
            }</span>

              <p class="text-primary first-letter">${note.note}</p>
              <hr>
            `;
          });
        } else {
          notesContent = "<p><i>There has been no documentation yet.</i></p>";
        }

        // Update the content in one go
        previousNotes.innerHTML = notesContent;
      })
      .catch((error) => {
        console.error("Error fetching notes:", error);
        previousNotes.innerHTML =
          "<p><i>Error fetching notes. Please try again later.</i></p>";
      });
  });
});
