# TODO · Mundial 2026

## Completado
- [x] Pestaña Noticias — RSS de Marca, AS y Mundo Deportivo
- [x] Pestaña Quiniela Cachorros — apuesta por partido, mis apuestas, clasificación
- [x] Auth estilo Tricount — contraseña de grupo + picker de nombre
- [x] Puntuación automática: 3 pts exacto, 1 pt ganador correcto
- [x] Ver apuestas del grupo (en Apostar y en Mis apuestas)
- [x] Resultados automáticos desde API-Football (standings.json → matchResults)
- [x] Próximo partido en Quiniela cuando no hay partidos hoy
- [x] Toast de confirmación al guardar apuesta
- [x] Cierre de apuestas automático 5 min antes del pitido
- [x] Pull-to-refresh en todas las pestañas
- [x] Bracket visual en árbol con hint de scroll
- [x] Bottom tab bar con iconos SVG + scroll horizontal
- [x] Badge GitHub + footer con autoría y disclaimer compacto
- [x] Separar index.html en módulos JS (js/)
- [x] Service Worker: cacheo offline + banner de actualización
- [x] Auditoría: XSS noticias, timezone CET/CEST, null checks, límites de navegación

## Pendiente

### Inicio
- [x] Pestaña Inicio — cuenta atrás para el Mundial (primera pestaña, primera en cargarse)

### Quiniela Cachorros
- [ ] Desarrollar más funcionalidad según avance el torneo
- [ ] Puntuación apuestas de torneo — crear tabla `tournament_results` en Supabase con los resultados oficiales (campeón, finalista, goleador, portero, sorpresa, fase España) y calcular puntos automáticamente comparando con las predicciones de cada usuario

### Otros
- [x] Filtro rápido "Solo España" en el calendario — botón/chip visible para ver solo los partidos de España
- [ ] Marcador en directo dentro del partido (score live durante el partido)
- [ ] Resultados de partidos ya jugados (marcadores finales en el calendario)
- [ ] Notificaciones push — infraestructura lista (SW, push.js, GitHub Actions cron, tablas Supabase), pendiente depurar inyección VAPID key y activar botón (#push-section oculto por CSS)
- [ ] Comparador de estadísticas entre jugadores

### Analytics
- [x] Cloudflare Web Analytics — crear cuenta, obtener snippet y añadir a index.html

### Sedes
- [x] Pestaña Sedes — info de las 16 ciudades y estadios en EE.UU., Canadá y México (nueva pestaña, última en la barra)

## Ideas a valorar
- [ ] Predictor/simulador de grupos (quién pasa)
- [ ] Widget de "próximo partido de España" para compartir como imagen
- [ ] Historial de ediciones anteriores del Mundial
