# TODO · Mundial 2026

## Completado
- [x] Ajuste puntuación apuestas de torneo — nueva escala: campeón 10, finalista 6, España 3, goleador 4, portero 3, sorpresa 3
- [x] Home post-torneo: mensaje campeón España + clasificación combinada (partidos + torneo) con filtro grupo/todos
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
- [x] Apostar: ocultar partidos con resultado final (status ft); popup de resultados al clickar equipo; hint one-time de anuncio
- [x] Scraper: fix `to_spain_dt` (fromisoformat no soportaba sufijo `Z` en Python <3.11 → resultados silenciosamente perdidos); recuperados 7 partidos desde el 18 jun
- [x] matches.js: hora Brasil vs Haití corregida 03:00 → 02:30 (ESPN marcó 00:30 UTC); MATCHES.sort() al cargar para garantizar orden cronológico siempre; fix entradas fuera de orden en 14 jun y 20 jun
- [x] Eliminatorias: equipos reales en Calendario y Bracket — buildFullSlotMap() resuelve 1º/2º de grupo desde standings.json y cascada ganadores (Pxx) desde matchResults; automático para r32, r16, cuartos, semis
- [x] Eliminatorias Apuestas: banner explicativo (marcador 90 min, pasa, líder visible); apuesta del líder del grupo visible antes del pitido, resto ocultas hasta cierre
- [x] Tab "Bracket" en el menú inferior: bracket como primera pestaña y vista por defecto; grupos pasan a segunda pestaña
- [x] Fix eliminatorias: bridge placeholder matchId → nombres reales en getMatchResults(); calendario y quiniela scoring ahora encuentran resultados de r32+
- [x] Fix scraper: KNOCKOUT_START corregido a 28 jun (primer partido r32); partidos del 28 jun recibirán phase/winner correctos
- [x] Bracket: muestra resultado a 90 min en tarjetas de partidos jugados; indicador pen./p.e. si aplica; score en vivo en verde
- [x] Fix home: usa resolveTeams() (en vez de matchTeams) para mostrar equipos reales en eliminatorias, no códigos de slot (2º A)
- [x] Fix scoring eliminatorias: calcPoints infiere ganador por marcador si result.winner no viene de ESPN; scraper añade fallback igual
- [x] Fix scraper: KNOCKOUT_START cambiado a datetime 28-jun 20:00 (antes comparaba solo fecha, marcando partidos de grupos del 28 jun madrugada como knockout); standings.json corregido para Colombia-Portugal, RDCongo-Uzbekistán, Argelia-Austria, Jordania-Argentina
- [x] Bracket confirmado: 8 terceros asignados (RD Congo·K, Suecia·F, Ecuador·E, Ghana·L, Bosnia·B, Argelia·J, Paraguay·D, Senegal·I); partidos 3º actualizados con equipos reales; flag España P84 confirmado (2→1); P86 Argentina vs Cabo Verde sin España (2→0); bridge de apuestas antiguas 1ºX_vs_3º → nombres reales

## Pendiente

### Quiniela
- [x] tournament_results.json: resultados oficiales de torneo como fichero editable (sustituye tabla Supabase); aliases por campo para cubrir variantes ortográficas (Mbappé/Mbappe/etc.)
- [x] Popup final: "DÍA PARA LA HISTORIA" (2 páginas) — aparece el 19 jul, se guarda en localStorage
- [x] Fix fase home: muestra fase de los partidos de hoy (no del último iniciado), evita "3ER Y 4º PUESTO" el día de la final
- [x] Final y 3er puesto actualizados: España vs Argentina (final), Francia vs Inglaterra (3er/4º)
- [ ] Desarrollar más funcionalidad según avance el torneo

### Otros
- [ ] Marcador en directo dentro del partido (score live durante el partido)
- [ ] Notificaciones push — infraestructura lista (SW, push.js, GitHub Actions cron, tablas Supabase), pendiente depurar inyección VAPID key y activar botón (#push-section oculto por CSS)
- [ ] Comparador de estadísticas entre jugadores

## Estado del torneo (actualizado 20 jun)

- [x] **Home live activo**: `HOME_PREVIEW_STARTED` automático por fecha desde el 11 jun
- [x] **Slug ESPN confirmado**: `fifa.world` (no `fifa.world-cup`); scraper y Worker funcionando
- [x] **match_id verificado**: IDs del scraper coinciden con `matchId()` del frontend (salvo el caso Brasil-Haití resuelto por hora real vs programada)
- [x] **Alineaciones ESPN exploradas**: `summary?event={id}` devuelve `rosters` (titulares, suplentes, formación, `subbedIn/Out`) y `keyEvents` (goles, tarjetas, cambios con minuto). Dato disponible ~1h antes del pitido. Descartado implementar por ahora.
- [ ] **Activar botón de notificaciones push**: descomentar `#push-section` en CSS y depurar inyección de VAPID key en el deploy
- [ ] **Ajustar ventana de live polling**: verificar que los 130 min desde kickoff cubren prórrogas y penaltis

## Ideas a valorar
- [ ] "Yo estuve aquí" — botón por partido, activo solo durante la ventana del partido (mismo criterio que el chat: día del partido hasta kickoff +3h). Un click por usuario por partido. Al final del mundial, contador de partidos vistos visible en Apuestas. Auth: login de Apuestas. Tabla: `checkins (id, match_id, user_id, created_at)`, unique constraint en (match_id, user_id).
- [ ] Chat por partido — comentarios en tiempo real (Supabase Realtime). Ventana: día del partido hasta kickoff +3h. Auth: login de Apuestas (solo lectura si no estás logueado). Tabla: `comments (id, match_id, user_id, text varchar(140), created_at)`. UI: icono 💬 en fila del Calendario cuando el chat está activo.
- [ ] Alineaciones por partido — datos disponibles vía ESPN `summary?event={id}` (rosters + keyEvents); descartado por ahora pero trivial de añadir
- [ ] Widget de "próximo partido de España" para compartir como imagen
- [ ] Historial de ediciones anteriores del Mundial
