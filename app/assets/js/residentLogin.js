// form submission =====================================
const form = document.querySelector("form");
const residentIdErr = document.getElementById("invalid-id");

form.addEventListener("submit", async (e) => {
  e.preventDefault(form);

  //form values
  const residentID = form.residentID.value;
  try {
    const res = await fetch("/residentLogin", {
      method: "POST",
      body: JSON.stringify({ residentID }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    //form error handling
    if (data.errors) {
      if (data.errors.residentID) {
        residentIdErr.classList.remove("d-none");
        residentIdErr.classList.add("d-block");
      }
    }
    if (data.user) {
      location.assign("/resident/dashboard");
      residentIdErr.classList.remove("d-block");
      residentIdErr.classList.add("d-none");
    }
  } catch (err) {
    console.log(err);
  }
});
