// form submission =====================================
const form = document.querySelector("form");
const emailErr = document.getElementById("invalid-email");
const passwordErr = document.getElementById("invalid-password");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  //form values
  const email = form.email.value;
  const password = form.password.value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();

    //form error handling
    if (data.errors) {
      if (data.errors.email) {
        emailErr.classList.remove("d-none");
        emailErr.classList.add("d-block");
        passwordErr.classList.remove("d-block");
        passwordErr.classList.add("d-none");
      } else if (data.errors.password) {
        emailErr.classList.remove("d-block");
        emailErr.classList.add("d-none");
        passwordErr.classList.remove("d-none");
        passwordErr.classList.add("d-block");
      }
    }
    if (data.user) {
      location.assign("/user/dashboard/" + data.user);
      emailErr.classList.remove("d-block");
      emailErr.classList.add("d-none");
      passwordErr.classList.remove("d-block");
      passwordErr.classList.add("d-none");
    }
  } catch (err) {
    console.log(err);
    // add error rendering page?
  }
});

//view password input ========================
// const passwordInput = document.querySelector("#password");
// const eye = document.querySelector("#eye");

// eye.addEventListener("click", function () {
//   this.classList.toggle("fa-eye-slash");
//   const type =
//     passwordInput.getAttribute("type") === "password" ? "text" : "password";
//   passwordInput.setAttribute("type", type);
// });
