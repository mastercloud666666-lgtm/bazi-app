
    const bundleCopy = {
      reading: [
        ["Chart Map", "Four Pillars, Day Master, Five Elements"],
        ["Life Pattern", "Career, money, relationships, stress response"],
        ["Luck Pillars", "The current ten-year chapter"],
        ["Action Notes", "What to build, protect, delay, or ask next"]
      ],
      forecast: [
        ["Annual Theme", "The main pressure and opportunity of the year"],
        ["12 Months", "Month-by-month focus and caution notes"],
        ["Timing Windows", "Green, yellow, and red planning windows"],
        ["Action Calendar", "What to move, repair, rest, or protect"]
      ],
      bundle: [
        ["Full Reading", "Your chart pattern translated into plain English"],
        ["Forecast Layer", "The year read against your exact chart"],
        ["Combined Summary", "Where the chart and year pressure overlap"],
        ["Best Value", "$223 separately, $188 as a bundle"]
      ]
    };

    const board = document.querySelector("[data-bundle-board]");
    document.querySelectorAll("[data-bundle]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-bundle]").forEach((item) => item.setAttribute("aria-selected", "false"));
        button.setAttribute("aria-selected", "true");
        board.innerHTML = bundleCopy[button.dataset.bundle].map(([title, body]) => `<div class="preview-row"><b>${title}</b><span>${body}</span></div>`).join("");
      });
    });

  
