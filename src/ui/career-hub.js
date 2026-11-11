import { store } from "../core/state.js";

export function renderCareerHub(container) {
  const state = store.get();
  const career = state.career;
  
  if (!career) {
    container.innerHTML = `<p class="text-white p-4">No hay partida iniciada.</p>`;
    return;
  }

  const myClub = state.clubs[career.userClubId];
  const formatMoney = (amount) => `$${(amount / 1000000).toFixed(1)}M`;

  container.innerHTML = `
    <div class="p-6 text-white h-full bg-slate-900 overflow-y-auto">
      
      <!-- Cabecera del Mánager -->
      <header class="flex justify-between items-center border-b border-slate-700 pb-4 mb-6">
        <div>
          <h1 class="text-3xl font-bold text-blue-400">${myClub.name}</h1>
          <p class="text-slate-400">Mánager: <span class="text-white">${career.manager.name}</span> | Fecha: ${career.date.toLocaleDateString()}</p>
        </div>
        <div class="text-right bg-slate-800 p-3 rounded-lg border border-slate-700">
          <p class="text-lg font-semibold text-green-400">Presupuesto: ${formatMoney(career.finances.budget)}</p>
          <p class="text-sm text-slate-400">Sueldos: $${(career.finances.wageBudget / 1000).toFixed(0)}k / sem</p>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Panel 1: Próximo Partido -->
        <div class="bg-slate-800 rounded-lg p-5 border border-slate-700 flex flex-col justify-between">
          <div>
            <h2 class="text-xl font-bold mb-4 text-slate-200">Próximo Partido</h2>
            <div class="flex justify-between items-center bg-slate-700 p-4 rounded-lg mb-4 shadow-inner">
              <span class="font-bold text-blue-300">${myClub.name}</span>
              <span class="text-slate-400 font-mono">VS</span>
              <span class="font-bold text-red-300">Rival FC</span> <!-- Luego lo conectaremos al calendario real -->
            </div>
          </div>
          <button id="btn-play-match" class="w-full bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold py-3 px-4 rounded shadow-lg">
            ⚽ Jugar Partido
          </button>
        </div>

        <!-- Panel 2: Bandeja de Entrada -->
        <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <h2 class="text-xl font-bold mb-4 text-slate-200">Bandeja de Entrada</h2>
          <ul class="space-y-3">
            ${career.messages.map(msg => `
              <li class="bg-slate-700 p-3 rounded border-l-4 cursor-pointer hover:bg-slate-600 transition-colors ${msg.read ? 'border-slate-500' : 'border-blue-500'}">
                <p class="font-bold text-sm text-white">${msg.from}</p>
                <p class="text-xs text-slate-300 mt-1">${msg.subject}</p>
              </li>
            `).join("")}
          </ul>
        </div>

        <!-- Panel 3: Resumen de Liga -->
        <div class="bg-slate-800 rounded-lg p-5 border border-slate-700">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold text-slate-200">La Liga</h2>
            <span class="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Jornada ${career.league.matchday}</span>
          </div>
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="text-slate-400 border-b border-slate-600">
                <th class="pb-2 w-8">Pos</th>
                <th class="pb-2">Equipo</th>
                <th class="pb-2 text-center w-8">Pts</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-slate-700/50">
                <td class="py-2 px-1 text-center font-mono">1</td>
                <td class="py-2 px-1 font-bold text-blue-300">${myClub.name}</td>
                <td class="py-2 px-1 text-center font-bold text-green-400">0</td>
              </tr>
              <tr>
                <td class="py-2 px-1 text-center font-mono text-slate-400">2</td>
                <td class="py-2 px-1 text-slate-300">Rival FC</td>
                <td class="py-2 px-1 text-center font-bold text-slate-400">0</td>
              </tr>
            </tbody>
          </table>
          <button class="mt-4 w-full text-blue-400 text-sm hover:text-blue-300 transition-colors text-center">Ver tabla completa</button>
        </div>

      </div>
    </div>
  `;

  // Evento temporal para simular el avance al partido
  document.getElementById("btn-play-match").addEventListener("click", () => {
    console.log("Transición al motor 2D de partidos...");
    // En el próximo paso uniremos este botón con la función startLiveMatch de tu engine
  });
}