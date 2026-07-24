
    const SUPABASE_URL = "https://rcyssrsnalefzhzsvswm.supabase.co";
    const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeXNzcnNuYWxlZnpoenN2c3dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTM5NjksImV4cCI6MjA4ODQyOTk2OX0.AiRGSCEYBGWZQgLXjghwjsESKBGSq7a0Z7NBLfrzuWU";
    const contactForm = document.querySelector("[data-contact-page-form]");
    const contactNote = contactForm.querySelector(".form-note");

    function isValidEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || "").trim());
    }

    function getUrlParam(name) {
      try {
        return new URLSearchParams(window.location.search || "").get(name) || "";
      } catch (error) {
        return "";
      }
    }

    function setContactStatus(message, isError) {
      contactNote.textContent = message || "";
      contactNote.style.color = isError ? "#b42318" : "var(--blue-dark)";
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = contactForm.querySelector("button[type='submit']");
      const formData = new FormData(contactForm);
      const name = String(formData.get("name") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const topic = String(formData.get("topic") || "").trim();
      const message = String(formData.get("message") || "").trim();
      const website = String(formData.get("website") || "").trim();

      if (!name) {
        setContactStatus("Please enter your name.", true);
        return;
      }
      if (!isValidEmail(email)) {
        setContactStatus("Please enter a valid email address.", true);
        return;
      }
      if (message.length < 10) {
        setContactStatus("Please write at least one clear sentence.", true);
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
      setContactStatus("", false);

      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/contact-submit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON}`,
          },
          body: JSON.stringify({
            name,
            email,
            topic,
            message,
            website,
            source: "contact-page",
            language: "en",
            page_path: window.location.pathname || "/",
            landing_url: String(window.location.href || "").slice(0, 500),
            referrer: String(document.referrer || "").slice(0, 500),
            utm_source: getUrlParam("utm_source"),
            utm_medium: getUrlParam("utm_medium"),
            utm_campaign: getUrlParam("utm_campaign"),
            metadata: {
              page: "tengyunzi-contact",
              intent: topic,
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        contactForm.reset();
        setContactStatus("Message sent. We will reply by email if a response is needed.", false);
      } catch (error) {
        setContactStatus("Message failed to send. Please try again in a moment.", true);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Send Message";
      }
    });
  
