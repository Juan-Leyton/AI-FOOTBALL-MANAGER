let lastAnnouncedScoreKey = "";

export function checkAndTriggerLiveGoalBanner(liveMatch, clubs) {
  if (!liveMatch) {
    lastAnnouncedScoreKey = "";
    return;
  }

  const key = `${liveMatch.homeId}|${liveMatch.awayId}|${liveMatch.gh}|${liveMatch.ga}`;
  if (!lastAnnouncedScoreKey) {
    lastAnnouncedScoreKey = key;
    return;
  }

  const prevParts = lastAnnouncedScoreKey.split("|");
  const sameMatch = prevParts[0] === String(liveMatch.homeId) && prevParts[1] === String(liveMatch.awayId);

  if (!sameMatch) {
    lastAnnouncedScoreKey = key;
    return;
  }

  if (key !== lastAnnouncedScoreKey && (liveMatch.gh > 0 || liveMatch.ga > 0)) {
    const prevGh = Number(prevParts[2] || 0);
    const homeScored = liveMatch.gh > prevGh;
    lastAnnouncedScoreKey = key;

    const scorerClub = homeScored ? clubs?.[liveMatch.homeId] : clubs?.[liveMatch.awayId];
    const lastEv = liveMatch.events?.[0] || "¡GOOOOL!";

    showGoalBroadcastBanner(
      scorerClub?.name || (homeScored ? liveMatch.homeName : liveMatch.awayName),
      scorerClub?.colors?.[0] || "#3b82f6",
      `${liveMatch.gh} - ${liveMatch.ga}`,
      liveMatch.minute,
      lastEv
    );
  }
}

export function showGoalBroadcastBanner(teamName, accentColor, scoreText, minute, detailText = "") {
  const existing = document.querySelector(".wfm-goal-overlay");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.className = "wfm-goal-overlay";
  banner.style.borderColor = accentColor || "#facc15";
  banner.innerHTML = `
    <div style="font-size:11px; font-weight:900; letter-spacing:0.18em; color:#fde047; text-transform:uppercase; margin-bottom:4px;">
      ⚽ ¡GOOOOOL! • MINUTO ${minute}'
    </div>
    <div style="font-size:26px; font-weight:900; color:#ffffff; letter-spacing:-0.01em; margin-bottom:4px;">
      ${teamName.toUpperCase()}
    </div>
    <div style="display:inline-block; background:rgba(0,0,0,0.55); border:1px solid rgba(255,255,255,0.2); padding:4px 16px; border-radius:99px; font-size:20px; font-weight:900; color:#34d399; margin-bottom:6px;">
      ${scoreText}
    </div>
    <div style="font-size:12px; color:#cbd5e1; max-width:340px; margin:0 auto;">
      ${detailText.replace(/<[^>]*>/g, "")}
    </div>
  `;

  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 2650);
}

export function playAnimatedQuickSim(homeClub, awayClub, finalGh, finalGa, onComplete) {
  const overlay = document.createElement("div");
  overlay.className = "wfm-quicksim-modal";

  const goalTimeline = [];
  for (let i = 0; i < finalGh; i++) {
    goalTimeline.push({ min: Math.floor(6 + Math.random() * 82), side: "home" });
  }
  for (let i = 0; i < finalGa; i++) {
    goalTimeline.push({ min: Math.floor(6 + Math.random() * 82), side: "away" });
  }
  goalTimeline.sort((a, b) => a.min - b.min);

  overlay.innerHTML = `
    <div style="width:100%; max-width:520px; background:linear-gradient(160deg, #0f172a, #060913); border:1px solid rgba(96,165,250,0.45); border-radius:18px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,0.85); text-align:center;">
      <div style="font-size:11px; font-weight:900; letter-spacing:0.14em; color:#60a5fa; text-transform:uppercase; margin-bottom:12px;">
        📺 TRANSMISIÓN EXPRESS • SIMULACIÓN DE PARTIDO
      </div>

      <div style="display:flex; justify-content:space-around; align-items:center; gap:12px; margin-bottom:16px;">
        <div style="flex:1;">
          <div style="font-size:16px; font-weight:900; color:#fff;">${homeClub?.name || "Local"}</div>
          <small style="color:#94a3b8;">OVR ${homeClub?.ovr || 75}</small>
        </div>

        <div style="background:rgba(15,23,42,0.95); border:1px solid rgba(255,255,255,0.15); border-radius:14px; padding:10px 20px;">
          <div id="qs-score" style="font-size:34px; font-weight:900; color:#fff; letter-spacing:2px;">0 - 0</div>
          <div id="qs-min" style="font-size:12px; font-weight:800; color:#34d399; margin-top:2px;">MIN 1'</div>
        </div>

        <div style="flex:1;">
          <div style="font-size:16px; font-weight:900; color:#fff;">${awayClub?.name || "Visitante"}</div>
          <small style="color:#94a3b8;">OVR ${awayClub?.ovr || 75}</small>
        </div>
      </div>

      <div style="width:100%; height:8px; background:rgba(30,41,59,0.9); border-radius:99px; overflow:hidden; margin-bottom:14px;">
        <div id="qs-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #10b981); transition:width 0.08s linear;"></div>
      </div>

      <div id="qs-feed" style="min-height:48px; background:rgba(6,9,19,0.75); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:10px; font-size:12.5px; color:#cbd5e1;">
        Pitazo inicial... ¡Rueda el balón!
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  let currentMin = 1;
  let curGh = 0;
  let curGa = 0;
  let goalIdx = 0;

  const timer = setInterval(() => {
    currentMin += 3;
    if (currentMin > 90) currentMin = 90;

    while (goalIdx < goalTimeline.length && goalTimeline[goalIdx].min <= currentMin) {
      const g = goalTimeline[goalIdx];
      if (g.side === "home") {
        curGh++;
        document.getElementById("qs-feed").innerHTML = `<b style="color:#34d399;">⚽ ${g.min}' ¡GOL DE ${(homeClub?.name || "LOCAL").toUpperCase()}!</b>`;
      } else {
        curGa++;
        document.getElementById("qs-feed").innerHTML = `<b style="color:#fbbf24;">⚽ ${g.min}' ¡GOL DE ${(awayClub?.name || "VISITANTE").toUpperCase()}!</b>`;
      }
      goalIdx++;
    }

    const scoreEl = document.getElementById("qs-score");
    const minEl = document.getElementById("qs-min");
    const barEl = document.getElementById("qs-bar");
    if (scoreEl) scoreEl.textContent = `${curGh} - ${curGa}`;
    if (minEl) minEl.textContent = currentMin >= 90 ? "FINAL 90'" : `MIN ${currentMin}'`;
    if (barEl) barEl.style.width = `${Math.round((currentMin / 90) * 100)}%`;

    if (currentMin >= 90) {
      clearInterval(timer);
      setTimeout(() => {
        overlay.remove();
        if (typeof onComplete === "function") onComplete();
      }, 550);
    }
  }, 65);
}