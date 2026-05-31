# 🌍 Mundial 2026

> PWA para seguir el Mundial de Fútbol 2026 — calendario, clasificaciones, quiniela y más, todo en español.

[![Live](https://img.shields.io/badge/ver%20app-mundial2026-gold?logo=googlechrome)](https://ignasiser97.github.io/mundial2026/)

---

## ¿Qué es esto?

**Mundial 2026** es una Progressive Web App (PWA) personal para seguir el Mundial de la FIFA 2026 (EE. UU., México y Canadá). Pensada para móvil, funciona sin conexión, se puede instalar en la pantalla de inicio y se actualiza automáticamente con datos en vivo.

---

## Funcionalidades

### 📅 Calendario
- Los 80 partidos del torneo con fecha, hora (horario Madrid), sede y canales de emisión
- Filtros por fecha (selector de calendario), canal (DAZN / La 1), equipo y solo partidos de España
- Indicador 🌙 para partidos de madrugada

### 🏆 Clasificaciones y Bracket
- Tablas de fase de grupos (A–L) actualizadas automáticamente
- Bracket de eliminatorias hasta la Final (MetLife Stadium)

### ⚽ Estadísticas
- Máximos goleadores y asistentes en vivo

### 🗺️ Sedes
- Mapa interactivo (Leaflet) con los 16 estadios sede en Norteamérica
- Información de cada estadio: ciudad, aforo, partidos asignados
- Badges especiales para la final (🏆) y sedes con partido de España (🇪🇸)

### 📰 Noticias
- Agregación de RSS de Marca, AS y Mundo Deportivo
- Deduplicación y filtro por fuente

### 🎯 Quiniela
- Liga privada de predicciones por grupos con contraseña
- Introduce el marcador de cada partido antes del pitido inicial
- Puntuación: **3 pts** resultado exacto · **1 pt** resultado correcto · **0** fallo
- Clasificación de grupo en tiempo real

### 🔔 Notificaciones Push
- Notificaciones incluidas

### 📲 PWA
- Installable (añadir a pantalla de inicio)
- Modo offline con Service Worker
- Banner de actualización automático cuando hay nueva versión

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Vanilla JS, HTML, CSS (sin build step) |
| Mapas | Leaflet.js v1.9.4 |
| Backend / DB | Supabase (PostgreSQL) |
| Datos en vivo | API-Football v3 |
| Notificaciones | Web Push API + `web-push` (Node.js) |
| CI/CD | GitHub Actions + GitHub Pages |
| Analytics | Cloudflare Web Analytics |

---

## Estructura del proyecto

```
mundial/
├── index.html              # SPA shell + CSS embebido
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (caché offline + push)
├── standings.json          # Datos actualizados automáticamente
├── js/
│   ├── app.js              # Navegación, SW, pull-to-refresh
│   ├── matches.js          # Base de datos de los 80 partidos
│   ├── home.js             # Cuenta atrás al inicio del torneo
│   ├── calendar.js         # Filtros y vista de calendario
│   ├── groups.js           # Tablas de grupo y bracket
│   ├── stats.js            # Goleadores y asistentes
│   ├── news.js             # Agregación RSS
│   ├── venues.js           # Mapa de sedes
│   ├── quiniela.js         # Sistema de predicciones
│   └── push.js             # Suscripción a notificaciones
├── scraper/
│   └── scrape.py           # Actualiza standings.json desde API-Football
├── worker/
│   └── send-notifications.js  # Envío de Web Push via Supabase
└── .github/workflows/
    ├── deploy.yml          # Deploy a GitHub Pages
    ├── update.yml          # Actualización horaria de datos
    └── notifications.yml   # Envío de notificaciones cada 5 min
```

---

## Ejecutar en local

No hay build step. Solo clona y abre:

```bash
git clone https://github.com/ignasiser97/mundial.git
cd mundial

# Copia las variables de entorno
cp .env.example .env
# Edita .env con tus claves (API-Football, Supabase, VAPID)

# Sirve con cualquier servidor estático, por ejemplo:
npx serve .
```

### Variables de entorno necesarias

| Variable | Descripción |
|----------|-------------|
| `API_FOOTBALL_KEY` | Clave de API-Football (datos en vivo) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_KEY` | Clave de servicio (solo para el worker) |
| `VAPID_PUBLIC_KEY` | Clave VAPID pública (notificaciones push) |
| `VAPID_PRIVATE_KEY` | Clave VAPID privada (solo para el worker) |

---

## Despliegue

El despliegue es automático al hacer push a `main` mediante GitHub Actions:

1. **`deploy.yml`** — inyecta las credenciales y sube a GitHub Pages
2. **`update.yml`** — cron horario que actualiza `standings.json` con datos reales
3. **`notifications.yml`** — cron cada 5 minutos que envía alertas push de partidos de España

Configura los secretos en *Settings → Secrets and variables → Actions* de tu repositorio.

---

## Proyecto personal · sin ánimo de lucro

Este proyecto no tiene afiliación con la FIFA ni con ninguna entidad oficial. Los datos de partidos se obtienen de fuentes públicas (API-Football, RSS de medios deportivos).

---

*Hecho con ❤️ para el Mundial · [@ignasiser97](https://github.com/ignasiser97)*
