
    const previewCopy = {
      work: [
        ["Best Months", "May, September, November"],
        ["Careful Months", "April, June, August"],
        ["Main Theme", "Visibility through disciplined output"],
        ["Next Action", "Plan launches around support months"]
      ],
      money: [
        ["Stable Months", "March, July, December"],
        ["Watch Spending", "April and June"],
        ["Best Move", "Negotiate after the facts are clear"],
        ["Risk Note", "Avoid reactive commitments"]
      ],
      love: [
        ["Open Months", "February, May, October"],
        ["Repair Months", "July and December"],
        ["Pattern", "Less intensity, more consistency"],
        ["Action", "Name expectations before pressure rises"]
      ],
      energy: [
        ["High Output", "May and September"],
        ["Low Noise", "March and October"],
        ["Rest Window", "June and August"],
        ["Action", "Schedule recovery before it becomes urgent"]
      ]
    };

    const board = document.querySelector("[data-preview-board]");
    document.querySelectorAll("[data-sample]").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-sample]").forEach((item) => item.setAttribute("aria-selected", "false"));
        button.setAttribute("aria-selected", "true");
        board.innerHTML = previewCopy[button.dataset.sample].map(([title, body]) => `<div class="preview-row"><b>${title}</b><span>${body}</span></div>`).join("");
      });
    });

  
