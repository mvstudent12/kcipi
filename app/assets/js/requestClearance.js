const modalForm = document.getElementById("modal-form");

modalForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent the default form submission

  const recipient = modalForm.recipient.value;
  const comments = modalForm.comments.value;

  try {
    const res = await fetch(modalForm.action, {
      method: "POST",
      body: JSON.stringify({ recipient, comments }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    //change modal contents to sent message when request is sent
    document.getElementById("done-body").classList.remove("d-none");
    document.getElementById("done-body").classList.add("d-block");

    document.getElementById("done-btn").classList.remove("d-none");
    document.getElementById("done-btn").classList.add("d-block");

    document.getElementById("request-body").classList.remove("d-block");
    document.getElementById("request-body").classList.add("d-none");

    document.getElementById("request-btns").classList.remove("d-block");
    document.getElementById("request-btns").classList.add("d-none");

    document.getElementById("request-title").classList.add("d-none");
    // if (data.errors) {
    //   console.log(errors);
    // } more elegant error handling for later

    //function to reinstate modal contents when modal is closed
    const modal = document.getElementById("clearanceModal");
    modal.addEventListener("hidden.bs.modal", function () {
      document.getElementById("done-body").classList.remove("d-block");
      document.getElementById("done-body").classList.add("d-none");

      document.getElementById("done-btn").classList.remove("d-block");
      document.getElementById("done-btn").classList.add("d-none");

      document.getElementById("request-body").classList.remove("d-none");
      document.getElementById("request-body").classList.add("d-block");

      document.getElementById("request-btns").classList.remove("d-none");
      document.getElementById("request-btns").classList.add("d-block");

      document.getElementById("request-title").classList.remove("d-none");
      document.getElementById("request-title").classList.add("d-block");
    });
  } catch (err) {
    console.log(err);
  }
});
