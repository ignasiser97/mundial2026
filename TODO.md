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

## Ideas a valorar
- [ ] "Yo estuve aquí" — botón por partido, activo solo durante la ventana del partido (mismo criterio que el chat: día del partido hasta kickoff +3h). Un click por usuario por partido. Al final del mundial, contador de partidos vistos visible en Apuestas. Auth: login de Apuestas. Tabla: `checkins (id, match_id, user_id, created_at)`, unique constraint en (match_id, user_id).
- [ ] Chat por partido — comentarios en tiempo real (Supabase Realtime). Ventana: día del partido hasta kickoff +3h. Auth: login de Apuestas (solo lectura si no estás logueado). Tabla: `comments (id, match_id, user_id, text varchar(140), created_at)`. UI: icono 💬 en fila del Calendario cuando el chat está activo.
- [ ] Alineaciones por partido — investigar fuente de datos (API-Football /fixtures/lineups, Wikipedia, Sofascore scraping)
- [ ] Predictor/simulador de grupos (quién pasa)
- [ ] Widget de "próximo partido de España" para compartir como imagen
- [ ] Historial de ediciones anteriores del Mundial
