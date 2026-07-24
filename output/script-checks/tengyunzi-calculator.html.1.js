
    const form = document.querySelector('[data-calc-form]');
    const note = form.querySelector('.form-note');
    const result = document.querySelector('[data-result]');
    const elementNames = { "木": "Wood", "火": "Fire", "土": "Earth", "金": "Metal", "水": "Water" };
    const stemElements = { "甲": "Wood", "乙": "Wood", "丙": "Fire", "丁": "Fire", "戊": "Earth", "己": "Earth", "庚": "Metal", "辛": "Metal", "壬": "Water", "癸": "Water" };

    function updatePillar(name, pillar) {
      const box = document.querySelector(`[data-pillar="${name}"]`);
      box.querySelector("[data-stem]").textContent = pillar.tg;
      box.querySelector("[data-branch]").textContent = pillar.dz;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const day = Number(data.get("day"));
      const month = Number(data.get("month"));
      const year = Number(data.get("year"));
      const hourRaw = data.get("hour");
      const hour = hourRaw === "" ? 12 : Number(hourRaw);
      const chart = window.BaziCalc.calculateBazi(year, month, day, hour);
      updatePillar("year", chart.year);
      updatePillar("month", chart.month);
      updatePillar("day", chart.day);
      updatePillar("hour", chart.hour);
      const monthText = form.querySelector('[name="month"] option:checked').textContent;
      const hourText = form.querySelector('[name="hour"] option:checked').textContent;
      document.querySelector("[data-birth-summary]").textContent = `${monthText} ${day}, ${year}`;
      document.querySelector("[data-hour-summary]").textContent = hourRaw === "" ? "Unknown (preview uses noon)" : hourText;
      document.querySelector("[data-day-master]").textContent = `${chart.day.tg} ${stemElements[chart.day.tg]}`;
      Object.entries(chart.wuxing).forEach(([key, value]) => {
        const chip = document.querySelector(`[data-element="${key}"]`);
        if (chip) chip.textContent = `${elementNames[key]} ${value}`;
      });
      note.textContent = 'Chart calculated below. Exact production readings should still include timezone and true-solar-time correction.';
      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  
