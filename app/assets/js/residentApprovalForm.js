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

    console.log(category);

    // Update the modal title
    const dataCategory = document.getElementById("data-category");
    dataCategory.textContent = category;

    // Update the form action URL dynamically
    const modalForm = document.getElementById("modal-form");
    modalForm.action = route;
  });
});
