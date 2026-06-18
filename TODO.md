# TODO · Mundial 2026

## Completado
- [x] Pestaña Inicio — cuenta atrás para el Mundial (primera pestaña, primera en cargarse)
- [x] Filtro rápido "Solo España" en el calendario
- [x] Puntuación apuestas de torneo — tabla `tournament_results` en Supabase, cálculo automático de puntos por predicción
- [x] Diseño tipo marcador en Calendario — filas home | hora | away con banderas grandes
- [x] Diseño tipo marcador en Apuestas — tarjetas con layout home | marcador | away y banderas
- [x] Interactividad: equipo en Grupos → panel con sus partidos; bracket → navega al calendario; Inicio → link al primer partido; Stats → expand con ratio por partido
- [x] Preparar renderizado de resultados en Calendario y Apuestas (activo cuando standings.json tenga datos)
- [x] Refactor: matchId/matchTeams/escHtml/getMatchResults centralizados en matches.js; grpLoaded declarado; XSS en qnlUser.name arreglado; CSS muerto eliminado
- [x] Backup de apuestas — login admin independiente (abajo del tab Apuestas) con contraseña propia; exporta JSON con todas las apuestas organizadas por grupo; group_id en tabla users para soporte multi-grupo
- [x] Nuevo grupo: Prrrrrrrraaaaaacaaas🐶👑👑👑 (id: pracas, 10 miembros)
- [x] Tab Equipos — convocatorias de las 48 selecciones (Wikipedia scraper → squads.json); filtros por país, club (buscador) y jugador; desplegable por jugador con DOB, edad, internacionales y goles; acceso directo desde nombres de equipos en el Calendario
- [x] Simulador de grupos y bracket — score inputs por partido → clasificación en tiempo real (Pts/DG/GF); ranking mejores terceros; bracket clickable R32→Final con cascada de limpieza
- [x] Navegación "Más" — 5 tabs fijos (Inicio/Calendario/Grupos/Apuestas/Equipos) + bottom sheet animado con Stats/Simulador/Noticias/Sedes
- [x] Descubrimiento de features — sección "¿Sabías que...?" en Inicio + hints de primer uso por tab (se guardan en localStorage, desaparecen solos a los 6s)
- [x] Cuotas de casas de apuestas — odds.json actualizado diariamente vía GitHub Actions (The Odds API, Betfair/William Hill); visible en Calendario y en tarjetas de Apostar
- [x] Refactor: standings.json cacheado una sola vez (getStandingsData); helpers de dropdown compartidos (filterDropdown/openDropdown/closeDropdown)
- [x] Próxima apuesta que cierra — bloque urgente en home de Quiniela con countdown en tiempo real
- [x] Quiniela multigrupo: clasificación de torneo con filtro Mi grupo/Todos; apuestas de partido filtradas al grupo propio (Ver grupo, dropdown contador)
- [x] Live scores: CF Worker proxy (mundial-live-scores.ignasiser97.workers.dev) + polling 60s en home + status live/ft en calendar, home y quiniela
- [x] Apostar: ocultar partidos con resultado final (status ft); popup de resultados al clickar equipo

## Pendiente

### Inicio durante el torneo
- [ ] Cuando el torneo esté en marcha, la página de Inicio muestra los partidos del día en grande: cuenta atrás a cada kickoff, canal, estadio, y resultado en directo si el partido ya ha empezado. Si no hay partidos hoy, mostrar los próximos. La cuenta atrás global al Mundial desaparece o pasa a secundaria.

### Quiniela Cachorros
- [ ] Desarrollar más funcionalidad según avance el torneo

### Otros
- [ ] Marcador en directo dentro del partido (score live durante el partido)
- [ ] Resultados de partidos ya jugados (marcadores finales en el calendario y en Apuestas pasadas)
- [ ] Notificaciones push — infraestructura lista (SW, push.js, GitHub Actions cron, tablas Supabase), pendiente depurar inyección VAPID key y activar botón (#push-section oculto por CSS)
- [ ] Comparador de estadísticas entre jugadores

## Cuando empiece el Mundial (11 jun)

- [ ] **Activar home live**: cambiar `HOME_PREVIEW_STARTED = false` → el switch es automático por fecha, no hay que tocarlo
- [ ] **Verificar ESPN scoreboard**: comprobar si `site.api.espn.com/apis/site/v2/sports/soccer/fifa.world-cup/scoreboard` devuelve solo partidos de hoy o el historial completo del torneo. Si devuelve historial, eliminar `matchResults` del scraper y usar únicamente el CF Worker (una sola fuente, sin merge). Si no, mantener el merge actual.
- [ ] **Verificar slug ESPN**: confirmar que el slug `fifa.world-cup` es correcto en producción o descubrir el definitivo (el Worker tiene fallback al scoreboard general)
- [ ] **Comprobar match_id del Worker**: verificar que los IDs generados por el CF Worker (ESPN) coinciden exactamente con los de `matchId()` en el frontend para al menos los primeros partidos
- [ ] **Ajustar ventana de live polling**: actualmente `_liveInterval` se activa si un partido está dentro de los 130 min desde el kickoff — verificar que cubre prórrogas y penaltis correctamente
- [ ] **Activar botón de notificaciones push**: descomentar `#push-section` en CSS y depurar inyección de VAPID key en el deploy
- [ ] **Alineaciones vía ESPN**: el scoreboard ya devuelve `event.id` por partido — con ese ID se puede pegar a `site.api.espn.com/apis/site/v2/sports/soccer/fifa.world-cup/summary?event={id}` para obtener alineaciones, formación, goles y tarjetas. Verificar estructura de respuesta y cuándo publica ESPN las alineaciones oficiales (~1h antes del partido). Requiere guardar el ESPN event ID en el CF Worker y exponerlo al frontend.

## Ideas a valorar
- [ ] "Yo estuve aquí" — botón por partido, activo solo durante la ventana del partido (mismo criterio que el chat: día del partido hasta kickoff +3h). Un click por usuario por partido. Al final del mundial, contador de partidos vistos visible en Apuestas. Auth: login de Apuestas. Tabla: `checkins (id, match_id, user_id, created_at)`, unique constraint en (match_id, user_id).
- [ ] Chat por partido — comentarios en tiempo real (Supabase Realtime). Ventana: día del partido hasta kickoff +3h. Auth: login de Apuestas (solo lectura si no estás logueado). Tabla: `comments (id, match_id, user_id, text varchar(140), created_at)`. UI: icono 💬 en fila del Calendario cuando el chat está activo.
- [ ] Alineaciones por partido — investigar fuente de datos (API-Football /fixtures/lineups, Wikipedia, Sofascore scraping)
- [ ] Widget de "próximo partido de España" para compartir como imagen
- [ ] Historial de ediciones anteriores del Mundial
