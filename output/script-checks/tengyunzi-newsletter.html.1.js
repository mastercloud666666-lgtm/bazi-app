
    const form = document.querySelector("[data-letter-form]");
    const note = form.querySelector(".form-note");
    const interest = document.querySelector("[data-interest-select]");
    const submitButton = form.querySelector("button[type='submit']");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = form.querySelector("input[type='email']").value.trim();
      const consent = form.querySelector("input[type='checkbox']");
      const selectedInterest = interest.value;

      if (!window.YZNewsletter?.isValidEmail(email)) {
        note.textContent = "Please enter a valid email address.";
        note.style.color = "#b42318";
        return;
      }

      if (consent && !consent.checked) {
        note.textContent = "Please confirm that you want to receive Tengyunzi emails.";
        note.style.color = "#b42318";
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Subscribing...";
      note.textContent = "";

      try {
        await window.YZNewsletter.subscribe({
          email,
          source: "newsletter-page",
          tags: ["newsletter-page", "letters-from-tengyunzi", selectedInterest],
          metadata: {
            interest: selectedInterest,
            lead_magnet: "weekly-letter",
          },
        });
        note.style.color = "var(--blue-dark)";
        note.textContent = `You are subscribed for ${selectedInterest}. The next Tengyunzi letter can now be sent from the backend list.`;
        form.reset();
        if (consent) consent.checked = true;
      } catch (error) {
        note.style.color = "#b42318";
        note.textContent = error?.code === "invalid_email"
          ? "Please enter a valid email address."
          : "Signup failed. Please try again in a moment.";
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Subscribe";
      }
    });
  
