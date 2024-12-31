document.addEventListener('DOMContentLoaded', function() {
// Get all the edit buttons
const editButtons = document.querySelectorAll('.edit-btn');

// Get the modal elements
const modal = new bootstrap.Modal(document.getElementById('editModal'));
const saveButton = document.getElementById('saveChanges');
const textArea = document.getElementById('editText');

// Handle click on edit button
editButtons.forEach(button => {
button.addEventListener('click', function() {
// Get the id of the div to be edited
const targetId = this.getAttribute('data-id');
const targetDiv = document.getElementById(targetId);

// Set the current text of the div into the textarea
textArea.value = targetDiv.textContent;

// Store the target div id on the save button for later use
saveButton.setAttribute('data-target-id', targetId);

// Show the modal
modal.show();
});
});

// Handle save changes
saveButton.addEventListener('click', function() {
const targetId = this.getAttribute('data-target-id');
const targetDiv = document.getElementById(targetId);
const newText = textArea.value;

// Update the text content of the target div
targetDiv.textContent = newText;

// Hide the modal
modal.hide();
});
});