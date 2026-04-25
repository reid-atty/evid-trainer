const STORAGE_KEY = "dragon_fre_state_v1";

const state = {
  current: null,
  phase: "action",
  answer: { action: null, family: null },
  startTs: 0,
  attempts: [],
  ruleState: {},
  queue: [],
  repsSinceAar: 0,
  errorBurst: 0,
  settings: {
    apiKey: "",
    model: "gpt-4.1-mini"
  }
};

const el = {
  phase: document.getElementById("phase"),
  timer: document.getElementById("timer"),
  scenarioText: document.getElementById("scenarioText"),
  feedback: document.getElementById("feedback"),
  repsToday: document.getElementById("repsToday"),
  streak: document.getElementById("streak"),
  accuracy: document.getElementById("accuracy"),
  medianRt: document.getElementById("medianRt"),
  weakRules: document.getElementById("weakRules"),
  dueReviews: document.getElementById("dueReviews"),
  tracker: document.getElementById("tracker"),
  aarDialog: document.getElementById("aarDialog"),
  aarBody: document.getElementById("aarBody"),
  aarContinue: document.getElementById("aarContinue"),
  settingsDialog: document.getElementById("settingsDialog"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  modelInput: document.getElementById("modelInput"),
  saveSettings: document.getElementById("saveSettings"),
  closeSettings: document.getElementById("closeSettings"),
  openSettings: document.getElementById("openSettings")
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state.attempts = saved.attempts || [];
    state.ruleState = saved.ruleState || {};
    state.settings = { ...state.settings, ...(saved.settings || {}) };
  } catch {
    // ignore corrupt local state
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ attempts: state.attempts, ruleState: state.ruleState, settings: state.settings })
  );
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function ruleKey(s) {
  return `${s.family}:${s.subrule}`;
}

function initRuleState(key) {
  if (!state.ruleState[key]) {
    state.ruleState[key] = {
      intervalDays: 1,
      nextDueAt: Date.now(),
      lapseCount: 0,
      streak: 0,
      accuracyEwma: 0.6,
      latencyEwma: 6000
    };
  }
  return state.ruleState[key];
}

function updateRuleProgress(scenario, correct, responseMs) {
  const k = ruleKey(scenario);
  const rs = initRuleState(k);
  const alpha = 0.25;
  rs.accuracyEwma = alpha * (correct ? 1 : 0) + (1 - alpha) * rs.accuracyEwma;
  rs.latencyEwma = alpha * responseMs + (1 - alpha) * rs.latencyEwma;

  if (correct) {
    rs.streak += 1;
    if (rs.streak >= 2) rs.intervalDays = Math.min(Math.round(rs.intervalDays * 1.8), 30);
  } else {
    rs.streak = 0;
    rs.intervalDays = 1;
    rs.lapseCount += 1;
  }
  rs.nextDueAt = Date.now() + rs.intervalDays * 24 * 3600 * 1000;
}

function getDueRules() {
  const now = Date.now();
  return Object.entries(state.ruleState)
    .filter(([, v]) => v.nextDueAt <= now)
    .map(([key]) => key);
}

function chooseScenario() {
  const due = getDueRules();
  if (due.length && Math.random() < 0.65) {
    const pick = randomItem(due);
    const [family, subrule] = pick.split(":");
    const exact = SEED_SCENARIOS.filter((s) => s.family === family && s.subrule === subrule);
    if (exact.length) return { ...randomItem(exact), variant: true };
    return generateSyntheticScenario(family, subrule);
  }

  const weak = getWeakRules(5);
  if (weak.length && Math.random() < 0.55) {
    const [family, subrule] = weak[0].split(":");
    const candidates = SEED_SCENARIOS.filter((s) => s.family === family && s.subrule === subrule);
    if (candidates.length) return { ...randomItem(candidates), weak: true };
    return generateSyntheticScenario(family, subrule);
  }

  return { ...randomItem(SEED_SCENARIOS) };
}

function generateSyntheticScenario(family, subrule) {
  const mode = Math.random() < 0.5 ? "O" : "N";
  return {
    text: `Synthetic drill (${family} ${subrule}). Counsel asks a tightly disputed question designed to test ${subrule}. Assess admissibility now.`,
    correctAction: mode,
    family,
    subrule,
    explanation: `Synthetic placeholder for ${family} ${subrule}. Use AI generation (G) for richer fact patterns.`
  };
}

