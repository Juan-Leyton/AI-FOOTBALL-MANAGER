World Soccer Web Manager (WSWM 26)

> **Simulador web de gestión futbolística, dirección deportiva, economía de clubes y táctica en tiempo real, diseñado bajo estándares Progressive Web App (PWA) y desplegado en producción mediante Vercel.**

## Tabla de Contenidos
1. [Descripción General del Sistema](#1-descripción-general-del-sistema)
2. [Estado del Proyecto y Dirección de Desarrollo](#2-estado-del-proyecto-y-dirección-de-desarrollo)
3. [Requisitos del Entorno de Desarrollo e Integración](#3-requisitos-del-entorno-de-desarrollo-e-integración)
4. [Guía de Instalación, Despliegue y Funcionamiento](#4-guía-de-instalación-despliegue-y-funcionamiento)
5. [Tecnologías Utilizadas y Enlaces de Referencia](#5-tecnologías-utilizadas-y-enlaces-de-referencia)
6. [Arquitectura Detallada del Proyecto](#6-arquitectura-detallada-del-proyecto)
7. [Historial de Correcciones Técnicas (Fase 0)](#7-historial-de-correcciones-técnicas-fase-0)
8. [Guía de Colaboración y Flujo de Trabajo (Git Flow)](#8-guía-de-colaboración-y-flujo-de-trabajo-git-flow)
9. [Preguntas Frecuentes (FAQ)](#9-preguntas-frecuentes-faq)
10. [Derechos de Autor y Licencia](#10-derechos-de-autor-y-licencia)

## 1. Descripción General del Sistema

### ¿Qué es World Soccer Web Manager (WSWM 26)?
**World Soccer Web Manager (WSWM 26)** es una aplicación web progresiva (PWA) de simulación deportiva, estrategia y dirección técnica de clubes de fútbol que se ejecuta íntegramente en el navegador web. A diferencia de los simuladores comerciales de escritorio que requieren descargas de decenas de gigabytes, instaladores complejos, licencias costosas o hardware de gama alta, **WSWM 26** está construido sobre tecnologías web estándar (JavaScript ES Modules, HTML5 Canvas, SVG dinámico, IndexedDB y Service Workers) para abrirse al instante desde cualquier computadora, laptop, tablet o teléfono móvil.

### ¿Cuál es su función principal?
El sistema recrea un ecosistema futbolístico internacional vivo, persistente e interconectado temporada tras temporada. El usuario asume simultáneamente los roles de **Entrenador (Director Técnico)** y **Director Deportivo**, tomando todas las decisiones tácticas, financieras, contractuales e institucionales que determinan el éxito o el fracaso de su institución:

1. **Gestión Integral de Plantilla, Estado Físico y Contratos (`squad-manager.js`, `medical.js`, `progression.js`):**
   * Administración completa de convocatorias (11 titulares y banquillo de suplentes), con opción de alineación automática inteligente (*Mejor XI Disponible*) que respeta lesiones, sanciones y posiciones naturales.
   * Monitoreo continuo de atributos base (`RIT` Ritmo, `TIR` Tiro, `PAS` Pase, `DEF` Defensa), media global (`OVR`), moral individual, desgaste físico acumulado (`stamina`) y edad.
   * Gestión disciplinaria y médica: bajas por lesión con tiempos de recuperación jornada a jornada, acumulación de tarjetas amarillas (suspensión automática al llegar a 5 amarillas en liga) y tarjetas rojas directas.
   * Negociación de renovaciones contractuales antes de que los futbolistas queden libres al cierre de cada temporada.

2. **Pizarra Táctica y Dirección de Partido en Vivo (`match-live.js`, `tactics-roles.js`, `pitch-renderer.js`):**
   * Configuración visual de sistemas tácticos (`4-3-3`, `4-4-2`, `3-5-2`, `4-2-3-1`, etc.) con visualización de camisetas personalizadas en primera y segunda equipación, dorsales y alertas visuales cuando un futbolista juega fuera de su demarcación natural (aplicando penalización táctica realista).
   * Ajuste fino mediante controles deslizantes (*sliders*) de **Mentalidad** (bloque defensivo ultra-cerrado hasta vocación ofensiva total), **Ritmo de Circulación** (posesión pausada hasta transiciones vertiginosas) e **Intensidad de Presión** (repliegue en campo propio hasta presión alta tras pérdida).
   * **Simulación en Vivo Tick a Tick:** Visualización cenital 2D en HTML5 Canvas con el movimiento continuo de los 22 futbolistas y el balón, marcador en tiempo real, barra dinámica de posesión, conteo de remates y faltas, banners animados de gol, efectos de sonido sintetizados mediante Web Audio API y crónica minuto a minuto.
   * **Intervención en Tiempo Real y Simulación Rápida:** Posibilidad de cambiar la mentalidad del equipo sin detener el reloj o pausar el encuentro para realizar hasta 5 sustituciones tácticas. Para avanzar rápido entre jornadas, incluye **Simulación Rápida** (`quick-sim.js`) ponderada por los 11 titulares reales, su forma física y penalizaciones fuera de puesto.

3. **Mercado Global, Valoración Dinámica y Economía (`transfers.js`, `market-advanced.js`, `economy-market.js`, `stadium.js`):**
   * Buscador mundial interactivo con filtros combinables por liga o país, demarcación (`POR`, `DEF`, `MED`, `DEL`), rango de edad (`Sub-21`, `Plenitud 22-28`, `Veteranos 29+`), media mínima (`OVR`) y búsqueda textual por nombre de jugador o club.
   * **Motor de Valoración Dinámica con Desglose Transparente:** Escala exponencial calibrada al fútbol moderno (`120 M€ – 200 M€` para superestrellas `90–95 OVR`) con etiquetas visuales que explican cada rebaja o sobrecoste en tiempo real (contrato por expirar, jugador descontento, lesión, promesa Sub-21, descuento del ojeador y efecto *Deadline Day*).
   * **Negociación Interactiva y Mercado Vivo de IA:**
     * *Sala de Negociación:* Deslizador de oferta personalizada con cálculo de comisión de agente y contraofertas negociables por parte de los clubes vendedores.
     * *Compra directa, Oferta rápida a la baja (-18%) y Cesión por 1 temporada (25%).*
     * *Agentes Libres y Bóveda de Leyendas:* Contratación directa de agentes libres abonando prima de firma, manteniendo las leyendas históricas protegidas (`legend_vault`) para recompensas especiales y regens élite.
     * *Traspasos Autónomos de IA:* Los clubes rivales fichan y se refuerzan activamente cada jornada, publicando boletines de mercado en **Despacho y Prensa**.
   * **Balance Financiero por Jornada:** Cálculo automático de ingresos por taquilla (basado en la capacidad del estadio, nivel de infraestructura, confianza de la afición e importancia de la competición) y patrocinadores frente al pago semanal de salarios escalados.

4. **Red de Ojeadores Juveniles, Academia Sub-18 e Infraestructura (`youth-scouting.js`, `academy.js`, `staff.js`, `training.js`):**
   * Envío de ojeadores internacionales a distintas regiones del mundo para descubrir prospectos menores de 18 años con rangos estimados de **Potencial (POT)**.
   * Incorporación de promesas mediante beca formativa a la **Academia Sub-18** (cupo de hasta 8 canteranos) y posterior ascenso al primer equipo cuando estén listos para debutar.
   * Asignación de **Planes de Entrenamiento Semanal** (equilibrado, físico, técnico, táctico o recuperación) y **Enfoque Individual** por futbolista (mejora específica de atributos o reentrenamiento hacia una nueva posición en el campo).
   * Inversión en infraestructura del club: ampliación de estadio, mejora del cuerpo médico (acelera recuperación de lesiones y fatiga), red de ojeadores (reduce costos de traspaso) y academia juvenil.

5. **Despacho y Prensa, Longevidad Mundial y Progresión de Carrera (`director.js`, `world-longevity.js`, `career-hooks.js`):**
   * **Sistema de Nivel y Perks del Mánager:** El entrenador acumula experiencia (`XP`) por victorias, empates, ascensos de canteranos y mejoras institucionales, subiendo de nivel y obteniendo puntos de habilidad para desbloquear ventajas pasivas (*perks*).
   * **Objetivos de Directiva y Confianza:** Metas deportivas y financieras asignadas al inicio de cada campaña cuya consecución otorga bonificaciones económicas y mantiene alta la confianza de la junta directiva.
   * **Despacho del Mánager y Sala de Prensa:** Comunicados interactivos tras los partidos (ruedas de prensa, conflictos de vestuario, ofertas de compra, contraofertas de negociación y boletines de mercado) donde cada decisión tiene consecuencias reales.
   * **Ciclo Generacional Infinito:** Al finalizar cada temporada se celebra la gala de premios, se registran los logros en el **Salón de la Fama**, se retiran los futbolistas veteranos y nacen nuevos jóvenes talentosos (*regens*) para que las partidas puedan extenderse indefinidamente.

6. **Modos de Juego Versátiles (`multiplayer-local.js`, `multiplayer-online.js`):**
   * **Carrera Individual:** Experiencia clásica contra clubes dirigidos por la lógica del juego.
   * **Multijugador Local por Turnos (2 a 6 Mánagers):** Permite que varios amigos jueguen en una misma computadora o dispositivo, alternando turnos jornada a jornada dentro de la misma liga o en ligas distintas, con tabla comparativa de mánagers y duelos directos PvP.
   * **Multijugador Online en la Nube:** Cualquier partida multijugador puede publicarse en la nube generando un **código único de sala de 6 caracteres**. Los demás participantes ingresan ese código desde sus propios navegadores o teléfonos móviles para sincronizar el mundo, realizar fichajes y disputar la temporada de forma coordinada.

### ¿Cuál es la meta del proyecto?
La meta a mediano y largo plazo de **World Soccer Web Manager** es consolidarse como un simulador de gestión futbolística web gratuito, abierto y técnicamente robusto, evolucionando mediante un plan estructurado por dependencias hacia:
1. **Un universo futbolístico masivo (~280 a 320 clubes):** Escalar a ligas de 16 equipos (30 jornadas por campaña), incorporar Segundas Divisiones en los países principales, clubes invitados del Resto del Mundo, sistema de ascensos y descensos con promociones (*playoffs*) y Copas Continentales con fase de grupos y eliminatorias a ida y vuelta, utilizando siempre **nomenclatura realista libre de infracciones de propiedad intelectual**.
2. **Un motor lógico de simulación táctica por zonas:** Reemplazar la simulación básica por una máquina de estados dividida en zonas del terreno de juego (*Salida, Creación, Tres Cuartos y Área*), duelos individuales de atributos (`1v1`), cálculo estadístico de Goles Esperados (`xG`), ventajas tácticas cruzadas entre estilos de juego y gritos de banda en vivo.
3. **Renderizado gráfico 2.5D fluido a 60 FPS:** Desacoplar por completo el cálculo lógico del motor visual integrando **PixiJS (WebGL)** con interpolación de fotogramas, sombras dinámicas, estelas de balón y controles tácticos interactivos sobre el césped.
4. **Ecosistema multijugador competitivo en tiempo real:** Sincronización delta de bajo consumo de ancho de banda, subastas PvP a ciegas por jugadores estrella, duelos tácticos simultáneos en vivo y clasificación global ELO.

---

## 2. Estado del Proyecto y Dirección de Desarrollo

### Estado Actual
* **Versión actual:** `v0.1.0-alpha`
* **Fase:** `En desarrollo activo — Fase 1/2 (Economía Realista, Valoración Dinámica y Mercado Vivo)`
* **¿El proyecto está terminado?** **No.** El núcleo del juego es completamente jugable de principio a fin a lo largo de múltiples temporadas (10 ligas europeas y sudamericanas, 120 clubes iniciales, copas nacionales, copa continental, copa intercontinental, mercado dinámico, cantera y multijugador local/online). Se ha completado exitosamente el saneamiento técnico de **Fase 0** y el motor económico/de mercado de **Fase 1**, continuando ahora con la expansión internacional y el motor táctico.

### Dirección de Desarrollo (Hoja de Ruta por Fases)

| Fase | Nombre | Estado | Objetivos Principales |
| :--- | :--- | :--- | :--- |
| **Fase 0** | **Saneamiento Técnico y Arquitectura Base** | **Completado** | Unificación de marca a **WSWM 26**, establecimiento de Git Flow (`main` / `developer`), corrección del bug en `transfers.js`, integración de pruebas unitarias con **Vitest**, persistencia asíncrona en **IndexedDB**, ponderación real de titulares en `quick-sim.js` y modularización de vistas en `src/ui/views/`. |
| **Fase 1** | **Economía, Valoración Dinámica y Mercado Vivo** | **Completado** | Protección de leyendas históricas (`legend_vault`), escala exponencial realista (`120M€–200M€` para OVR 90+), salarios coherentes, motor de valoración dinámica con desglose transparente, sala de negociación interactiva y fichajes autónomos entre clubes de IA. |
| **Fase 2** | **Expansión Mundial, Divisiones y Copas** | **Siguiente** | Escalado a ~280-320 clubes con nomenclatura realista sin plagio, ligas de 16 equipos, Segundas Divisiones, ascensos/descensos, Copas Nacionales y torneos continentales con fase de grupos. |
| **Fase 3** | **Finanzas del Club, Vestuario y Narrativa** | Pendiente | Elección de patrocinadores, Fair Play Financiero, química de plantilla, lesiones musculares por fatiga, gestión de egos, ruedas de prensa y gala del Balón de Oro. |
| **Fase 4** | **Motor Lógico Táctico (`match-engine.js`)** | Pendiente | Simulación por zonas del campo, duelos 1v1 basados en atributos, cálculo de `xG`, sistema táctico piedra-papel-tijera y gritos desde la banda en vivo. |
| **Fase 5** | **Renderizado 2.5D a 60 FPS con PixiJS** | Pendiente | Desacoplamiento total entre lógica y vista, renderizado WebGL en perspectiva 2.5D, interpolación suave, animaciones de disparo y HUD flotante. |
| **Fase 6** | **Multijugador Online Competitivo** | Pendiente | Sincronización delta eficiente, subastas a ciegas entre mánagers humanos, duelos tácticos simultáneos en vivo y ranking global ELO. |

---

## 3. Requisitos del Entorno de Desarrollo e Integración

Para clonar, modificar, depurar o integrar nuevas funcionalidades en el código fuente antes de su despliegue en Vercel, se requieren las siguientes herramientas:

### Requisitos de Software Local (Obligatorios)
* **Sistema Operativo:** Windows 10/11, macOS (12+) o distribuciones Linux modernas (Ubuntu 22.04+, Debian, Fedora).
* **Node.js:** Versión `18.0.0` LTS o superior (recomendado Node.js `20 LTS` o `22 LTS`). [Descargar Node.js](https://nodejs.org/).
* **Gestor de Paquetes:** `npm` v9.0.0 o superior (incluido automáticamente en la instalación de Node.js).
* **Control de Versiones:** `Git` v2.40+ y/o **GitHub Desktop** configurado con el correo electrónico vinculado a la cuenta de GitHub.
* **Navegador Web Moderno:** Google Chrome, Microsoft Edge, Mozilla Firefox o Brave con soporte nativo para ES Modules, HTML5 Canvas, IndexedDB y Service Workers, además de DevTools (`F12`) para depuración.
* **Editor de Código:** Visual Studio Code (recomendado) con extensiones para JavaScript (ES6+), formateo Prettier y vista previa Markdown.

### Requisitos de Servicios en la Nube (Opcionales / Producción)
* **Supabase (Backend Multijugador Online):** Necesario únicamente si deseas levantar tu propia base de datos para salas multijugador online. Requiere crear un proyecto gratuito en [Supabase](https://supabase.com/) con una tabla `rooms` (campos `room_code`, `season`, `round`, `state_json`, `updated_at`) y obtener la URL del proyecto y la clave pública anónima (`anon key`).
* **Vercel (Alojamiento y CI/CD):** El repositorio está vinculado a [Vercel](https://vercel.com/) para despliegues automáticos: cada actualización en la rama `main` actualiza la versión pública de producción, mientras que la rama `developer` genera entornos de vista previa (*Preview Deployments*) para pruebas.

---

## 4. Guía de Instalación, Despliegue y Funcionamiento

### A. Acceso y Uso para el Jugador Final (Sin Instalación)
Al estar desplegado en **Vercel**, cualquier usuario puede abrir y jugar **World Soccer Web Manager** de forma inmediata:

1. **Abrir el Juego:** Ingresa desde tu navegador web (PC o móvil) al enlace público de despliegue en **Vercel**.
2. **Elegir Modo de Partida en la Portada:**
   * **Carrera Individual:** Explora las ligas europeas (España, Inglaterra, Italia, Alemania, Francia, Portugal, Países Bajos) y sudamericanas (Colombia, Argentina, Brasil), compara el presupuesto inicial, capacidad del estadio y media (`OVR`) de los clubes, y haz clic sobre el equipo elegido para iniciar la temporada.
   * **Crear Sala Amigos (2-6):** Añade entre 2 y 6 perfiles de entrenador, personaliza sus nombres, elige un club para cada participante e inicia la partida compartida. Una vez dentro del menú principal, podrás pulsar *"Publicar Sala Online"* para subir la partida a la nube y obtener un código de invitación.
   * **Unirse a Sala Online:** Si un amigo ya creó y publicó una sala, selecciona esta pestaña, escribe el código de 6 caracteres (por ejemplo, `WSWM82`), pulsa *"Buscar Sala"* y elige tu nombre de mánager para conectarte desde tu propio dispositivo.
3. **Instalar como Aplicación Nativa (PWA):**
   * **En Computadora (Chrome / Edge):** Haz clic en el botón de instalación en el extremo derecho de la barra de direcciones para abrir **WSWM 26** en su propia ventana sin barra de navegación.
   * **En Android (Chrome):** Abre el menú (`⋮`) y pulsa *"Instalar aplicación"* o *"Añadir a pantalla de inicio"*.
   * **En iPhone / iPad (Safari):** Pulsa el botón *"Compartir"* y selecciona *"Añadir a pantalla de inicio"*.

### B. Instalación Local para Desarrolladores
Si deseas trabajar sobre el código fuente en tu máquina:

1. **Obtener el código y situarse en la rama de desarrollo:**
   ```bash
   git clone [https://github.com/Juan-Leyton/AI-FOOTBALL-MANAGER.git](https://github.com/Juan-Leyton/AI-FOOTBALL-MANAGER.git)
   cd AI-FOOTBALL-MANAGER
   git checkout developer
Instalar las dependencias definidas en package.json:Bashnpm install
Configurar variables de entorno para modo online (Opcional):
Crea un archivo .env en la raíz del proyecto (ignorado por Git para proteger tus credenciales) y añade:Fragmento de códigoVITE_SUPABASE_URL=[https://tu-instancia.supabase.co](https://tu-instancia.supabase.co)
VITE_SUPABASE_ANON_KEY=tu_clave_publica_anonima
(Si no creas el archivo .env, el juego funcionará perfectamente en modo Carrera Individual y Multijugador Local).Ejecutar el servidor de desarrollo local:Bashnpm run dev
Abre http://localhost:5173 en tu navegador.Ejecutar pruebas unitarias y compilar para producción (Verificación previa a Merge):Bashnpm test
npm run build
npm run preview

5. Tecnologías Utilizadas y Enlaces de ReferenciaTecnologíaRol en el ProyectoDocumentación
  
   OficialJavaScript (ES2022+ / ES Modules)Lenguaje principal de toda la lógica de simulación, gestión de estado, algoritmos económicos y control del DOM, sin sobrecarga de frameworks pesados.
   
   MDN Web Docs — JavaScriptVite 8 & VitestEmpaquetador de módulos ultrarrápido con soporte nativo para ES Modules, compilación optimizada y runner de pruebas unitarias automatizadas.
   
   Documentación de Vite / VitestIndexedDB & LocalStorageAlmacenamiento asíncrono de alto rendimiento para partidas completas y estados transitorios en memoria RAM durante partidos en vivo.
   
   MDN — IndexedDB APIHTML5 Canvas & SVG DinámicoRenderizado 2D en tiempo real del terreno de juego, movimiento de jugadores y balón (Canvas), además de generación procedural de escudos y camisetas (SVG).
   
   MDN — Canvas APIWeb Audio APISíntesis de efectos de sonido en tiempo real (silbato del árbitro, golpes de balón, celebraciones de gol) sin necesidad de descargar archivos .mp3 externos.
   
   MDN — Web Audio APIProgressive Web App (PWA)Configuración mediante manifest.json y sw.js (Service Worker con invalidación automática de caché) para instalación en dispositivos y juego sin conexión.

   MDN — Progressive Web AppsSupabasePlataforma Backend-as-a-Service basada en PostgreSQL utilizada para almacenar y sincronizar el estado JSON de las salas multijugador online.
   
   Documentación de SupabaseVercelPlataforma de alojamiento en la nube y despliegue continuo (CI/CD) integrada con GitHub para servir la aplicación globalmente mediante CDN.Documentación de Vercel6.
   
   Arquitectura Detallada del ProyectoEl código fuente de World Soccer Web Manager está estructurado bajo una arquitectura modular separada por responsabilidades dentro del directorio src/, complementada por pruebas unitarias en tests/ y especificaciones técnicas en docs/:Plaintextworld-soccer-web-manager/


   
├── docs/
│   └── specs/                  # Especificaciones funcionales y reglas de negocio (Spec-Driven Dev)
├── tests/
│   └── transfers.test.js       # Suite de pruebas unitarias de mercado y traspasos (Vitest)
├── src/
│   ├── ai/
│   │   └── director.js         # Motor narrativo: eventos post-partido, prensa, vestuario y decisiones
│   ├── core/
│   │   ├── state.js            # Store central reactivo, sistema de suscripciones y persistencia
│   │   └── storage-idb.js      # Adaptador de almacenamiento asíncrono en IndexedDB
│   ├── data/
│   │   ├── world-database.js   # Catálogo maestro de ligas, clubes, colores, estadios y plantillas
│   │   ├── database.js         # Funciones auxiliares y estructuras de datos iniciales
│   │   └── custom-legends.js   # Base de datos de futbolistas históricos y leyendas especiales
│   ├── engine/
│   │   ├── match-live.js       # Simulación tick a tick en vivo, IA rival, tácticas y sustituciones
│   │   ├── quick-sim.js        # Resolución instantánea ponderada por los 11 titulares y forma física
│   │   ├── competitions.js     # Generador de calendarios, tablas de posiciones, copas y cruces
│   │   ├── transfers.js        # Valoración dinámica exponencial, desglose, compras y ventas
│   │   ├── market-advanced.js  # Sala de negociación interactiva, contraofertas, cesiones y mercado IA
│   │   ├── economy-market.js   # Escala salarial realista, ventanas de fichajes, Deadline Day y sponsors
│   │   ├── progression.js      # Avance de jornada, balance financiero semanal y renovaciones
│   │   ├── season-transition.js# Cierre de campaña, premios, Salón de la Fama y nueva temporada
│   │   ├── world-longevity.js  # Envejecimiento, retiros por edad y creación de promesas (regens)
│   │   ├── youth-scouting.js   # Ojeo juvenil por regiones y gestión de la Academia Sub-18
│   │   ├── player-development.js# Pool de agentes libres, cambio de posición y enfoque individual
│   │   ├── medical.js          # Gestión de lesiones, recuperación física y sanciones por tarjetas
│   │   ├── squad-manager.js    # Algoritmo de selección automática del mejor XI disponible
│   │   ├── tactics-roles.js    # Definición de formaciones, coordenadas y penalización fuera de puesto
│   │   ├── staff.js            # Catálogo y mejoras de cuerpo técnico, ojeadores y estadio
│   │   ├── stadium.js          # Cálculo de asistencia al estadio, porcentaje de lleno y taquilla
│   │   ├── training.js         # Planes de entrenamiento semanal y su impacto en físico/progreso
│   │   ├── career-hooks.js     # Progresión del mánager (XP, niveles, perks) y objetivos de directiva
│   │   ├── multiplayer-local.js# Gestión de turnos e intercambio de estado entre mánagers locales
│   │   ├── multiplayer-online.js# Sincronización en la nube con Supabase (crear, buscar y unir sala)
│   │   └── audio.js            # Sintetizador de efectos de sonido del partido mediante Web Audio
│   └── ui/
│       ├── dom-manager.js      # Controlador principal de navegación, ciclo de render y eventos globales
│       ├── views/
│       │   ├── lobby-view.js       # Pantalla inicial de selección de club y salas multijugador
│       │   ├── manager-tabs.js     # Vistas operativas: Centro, Plantilla, Táctica, Staff, Mercado y Prensa
│       │   ├── match-view.js       # Interfaz de partido en vivo, marcador y controles tácticos
│       │   └── competitions-view.js# Tablas de clasificación, copas y calendario internacional
│       ├── components/
│       │   └── ui-helpers.js   # Badges de OVR, barras de progreso, camisetas SVG y pestañas
│       ├── pitch-renderer.js   # Renderizado 2D del campo, líneas, jugadores y balón en Canvas
│       ├── match-cinematics.js # Banners animados de gol en vivo y animación de simulación rápida
│       ├── player-modal.js     # Ficha detallada del jugador, desglose de precio y sala de negociación
│       ├── badges.js           # Generador vectorial SVG de escudos personalizados por club
│       ├── tactics-extras.js   # Controles complementarios de pizarra e instrucciones tácticas
│       ├── world-expansion-ui.js# Componentes visuales de ligas internacionales y expansión
│       ├── career-hub.js       # Componentes visuales de trayectoria y vitrina del mánager
│       └── toast.js            # Sistema de notificaciones flotantes no intrusivas
├── main.js                     # Punto de entrada que inicializa la interfaz y el ciclo de vida
├── index.html                  # Documento HTML5 raíz con metadatos PWA y registro del SW
├── manifest.json               # Manifiesto de aplicación web instalable (WSWM 26)
├── package.json                # Definición del paquete, dependencias y scripts de Vite/Vitest
├── sw.js                       # Service Worker con caché offline y limpieza de versiones previas
└── README.md                   # Documentación técnica y funcional completa del proyecto
8. Historial de Correcciones Técnicas (Fase 0)Durante la auditoría técnica inicial (Fase 0)

Se resolvieron los siguientes problemas estructurales antes de iniciar la expansión funcional:Bug en Ofertas Entrantes (src/engine/transfers.js): Corregido el acceso a draft.inbox dentro de store.update(["inbox"], ...) e inicialización segura del arreglo (if (!Array.isArray(draft.inbox)) draft.inbox = [];), cubierto con pruebas automatizadas en tests/transfers.test.js.Persistencia Asíncrona sin Bloqueos (src/core/storage-idb.js y src/core/state.js): Migrado el guardado principal a IndexedDB asíncrono y mantenido el estado liveMatch en memoria RAM transitoria para eliminar caídas de fotogramas (stuttering) durante los partidos en vivo.

Simulación Rápida Ponderada (src/engine/quick-sim.js): Actualizado el motor de resolución rápida para evaluar exactamente los 11 titulares disponibles, su estado físico, moral y penalizaciones por jugar fuera de posición.Modularización de la Capa Visual (src/ui/views/ y src/ui/components/): Extraídas las vistas de portada, partido en vivo, competiciones y pestañas operativas fuera de dom-manager.js para facilitar el mantenimiento y la escalabilidad.8. Guía de Colaboración y Flujo de Trabajo (Git Flow)Las contribuciones de código, reportes de errores y propuestas de diseño son bienvenidas. 

Para mantener la estabilidad del despliegue continuo en Vercel, todo colaborador debe respetar las siguientes normas:

1. Estructura de Ramasmain (Producción): Contiene exclusivamente código estable, probado y libre de errores bloqueantes. Esta rama está conectada directamente al dominio público en Vercel. Están prohibidos los commits directos sobre main.developer (Integración y Pruebas): Rama principal de desarrollo donde se integran y prueban todas las nuevas características antes de promoverlas a main.

2. Proceso para DesarrolladoresCrea una rama nueva partiendo siempre desde developer actualizada, utilizando una convención de nombres clara:
feat/nombre-de-la-funcion → Para nuevas características (ej. feat/dynamic-market).
fix/descripcion-del-bug → Para corrección de errores (ej. fix/transfers-inbox-crash).
refactor/nombre-del-modulo → Para limpieza o modularización interna (ej. refactor/split-dom-manager).
docs/tema → Para actualizaciones de documentación o especificaciones.

Verificación Previa: Antes de abrir un Pull Request hacia developer, verifica localmente que: Las pruebas unitarias (npm test) pasen al 100%.La compilación de producción (npm run build) finalice limpiamente sin errores de sintaxis ni importaciones rotas.

9.

Preguntas Frecuentes (FAQ)
¿El juego utiliza Inteligencia Artificial generativa (ChatGPT, Gemini, Claude, etc.) durante las partidas?
No. Toda la simulación de partidos, decisiones de fichajes de los clubes rivales y eventos de prensa de ai/director.js funcionan mediante algoritmos deterministas, probabilidades ponderadas por atributos y tablas de eventos locales en el navegador. Esto garantiza que WSWM 26 sea 100% gratuito, tenga latencia cero y nunca dependa de cuotas o claves de APIs externas.
¿Necesito descargar o instalar algún programa para jugar?
No. Al estar hospedado en Vercel, el juego funciona directamente desde cualquier navegador web moderno. Si lo deseas, puedes instalarlo como Progressive Web App (PWA) para tener un icono en tu escritorio o pantalla de inicio y jugar sin conexión a internet.
¿Por qué los nombres de algunos clubes o competiciones son adaptados?
Para respetar los derechos de propiedad intelectual y marcas registradas de ligas, federaciones y clubes profesionales reales, World Soccer Web Manager utiliza nombres inspirados en ciudades reales, colores históricos y tradiciones futbolísticas sin plagiar marcas comerciales.
¿Dónde se guardan mis partidas y cómo evito perder mi progreso?
En IndexedDB dentro del almacenamiento local de tu navegador web. Si borras los datos del sitio o utilizas el botón "Nueva Partida" dentro del menú lateral, la partida local se reiniciará. En las partidas Multijugador Online, el estado del mundo se respalda en la nube asociado al código de tu sala.
¿Puedo jugar con amigos desde distintos celulares o computadoras?
Sí. Crea una partida en el modo "Crear Sala Amigos (2-6)", asigna los clubes de cada participante y, dentro del juego, pulsa "Publicar Sala Online". Comparte el código de 6 caracteres con tus amigos para que ingresen desde la opción "Unirse a Sala Online" en sus propios dispositivos.

10. Derechos de Autor y Licencia
    
    Copyright © 2026 Juan Leyton y colaboradores de World Soccer Web Manager (WSWM 26).
   
    Este proyecto es software libre y de código abierto distribuido bajo los términos de la Licencia MIT:PlaintextMIT License

Copyright (c) 2026 Juan Leyton - World Soccer Web Manager

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
