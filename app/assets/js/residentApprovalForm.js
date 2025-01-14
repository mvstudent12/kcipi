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