async function maybeGenerateFromApi() {
  if (!state.settings.apiKey) return null;
  const weak = getWeakRules(1)[0];
  const [family, subrule] = weak ? weak.split(":") : ["H", "801(c)"];

  const prompt = `Return ONLY JSON with keys: text, correctAction, family, subrule, explanation.
Generate a realistic courtroom evidence scenario under FRE targeting ${family} and ${subrule}. correctAction must be O or N.`;

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.settings.apiKey}`
    },
    body: JSON.stringify({
      model: state.settings.model,
      input: prompt,
      temperature: 0.7
    })
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json();
  const text = data.output_text || "";
  const parsed = JSON.parse(text);
  if (!parsed.text || !parsed.correctAction || !parsed.family || !parsed.subrule) throw new Error("Bad payload");
  return parsed;
}

function startScenario(scenario = null) {
  state.current = scenario || chooseScenario();
  state.phase = "action";
  state.answer = { action: null, family: null };
  state.startTs = performance.now();
  el.phase.textContent = "ACTION: O OBJECT / N NO OBJECTION";
  el.scenarioText.textContent = state.current.text;
  hideFeedback();
}

function showFeedback(ok, message) {
  el.feedback.classList.remove("hidden", "ok", "bad");
  el.feedback.classList.add(ok ? "ok" : "bad");
  el.feedback.textContent = message;
}

function hideFeedback() {
  el.feedback.classList.add("hidden");
}

function handleAction(key) {
  if (key === "O") {
    state.answer.action = "O";
    state.phase = "family";
    el.phase.textContent = "GROUND FAMILY: H/R/P/C/I/F/L/S/A/X";
  } else if (key === "N") {
    finalizeAttempt("N", null, null);
  }
}

function handleFamily(key) {
  if (!FAMILY_MAP[key]) return;
  state.answer.family = key;
  state.phase = "subrule";
  renderSubruleHint(key);
}

function renderSubruleHint(family) {
  const rules = FAMILY_MAP[family].subrules;
  const legend = rules.map((r, i) => `${i + 1}:${r.code}`).join(" | ");
  el.phase.textContent = `SUBRULE (${family}) ${legend}`;
}

function handleSubrule(numKey) {
  const idx = parseInt(numKey, 10) - 1;
  if (Number.isNaN(idx)) return;
  const rules = FAMILY_MAP[state.answer.family].subrules;
  const pick = rules[idx];
  if (!pick) return;
  finalizeAttempt("O", state.answer.family, pick.code);
}

function finalizeAttempt(action, family, subrule) {
  const rt = Math.round(performance.now() - state.startTs);
  const correct = action === state.current.correctAction &&
    (action === "N" || (family === state.current.family && subrule === state.current.subrule));

  const attempt = {
    ts: new Date().toISOString(),
    rule: `${state.current.family}:${state.current.subrule}`,
    action,
    family,
    subrule,
    correct,
    rt
  };

  state.attempts.push(attempt);
  updateRuleProgress(state.current, correct, rt);
  state.repsSinceAar += 1;
  state.errorBurst = correct ? 0 : state.errorBurst + 1;

  showFeedback(
    correct,
    correct
      ? `CORRECT // ${state.current.family} ${state.current.subrule} // ${state.current.explanation}`
      : `MISS // correct: ${state.current.correctAction === "N" ? "NO OBJECTION" : `${state.current.family} ${state.current.subrule}`} // ${state.current.explanation}`
  );

  saveState();
  renderMetrics();

  if (state.repsSinceAar >= 20 || state.errorBurst >= 3) {
    openAAR();
    state.repsSinceAar = 0;
    state.errorBurst = 0;
    return;
  }

  setTimeout(() => startScenario(), 600);
}

function renderMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const todays = state.attempts.filter((a) => a.ts.startsWith(today));
  const correct = todays.filter((a) => a.correct).length;
  const acc = todays.length ? Math.round((correct / todays.length) * 100) : 0;

  let streak = 0;
  for (let i = state.attempts.length - 1; i >= 0; i -= 1) {
    if (!state.attempts[i].correct) break;
    streak += 1;
  }

  const rts = todays.map((a) => a.rt).sort((a, b) => a - b);
  const med = rts.length ? rts[Math.floor(rts.length / 2)] : 0;

  el.repsToday.textContent = String(todays.length);
  el.streak.textContent = String(streak);
  el.accuracy.textContent = `${acc}%`;
  el.medianRt.textContent = `${med}ms`;

  renderWeakRules();
  renderDueReviews();
  renderTracker();
}

function getWeakRules(limit = 5) {
  return Object.entries(state.ruleState)
    .sort((a, b) => {
      const sa = (1 - a[1].accuracyEwma) * 0.7 + Math.min(a[1].latencyEwma / 10000, 1) * 0.3;
      const sb = (1 - b[1].accuracyEwma) * 0.7 + Math.min(b[1].latencyEwma / 10000, 1) * 0.3;
      return sb - sa;
    })
    .slice(0, limit)
    .map(([k]) => k);
}

function renderWeakRules() {
  const weak = getWeakRules(5);
  el.weakRules.innerHTML = weak.length ? weak.map((w) => `<li>${w}</li>`).join("") : "<li>No data yet. Start grinding.</li>";
}

function renderDueReviews() {
  const due = getDueRules();
  el.dueReviews.innerHTML = due.length ? due.map((d) => `<li>${d}</li>`).join("") : "<li>None due. Keep volume high.</li>";
}

function renderTracker() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const day = state.attempts.filter((a) => a.ts.startsWith(now.toISOString().slice(0, 10))).length;
  const week = state.attempts.filter((a) => Date.parse(a.ts) >= weekAgo).length;
  const yearCount = state.attempts.filter((a) => a.ts.startsWith(String(year))).length;
  el.tracker.innerHTML = `<p>Daily reps: <strong>${day}</strong></p><p>Weekly reps: <strong>${week}</strong></p><p>Yearly reps: <strong>${yearCount}</strong></p>`;
}

function openAAR() {
  const weak = getWeakRules(3);
  const lines = weak.map((k) => {
    const rs = state.ruleState[k];
    return `<li><strong>${k}</strong> // accuracy ${(rs.accuracyEwma * 100).toFixed(0)}% // avg rt ${Math.round(rs.latencyEwma)}ms // next due ${new Date(rs.nextDueAt).toLocaleDateString()}</li>`;
  }).join("");

  el.aarBody.innerHTML = `<p>Rebuild these failures now.</p><ul>${lines || "<li>No weak clusters yet.</li>"}</ul>`;
  el.aarDialog.showModal();
}

function startClock() {
  setInterval(() => {
    if (!state.startTs) return;
    const sec = (performance.now() - state.startTs) / 1000;
    el.timer.textContent = `${sec.toFixed(1)}s`;
  }, 100);
}

document.addEventListener("keydown", async (e) => {
  if (el.settingsDialog.open || el.aarDialog.open) return;

  const key = e.key.toUpperCase();
  if (key === "G") {
    try {
      const generated = await maybeGenerateFromApi();
      if (generated) {
        startScenario(generated);
        showFeedback(true, "API scenario loaded.");
      } else {
        showFeedback(false, "No API key configured.");
      }
    } catch (err) {
      showFeedback(false, `API generation failed: ${err.message}`);
    }
    return;
  }

  if (state.phase === "action") return handleAction(key);
  if (state.phase === "family") return handleFamily(key);
  if (state.phase === "subrule") return handleSubrule(key);
});

el.aarContinue.addEventListener("click", () => {
  el.aarDialog.close();
  startScenario();
});

el.openSettings.addEventListener("click", () => {
  el.apiKeyInput.value = state.settings.apiKey;
  el.modelInput.value = state.settings.model;
  el.settingsDialog.showModal();
});

el.closeSettings.addEventListener("click", () => el.settingsDialog.close());
el.saveSettings.addEventListener("click", () => {
  state.settings.apiKey = el.apiKeyInput.value.trim();
  state.settings.model = el.modelInput.value.trim() || "gpt-4.1-mini";
  saveState();
  el.settingsDialog.close();
});

function boot() {
  loadState();
  renderMetrics();
  startScenario();
  startClock();
}

boot();
