export const LEAGUES_CATALOG = [
  // ==================== EUROPA - PRIMERAS DIVISIONES (16 EQUIPOS) ====================
  {
    id: "esp_1",
    name: "Liga Ibérica",
    country: "España",
    flag: "🇪🇸",
    continent: "Europa",
    tier: 1,
    childLeagueId: "esp_2",
    clubs: [
      { id: "real_madrid", name: "Madrid Blanco", ovr: 86, budget: 145000000, colors: ["#ffffff", "#1e3a8a"], stadium: { name: "Coliseo Chamartín", capacity: 81000 } },
      { id: "barcelona", name: "FC Condal", ovr: 85, budget: 120000000, colors: ["#a50044", "#004d98"], stadium: { name: "Estadio Olímpico Condal", capacity: 78000 } },
      { id: "atletico", name: "Atlético Capital", ovr: 83, budget: 95000000, colors: ["#cb3524", "#ffffff"], stadium: { name: "Metropolitano del Sur", capacity: 68000 } },
      { id: "athletic", name: "Athletic Norte", ovr: 80, budget: 65000000, colors: ["#ee2523", "#ffffff"], stadium: { name: "La Catedral del Norte", capacity: 53000 } },
      { id: "real_sociedad", name: "Real Donostia", ovr: 79, budget: 60000000, colors: ["#0067b1", "#ffffff"], stadium: { name: "Arena Donostia", capacity: 39500 } },
      { id: "villarreal", name: "Submarino Amarillo", ovr: 79, budget: 58000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Estadio de la Cerámica", capacity: 23500 } },
      { id: "betis", name: "Real Heliópolis", ovr: 78, budget: 52000000, colors: ["#0bb363", "#ffffff"], stadium: { name: "Estadio Heliópolis", capacity: 60500 } },
      { id: "sevilla", name: "Sevilla Nervión", ovr: 78, budget: 50000000, colors: ["#ffffff", "#d4021d"], stadium: { name: "Bombonera de Nervión", capacity: 43800 } },
      { id: "valencia", name: "Valencia Turia", ovr: 77, budget: 44000000, colors: ["#ffffff", "#f97316"], stadium: { name: "Templo del Turia", capacity: 49000 } },
      { id: "girona", name: "Girona Costa", ovr: 77, budget: 42000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Fortín Montilivi", capacity: 18500 } },
      { id: "celta", name: "Celta Vigo", ovr: 75, budget: 35000000, colors: ["#7dd3fc", "#ffffff"], stadium: { name: "Estadio Balaídos", capacity: 29000 } },
      { id: "osasuna", name: "Osasuna Rojo", ovr: 75, budget: 32000000, colors: ["#b91c1c", "#1e3a8a"], stadium: { name: "El Sadar Rojo", capacity: 23500 } },
      { id: "mallorca", name: "RCD Mallorca Isla", ovr: 74, budget: 29000000, colors: ["#dc2626", "#111827"], stadium: { name: "Estadi Son Moix", capacity: 23100 } },
      { id: "rayo_val", name: "Rayo Vallecas", ovr: 74, budget: 26000000, colors: ["#ffffff", "#dc2626"], stadium: { name: "Estadio de Vallecas", capacity: 14700 } },
      { id: "getafe_cf", name: "Getafe Azulón", ovr: 73, budget: 25000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Coliseum Sur", capacity: 16500 } },
      { id: "alaves_vit", name: "Deportivo Vitoria", ovr: 73, budget: 24000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Mendizorroza", capacity: 19800 } }
    ]
  },
  {
    id: "eng_1",
    name: "Premier Británica",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    continent: "Europa",
    tier: 1,
    childLeagueId: "eng_2",
    clubs: [
      { id: "man_sky", name: "Manchester Sky", ovr: 87, budget: 175000000, colors: ["#6cabdd", "#1c2c5b"], stadium: { name: "Etihad Sky Arena", capacity: 55000 } },
      { id: "arsenal_ldn", name: "Arsenal Londres", ovr: 85, budget: 140000000, colors: ["#ef0107", "#ffffff"], stadium: { name: "Emirates North Stadium", capacity: 60700 } },
      { id: "liverpool_red", name: "Liverpool Red", ovr: 85, budget: 135000000, colors: ["#c8102e", "#facc15"], stadium: { name: "Anfield Kop Park", capacity: 61000 } },
      { id: "man_devils", name: "Manchester Devils", ovr: 82, budget: 130000000, colors: ["#da291c", "#0f172a"], stadium: { name: "Teatro de los Sueños", capacity: 74300 } },
      { id: "chelsea_blu", name: "Chelsea Azul", ovr: 82, budget: 135000000, colors: ["#034694", "#ffffff"], stadium: { name: "Stamford Bridge West", capacity: 41800 } },
      { id: "tottenham_sp", name: "Tottenham Spur", ovr: 81, budget: 110000000, colors: ["#ffffff", "#132257"], stadium: { name: "White Hart Arena", capacity: 62800 } },
      { id: "newcastle_utd", name: "Newcastle Magpies", ovr: 80, budget: 105000000, colors: ["#111827", "#ffffff"], stadium: { name: "St James Park North", capacity: 52300 } },
      { id: "aston_villa", name: "Aston Villans", ovr: 80, budget: 85000000, colors: ["#670e36", "#95bfe5"], stadium: { name: "Villa Park Birmingham", capacity: 42600 } },
      { id: "brighton_alb", name: "Brighton Gaviotas", ovr: 78, budget: 68000000, colors: ["#0057b8", "#ffffff"], stadium: { name: "Amex Coast Stadium", capacity: 31800 } },
      { id: "west_ham", name: "West Ham Martillos", ovr: 77, budget: 65000000, colors: ["#7a263a", "#1bb1e7"], stadium: { name: "London Olympic Bowl", capacity: 62500 } },
      { id: "everton_blu", name: "Everton Toffees", ovr: 76, budget: 52000000, colors: ["#003399", "#ffffff"], stadium: { name: "Bramley Moore Dock", capacity: 52800 } },
      { id: "wolves_fc", name: "Wolves Lobos", ovr: 76, budget: 50000000, colors: ["#fdb913", "#111827"], stadium: { name: "Molineux Gold", capacity: 32000 } },
      { id: "fulham_fc", name: "Fulham Cottagers", ovr: 76, budget: 54000000, colors: ["#ffffff", "#111827"], stadium: { name: "Craven Cottage Thames", capacity: 25700 } },
      { id: "crystal_pal", name: "Crystal Águilas", ovr: 76, budget: 52000000, colors: ["#1b458f", "#c4122e"], stadium: { name: "Selhurst Park South", capacity: 25400 } },
      { id: "brentford_fc", name: "Brentford Abejas", ovr: 75, budget: 48000000, colors: ["#e30613", "#ffffff"], stadium: { name: "Gtech Community", capacity: 17250 } },
      { id: "nottingham_f", name: "Nottingham Forest", ovr: 75, budget: 50000000, colors: ["#dd0000", "#ffffff"], stadium: { name: "The City Ground", capacity: 30400 } }
    ]
  },
  {
    id: "ita_1",
    name: "Serie A Italiana",
    country: "Italia",
    flag: "🇮🇹",
    continent: "Europa",
    tier: 1,
    childLeagueId: "ita_2",
    clubs: [
      { id: "inter_mil", name: "Inter Milano", ovr: 85, budget: 115000000, colors: ["#0068a8", "#0f172a"], stadium: { name: "Giuseppe Meazza Nord", capacity: 75800 } },
      { id: "ac_milan", name: "AC Rossoneri", ovr: 83, budget: 105000000, colors: ["#fb090b", "#0f172a"], stadium: { name: "San Siro Rossonero", capacity: 75800 } },
      { id: "juventus_tr", name: "Juventus Vecchia", ovr: 83, budget: 110000000, colors: ["#ffffff", "#111827"], stadium: { name: "Allianz Torino", capacity: 41500 } },
      { id: "napoli_az", name: "Napoli Azzurri", ovr: 82, budget: 92000000, colors: ["#12a0d7", "#ffffff"], stadium: { name: "Stadio Vesuvio", capacity: 54700 } },
      { id: "as_roma", name: "AS Roma Loba", ovr: 80, budget: 78000000, colors: ["#8e1f2f", "#f0bc42"], stadium: { name: "Stadio Olimpico Sud", capacity: 70600 } },
      { id: "atalanta_bg", name: "Atalanta Bérgamo", ovr: 80, budget: 72000000, colors: ["#1e71b8", "#0f172a"], stadium: { name: "Gewiss Arena", capacity: 24900 } },
      { id: "lazio_rm", name: "Lazio Águilas", ovr: 79, budget: 68000000, colors: ["#87d8f7", "#ffffff"], stadium: { name: "Curva Nord Olimpico", capacity: 70600 } },
      { id: "fiorentina", name: "Fiorentina Viola", ovr: 78, budget: 58000000, colors: ["#482e92", "#ffffff"], stadium: { name: "Artemio Franchi", capacity: 43100 } },
      { id: "bologna_fc", name: "Bologna Rossoblù", ovr: 77, budget: 52000000, colors: ["#9f1f33", "#1a2f4b"], stadium: { name: "Renato Dall'Ara", capacity: 38200 } },
      { id: "torino_fc", name: "Torino Granata", ovr: 76, budget: 45000000, colors: ["#8a1e22", "#ffffff"], stadium: { name: "Olimpico Grande Torino", capacity: 28100 } },
      { id: "udinese_fc", name: "Udinese Friuli", ovr: 75, budget: 38000000, colors: ["#ffffff", "#1e293b"], stadium: { name: "Bluenergy Friuli", capacity: 25100 } },
      { id: "genoa_cfc", name: "Genoa Grifone", ovr: 74, budget: 35000000, colors: ["#a6192e", "#003366"], stadium: { name: "Luigi Ferraris", capacity: 36500 } },
      { id: "monza_ac", name: "AC Monza Brianza", ovr: 74, budget: 36000000, colors: ["#e30613", "#ffffff"], stadium: { name: "U-Power Stadium", capacity: 16900 } },
      { id: "parma_cal", name: "Parma Crociati", ovr: 74, budget: 34000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Ennio Tardini", capacity: 22300 } },
      { id: "lecce_us", name: "US Lecce Salento", ovr: 73, budget: 28000000, colors: ["#facc15", "#dc2626"], stadium: { name: "Via del Mare", capacity: 31500 } },
      { id: "cagliari_c", name: "Cagliari Sardegna", ovr: 73, budget: 29000000, colors: ["#9f1f33", "#1e3a8a"], stadium: { name: "Unipol Domus", capacity: 16400 } }
    ]
  },
  {
    id: "ger_1",
    name: "Bundesliga Germana",
    country: "Alemania",
    flag: "🇩🇪",
    continent: "Europa",
    tier: 1,
    childLeagueId: "ger_2",
    clubs: [
      { id: "bayern_mun", name: "Bayern Múnich", ovr: 86, budget: 155000000, colors: ["#dc052d", "#ffffff"], stadium: { name: "Allianz Baviera", capacity: 75000 } },
      { id: "bvb_dort", name: "Borussia Dortmund", ovr: 83, budget: 112000000, colors: ["#fde100", "#111827"], stadium: { name: "Muro Amarillo Westfalen", capacity: 81300 } },
      { id: "bayer_lev", name: "Bayer Leverkusen", ovr: 83, budget: 98000000, colors: ["#e32221", "#111827"], stadium: { name: "BayArena Rin", capacity: 30200 } },
      { id: "rb_leipzig", name: "RB Leipzig", ovr: 82, budget: 102000000, colors: ["#ffffff", "#dd0741"], stadium: { name: "Red Bull Arena Sajonia", capacity: 47000 } },
      { id: "eintracht", name: "Eintracht Frankfurt", ovr: 79, budget: 68000000, colors: ["#e1000f", "#111827"], stadium: { name: "Deutsche Bank Park", capacity: 58000 } },
      { id: "stuttgart", name: "VfB Stuttgart", ovr: 79, budget: 64000000, colors: ["#ffffff", "#e32219"], stadium: { name: "MHP Arena Suabia", capacity: 60400 } },
      { id: "wolfsburg", name: "Wolfsburgo Lobos", ovr: 77, budget: 62000000, colors: ["#65b32e", "#ffffff"], stadium: { name: "Volkswagen Arena", capacity: 30000 } },
      { id: "gladbach", name: "Borussia M'gladbach", ovr: 77, budget: 54000000, colors: ["#ffffff", "#10b981"], stadium: { name: "Borussia-Park", capacity: 54000 } },
      { id: "freiburg", name: "Friburgo Selva", ovr: 76, budget: 48000000, colors: ["#dc2626", "#111827"], stadium: { name: "Europa-Park Stadion", capacity: 34700 } },
      { id: "werder_br", name: "Werder Bremen", ovr: 75, budget: 42000000, colors: ["#1d9053", "#ffffff"], stadium: { name: "Weserstadion", capacity: 42100 } },
      { id: "hoffenheim", name: "TSG Hoffenheim", ovr: 75, budget: 44000000, colors: ["#1961b5", "#ffffff"], stadium: { name: "PreZero Arena", capacity: 30150 } },
      { id: "union_ber", name: "Union Berlín", ovr: 74, budget: 39000000, colors: ["#eb1923", "#facc15"], stadium: { name: "Alte Försterei", capacity: 22000 } },
      { id: "mainz_05", name: "Mainz 05 Carnaval", ovr: 74, budget: 36000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Mewa Arena", capacity: 33300 } },
      { id: "augsburg_fc", name: "FC Augsburgo", ovr: 74, budget: 34000000, colors: ["#ba3733", "#15803d"], stadium: { name: "WWK Arena", capacity: 30600 } },
      { id: "bochum_vfl", name: "VfL Bochum Ruhr", ovr: 73, budget: 30000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Ruhrstadion", capacity: 26000 } },
      { id: "st_pauli", name: "FC St. Pauli Hamburgo", ovr: 73, budget: 31000000, colors: ["#624839", "#ffffff"], stadium: { name: "Millerntor-Stadion", capacity: 29500 } }
    ]
  },
  {
    id: "fra_1",
    name: "Ligue Hexagone",
    country: "Francia",
    flag: "🇫🇷",
    continent: "Europa",
    tier: 1,
    childLeagueId: "fra_2",
    clubs: [
      { id: "psg_par", name: "Paris Saint-Étoile", ovr: 85, budget: 165000000, colors: ["#004170", "#da291c"], stadium: { name: "Parc des Princes", capacity: 48500 } },
      { id: "monaco_fc", name: "Mónaco Principado", ovr: 81, budget: 95000000, colors: ["#e1000f", "#ffffff"], stadium: { name: "Stade Louis II", capacity: 18500 } },
      { id: "marseille", name: "Olympique Marsella", ovr: 80, budget: 82000000, colors: ["#ffffff", "#2faee0"], stadium: { name: "Vélodrome Mediterráneo", capacity: 67300 } },
      { id: "lyon_ol", name: "Lyon Ródano", ovr: 79, budget: 76000000, colors: ["#ffffff", "#1e3a8a"], stadium: { name: "Groupama Décines", capacity: 59100 } },
      { id: "lille_osc", name: "Lille Norte", ovr: 79, budget: 70000000, colors: ["#e01e13", "#1e293b"], stadium: { name: "Pierre-Mauroy", capacity: 50100 } },
      { id: "nice_ogc", name: "Niza Costa Azul", ovr: 78, budget: 64000000, colors: ["#cc0000", "#111827"], stadium: { name: "Allianz Riviera", capacity: 36100 } },
      { id: "rennes_fc", name: "Rennes Bretaña", ovr: 77, budget: 58000000, colors: ["#e30613", "#111827"], stadium: { name: "Roazhon Park", capacity: 29700 } },
      { id: "lens_rc", name: "Lens Sangre y Oro", ovr: 77, budget: 54000000, colors: ["#ec1c24", "#facc15"], stadium: { name: "Bollaert-Delelis", capacity: 38200 } },
      { id: "strasbourg", name: "Estrasburgo Alsacia", ovr: 75, budget: 48000000, colors: ["#009fe3", "#ffffff"], stadium: { name: "Stade de la Meinau", capacity: 26100 } },
      { id: "nantes_fc", name: "Nantes Canarios", ovr: 74, budget: 40000000, colors: ["#facc15", "#15803d"], stadium: { name: "La Beaujoire", capacity: 35300 } },
      { id: "reims_st", name: "Reims Champaña", ovr: 74, budget: 38000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Auguste-Delaune", capacity: 21000 } },
      { id: "toulouse", name: "Toulouse Violeta", ovr: 74, budget: 37000000, colors: ["#5b21b6", "#ffffff"], stadium: { name: "Stadium Municipal", capacity: 33150 } },
      { id: "brest_sb", name: "Stade Brestois", ovr: 75, budget: 39000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Francis-Le Blé", capacity: 15200 } },
      { id: "montpellier", name: "Montpellier Hérault", ovr: 73, budget: 33000000, colors: ["#f97316", "#1e3a8a"], stadium: { name: "Stade de la Mosson", capacity: 22000 } },
      { id: "auxerre_aj", name: "AJ Auxerre Borgoña", ovr: 73, budget: 30000000, colors: ["#ffffff", "#1d4ed8"], stadium: { name: "Abbé-Deschamps", capacity: 18500 } },
      { id: "st_etienne", name: "AS Saint-Étienne", ovr: 73, budget: 32000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Geoffroy-Guichard", capacity: 41900 } }
    ]
  },
  {
    id: "por_1",
    name: "Liga Lusitana",
    country: "Portugal",
    flag: "🇵🇹",
    continent: "Europa",
    tier: 1,
    clubs: [
      { id: "benfica_sl", name: "Benfica Águilas", ovr: 82, budget: 88000000, colors: ["#e10600", "#ffffff"], stadium: { name: "Estádio da Luz", capacity: 64600 } },
      { id: "sporting_cp", name: "Sporting Lisboa", ovr: 82, budget: 84000000, colors: ["#008057", "#ffffff"], stadium: { name: "José Alvalade", capacity: 50000 } },
      { id: "porto_fc", name: "Porto Dragones", ovr: 81, budget: 82000000, colors: ["#00428c", "#ffffff"], stadium: { name: "Estádio do Dragão", capacity: 50000 } },
      { id: "braga_sc", name: "Braga Minho", ovr: 78, budget: 52000000, colors: ["#cc0000", "#ffffff"], stadium: { name: "Pedreira de Braga", capacity: 30200 } },
      { id: "vitoria_sc", name: "Vitória Guimarães", ovr: 76, budget: 36000000, colors: ["#ffffff", "#111827"], stadium: { name: "D. Afonso Henriques", capacity: 30000 } },
      { id: "famalicao", name: "FC Famalicão", ovr: 74, budget: 28000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Municipal 22 de Junho", capacity: 12000 } },
      { id: "boavista_fc", name: "Boavista Ajedrez", ovr: 73, budget: 24000000, colors: ["#111827", "#ffffff"], stadium: { name: "Estádio do Bessa", capacity: 28200 } },
      { id: "rio_ave", name: "Rio Ave Vila", ovr: 73, budget: 23000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Estádio dos Arcos", capacity: 12800 } },
      { id: "gil_vicente", name: "Gil Vicente Barcelos", ovr: 72, budget: 22000000, colors: ["#dc2626", "#1e3a8a"], stadium: { name: "Cidade de Barcelos", capacity: 12500 } },
      { id: "estoril_pr", name: "Estoril Praia", ovr: 72, budget: 22000000, colors: ["#facc15", "#1d4ed8"], stadium: { name: "António Coimbra", capacity: 8000 } },
      { id: "moreirense", name: "Moreirense Cónegos", ovr: 72, budget: 20000000, colors: ["#16a34a", "#ffffff"], stadium: { name: "Comendador Almeida", capacity: 9000 } },
      { id: "casa_pia", name: "Casa Pia Lisboa", ovr: 71, budget: 19000000, colors: ["#111827", "#ffffff"], stadium: { name: "Estádio Pina Manique", capacity: 10000 } },
      { id: "arouca_fc", name: "FC Arouca Lobo", ovr: 71, budget: 18500000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Municipal de Arouca", capacity: 5600 } },
      { id: "farense_sc", name: "SC Farense Algarve", ovr: 71, budget: 18000000, colors: ["#111827", "#ffffff"], stadium: { name: "São Luís Faro", capacity: 7000 } },
      { id: "santa_clara", name: "Santa Clara Azores", ovr: 71, budget: 18000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "São Miguel Ponta Delgada", capacity: 12500 } },
      { id: "nacional_mad", name: "Nacional Madeira", ovr: 70, budget: 17000000, colors: ["#111827", "#ffffff"], stadium: { name: "Estádio da Madeira", capacity: 5200 } }
    ]
  },
  {
    id: "ned_1",
    name: "Eredivisie Oranje",
    country: "Países Bajos",
    flag: "🇳🇱",
    continent: "Europa",
    tier: 1,
    clubs: [
      { id: "psv_eind", name: "PSV Eindhoven", ovr: 81, budget: 78000000, colors: ["#ed1c24", "#ffffff"], stadium: { name: "Philips Stadion", capacity: 35000 } },
      { id: "ajax_ams", name: "Ajax Amsterdam", ovr: 81, budget: 86000000, colors: ["#ffffff", "#d2122e"], stadium: { name: "Johan Cruyff Arena", capacity: 55800 } },
      { id: "feyenoord", name: "Feyenoord Róterdam", ovr: 80, budget: 72000000, colors: ["#ee1c25", "#ffffff"], stadium: { name: "De Kuip Róterdam", capacity: 51100 } },
      { id: "az_alkmaar", name: "AZ Alkmaar", ovr: 77, budget: 48000000, colors: ["#db0029", "#ffffff"], stadium: { name: "AFAS Stadion", capacity: 19500 } },
      { id: "twente_fc", name: "Twente Enschede", ovr: 76, budget: 42000000, colors: ["#e30613", "#ffffff"], stadium: { name: "De Grolsch Veste", capacity: 30200 } },
      { id: "utrecht_fc", name: "FC Utrecht Dom", ovr: 75, budget: 35000000, colors: ["#e11d48", "#ffffff"], stadium: { name: "Stadion Galgenwaard", capacity: 23750 } },
      { id: "heerenveen", name: "SC Heerenveen", ovr: 73, budget: 28000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Abe Lenstra Stadion", capacity: 27200 } },
      { id: "groningen", name: "FC Groningen Norte", ovr: 73, budget: 26000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Euroborg", capacity: 22550 } },
      { id: "nec_nijm", name: "NEC Nimega", ovr: 73, budget: 25000000, colors: ["#dc2626", "#15803d"], stadium: { name: "Goffertstadion", capacity: 12500 } },
      { id: "sparta_rot", name: "Sparta Róterdam", ovr: 72, budget: 23000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Het Kasteel", capacity: 11000 } },
      { id: "go_ahead", name: "Go Ahead Eagles", ovr: 72, budget: 22000000, colors: ["#dc2626", "#facc15"], stadium: { name: "De Adelaarshorst", capacity: 10000 } },
      { id: "vitesse_ar", name: "Vitesse Arnhem", ovr: 71, budget: 20000000, colors: ["#facc15", "#111827"], stadium: { name: "GelreDome", capacity: 21200 } },
      { id: "fortuna_sit", name: "Fortuna Sittard", ovr: 71, budget: 19000000, colors: ["#facc15", "#15803d"], stadium: { name: "Fortuna Sittard Stadion", capacity: 12500 } },
      { id: "pec_zwolle", name: "PEC Zwolle Azul", ovr: 71, budget: 19000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "MAC³PARK Stadion", capacity: 14000 } },
      { id: "willem_ii", name: "Willem II Tilburgo", ovr: 70, budget: 18000000, colors: ["#dc2626", "#1d4ed8"], stadium: { name: "Koning Willem II", capacity: 14700 } },
      { id: "heracles_a", name: "Heracles Almelo", ovr: 70, budget: 18000000, colors: ["#111827", "#ffffff"], stadium: { name: "Asito Stadion", capacity: 12000 } }
    ]
  },

  // ==================== SUDAMÉRICA - PRIMERAS DIVISIONES (16 EQUIPOS) ====================
  {
    id: "bra_1",
    name: "Brasileirão Série A",
    country: "Brasil",
    flag: "🇧🇷",
    continent: "Sudamérica",
    tier: 1,
    childLeagueId: "bra_2",
    clubs: [
      { id: "flamengo_rj", name: "Flamengo Rubro", ovr: 81, budget: 75000000, colors: ["#c52613", "#111827"], stadium: { name: "Maracanã Rubro-Negro", capacity: 78800 } },
      { id: "palmeiras_sp", name: "Palmeiras Verdão", ovr: 81, budget: 72000000, colors: ["#006437", "#ffffff"], stadium: { name: "Allianz Parque SP", capacity: 43700 } },
      { id: "atletico_mg", name: "Atlético Mineiro", ovr: 79, budget: 58000000, colors: ["#111827", "#ffffff"], stadium: { name: "Arena MRV Galo", capacity: 46000 } },
      { id: "sao_paulo", name: "São Paulo Tricolor", ovr: 78, budget: 54000000, colors: ["#ffffff", "#e11d48"], stadium: { name: "MorumBIS Tricolor", capacity: 66700 } },
      { id: "botafogo_rj", name: "Botafogo Estrella", ovr: 78, budget: 55000000, colors: ["#111827", "#ffffff"], stadium: { name: "Nilton Santos", capacity: 44600 } },
      { id: "corinthians", name: "Corinthians Timão", ovr: 77, budget: 52000000, colors: ["#ffffff", "#111827"], stadium: { name: "Neo Química Arena", capacity: 49200 } },
      { id: "fluminense", name: "Fluminense Tricolor", ovr: 77, budget: 48000000, colors: ["#870a28", "#006633"], stadium: { name: "Laranjeiras Maracanã", capacity: 78800 } },
      { id: "internacional", name: "Internacional Colorado", ovr: 77, budget: 46000000, colors: ["#e30613", "#ffffff"], stadium: { name: "Beira-Rio", capacity: 50800 } },
      { id: "gremio_pa", name: "Grêmio Imortal", ovr: 76, budget: 45000000, colors: ["#0d80bf", "#111827"], stadium: { name: "Arena do Grêmio", capacity: 55600 } },
      { id: "cruzeiro_bh", name: "Cruzeiro Celeste", ovr: 76, budget: 44000000, colors: ["#003399", "#ffffff"], stadium: { name: "Mineirão Celeste", capacity: 61800 } },
      { id: "vasco_rj", name: "Vasco da Gama", ovr: 75, budget: 40000000, colors: ["#111827", "#ffffff"], stadium: { name: "São Januário", capacity: 21800 } },
      { id: "santos_fc", name: "Santos Peixe", ovr: 75, budget: 38000000, colors: ["#ffffff", "#111827"], stadium: { name: "Vila Belmiro", capacity: 16000 } },
      { id: "bahia_ec", name: "EC Bahia Tricolor", ovr: 75, budget: 42000000, colors: ["#1d4ed8", "#dc2626"], stadium: { name: "Arena Fonte Nova", capacity: 47900 } },
      { id: "fortaleza_ec", name: "Fortaleza Leão", ovr: 75, budget: 36000000, colors: ["#1d4ed8", "#dc2626"], stadium: { name: "Arena Castelão", capacity: 63900 } },
      { id: "athletico_pr", name: "Athletico Paranaense", ovr: 75, budget: 37000000, colors: ["#dc2626", "#111827"], stadium: { name: "Ligga Arena Curitiba", capacity: 42300 } },
      { id: "bragantino", name: "RB Bragantino", ovr: 74, budget: 39000000, colors: ["#ffffff", "#dc2626"], stadium: { name: "Nabi Abi Chedid", capacity: 15000 } }
    ]
  },
  {
    id: "arg_1",
    name: "Liga Profesional Argentina",
    country: "Argentina",
    flag: "🇦🇷",
    continent: "Sudamérica",
    tier: 1,
    childLeagueId: "arg_2",
    clubs: [
      { id: "river_plate", name: "River Millonario", ovr: 80, budget: 64000000, colors: ["#ffffff", "#e30613"], stadium: { name: "Más Monumental", capacity: 84500 } },
      { id: "boca_juniors", name: "Boca Xeneize", ovr: 79, budget: 62000000, colors: ["#003399", "#facc15"], stadium: { name: "La Bombonera", capacity: 54000 } },
      { id: "racing_av", name: "Racing Academia", ovr: 78, budget: 46000000, colors: ["#6cabdd", "#ffffff"], stadium: { name: "Cilindro de Avellaneda", capacity: 51300 } },
      { id: "estudiantes", name: "Estudiantes León", ovr: 77, budget: 40000000, colors: ["#e11d48", "#ffffff"], stadium: { name: "Estadio UNO", capacity: 32500 } },
      { id: "velez_sar", name: "Vélez Fortín", ovr: 76, budget: 36000000, colors: ["#ffffff", "#1d4ed8"], stadium: { name: "José Amalfitani", capacity: 49500 } },
      { id: "talleres_cba", name: "Talleres Córdoba", ovr: 76, budget: 35000000, colors: ["#1e3a8a", "#ffffff"], stadium: { name: "Mario Alberto Kempes", capacity: 57000 } },
      { id: "independiente", name: "Independiente Rojo", ovr: 75, budget: 34000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Libertadores de América", capacity: 48300 } },
      { id: "san_lorenzo", name: "San Lorenzo Ciclón", ovr: 75, budget: 32000000, colors: ["#1e3a8a", "#dc2626"], stadium: { name: "Nuevo Gasómetro", capacity: 47900 } },
      { id: "rosario_cen", name: "Rosario Central", ovr: 74, budget: 30000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Gigante de Arroyito", capacity: 41400 } },
      { id: "newells_ob", name: "Newell's Lepra", ovr: 74, budget: 28000000, colors: ["#dc2626", "#111827"], stadium: { name: "Coloso Marcelo Bielsa", capacity: 42000 } },
      { id: "lanus_ca", name: "Lanús Granate", ovr: 74, budget: 28000000, colors: ["#7f1d1d", "#ffffff"], stadium: { name: "Ciudad de Lanús", capacity: 47000 } },
      { id: "argentinos_jr", name: "Argentinos Bicho", ovr: 73, budget: 26000000, colors: ["#e11d48", "#ffffff"], stadium: { name: "Diego Armando Maradona", capacity: 26000 } },
      { id: "huracan_ca", name: "Huracán Globo", ovr: 73, budget: 25000000, colors: ["#ffffff", "#dc2626"], stadium: { name: "Tomás Adolfo Ducó", capacity: 48300 } },
      { id: "defensa_jus", name: "Defensa y Justicia", ovr: 73, budget: 24000000, colors: ["#facc15", "#15803d"], stadium: { name: "Norberto Tomaghello", capacity: 20000 } },
      { id: "belgrano_cba", name: "Belgrano Pirata", ovr: 72, budget: 23000000, colors: ["#38bdf8", "#ffffff"], stadium: { name: "Gigante de Alberdi", capacity: 34800 } },
      { id: "godoy_cruz", name: "Godoy Cruz Mendoza", ovr: 72, budget: 22000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Feliciano Gambarte", capacity: 21000 } }
    ]
  },
  {
    id: "col_1",
    name: "Liga BetPlay Colombia",
    country: "Colombia",
    flag: "🇨🇴",
    continent: "Sudamérica",
    tier: 1,
    childLeagueId: "col_2",
    clubs: [
      { id: "atl_nacional", name: "Atlético Nacional", ovr: 77, budget: 38000000, colors: ["#008f39", "#ffffff"], stadium: { name: "Atanasio Girardot Verde", capacity: 44800 } },
      { id: "millonarios", name: "Millonarios Azul", ovr: 77, budget: 36000000, colors: ["#003399", "#ffffff"], stadium: { name: "El Campín Embajador", capacity: 39500 } },
      { id: "america_cali", name: "América Escarlata", ovr: 76, budget: 34000000, colors: ["#e30613", "#ffffff"], stadium: { name: "Pascual Guerrero", capacity: 38500 } },
      { id: "junior_baq", name: "Junior Tiburón", ovr: 76, budget: 35000000, colors: ["#e11d48", "#ffffff"], stadium: { name: "Metropolitano Roberto Meléndez", capacity: 46600 } },
      { id: "ind_medellin", name: "Independiente Medellín", ovr: 75, budget: 30000000, colors: ["#dc2626", "#1d4ed8"], stadium: { name: "Atanasio Poderoso", capacity: 44800 } },
      { id: "dep_tolima", name: "Deportes Tolima", ovr: 75, budget: 28000000, colors: ["#7f1d1d", "#facc15"], stadium: { name: "Manuel Murillo Toro", capacity: 28100 } },
      { id: "santa_fe", name: "Santa Fe Cardenal", ovr: 74, budget: 27000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "El Campín Cardenal", capacity: 39500 } },
      { id: "dep_cali", name: "Deportivo Cali", ovr: 74, budget: 26000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Estadio Palmaseca", capacity: 44000 } },
      { id: "once_caldas", name: "Once Caldas Blanco", ovr: 73, budget: 24000000, colors: ["#ffffff", "#111827"], stadium: { name: "Palogrande Manizales", capacity: 31600 } },
      { id: "bucaramanga", name: "Atlético Bucaramanga", ovr: 73, budget: 23000000, colors: ["#facc15", "#15803d"], stadium: { name: "Américo Montanini", capacity: 28000 } },
      { id: "dep_pereira", name: "Deportivo Pereira", ovr: 73, budget: 22000000, colors: ["#facc15", "#dc2626"], stadium: { name: "Hernán Ramírez Villegas", capacity: 30300 } },
      { id: "aguilas_dor", name: "Águilas Doradas", ovr: 72, budget: 20000000, colors: ["#eab308", "#111827"], stadium: { name: "Alberto Grisales", capacity: 14000 } },
      { id: "la_equidad", name: "La Equidad Seguros", ovr: 71, budget: 19000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Metropolitano de Techo", capacity: 10000 } },
      { id: "dep_pasto", name: "Deportivo Pasto Volcán", ovr: 71, budget: 18500000, colors: ["#dc2626", "#1e3a8a"], stadium: { name: "Departamental Libertad", capacity: 20000 } },
      { id: "fortaleza_ce", name: "Fortaleza CEIF Bogotá", ovr: 70, budget: 17500000, colors: ["#1d4ed8", "#dc2626"], stadium: { name: "Estadio de Techo Norte", capacity: 10000 } },
      { id: "alianza_val", name: "Alianza Valledupar", ovr: 70, budget: 17000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Armando Maestre", capacity: 11500 } }
    ]
  },

  // ==================== SEGUNDAS DIVISIONES (8 LIGAS x 12 EQUIPOS = 96 CLUBES) ====================
  {
    id: "esp_2",
    name: "Segunda División Ibérica",
    country: "España",
    flag: "🇪🇸",
    continent: "Europa",
    tier: 2,
    parentLeagueId: "esp_1",
    clubs: [
      { id: "espanyol_bcn", name: "RCD Pericos Barcelona", ovr: 73, budget: 24000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Stage Front Cornellà", capacity: 40000 } },
      { id: "real_zaragoza", name: "Real Zaragoza Maño", ovr: 72, budget: 20000000, colors: ["#ffffff", "#1d4ed8"], stadium: { name: "La Romareda", capacity: 33600 } },
      { id: "sporting_gij", name: "Sporting Gijón", ovr: 72, budget: 19000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "El Molinón", capacity: 29000 } },
      { id: "real_oviedo", name: "Real Oviedo Azul", ovr: 72, budget: 19500000, colors: ["#1e3a8a", "#ffffff"], stadium: { name: "Carlos Tartiere", capacity: 30500 } },
      { id: "deportivo_cor", name: "Deportivo Coruña", ovr: 71, budget: 18500000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Abanca-Riazor", capacity: 32400 } },
      { id: "levante_ud", name: "Levante Granota", ovr: 72, budget: 21000000, colors: ["#9f1f33", "#1e3a8a"], stadium: { name: "Ciutat de València", capacity: 26300 } },
      { id: "granada_cf", name: "Granada Nazarí", ovr: 72, budget: 22000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Nuevo Los Cármenes", capacity: 19300 } },
      { id: "cadiz_cf", name: "Cádiz Submarino", ovr: 72, budget: 21000000, colors: ["#facc15", "#1d4ed8"], stadium: { name: "Nuevo Mirandilla", capacity: 21000 } },
      { id: "elche_cf", name: "Elche Franjiverde", ovr: 71, budget: 18000000, colors: ["#ffffff", "#15803d"], stadium: { name: "Martínez Valero", capacity: 31300 } },
      { id: "sd_eibar", name: "SD Eibar Armero", ovr: 71, budget: 17500000, colors: ["#9f1f33", "#1e3a8a"], stadium: { name: "Municipal de Ipurúa", capacity: 8100 } },
      { id: "tenerife_cd", name: "CD Tenerife Isla", ovr: 70, budget: 16500000, colors: ["#ffffff", "#1d4ed8"], stadium: { name: "Heliodoro Rodríguez", capacity: 22800 } },
      { id: "racing_sant", name: "Racing Santander", ovr: 71, budget: 17000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Campos de Sport Sardinero", capacity: 22200 } }
    ]
  },
  {
    id: "eng_2",
    name: "Championship Británica",
    country: "Inglaterra",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    continent: "Europa",
    tier: 2,
    parentLeagueId: "eng_1",
    clubs: [
      { id: "leeds_utd", name: "Leeds United Whites", ovr: 75, budget: 44000000, colors: ["#ffffff", "#facc15"], stadium: { name: "Elland Road", capacity: 37600 } },
      { id: "leicester_fx", name: "Leicester Foxes", ovr: 75, budget: 45000000, colors: ["#003090", "#ffffff"], stadium: { name: "King Power Stadium", capacity: 32200 } },
      { id: "southampton", name: "Southampton Saints", ovr: 74, budget: 40000000, colors: ["#d71920", "#ffffff"], stadium: { name: "St Mary's Stadium", capacity: 32300 } },
      { id: "burnley_fc", name: "Burnley Clarets", ovr: 74, budget: 38000000, colors: ["#6c1d45", "#99d6ea"], stadium: { name: "Turf Moor", capacity: 21900 } },
      { id: "sheffield_u", name: "Sheffield Blades", ovr: 73, budget: 34000000, colors: ["#ee2737", "#111827"], stadium: { name: "Bramall Lane", capacity: 32000 } },
      { id: "norwich_city", name: "Norwich Canaries", ovr: 73, budget: 30000000, colors: ["#fff200", "#00a650"], stadium: { name: "Carrow Road", capacity: 27300 } },
      { id: "middlesbrough", name: "Middlesbrough Boro", ovr: 73, budget: 29000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Riverside Stadium", capacity: 34700 } },
      { id: "west_brom", name: "West Bromwich Albion", ovr: 72, budget: 28000000, colors: ["#122f67", "#ffffff"], stadium: { name: "The Hawthorns", capacity: 26800 } },
      { id: "sunderland_a", name: "Sunderland Black Cats", ovr: 73, budget: 31000000, colors: ["#eb172b", "#ffffff"], stadium: { name: "Stadium of Light", capacity: 49000 } },
      { id: "coventry_c", name: "Coventry Sky Blues", ovr: 72, budget: 26000000, colors: ["#38bdf8", "#ffffff"], stadium: { name: "Coventry Building Arena", capacity: 32600 } },
      { id: "watford_fc", name: "Watford Hornets", ovr: 72, budget: 27000000, colors: ["#fbee23", "#ed2127"], stadium: { name: "Vicarage Road", capacity: 22200 } },
      { id: "stoke_city", name: "Stoke Potters", ovr: 71, budget: 25000000, colors: ["#e03a3e", "#ffffff"], stadium: { name: "bet365 Stadium", capacity: 30000 } }
    ]
  },
  {
    id: "ita_2",
    name: "Serie B Italiana",
    country: "Italia",
    flag: "🇮🇹",
    continent: "Europa",
    tier: 2,
    parentLeagueId: "ita_1",
    clubs: [
      { id: "sampdoria", name: "Sampdoria Blucerchiati", ovr: 72, budget: 24000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Marassi Sud", capacity: 36500 } },
      { id: "palermo_fc", name: "Palermo Rosanero", ovr: 72, budget: 26000000, colors: ["#f472b6", "#111827"], stadium: { name: "Renzo Barbera", capacity: 36300 } },
      { id: "sassuolo_c", name: "Sassuolo Neroverdi", ovr: 73, budget: 28000000, colors: ["#15803d", "#111827"], stadium: { name: "Mapei Stadium", capacity: 21500 } },
      { id: "cremonese", name: "US Cremonese", ovr: 72, budget: 22000000, colors: ["#dc2626", "#64748b"], stadium: { name: "Giovanni Zini", capacity: 16000 } },
      { id: "spezia_cal", name: "Spezia Aquile", ovr: 71, budget: 20000000, colors: ["#ffffff", "#111827"], stadium: { name: "Alberto Picco", capacity: 11500 } },
      { id: "bari_ssc", name: "SSC Bari Galletti", ovr: 71, budget: 21000000, colors: ["#ffffff", "#dc2626"], stadium: { name: "Stadio San Nicola", capacity: 58200 } },
      { id: "brescia_c", name: "Brescia Rondinelle", ovr: 71, budget: 19000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Mario Rigamonti", capacity: 19500 } },
      { id: "pisa_sc", name: "Pisa Sporting", ovr: 71, budget: 19500000, colors: ["#1e3a8a", "#111827"], stadium: { name: "Arena Garibaldi", capacity: 14800 } },
      { id: "salernitana", name: "Salernitana Granata", ovr: 72, budget: 22000000, colors: ["#7f1d1d", "#ffffff"], stadium: { name: "Stadio Arechi", capacity: 37000 } },
      { id: "frosinone", name: "Frosinone Ciociaria", ovr: 71, budget: 20000000, colors: ["#facc15", "#1d4ed8"], stadium: { name: "Benito Stirpe", capacity: 16200 } },
      { id: "modena_fc", name: "Modena Canarini", ovr: 70, budget: 18000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Alberto Braglia", capacity: 21100 } },
      { id: "catanzaro", name: "US Catanzaro", ovr: 70, budget: 17500000, colors: ["#dc2626", "#facc15"], stadium: { name: "Nicola Ceravolo", capacity: 14600 } }
    ]
  },
  {
    id: "ger_2",
    name: "2. Bundesliga Germana",
    country: "Alemania",
    flag: "🇩🇪",
    continent: "Europa",
    tier: 2,
    parentLeagueId: "ger_1",
    clubs: [
      { id: "hamburger_sv", name: "Hamburgo SV", ovr: 73, budget: 28000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Volksparkstadion", capacity: 57000 } },
      { id: "schalke_04", name: "FC Schalke 04", ovr: 73, budget: 27000000, colors: ["#1e3a8a", "#ffffff"], stadium: { name: "Veltins-Arena", capacity: 62200 } },
      { id: "fc_koln", name: "1. FC Colonia", ovr: 73, budget: 29000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "RheinEnergieStadion", capacity: 50000 } },
      { id: "hertha_bsc", name: "Hertha BSC Berlín", ovr: 72, budget: 26000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Olympiastadion Berlín", capacity: 74400 } },
      { id: "fortuna_dus", name: "Fortuna Düsseldorf", ovr: 72, budget: 24000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Merkur Spiel-Arena", capacity: 54600 } },
      { id: "hannover_96", name: "Hannover 96", ovr: 71, budget: 22000000, colors: ["#15803d", "#111827"], stadium: { name: "Heinz von Heiden Arena", capacity: 49000 } },
      { id: "nurnberg_fc", name: "1. FC Núremberg", ovr: 71, budget: 21000000, colors: ["#991b1b", "#111827"], stadium: { name: "Max-Morlock-Stadion", capacity: 50000 } },
      { id: "kaiserslautern", name: "1. FC Kaiserslautern", ovr: 71, budget: 20000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Fritz-Walter-Stadion", capacity: 49800 } },
      { id: "karlsruher", name: "Karlsruher SC", ovr: 71, budget: 19500000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "BBBank Wildpark", capacity: 34000 } },
      { id: "paderborn_07", name: "SC Paderborn 07", ovr: 70, budget: 18500000, colors: ["#1d4ed8", "#111827"], stadium: { name: "Home Deluxe Arena", capacity: 15000 } },
      { id: "greuther_f", name: "Greuther Fürth", ovr: 70, budget: 18000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Sportpark Ronhof", capacity: 16600 } },
      { id: "magdeburg", name: "1. FC Magdeburgo", ovr: 70, budget: 18000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Avnet Arena", capacity: 30000 } }
    ]
  },
  {
    id: "fra_2",
    name: "Ligue 2 Hexagone",
    country: "Francia",
    flag: "🇫🇷",
    continent: "Europa",
    tier: 2,
    parentLeagueId: "fra_1",
    clubs: [
      { id: "bordeaux_fc", name: "Girondins Burdeos", ovr: 72, budget: 23000000, colors: ["#1e3a8a", "#ffffff"], stadium: { name: "Matmut Atlantique", capacity: 42100 } },
      { id: "metz_fc", name: "FC Metz Lorena", ovr: 72, budget: 22000000, colors: ["#7f1d1d", "#ffffff"], stadium: { name: "Saint-Symphorien", capacity: 28700 } },
      { id: "lorient_fc", name: "FC Lorient Merluzas", ovr: 72, budget: 22500000, colors: ["#f97316", "#111827"], stadium: { name: "Stade du Moustoir", capacity: 18500 } },
      { id: "caen_sm", name: "SM Caen Normandía", ovr: 71, budget: 19000000, colors: ["#dc2626", "#1e3a8a"], stadium: { name: "Michel d'Ornano", capacity: 20300 } },
      { id: "paris_fc", name: "Paris FC Capital", ovr: 71, budget: 21000000, colors: ["#1e3a8a", "#38bdf8"], stadium: { name: "Stade Charléty", capacity: 19100 } },
      { id: "guingamp_ea", name: "EA Guingamp", ovr: 70, budget: 18000000, colors: ["#dc2626", "#111827"], stadium: { name: "Stade de Roudourou", capacity: 19000 } },
      { id: "bastia_sc", name: "SC Bastia Córcega", ovr: 70, budget: 17500000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Armand Cesari", capacity: 16000 } },
      { id: "sochaux_fc", name: "FC Sochaux León", ovr: 70, budget: 17500000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Auguste Bonal", capacity: 20000 } },
      { id: "grenoble_f", name: "Grenoble Foot Alpes", ovr: 70, budget: 17000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Stade des Alpes", capacity: 20000 } },
      { id: "amiens_sc", name: "Amiens SC Picardía", ovr: 70, budget: 17000000, colors: ["#ffffff", "#111827"], stadium: { name: "Stade de la Licorne", capacity: 12000 } },
      { id: "troyes_es", name: "ESTAC Troyes", ovr: 70, budget: 18000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Stade de l'Aube", capacity: 20400 } },
      { id: "ajaccio_ac", name: "AC Ajaccio", ovr: 69, budget: 16000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Michel Moretti", capacity: 10600 } }
    ]
  },
  {
    id: "bra_2",
    name: "Brasileirão Série B",
    country: "Brasil",
    flag: "🇧🇷",
    continent: "Sudamérica",
    tier: 2,
    parentLeagueId: "bra_1",
    clubs: [
      { id: "sport_recife", name: "Sport Recife Leão", ovr: 73, budget: 24000000, colors: ["#dc2626", "#111827"], stadium: { name: "Ilha do Retiro", capacity: 32900 } },
      { id: "coritiba_fc", name: "Coritiba Coxa", ovr: 73, budget: 23000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Couto Pereira", capacity: 40500 } },
      { id: "ceara_sc", name: "Ceará Vozão", ovr: 72, budget: 22000000, colors: ["#111827", "#ffffff"], stadium: { name: "Presidente Vargas CE", capacity: 20200 } },
      { id: "goias_ec", name: "Goiás Esmeraldino", ovr: 72, budget: 21000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Estádio da Serrinha", capacity: 14500 } },
      { id: "america_mg", name: "América Mineiro", ovr: 72, budget: 21500000, colors: ["#15803d", "#111827"], stadium: { name: "Independência BH", capacity: 23000 } },
      { id: "vitoria_ba", name: "EC Vitória Salvador", ovr: 72, budget: 22000000, colors: ["#dc2626", "#111827"], stadium: { name: "Barradão Salvador", capacity: 30600 } },
      { id: "criciuma_ec", name: "Criciúma Tigre", ovr: 71, budget: 19000000, colors: ["#facc15", "#111827"], stadium: { name: "Heriberto Hülse", capacity: 19200 } },
      { id: "avai_fc", name: "Avaí Leão da Ilha", ovr: 71, budget: 18500000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Ressacada", capacity: 17800 } },
      { id: "guarani_fc", name: "Guarani Campinas", ovr: 70, budget: 17500000, colors: ["#15803d", "#ffffff"], stadium: { name: "Brinco de Ouro", capacity: 29100 } },
      { id: "ponte_preta", name: "Ponte Preta Macaca", ovr: 70, budget: 17500000, colors: ["#111827", "#ffffff"], stadium: { name: "Moisés Lucarelli", capacity: 19700 } },
      { id: "juventude_ec", name: "EC Juventude Caxias", ovr: 71, budget: 18500000, colors: ["#15803d", "#ffffff"], stadium: { name: "Alfredo Jaconi", capacity: 19900 } },
      { id: "cuiaba_ec", name: "Cuiabá Dourado", ovr: 72, budget: 20500000, colors: ["#15803d", "#facc15"], stadium: { name: "Arena Pantanal", capacity: 44000 } }
    ]
  },
  {
    id: "arg_2",
    name: "Primera Nacional Argentina",
    country: "Argentina",
    flag: "🇦🇷",
    continent: "Sudamérica",
    tier: 2,
    parentLeagueId: "arg_1",
    clubs: [
      { id: "colon_sf", name: "Colón Sabalero", ovr: 71, budget: 19000000, colors: ["#dc2626", "#111827"], stadium: { name: "Cementerio de Elefantes", capacity: 40000 } },
      { id: "union_sf", name: "Unión Tatengue", ovr: 71, budget: 18500000, colors: ["#dc2626", "#ffffff"], stadium: { name: "15 de Abril", capacity: 27000 } },
      { id: "banfield_ca", name: "Banfield Taladro", ovr: 71, budget: 18500000, colors: ["#15803d", "#ffffff"], stadium: { name: "Florencio Sola", capacity: 34900 } },
      { id: "ferro_carril", name: "Ferro Carril Oeste", ovr: 70, budget: 16500000, colors: ["#15803d", "#ffffff"], stadium: { name: "Arquitecto Etcheverri", capacity: 24400 } },
      { id: "quilmes_ac", name: "Quilmes Cervecero", ovr: 70, budget: 16500000, colors: ["#ffffff", "#1e3a8a"], stadium: { name: "Estadio Centenario QAC", capacity: 30200 } },
      { id: "chacarita_jr", name: "Chacarita Funebrero", ovr: 70, budget: 16000000, colors: ["#dc2626", "#111827"], stadium: { name: "Villa Maipú", capacity: 20800 } },
      { id: "san_martin_t", name: "San Martín Tucumán", ovr: 70, budget: 17000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "La Ciudadela", capacity: 30500 } },
      { id: "atl_tucuman", name: "Atlético Tucumán", ovr: 71, budget: 18000000, colors: ["#38bdf8", "#ffffff"], stadium: { name: "Monumental José Fierro", capacity: 35200 } },
      { id: "tigre_ca", name: "CA Tigre Victoria", ovr: 71, budget: 18500000, colors: ["#1d4ed8", "#dc2626"], stadium: { name: "José Dellagiovanna", capacity: 26200 } },
      { id: "platense_ca", name: "CA Platense Calamar", ovr: 70, budget: 17000000, colors: ["#78350f", "#ffffff"], stadium: { name: "Ciudad de Vicente López", capacity: 28500 } },
      { id: "instituto_cba", name: "Instituto Gloria", ovr: 71, budget: 18000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Juan Domingo Perón CBA", capacity: 26000 } },
      { id: "gimnasia_lp", name: "Gimnasia Lobo LP", ovr: 71, budget: 18000000, colors: ["#ffffff", "#1e3a8a"], stadium: { name: "Juan Carmelo Zerillo", capacity: 24500 } }
    ]
  },
  {
    id: "col_2",
    name: "Torneo Ascenso Colombia",
    country: "Colombia",
    flag: "🇨🇴",
    continent: "Sudamérica",
    tier: 2,
    parentLeagueId: "col_1",
    clubs: [
      { id: "cucuta_dep", name: "Cúcuta Motilón", ovr: 69, budget: 14500000, colors: ["#dc2626", "#111827"], stadium: { name: "General Santander", capacity: 42000 } },
      { id: "real_cartagena", name: "Real Cartagena Heroico", ovr: 69, budget: 15000000, colors: ["#facc15", "#15803d"], stadium: { name: "Jaime Morón León", capacity: 16000 } },
      { id: "union_magd", name: "Unión Magdalena Ciclón", ovr: 69, budget: 14000000, colors: ["#dc2626", "#1d4ed8"], stadium: { name: "Sierra Nevada Santa Marta", capacity: 16000 } },
      { id: "envigado_fc", name: "Envigado Cantera", ovr: 69, budget: 14500000, colors: ["#f97316", "#15803d"], stadium: { name: "Polideportivo Sur", capacity: 14000 } },
      { id: "patriotas_boy", name: "Patriotas Boyacá", ovr: 68, budget: 13000000, colors: ["#dc2626", "#15803d"], stadium: { name: "La Independencia Tunja", capacity: 20600 } },
      { id: "boyaca_chico", name: "Boyacá Chicó Ajedrez", ovr: 68, budget: 13000000, colors: ["#111827", "#ffffff"], stadium: { name: "Estadio Tunja Norte", capacity: 20600 } },
      { id: "jaguares_cor", name: "Jaguares Córdoba", ovr: 68, budget: 13500000, colors: ["#38bdf8", "#1e3a8a"], stadium: { name: "Jaraguay Montería", capacity: 12000 } },
      { id: "deportes_quin", name: "Deportes Quindío", ovr: 68, budget: 13500000, colors: ["#15803d", "#facc15"], stadium: { name: "Centenario de Armenia", capacity: 20700 } },
      { id: "atletico_huila", name: "Atlético Huila Opita", ovr: 68, budget: 13000000, colors: ["#facc15", "#15803d"], stadium: { name: "Guillermo Plazas Alcid", capacity: 12000 } },
      { id: "cortulua_int", name: "Internacional Palmira", ovr: 67, budget: 12000000, colors: ["#dc2626", "#15803d"], stadium: { name: "Francisco Rivera Escobar", capacity: 15300 } },
      { id: "llaneros_fc", name: "Llaneros Villavicencio", ovr: 68, budget: 13500000, colors: ["#111827", "#facc15"], stadium: { name: "Bello Horizonte Rey Pelé", capacity: 15000 } },
      { id: "tigres_bog", name: "Tigres FC Soacha", ovr: 67, budget: 12000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Metropolitano Sur Techo", capacity: 10000 } }
    ]
  },

  // ==================== RESTO DEL MUNDO (24 CLUBES INVITADOS) ====================
  {
    id: "row_1",
    name: "Resto del Mundo Élite",
    country: "Internacional",
    flag: "🌍",
    continent: "Mundial",
    tier: 0,
    clubs: [
      { id: "celtic_gla", name: "Celtic Glasgow", ovr: 77, budget: 48000000, colors: ["#15803d", "#ffffff"], stadium: { name: "Celtic Park", capacity: 60400 } },
      { id: "rangers_gla", name: "Rangers Glasgow", ovr: 77, budget: 46000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Ibrox Stadium", capacity: 50800 } },
      { id: "galatasaray", name: "Galatasaray Estambul", ovr: 79, budget: 64000000, colors: ["#a90432", "#fdb912"], stadium: { name: "RAMS Park Bósforo", capacity: 52200 } },
      { id: "fenerbahce", name: "Fenerbahçe Canarios", ovr: 79, budget: 62000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Şükrü Saracoğlu", capacity: 47800 } },
      { id: "besiktas_jk", name: "Beşiktaş Águilas", ovr: 77, budget: 50000000, colors: ["#111827", "#ffffff"], stadium: { name: "Tüpraş Stadyumu", capacity: 42500 } },
      { id: "club_brugge", name: "Club Brujas Flandes", ovr: 77, budget: 48000000, colors: ["#1d4ed8", "#111827"], stadium: { name: "Jan Breydel", capacity: 29000 } },
      { id: "anderlecht", name: "RSC Anderlecht", ovr: 76, budget: 42000000, colors: ["#5b21b6", "#ffffff"], stadium: { name: "Lotto Park Bruselas", capacity: 22500 } },
      { id: "rb_salzburg", name: "RB Salzburgo", ovr: 77, budget: 54000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Red Bull Arena Austria", capacity: 30100 } },
      { id: "shakhtar_d", name: "Shakhtar Mineros", ovr: 76, budget: 46000000, colors: ["#f97316", "#111827"], stadium: { name: "Arena Lviv", capacity: 34900 } },
      { id: "olympiacos", name: "Olympiacos Pireo", ovr: 76, budget: 44000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Georgios Karaiskakis", capacity: 33300 } },
      { id: "dinamo_zag", name: "Dinamo Zagreb", ovr: 75, budget: 36000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Stadion Maksimir", capacity: 25900 } },
      { id: "young_boys", name: "BSC Young Boys Berna", ovr: 75, budget: 35000000, colors: ["#facc15", "#111827"], stadium: { name: "Stadion Wankdorf", capacity: 31500 } },
      { id: "inter_miami", name: "Inter Miami Garzas", ovr: 77, budget: 65000000, colors: ["#f472b6", "#111827"], stadium: { name: "Chase Stadium Florida", capacity: 21500 } },
      { id: "la_galaxy", name: "LA Galaxy Cosmos", ovr: 75, budget: 48000000, colors: ["#ffffff", "#1e3a8a"], stadium: { name: "Dignity Health Park", capacity: 27000 } },
      { id: "club_america", name: "Club América Águilas", ovr: 77, budget: 52000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Estadio Azteca", capacity: 83200 } },
      { id: "monterrey_cf", name: "CF Monterrey Rayados", ovr: 76, budget: 50000000, colors: ["#1e3a8a", "#ffffff"], stadium: { name: "Estadio BBVA", capacity: 53500 } },
      { id: "tigres_uanl", name: "Tigres UANL Felinos", ovr: 76, budget: 48000000, colors: ["#facc15", "#1d4ed8"], stadium: { name: "Estadio Universitario", capacity: 42000 } },
      { id: "penarol_mvd", name: "Peñarol Carbonero", ovr: 75, budget: 28000000, colors: ["#facc15", "#111827"], stadium: { name: "Campeón del Siglo", capacity: 40700 } },
      { id: "nacional_mvd", name: "Nacional Bolso", ovr: 75, budget: 28000000, colors: ["#ffffff", "#1e3a8a"], stadium: { name: "Gran Parque Central", capacity: 34000 } },
      { id: "colo_colo", name: "Colo-Colo Cacique", ovr: 75, budget: 27000000, colors: ["#ffffff", "#111827"], stadium: { name: "Monumental David Arellano", capacity: 43600 } },
      { id: "ldu_quito", name: "LDU Quito Rey", ovr: 75, budget: 26000000, colors: ["#ffffff", "#dc2626"], stadium: { name: "Rodrigo Paz Delgado", capacity: 41500 } },
      { id: "al_hilal_riy", name: "Al-Hilal Riad", ovr: 80, budget: 140000000, colors: ["#1d4ed8", "#ffffff"], stadium: { name: "Kingdom Arena Riad", capacity: 26000 } },
      { id: "al_nassr_riy", name: "Al-Nassr Najd", ovr: 79, budget: 130000000, colors: ["#facc15", "#1e3a8a"], stadium: { name: "Al-Awwal Park", capacity: 25000 } },
      { id: "al_ahly_cai", name: "Al Ahly El Cairo", ovr: 75, budget: 34000000, colors: ["#dc2626", "#ffffff"], stadium: { name: "Estadio Internacional Cairo", capacity: 75000 } }
    ]
  }
];

export const NATIONALITIES_CATALOG = {
  ESP: { code: "ESP", name: "España", flag: "🇪🇸" },
  ENG: { code: "ENG", name: "Inglaterra", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  ITA: { code: "ITA", name: "Italia", flag: "🇮🇹" },
  GER: { code: "GER", name: "Alemania", flag: "🇩🇪" },
  FRA: { code: "FRA", name: "Francia", flag: "🇫🇷" },
  POR: { code: "POR", name: "Portugal", flag: "🇵🇹" },
  NED: { code: "NED", name: "Países Bajos", flag: "🇳🇱" },
  BRA: { code: "BRA", name: "Brasil", flag: "🇧🇷" },
  ARG: { code: "ARG", name: "Argentina", flag: "🇦🇷" },
  COL: { code: "COL", name: "Colombia", flag: "🇨🇴" },
  URU: { code: "URU", name: "Uruguay", flag: "🇺🇾" },
  BEL: { code: "BEL", name: "Bélgica", flag: "🇧🇪" }
};

const NATIONALITY_NAME_POOLS = {
  ESP: {
    first: [
      "Alejandro", "Carlos", "Javier", "Pablo", "Álvaro", "Diego", "Dani", "Marco", "Hugo", "Sergio",
      "Iker", "Unai", "Mikel", "Gavi", "Pedri", "Nico", "Ferran", "Rodrigo", "Martín", "Adrián",
      "Raúl", "Borja", "Aitor", "Yeray", "Álex", "César", "Gonzalo", "Pau", "Joan", "Marc",
      "Oriol", "Gerard", "Iñaki", "Oihan", "Gorka", "Brais", "Iago", "Lamine", "Fermín", "Brahim"
    ],
    last: [
      "García", "Rodríguez", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández", "Ruiz", "Díaz",
      "Moreno", "Muñoz", "Álvarez", "Romero", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil",
      "Serrano", "Molina", "Blanco", "Suárez", "Morales", "Ortega", "Delgado", "Castro", "Ortiz", "Rubio",
      "Zubimendi", "Merino", "Williams", "Sancet", "Olmo", "Carvajal", "Grimaldo", "Cucurella", "Baena", "Oyarzabal"
    ]
  },
  ENG: {
    first: [
      "Harry", "Jude", "Bukayo", "Phil", "Declan", "Cole", "Marcus", "Trent", "Jack", "Ollie",
      "Mason", "James", "Callum", "Liam", "Noah", "Ethan", "Alfie", "George", "Oliver", "Charlie",
      "Ben", "Luke", "Jordan", "Kyle", "John", "Reece", "Harvey", "Curtis", "Jarrod", "Anthony",
      "Eberechi", "Morgan", "Kieran", "Conor", "Kobbie", "Ezri", "Rico", "Levi", "Jarrad", "Dominic"
    ],
    last: [
      "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Robinson", "Wright",
      "Thompson", "Evans", "Walker", "White", "Roberts", "Green", "Hall", "Wood", "Jackson", "Clarke",
      "Bellingham", "Foden", "Saka", "Rice", "Palmer", "Kane", "Watkins", "Bowen", "Gordon", "Stones",
      "Grealish", "Rashford", "Shaw", "Trippier", "Pickford", "Maddison", "Eze", "Guehi", "Mainoo", "Solanke"
    ]
  },
  ITA: {
    first: [
      "Gianluigi", "Nicolò", "Federico", "Alessandro", "Lorenzo", "Andrea", "Marco", "Matteo", "Davide", "Simone",
      "Riccardo", "Giacomo", "Francesco", "Luca", "Mattia", "Filippo", "Leonardo", "Tommaso", "Edoardo", "Pietro",
      "Gabriele", "Samuele", "Cristian", "Giorgio", "Alessio", "Manuel", "Domenico", "Gianluca", "Stefano", "Roberto",
      "Ciro", "Sandro", "Destiny", "Andrea", "Niccolò", "Matteo", "Guglielmo", "Raoul", "Michael", "Daniel"
    ],
    last: [
      "Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco",
      "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti",
      "Barella", "Bastoni", "Dimarco", "Chiesa", "Donnarumma", "Calafiori", "Pellegrini", "Frattesi", "Tonali", "Scalvini",
      "Buongiorno", "Cambiaso", "Raspadori", "Scamacca", "Retegui", "Zaccagni", "Di Lorenzo", "Locatelli", "Jorginho", "Acerbi"
    ]
  },
  GER: {
    first: [
      "Jamal", "Florian", "Joshua", "Kai", "Leroy", "Ilkay", "Antonio", "Manuel", "Marc-André", "Nico",
      "Jonathan", "David", "Robert", "Pascal", "Benjamin", "Maximilian", "Julian", "Leon", "Serge", "Timo",
      "Lukas", "Jonas", "Felix", "Moritz", "Tim", "Jan", "Niclas", "Karim", "Deniz", "Chris",
      "Aleksandar", "Angelo", "Maximilian", "Waldemar", "Robin", "Bastian", "Mario", "Nadiem", "Kevin", "Niklas"
    ],
    last: [
      "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann",
      "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann",
      "Musiala", "Wirtz", "Kimmich", "Havertz", "Sané", "Gündogan", "Rüdiger", "Neuer", "Ter Stegen", "Schlotterbeck",
      "Tah", "Raum", "Andrich", "Groß", "Henrichs", "Mittelstädt", "Brandt", "Goretzka", "Gnabry", "Füllkrug"
    ]
  },
  FRA: {
    first: [
      "Kylian", "Antoine", "Ousmane", "Aurélien", "Eduardo", "William", "Jules", "Theo", "Mike", "Marcus",
      "Randal", "Bradley", "Warren", "Adrien", "N'Golo", "Dayot", "Ibrahima", "Lucas", "Benjamin", "Kingsley",
      "Moussa", "Christopher", "Matteo", "Youssouf", "Khéphren", "Désiré", "Leny", "Malo", "Jean-Clair", "Castello",
      "Alexandre", "Olivier", "Hugo", "Romain", "Corentin", "Florian", "Gaëtan", "Dimitri", "Ludovic", "Maxence"
    ],
    last: [
      "Mbappé", "Griezmann", "Dembélé", "Tchouaméni", "Camavinga", "Saliba", "Koundé", "Hernández", "Maignan", "Thuram",
      "Kolo Muani", "Barcola", "Zaïre-Emery", "Rabiot", "Kanté", "Upamecano", "Konaté", "Pavard", "Coman", "Diaby",
      "Nkunku", "Guendouzi", "Fofana", "Doué", "Yoro", "Gusto", "Todibo", "Lukeba", "Lacazette", "Tolisso",
      "Martin", "Bernard", "Dubois", "Thomas", "Petit", "Robert", "Richard", "Durand", "Moreau", "Laurent"
    ]
  },
  POR: {
    first: [
      "Cristiano", "Bruno", "Bernardo", "Rúben", "Rafael", "Diogo", "Vitinha", "João", "Nuno", "Pedro",
      "Gonçalo", "Francisco", "António", "Matheus", "Palhinha", "Otávio", "Renato", "Rafa", "Pote", "Trincão",
      "Tiago", "André", "Rui", "Tomás", "Fábio", "Daniel", "Henrique", "Rodrigo", "Vítor", "Sérgio",
      "Nelson", "Cédric", "Ricardo", "Pepe", "Danilo", "William", "Gelson", "Paulinho", "Beto", "Chiquinho"
    ],
    last: [
      "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Sousa",
      "Fernandes", "Gonçalves", "Gomes", "Lopes", "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho",
      "Dias", "Leão", "Jota", "Neves", "Félix", "Cancelo", "Mendes", "Neto", "Ramos", "Conceição",
      "Inácio", "Nunes", "Dalot", "Semedo", "Quaresma", "Moutinho", "Patrício", "Horta", "Bragança", "Vieira"
    ]
  },
  NED: {
    first: [
      "Virgil", "Frenkie", "Xavi", "Cody", "Memphis", "Matthijs", "Nathan", "Denzel", "Jeremie", "Tijjani",
      "Teun", "Ryan", "Jurriën", "Micky", "Jorrel", "Brian", "Joshua", "Donyell", "Noa", "Joey",
      "Lutsharel", "Stefan", "Daley", "Steven", "Wout", "Bart", "Mark", "Justin", "Quinten", "Kenneth",
      "Mats", "Ian", "Sven", "Luuk", "Gini", "Davy", "Arnaut", "Calvin", "Bram", "Kees"
    ],
    last: [
      "van Dijk", "de Jong", "Simons", "Gakpo", "Depay", "de Ligt", "Aké", "Dumfries", "Frimpong", "Reijnders",
      "Koopmeiners", "Gravenberch", "Timber", "van de Ven", "Hato", "Brobbey", "Zirkzee", "Malen", "Lang", "Veerman",
      "Geertruida", "de Vrij", "Blind", "Bergwijn", "Weghorst", "Verbruggen", "Flekken", "Kluivert", "Taylor", "Wieffer",
      "Maatsen", "Botman", "Bakker", "Klaassen", "Berghuis", "Schouten", "Til", "Steijn", "Veltman", "Jansen"
    ]
  },
  BRA: {
    first: [
      "Vinícius", "Rodrygo", "Endrick", "Raphinha", "Bruno", "Lucas", "Gabriel", "Marquinhos", "Éder", "Alisson",
      "Ederson", "Bremer", "Danilo", "Wendell", "Yan", "Douglas", "João", "André", "Gerson", "Pedro",
      "Estêvão", "Savinho", "Matheus", "Richarlison", "Casemiro", "Fabinho", "Éverton", "Arrascaeta", "Hulk", "Paulinho",
      "Yuri", "Igor", "Caio", "Léo", "Thiago", "Rafael", "Felipe", "Renan", "Arthur", "Vitor"
    ],
    last: [
      "Júnior", "Goes", "Guimarães", "Paquetá", "Magalhães", "Martinelli", "Militão", "Becker", "Moraes", "Luiz",
      "Gomes", "Trindade", "Pereira", "Alves", "Silva", "Santos", "Oliveira", "Souza", "Lima", "Ferreira",
      "Ribeiro", "Carvalho", "Costa", "Almeida", "Nascimento", "Araújo", "Barbosa", "Cardoso", "Rocha", "Cunha",
      "Veiga", "Scarpa", "Dudu", "Rony", "Gabi", "Ayrton", "Ortiz", "Beraldo", "Murillo", "Roque"
    ]
  },
  ARG: {
    first: [
      "Lionel", "Julián", "Lautaro", "Enzo", "Alexis", "Rodrigo", "Cristian", "Lisandro", "Emiliano", "Nahuel",
      "Nicolás", "Alejandro", "Paulo", "Ángel", "Giovani", "Leandro", "Exequiel", "Thiago", "Valentín", "Facundo",
      "Franco", "Marcos", "Germán", "Gonzalo", "Lucas", "Matías", "Santiago", "Federico", "Ignacio", "Agustín",
      "Claudio", "Ezequiel", "Kevin", "Alan", "Miguel", "Darío", "Guillermo", "Gastón", "Hernán", "Mauro"
    ],
    last: [
      "Messi", "Álvarez", "Martínez", "Fernández", "Mac Allister", "De Paul", "Romero", "Molina", "Otamendi", "Tagliafico",
      "Garnacho", "Dybala", "Lo Celso", "Paredes", "Palacios", "Almada", "Barco", "Carboni", "Paz", "Mastantuono",
      "Acuña", "Pezzella", "Montiel", "Beltrán", "Simeone", "Correa", "Buonanotte", "Medina", "Zenón", "Equi",
      "González", "Rodríguez", "Gómez", "López", "Díaz", "Pérez", "Sánchez", "Riquelme", "Gallardo", "Quintero"
    ]
  },
  COL: {
    first: [
      "Luis", "James", "Jhon", "Daniel", "Jefferson", "Richard", "Davinson", "Carlos", "Camilo", "Johan",
      "Yaser", "Jhonatan", "Jorge", "Rafael", "Miguel", "Mateus", "Juan", "Kevin", "Deiver", "Álvaro",
      "Marino", "Andrés", "Dayro", "Dorlan", "Teófilo", "Radamel", "Duván", "Luis Fernando", "Jéfferson", "Harold",
      "Cristian", "Sebastián", "Brayan", "Yeison", "Néiser", "Óscar", "Stiven", "Danovis", "Mackalister", "Leonardo"
    ],
    last: [
      "Díaz", "Rodríguez", "Durán", "Muñoz", "Lerma", "Ríos", "Sánchez", "Cuesta", "Vargas", "Mojica",
      "Asprilla", "Arias", "Carrascal", "Borré", "Borja", "Uribe", "Quintero", "Castaño", "Machado", "Montero",
      "Hinestroza", "Román", "Moreno", "Pabón", "Gutiérrez", "Falcao", "Zapata", "Muriel", "Lucumí", "Mina",
      "Córdoba", "Sinisterra", "Campaz", "Portilla", "Mosquera", "Banguero", "Silva", "Castro", "Rojas", "Gómez"
    ]
  },
  URU: {
    first: ["Federico", "Darwin", "Ronald", "Manuel", "José María", "Nicolás", "Rodrigo", "Facundo", "Maximiliano", "Sergio", "Nahitan", "Giorgian", "Mathías", "Guillermo", "Agustín", "Luciano", "Cristhian", "Sebastián"],
    last: ["Valverde", "Núñez", "Araújo", "Ugarte", "Giménez", "De la Cruz", "Bentancur", "Pellistri", "Olivera", "Rochet", "Nández", "De Arrascaeta", "Viña", "Varela", "Canobbio", "Rodríguez", "Stuani", "Coates"]
  },
  BEL: {
    first: ["Kevin", "Romelu", "Jérémy", "Thibaut", "Amadou", "Leandro", "Youri", "Loïs", "Johan", "Charles", "Arthur", "Wout", "Timothy", "Dodi", "Romeo", "Zeno", "Alexis", "Koen"],
    last: ["De Bruyne", "Lukaku", "Doku", "Courtois", "Onana", "Trossard", "Tielemans", "Openda", "Bakayoko", "De Ketelaere", "Theate", "Faes", "Castagne", "Lukebakio", "Lavia", "Debast", "Saelemaekers", "Casteels"]
  }
};

const LEAGUE_NATIONALITY_MIX = {
  esp_1: ["ESP", "ESP", "ESP", "ESP", "ESP", "ARG", "BRA", "FRA", "COL", "URU"],
  esp_2: ["ESP", "ESP", "ESP", "ESP", "ESP", "ESP", "ARG", "COL", "URU", "FRA"],
  eng_1: ["ENG", "ENG", "ENG", "ENG", "ENG", "FRA", "BRA", "ESP", "NED", "POR"],
  eng_2: ["ENG", "ENG", "ENG", "ENG", "ENG", "ENG", "FRA", "ESP", "NED", "BEL"],
  ita_1: ["ITA", "ITA", "ITA", "ITA", "ITA", "ARG", "FRA", "BRA", "NED", "COL"],
  ita_2: ["ITA", "ITA", "ITA", "ITA", "ITA", "ITA", "ARG", "BRA", "FRA", "URU"],
  ger_1: ["GER", "GER", "GER", "GER", "GER", "FRA", "NED", "ENG", "ARG", "ESP"],
  ger_2: ["GER", "GER", "GER", "GER", "GER", "GER", "NED", "FRA", "BEL", "ESP"],
  fra_1: ["FRA", "FRA", "FRA", "FRA", "FRA", "BRA", "ARG", "POR", "BEL", "COL"],
  fra_2: ["FRA", "FRA", "FRA", "FRA", "FRA", "FRA", "BEL", "POR", "BRA", "ARG"],
  por_1: ["POR", "POR", "POR", "POR", "POR", "BRA", "BRA", "ARG", "COL", "ESP"],
  ned_1: ["NED", "NED", "NED", "NED", "NED", "BEL", "GER", "ARG", "BRA", "ESP"],
  bra_1: ["BRA", "BRA", "BRA", "BRA", "BRA", "BRA", "ARG", "URU", "COL", "COL"],
  bra_2: ["BRA", "BRA", "BRA", "BRA", "BRA", "BRA", "BRA", "ARG", "URU", "COL"],
  arg_1: ["ARG", "ARG", "ARG", "ARG", "ARG", "ARG", "COL", "COL", "URU", "BRA"],
  arg_2: ["ARG", "ARG", "ARG", "ARG", "ARG", "ARG", "ARG", "URU", "COL", "BRA"],
  col_1: ["COL", "COL", "COL", "COL", "COL", "COL", "COL", "ARG", "ARG", "URU"],
  col_2: ["COL", "COL", "COL", "COL", "COL", "COL", "COL", "COL", "ARG", "URU"],
  row_1: ["ESP", "ENG", "ITA", "GER", "FRA", "POR", "NED", "BRA", "ARG", "COL", "URU", "BEL"]
};

const SQUAD_TEMPLATE = [
  { pos: "POR", starter: true, ovrDelta: 1, ageMin: 24, ageMax: 33 },
  { pos: "DEF", starter: true, ovrDelta: 2, ageMin: 23, ageMax: 31 },
  { pos: "DEF", starter: true, ovrDelta: 1, ageMin: 22, ageMax: 30 },
  { pos: "DEF", starter: true, ovrDelta: 0, ageMin: 21, ageMax: 29 },
  { pos: "DEF", starter: true, ovrDelta: -1, ageMin: 20, ageMax: 28 },
  { pos: "MED", starter: true, ovrDelta: 2, ageMin: 22, ageMax: 30 },
  { pos: "MED", starter: true, ovrDelta: 1, ageMin: 21, ageMax: 29 },
  { pos: "MED", starter: true, ovrDelta: 0, ageMin: 20, ageMax: 28 },
  { pos: "DEL", starter: true, ovrDelta: 3, ageMin: 21, ageMax: 29 },
  { pos: "DEL", starter: true, ovrDelta: 1, ageMin: 20, ageMax: 28 },
  { pos: "DEL", starter: true, ovrDelta: 0, ageMin: 19, ageMax: 27 },
  { pos: "POR", starter: false, ovrDelta: -5, ageMin: 20, ageMax: 34 },
  { pos: "DEF", starter: false, ovrDelta: -3, ageMin: 19, ageMax: 30 },
  { pos: "DEF", starter: false, ovrDelta: -4, ageMin: 18, ageMax: 26 },
  { pos: "MED", starter: false, ovrDelta: -2, ageMin: 19, ageMax: 29 },
  { pos: "MED", starter: false, ovrDelta: -4, ageMin: 18, ageMax: 25 },
  { pos: "DEL", starter: false, ovrDelta: -2, ageMin: 19, ageMax: 28 },
  { pos: "DEL", starter: false, ovrDelta: -5, ageMin: 17, ageMax: 23 }
];

export function buildWorldDatabase() {
  const clubs = {};
  const players = {};
  const usedNames = new Set();

  LEAGUES_CATALOG.forEach(league => {
    const natMix = LEAGUE_NATIONALITY_MIX[league.id] || ["ESP"];
    league.clubs.forEach((c, cIdx) => {
      clubs[c.id] = {
        ...c,
        leagueId: league.id,
        leagueName: league.name,
        country: league.country,
        flag: league.flag,
        continent: league.continent || "Europa",
        tier: league.tier ?? 1,
        parentLeagueId: league.parentLeagueId || null,
        childLeagueId: league.childLeagueId || null,
        formation: cIdx % 3 === 0 ? "4-3-3" : cIdx % 3 === 1 ? "4-4-2" : "4-2-3-1",
        tactics: { mentality: 55, tempo: 55, press: 55 }
      };

      SQUAD_TEMPLATE.forEach((slot, sIdx) => {
        const natCode = natMix[(cIdx * 3 + sIdx * 7) % natMix.length];
        const natInfo = NATIONALITIES_CATALOG[natCode] || NATIONALITIES_CATALOG.ESP;
        const pool = NATIONALITY_NAME_POOLS[natCode] || NATIONALITY_NAME_POOLS.ESP;

        let fullName = "";
        let attempts = 0;
        while (!fullName || usedNames.has(fullName)) {
          const f = pool.first[(cIdx * 7 + sIdx * 13 + attempts * 3) % pool.first.length];
          const l = pool.last[(cIdx * 11 + sIdx * 5 + attempts * 7) % pool.last.length];
          fullName = `${f} ${l}`;
          attempts++;
          if (attempts > 160) {
            fullName = `${f} ${l} ${sIdx + 1}`;
            break;
          }
        }
        usedNames.add(fullName);

        const jitter = ((cIdx + sIdx) % 3) - 1;
        const ovr = Math.max(64, Math.min(93, c.ovr + slot.ovrDelta + jitter));
        const age = slot.ageMin + ((cIdx * 3 + sIdx * 5) % (slot.ageMax - slot.ageMin + 1));
        const pid = `p_${c.id}_${sIdx + 1}`;

        players[pid] = {
          id: pid,
          clubId: c.id,
          name: fullName,
          nationality: natInfo.name,
          natCode: natInfo.code,
          flag: natInfo.flag,
          pos: slot.pos,
          age,
          ovr,
          starter: slot.starter,
          stamina: 96,
          morale: 85,
          contractYears: 2 + ((cIdx + sIdx) % 3),
          goals: 0,
          yellowCardsSeason: 0,
          injuredMatches: 0,
          suspendedMatches: 0
        };
      });
    });
  });

  return { clubs, players };
}