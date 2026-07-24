(() => {
  const months = [
    {
      period: 'January solar month', posture: 'Consolidate and reset', score: 58,
      theme: 'Close unfinished loops before adding fresh pressure. A quieter month becomes useful when it is used to simplify systems and commitments.',
      interaction: 'No dominant collision; residual obligations need closure',
      action: 'Reduce friction before choosing the next priority',
      areas: {
        career: [60, 'Finish important work and repair the process behind it.'],
        wealth: [55, 'Keep cash decisions simple and avoid adding unnecessary fixed costs.'],
        relationships: [64, 'Consistency matters more than dramatic gestures.'],
        wellbeing: [70, 'Recovery routines respond well to repetition.']
      }
    },
    {
      period: 'February solar month', posture: 'Build through connection', score: 72,
      theme: 'Cooperation and audience energy improve. Use the month to open conversations, test ideas, and build trust before making large commitments.',
      interaction: 'Combination energy supports relationships and outreach',
      action: 'Start the conversation before asking for the decision',
      areas: {
        career: [74, 'Useful for collaboration, interviews, and early-stage proposals.'],
        wealth: [61, 'Build opportunity through relationships rather than urgency.'],
        relationships: [83, 'Good for repairing contact and making expectations explicit.'],
        wellbeing: [68, 'Social activity is supportive when recovery time stays protected.']
      }
    },
    {
      period: 'March solar month', posture: 'Advance with preparation', score: 76,
      theme: 'Momentum is available, but preparation determines whether it lasts. Put structure behind the work before increasing visibility.',
      interaction: 'Supportive element strengthens planning and execution',
      action: 'Turn the strongest plan into a dated sequence',
      areas: {
        career: [82, 'Strong for strategy, pitching, and taking ownership of a project.'],
        wealth: [67, 'Good for planned investment with a clear limit and review point.'],
        relationships: [70, 'Shared plans create more connection than abstract promises.'],
        wellbeing: [65, 'Protect movement and sleep while workload expands.']
      }
    },
    {
      period: 'April solar month', posture: 'Protect the downside', score: 44,
      theme: 'Pressure gathers around money, obligations, and assumptions. Slowing the decision process can prevent avoidable friction.',
      interaction: 'Harm signal asks for clearer terms and fewer assumptions',
      action: 'Verify costs, deadlines, and ownership before agreeing',
      areas: {
        career: [52, 'Keep scope and responsibility written down.'],
        wealth: [38, 'Avoid reactive purchases and commitments with unclear exit terms.'],
        relationships: [49, 'Ask direct questions instead of interpreting silence.'],
        wellbeing: [46, 'Reduce overload before fatigue begins directing decisions.']
      }
    },
    {
      period: 'May solar month', posture: 'Advance with structure', score: 81,
      theme: 'Visibility improves when output is focused. Move the strongest work forward without turning momentum into overcommitment.',
      interaction: 'Combination supports output and public visibility',
      action: 'Choose one priority and make it visible',
      areas: {
        career: [86, 'Strong for publishing, presenting, and asking for responsibility.'],
        wealth: [68, 'Favor clear offers and measured growth over speculative spending.'],
        relationships: [74, 'Direct, warm conversations carry more weight than indirect signals.'],
        wellbeing: [57, 'Protect sleep and recovery as activity increases.']
      }
    },
    {
      period: 'June solar month', posture: 'Protect energy and pace', score: 39,
      theme: 'Heat and urgency can make every task feel equally important. The useful move is to narrow the field and defend recovery.',
      interaction: 'Punishment pattern increases internal pressure and impatience',
      action: 'Make fewer promises and add recovery before the calendar fills',
      areas: {
        career: [48, 'Complete essential work without expanding scope.'],
        wealth: [43, 'Delay emotionally driven spending or risky acceleration.'],
        relationships: [41, 'Pause before turning temporary pressure into permanent language.'],
        wellbeing: [32, 'Sleep, hydration, and heat management deserve priority.']
      }
    },
    {
      period: 'July solar month', posture: 'Build steady foundations', score: 66,
      theme: 'Practical repair produces more value than a dramatic pivot. Strengthen routines, contracts, and the systems that hold growth.',
      interaction: 'Earth support favors structure and long-term maintenance',
      action: 'Fix the recurring weakness before increasing volume',
      areas: {
        career: [69, 'Good for operations, documentation, and process improvement.'],
        wealth: [71, 'Stable planning and cost control are well supported.'],
        relationships: [62, 'Reliability communicates more than intensity.'],
        wellbeing: [67, 'Simple routines become easier to sustain.']
      }
    },
    {
      period: 'August solar month', posture: 'Protect focus', score: 46,
      theme: 'Competition and comparison can distort priorities. Keep attention on the work you can improve and avoid reactive moves.',
      interaction: 'Clash signal increases change, competition, and travel friction',
      action: 'Leave margin in the schedule and avoid proving a point',
      areas: {
        career: [55, 'Compete through quality and preparation, not speed alone.'],
        wealth: [42, 'Keep reserves available for changing plans.'],
        relationships: [45, 'Do not let outside comparison set the tone at home.'],
        wellbeing: [44, 'Nervous-system recovery matters when the pace becomes uneven.']
      }
    },
    {
      period: 'September solar month', posture: 'Advance with discipline', score: 78,
      theme: 'Authority and standards become more visible. This is a useful month to show competence, formalize work, and accept measured responsibility.',
      interaction: 'Authority energy supports standards and recognition',
      action: 'Submit the work that proves the standard',
      areas: {
        career: [88, 'Strong for reviews, promotion conversations, and formal delivery.'],
        wealth: [73, 'Reliable income actions are favored over novelty.'],
        relationships: [63, 'Balance high standards with room for another perspective.'],
        wellbeing: [61, 'Structure helps, but perfectionism can exhaust the body.']
      }
    },
    {
      period: 'October solar month', posture: 'Consolidate quietly', score: 53,
      theme: 'Lower visibility can be productive. Use the month for deep work, repair, research, and decisions that benefit from less noise.',
      interaction: 'Break signal asks for revision of routines and expectations',
      action: 'Review the foundation before making the next public move',
      areas: {
        career: [62, 'Deep work and revision are more useful than aggressive expansion.'],
        wealth: [54, 'Review recurring expenses and weak assumptions.'],
        relationships: [50, 'Make space for slower, more honest conversations.'],
        wellbeing: [58, 'Quiet routines support emotional and physical recovery.']
      }
    },
    {
      period: 'November solar month', posture: 'Advance through resources', score: 74,
      theme: 'Learning, support, and useful information become easier to access. Ask for help, gather evidence, and prepare the next cycle.',
      interaction: 'Resource energy strengthens learning and strategic support',
      action: 'Use expert input to improve the next major decision',
      areas: {
        career: [76, 'Good for research, training, mentorship, and strategic planning.'],
        wealth: [70, 'Information improves the quality of financial decisions.'],
        relationships: [72, 'Receiving support is as important as offering it.'],
        wellbeing: [71, 'Rest and reflection return useful energy.']
      }
    },
    {
      period: 'December solar month', posture: 'Consolidate and close', score: 61,
      theme: 'Completion creates the cleanest start for the next cycle. Decide what deserves to continue before making new commitments.',
      interaction: 'Closing energy favors integration over expansion',
      action: 'Finish, review, and choose what not to carry forward',
      areas: {
        career: [64, 'Complete the work that will matter after the calendar changes.'],
        wealth: [63, 'Review the year and set clear limits for the next cycle.'],
        relationships: [66, 'Closure and appreciation reduce unresolved tension.'],
        wellbeing: [68, 'Rest works best when it is scheduled rather than postponed.']
      }
    }
  ];

  const tabs = Array.from(document.querySelectorAll('[data-forecast-month]'));
  if (!tabs.length) return;

  const fields = {
    period: document.querySelector('[data-forecast-period]'),
    posture: document.querySelector('[data-forecast-posture]'),
    score: document.querySelector('[data-forecast-score]'),
    theme: document.querySelector('[data-forecast-theme]'),
    interaction: document.querySelector('[data-forecast-interaction]'),
    action: document.querySelector('[data-forecast-action]')
  };

  function render(index) {
    const month = months[index];
    if (!month) return;

    fields.period.textContent = month.period;
    fields.posture.textContent = month.posture;
    fields.score.textContent = String(month.score);
    fields.theme.textContent = month.theme;
    fields.interaction.textContent = month.interaction;
    fields.action.textContent = month.action;

    Object.entries(month.areas).forEach(([area, details]) => {
      const [value, note] = details;
      const valueElement = document.querySelector(`[data-forecast-value="${area}"]`);
      const meterElement = document.querySelector(`[data-forecast-meter="${area}"]`);
      const noteElement = document.querySelector(`[data-forecast-note="${area}"]`);
      if (valueElement) valueElement.textContent = String(value);
      if (meterElement) meterElement.style.width = `${value}%`;
      if (noteElement) noteElement.textContent = note;
    });

    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', tabIndex === index ? 'true' : 'false');
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => render(index));
    tab.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      render(nextIndex);
    });
  });

  render(4);
})();
