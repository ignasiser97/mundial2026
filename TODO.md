# TODO · Mundial 2026

## En progreso
- [ ] Pestaña Noticias — RSS de periódicos deportivos españoles (Marca, AS, Sport, MD)

## Completado
- [x] Pestaña Quiniela Cachorros — registro con alias, apuesta por partido, mis apuestas, clasificación
- [x] Sistema de usuarios: alias + UUID en localStorage, sin email ni contraseña (Supabase)
- [x] Cierre de apuestas automático 5 min antes del pitido
- [x] Apuestas solo el día del partido

## Pendiente

### Quiniela Cachorros
- [ ] Activar puntuación en clasificación cuando haya resultados (3 pts resultado exacto, 1 pt ganador correcto)
- [ ] Ver las apuestas de los demás amigos una vez cerrado el partido
- [ ] Desarrollar más funcionalidad según avance el torneo

### Arquitectura
- [ ] Separar index.html en módulos JS (matches.js, filters.js, groups.js, stats.js, news.js, quiniela.js) para facilitar el mantenimiento

### Otros
- [ ] Pull-to-refresh (scroll hacia abajo para actualizar datos y noticias)
- [ ] Marcador en directo dentro del partido (score live durante el partido)
- [ ] Bracket visual de la fase eliminatoria (árbol de cruces)
- [ ] Resultados de partidos ya jugados (marcadores finales en el calendario)
- [ ] Notificaciones push antes de cada partido de España
- [ ] Comparador de estadísticas entre jugadores

## Ideas a valorar
- [ ] Predictor/simulador de grupos (quién pasa)
- [ ] Widget de "próximo partido de España" para compartir como imagen
- [ ] Historial de ediciones anteriores del Mundial
