\# Especificación 01: Arquitectura, Persistencia y Modularización UI



\## 1. Arquitectura General

\*\*World Soccer Web Manager (WSWM 26)\*\* opera bajo una arquitectura descentralizada orientada a cliente (Vanilla JS ES Modules + Vite 8 + PWA), con sincronización opcional en tiempo real mediante \*\*Supabase\*\* (con Row-Level Security activo) para salas multijugador en línea.



```text

src/

├── core/            # Almacén reactivo en RAM y capa asíncrona IndexedDB (state.js)

├── data/            # Base de datos mundial (10 ligas, 120 clubes, leyendas personalizadas)

├── engine/          # Motores puros de simulación, traspasos, cantera, finanzas y multijugador

├── ai/              # Director narrativo y eventos dinámicos de bandeja de entrada

└── ui/

&#x20;   ├── components/  # Componentes visuales puros (ui-helpers.js)

&#x20;   ├── views/       # Vistas aisladas (lobby-view.js, match-view.js, competitions-view.js, manager-tabs.js)

&#x20;   └── dom-manager.js # Orquestador central de renderizado y eventos

