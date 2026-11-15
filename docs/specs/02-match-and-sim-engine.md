\---



\### 2. Archivo: `docs/specs/02-match-and-sim-engine.md`



Abre `docs/specs/02-match-and-sim-engine.md` en tu editor, borra lo que tenga y pega esto:



```markdown

\# Especificación 02: Motores de Simulación (En Vivo 2D y Simulación Rápida)



\## 1. Simulación Rápida Basada en Plantillas Reales (`src/engine/quick-sim.js`)

A diferencia de modelos estáticos basados únicamente en la media general del club, `simulateQuickMatch()` evalúa el \*\*XI titular real\*\* alineado por cada equipo mediante `evaluateClubLineupStrength()`:



1\. \*\*Disponibilidad Médica y Disciplinaria:\*\* Filtra jugadores lesionados o sancionados (`isPlayerUnavailable()`). Exige exactamente 11 titulares válidos al usuario antes de iniciar.

2\. \*\*Asignación Táctica (`assignPlayersToSlots`):\*\* Mapea los 11 titulares a la formación elegida (`4-3-3`, `4-4-2`, `3-5-2`, `4-2-3-1`). Cualquier futbolista alineado fuera de su demarcación natural sufre una penalización de \*\*-8 OVR\*\*.

3\. \*\*Condición Física y Moral:\*\*

&#x20;  - Fatiga progresiva: Cuando `stamina < 75`, se aplica una penalización proporcional `(75 - stamina) \* 0.14` al rendimiento efectivo.

&#x20;  - Moral: Modificador dinámico centrado en `75` (`(morale - 75) \* 0.05`).

4\. \*\*Roles Tácticos (`tactics-roles.js`):\*\* Pondera `atkBonus` y `defBonus` asignados a cada demarcación (`slotRoles`) para calcular por separado la fuerza ofensiva (`atkOvr`) y defensiva (`defOvr`).

5\. \*\*Generación de Goles:\*\* Muestreo estocástico mediante distribución de Poisson (`samplePoissonGoals`), ajustado por ventaja de localía y mentalidad táctica del entrenador.



\## 2. Motor Táctico en Vivo 2D (`src/engine/match-live.js`)

\- \*\*Frecuencia:\*\* 35 ms por tick (\~30 FPS), equivalente a \~1.12 segundos reales por minuto de juego.

\- \*\*Física y Posicionamiento:\*\*

&#x20; - Separación de agentes (`separateOverlappingPlayers`) para evitar superposición de sprites en el canvas.

&#x20; - Pases filtrados al espacio, centros laterales, rebotes del portero, tarjetas y contraataques dinámicos.

&#x20; - Sustituciones en vivo (hasta 5 cambios) y órdenes tácticas en tiempo real (`Defensivo`, `Equilibrado`, `Ofensivo`).

\- \*\*Tandas de Penales:\*\* Resolución automática en fases eliminatorias (`cup\_1`, `cont\_1`) si el marcador termina empatado tras los 90 minutos.

