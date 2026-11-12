import { store } from "../core/state.js";
import {
  ensurePressAndRecordsState,
  answerPressConference,
  getLockerRoomDynamics,
  holdTeamMeeting
} from "../engine/press-locker-records.js";
import { showToast } from "./toast.js";

export function renderPressLockerExtrasUI() {
  const state = store.get();
  if (!state || !state.userClubId || state.liveMatch) return;

  ensurePressAndRecordsState();
  const freshState = store.get();
  const targetHost = document.getElementById("tab-content") || document.getElementById("view-root");
  if (!targetHost) return;

  // 1. CENTRO DEL CLUB: Rueda de Prensa Pendiente + Clima de Vestuario
  if (freshState.activeTab === "home" && !document.getElementById("wfm-press-locker-wrap")) {
    const wrap = document.createElement("div");
    wrap.id = "wfm-press-locker-wrap";
    wrap.style.marginTop = "16px";
    wrap.style.display = "grid";
    wrap.style.gap = "16px";

    const press = freshState.pendingPressConference;
    const locker = getLockerRoomDynamics(freshState);
    const roundKey = `${freshState.season || 1}_${freshState.competitions?.league_1?.currentRound || 0}`;
    const meetingDone = freshState.lastTeamMeetingRound === roundKey;

    let html = "";

    if (press) {
      html += `
        <section class="fm-card" style="border-color:rgba(250,204,21,0.55); background:linear-gradient(155deg, rgba(250,204,21,0.12), rgba(15,23,42,0.95) 60%);">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px;">
            <h3 style="margin:0; color:#fde047;">${press.headline}</h3>
            <span style="background:rgba(239,68,68,0.25); color:#fca5a5; border:1px solid rgba(239,68,68,0.45); padding:2px 9px; border-radius:99px; font-size:10.5px; font-weight:800;">EN DIRECTO</span>
          </div>
          <p style="font-size:13.5px; color:#e2e8f0; font-style:italic; margin-bottom:12px;">${press.question}</p>
          <div style="display:grid; gap:8px;">
            ${press.options.map((opt, idx) => `
              <button type="button" class="btn-press-answer fm-btn fm-btn-ghost" data-pidx="${idx}" style="text-align:left; padding:10px 12px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; border-color:rgba(255,255,255,0.16);">
                <b style="font-size:12.5px; color:#fff;">${opt.label}</b>
                <span style="font-size:11px; color:#38bdf8; font-weight:700;">${opt.effectText}</span>
              </button>
            `).join("")}
          </div>
        </section>
      `;
    }

    if (locker) {
      html += `
        <section class="fm-card">
          <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; margin-bottom:12px;">
            <div>
              <h3 style="margin:0;">🗣️ Clima y Jerarquía del Vestuario</h3>
              <small style="color:var(--text-muted);">Moral media de plantilla: <b style="color:${locker.atmosphere.color};">${locker.avgMorale}% (${locker.atmosphere.label})</b></small>
            </div>
            <button type="button" id="btn-team-meeting" class="fm-btn ${meetingDone ? 'fm-btn-ghost' : 'fm-btn-primary'}" ${meetingDone ? 'disabled' : ''} style="padding:7px 13px; font-size:12px; ${meetingDone ? 'opacity:0.5; cursor:not-allowed;' : ''}">
              ${meetingDone ? '✓ Charla realizada esta fecha' : '📣 Dar Charla Motivacional (+7% Moral)'}
            </button>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
            <div style="background:rgba(6,9,19,0.72); border:1px solid var(--panel-border); border-radius:10px; padding:11px;">
              <div style="font-size:11px; font-weight:800; color:#34d399; text-transform:uppercase; margin-bottom:7px;">👑 Líderes del Vestuario</div>
              ${locker.leaders.length === 0
                ? `<small style="color:var(--text-muted);">Sin referentes consolidados aún.</small>`
                : locker.leaders.map(p => `
                  <div style="display:flex; justify-content:space-between; font-size:12.5px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span><b>${p.name}</b> <small style="color:var(--text-muted);">(${p.age}a • OVR ${p.ovr})</small></span>
                    <span style="color:#34d399; font-weight:800;">Moral ${p.morale ?? 85}%</span>
                  </div>
                `).join("")}
            </div>

            <div style="background:rgba(6,9,19,0.72); border:1px solid var(--panel-border); border-radius:10px; padding:11px;">
              <div style="font-size:11px; font-weight:800; color:#fbbf24; text-transform:uppercase; margin-bottom:7px;">⚠️ Jugadores Pidiendo Minutos</div>
              ${locker.unsettled.length === 0
                ? `<small style="color:#34d399;">✓ Todos los jugadores están satisfechos con su rol.</small>`
                : locker.unsettled.map(p => `
                  <div style="display:flex; justify-content:space-between; font-size:12.5px; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span><b>${p.name}</b> <small style="color:var(--text-muted);">(${p.pos} • OVR ${p.ovr})</small></span>
                    <span style="color:#fbbf24; font-weight:800;">Moral ${p.morale ?? 75}%</span>
                  </div>
                `).join("")}
            </div>
          </div>
        </section>
      `;
    }

    wrap.innerHTML = html;
    targetHost.appendChild(wrap);

    wrap.querySelectorAll(".btn-press-answer").forEach(btn => {
      btn.addEventListener("click", () => {
        const res = answerPressConference(Number(btn.dataset.pidx));
        showToast(res.msg, res.ok ? "success" : "warning", 4500);
      });
    });

    document.getElementById("btn-team-meeting")?.addEventListener("click", () => {
      const res = holdTeamMeeting();
      showToast(res.msg, res.ok ? "success" : "warning", 4000);
    });
  }

  // 2. COMPETICIONES: Libro de Récords Históricos del Club
  if (freshState.activeTab === "table" && !document.getElementById("wfm-club-records-card")) {
    const rec = freshState.clubRecords || {};
    const streakNow = freshState.unbeatenStreak || 0;
    const allPlayers = Object.values(freshState.players || {}).filter(p => p.clubId === freshState.userClubId);
    const topClubScorer = [...allPlayers].sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];

    const card = document.createElement("section");
    card.id = "wfm-club-records-card";
    card.className = "fm-card";
    card.style.marginTop = "16px";

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0;">📜 Libro de Récords Históricos del Club</h3>
        <span style="font-size:11.5px; color:#38bdf8; font-weight:800;">Racha Invicta Actual: ${streakNow} partidos</span>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:10px;">
        <div style="background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:10px; padding:11px;">
          <small style="color:var(--text-muted); display:block; font-size:10.5px;">MAYOR GOLEADA A FAVOR</small>
          <b style="font-size:16px; color:#34d399;">${rec.biggestWin?.diff > 0 ? `${rec.biggestWin.score} vs ${rec.biggestWin.rival}` : "Sin victorias aún"}</b>
        </div>
        <div style="background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:10px; padding:11px;">
          <small style="color:var(--text-muted); display:block; font-size:10.5px;">RÉCORD PARTIDOS INVICTO</small>
          <b style="font-size:16px; color:#fde047;">${rec.bestUnbeatenStreak || 0} encuentros</b>
        </div>
        <div style="background:rgba(6,9,19,0.75); border:1px solid var(--panel-border); border-radius:10px; padding:11px;">
          <small style="color:var(--text-muted); display:block; font-size:10.5px;">MÁXIMO GOLEADOR ACTUAL</small>
          <b style="font-size:16px; color:#38bdf8;">${topClubScorer && topClubScorer.goals > 0 ? `${topClubScorer.name} (${topClubScorer.goals})` : "Sin goles aún"}</b>
        </div>
      </div>
    `;

    targetHost.appendChild(card);
  }
}