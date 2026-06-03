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
- [x] Backup de apuestas — botón admin (solo Nacho) exporta JSON con todas las apuestas organizadas por grupo; group_id añadido a tabla users para soporte multi-grupo
- [x] Nuevo grupo: Prrrrrrrraaaaaacaaas🐶👑👑👑 (id: pracas, 10 miembros)

## Pendiente

### Quiniela Cachorros
- [ ] Desarrollar más funcionalidad según avance el torneo

### Otros
- [ ] Marcador en directo dentro del partido (score live durante el partido)
- [ ] Resultados de partidos ya jugados (marcadores finales en el calendario y en Apuestas pasadas)
- [ ] Notificaciones push — infraestructura lista (SW, push.js, GitHub Actions cron, tablas Supabase), pendiente depurar inyección VAPID key y activar botón (#push-section oculto por CSS)
- [ ] Comparador de estadísticas entre jugadores

## Ideas a valorar
- [ ] Predictor/simulador de grupos (quién pasa)
- [ ] Widget de "próximo partido de España" para compartir como imagen
- [ ] Historial de ediciones anteriores del Mundial
