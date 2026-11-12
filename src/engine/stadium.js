const DEFAULT_STADIUMS = {
  real_madrid: { name: "Coliseo Chamartín", capacity: 81000 },
  barcelona: { name: "Estadio Olímpico Condal", capacity: 78000 },
  atletico: { name: "Metropolitano del Sur", capacity: 68000 },
  athletic: { name: "La Catedral del Norte", capacity: 53000 },
  real_sociedad: { name: "Arena Donostia", capacity: 39500 },
  betis: { name: "Estadio Heliópolis", capacity: 60500 },
  sevilla: { name: "Bombonera de Nervión", capacity: 43800 },
  villarreal: { name: "Estadio de la Cerámica", capacity: 23500 },
  valencia: { name: "Templo del Turia", capacity: 49000 },
  girona: { name: "Fortín Montilivi", capacity: 18500 },
  celta: { name: "Estadio Balaídos", capacity: 29000 },
  osasuna: { name: "El Sadar Rojo", capacity: 23500 }
};

export function getClubStadium(club, staffStadiumLvl = 1) {
  if (!club) return { name: "Estadio Municipal", capacity: 25000 };
  if (club.stadium) return club.stadium;

  const preset = DEFAULT_STADIUMS[club.id];
  const baseCap = preset ? preset.capacity : Math.round((club.ovr || 75) * 480);
  const bonusCap = Math.max(0, staffStadiumLvl - 1) * 6000;

  return {
    name: preset ? preset.name : `Estadio ${club.name}`,
    capacity: baseCap + bonusCap
  };
}

export function calculateMatchAttendance(homeClub, boardConfidence = 80, compId = "league_1", staffStadiumLvl = 1) {
  const stadium = getClubStadium(homeClub, staffStadiumLvl);
  const compBoost = compId === "cont_1" ? 0.14 : compId === "cup_1" ? 0.08 : 0;
  const moodFactor = 0.62 + (Math.max(20, Math.min(100, boardConfidence)) / 100) * 0.34 + compBoost;
  const fillRate = Math.max(0.55, Math.min(1.0, moodFactor));
  const attendance = Math.round(stadium.capacity * fillRate);
  const ticketPrice = 34 + staffStadiumLvl * 5 + (compId === "cont_1" ? 15 : 0);

  return {
    stadiumName: stadium.name,
    capacity: stadium.capacity,
    attendance,
    fillPct: Math.round(fillRate * 100),
    revenue: attendance * ticketPrice
  };
}