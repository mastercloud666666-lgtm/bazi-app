(function () {
  const chartForm = document.querySelector("[data-chart-form]");
  const chartNote = chartForm?.querySelector(".form-note");
  const chartResult = document.querySelector("[data-chart-result]");

  if (!chartForm || !chartNote || !chartResult) return;

  chartForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(chartForm);
    const birthdate = String(formData.get("birthdate") || "");
    const parsedDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate);
    const hourRaw = String(formData.get("hour") || "");

    if (!parsedDate) {
      chartNote.textContent = "Please enter a valid birth date.";
      chartNote.dataset.state = "error";
      return;
    }

    const year = Number(parsedDate[1]);
    const month = Number(parsedDate[2]);
    const day = Number(parsedDate[3]);
    const dateIsValid = year >= 1900
      && year <= 2100
      && month >= 1
      && month <= 12
      && day >= 1
      && day <= new Date(year, month, 0).getDate();

    if (!dateIsValid) {
      chartNote.textContent = "Please enter a valid birth date.";
      chartNote.dataset.state = "error";
      return;
    }

    if (!window.BaziCalc?.calculateBazi) {
      chartNote.textContent = "The chart engine could not load. Please refresh and try again.";
      chartNote.dataset.state = "error";
      return;
    }

    const chartHour = hourRaw === "" ? 12 : Number(hourRaw);
    const chart = window.BaziCalc.calculateBazi(year, month, day, chartHour);

    for (const name of ["year", "month", "day", "hour"]) {
      const pillar = chart[name];
      const target = document.querySelector(`[data-home-pillar="${name}"]`);
      if (!target) continue;

      window.BaziCalc.renderColoredPillar(
        target,
        pillar.tg,
        pillar.dz,
        name === "hour" && hourRaw === "" ? "Unknown" : ""
      );
    }

    const visibleWuxing = { ...chart.wuxing };
    if (hourRaw === "") {
      for (const symbol of [chart.hour.tg, chart.hour.dz]) {
        const element = window.BaziCalc.WUXING[symbol];
        if (element && visibleWuxing[element] > 0) visibleWuxing[element] -= 1;
      }
    }

    const counts = Object.values(visibleWuxing).map(Number);
    const maxCount = Math.max(...counts, 1);

    Object.entries(visibleWuxing).forEach(([element, count]) => {
      const row = document.querySelector(`[data-home-element="${element}"]`);
      if (!row) return;

      row.querySelector("i")?.style.setProperty(
        "--value",
        `${Math.max(8, Math.round((Number(count) / maxCount) * 100))}%`
      );

      const value = row.querySelector("small");
      if (value) value.textContent = String(count);
    });

    const gender = String(formData.get("gender") || "Male").toLowerCase() === "female" ? "女" : "男";
    const luck = window.BaziCalc.calculateDaYun(
      chart.year,
      chart.month,
      gender,
      year,
      month,
      day,
      chartHour
    );

    window.BaziCalc.renderLuckPillars(
      document.querySelector("[data-home-luck-pillars]"),
      luck
    );

    const reportLink = document.querySelector("[data-home-report-link]");
    if (reportLink) {
      const reportParams = new URLSearchParams({
        year: String(year),
        month: String(month),
        day: String(day),
        hour: hourRaw === "" ? "unknown" : String(chartHour),
        gender: String(formData.get("gender") || "Male").toLowerCase() === "female" ? "female" : "male",
      });
      reportLink.href = `./tengyunzi-report.html?${reportParams.toString()}#reading-form`;
    }

    chartResult.classList.add("is-visible");
    chartNote.textContent = hourRaw === ""
      ? "Chart calculated from the year, month, and day pillars. Add the birth time when known for the hour pillar."
      : "Chart calculated from the birth details above.";
    chartNote.dataset.state = "success";
    chartResult.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
