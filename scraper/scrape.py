#!/usr/bin/env python3
"""
Actualiza standings.json usando la API unofficial de ESPN (sin clave, sin coste).
Slug correcto: fifa.world  (no fifa.world-cup)
"""

import json
import re
import sys
from datetime import datetime, timezone, date, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

OUT_FILE = Path(__file__).parent.parent / "standings.json"
MADRID   = ZoneInfo("Europe/Madrid")
HEADERS  = {"User-Agent": "Mozilla/5.0 (compatible; Mundial2026Scraper/1.0)"}
BASE     = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world"
BASE_V2  = "https://site.api.espn.com/apis/v2/sports/soccer/fifa.world"

NAMES_ES = {
    "Mexico": "México", "South Korea": "Corea del Sur",
    "Czech Republic": "Rep. Checa", "Czechia": "Rep. Checa",
    "South Africa": "Sudáfrica", "Canada": "Canadá", "Switzerland": "Suiza",
    "Bosnia": "Bosnia", "Bosnia-Herzegovina": "Bosnia", "Qatar": "Catar",
    "Brazil": "Brasil", "Morocco": "Marruecos", "Scotland": "Escocia",
    "Haiti": "Haití", "United States": "Estados Unidos", "USA": "Estados Unidos",
    "Australia": "Australia", "Turkey": "Turquía", "Turkiye": "Turquía", "Türkiye": "Turquía", "Paraguay": "Paraguay",
    "Germany": "Alemania", "Ivory Coast": "Costa de Marfil",
    "Côte d'Ivoire": "Costa de Marfil", "Ecuador": "Ecuador", "Curacao": "Curazao", "Curaçao": "Curazao",
    "Netherlands": "Países Bajos", "Japan": "Japón", "Sweden": "Suecia",
    "Tunisia": "Túnez", "Belgium": "Bélgica", "New Zealand": "Nueva Zelanda",
    "Iran": "RI de Irán", "IR Iran": "RI de Irán", "Egypt": "Egipto",
    "Spain": "España", "Uruguay": "Uruguay", "Saudi Arabia": "Arabia Saudí",
    "Cape Verde": "Cabo Verde", "France": "Francia", "Senegal": "Senegal",
    "Norway": "Noruega", "Iraq": "Irak", "Argentina": "Argentina",
    "Austria": "Austria", "Algeria": "Argelia", "Jordan": "Jordania",
    "Portugal": "Portugal", "Colombia": "Colombia", "DR Congo": "RD Congo",
    "Congo DR": "RD Congo", "Democratic Republic of Congo": "RD Congo", "Uzbekistan": "Uzbekistán",
    "England": "Inglaterra", "Croatia": "Croacia", "Ghana": "Ghana", "Panama": "Panamá",
}

FLAGS = {
    "México": "🇲🇽", "Corea del Sur": "🇰🇷", "Rep. Checa": "🇨🇿", "Sudáfrica": "🇿🇦",
    "Canadá": "🇨🇦", "Suiza": "🇨🇭", "Bosnia": "🇧🇦", "Catar": "🇶🇦",
    "Brasil": "🇧🇷", "Marruecos": "🇲🇦", "Escocia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Haití": "🇭🇹",
    "Estados Unidos": "🇺🇸", "Australia": "🇦🇺", "Turquía": "🇹🇷", "Paraguay": "🇵🇾",
    "Alemania": "🇩🇪", "Costa de Marfil": "🇨🇮", "Ecuador": "🇪🇨", "Curazao": "🇨🇼",
    "Países Bajos": "🇳🇱", "Japón": "🇯🇵", "Suecia": "🇸🇪", "Túnez": "🇹🇳",
    "Bélgica": "🇧🇪", "Nueva Zelanda": "🇳🇿", "RI de Irán": "🇮🇷", "Egipto": "🇪🇬",
    "España": "🇪🇸", "Uruguay": "🇺🇾", "Arabia Saudí": "🇸🇦", "Cabo Verde": "🇨🇻",
    "Francia": "🇫🇷", "Senegal": "🇸🇳", "Noruega": "🇳🇴", "Irak": "🇮🇶",
    "Argentina": "🇦🇷", "Austria": "🇦🇹", "Argelia": "🇩🇿", "Jordania": "🇯🇴",
    "Portugal": "🇵🇹", "Colombia": "🇨🇴", "RD Congo": "🇨🇩", "Uzbekistán": "🇺🇿",
    "Inglaterra": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croacia": "🇭🇷", "Ghana": "🇬🇭", "Panamá": "🇵🇦",
}


def to_spain_dt(iso_date: str):
    dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00")).astimezone(MADRID)
    return dt.strftime("%Y-%m-%d"), dt.strftime("%H:%M")


def to_match_id(home_es: str, away_es: str, date_str: str, time_str: str) -> str:
    label = f"{home_es} vs {away_es}"
    label = re.sub(r"\s+vs\s+", "_vs_", label)
    label = label.replace(" ", "")
    return f"{date_str}_{time_str}_{label}"


def fetch_scoreboard(dates_param: str) -> dict:
    resp = requests.get(
        f"{BASE}/scoreboard",
        headers=HEADERS,
        params={"dates": dates_param, "limit": 100},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def parse_scoreboard(data: dict) -> tuple:
    """Returns (results_dict, event_ids for ft matches)."""
    results   = {}
    event_ids = []
    for event in data.get("events", []):
        comp  = event.get("competitions", [{}])[0]
        state = comp.get("status", {}).get("type", {}).get("state", "")
        if state not in ("in", "post"):
            continue

        home = next((c for c in comp.get("competitors", []) if c.get("homeAway") == "home"), None)
        away = next((c for c in comp.get("competitors", []) if c.get("homeAway") == "away"), None)
        if not home or not away:
            continue

        home_es = NAMES_ES.get(home["team"]["displayName"], home["team"]["displayName"])
        away_es = NAMES_ES.get(away["team"]["displayName"], away["team"]["displayName"])

        try:
            date_str, time_str = to_spain_dt(event["date"])
        except Exception:
            continue

        mid    = to_match_id(home_es, away_es, date_str, time_str)
        status = "live" if state == "in" else "ft"
        results[mid] = {
            "home":   int(home.get("score") or 0),
            "away":   int(away.get("score") or 0),
            "status": status,
        }
        if status == "ft":
            event_ids.append(event["id"])
    return results, event_ids


def fetch_summary(event_id: str) -> dict:
    resp = requests.get(
        f"{BASE}/summary",
        headers=HEADERS,
        params={"event": event_id},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def parse_top_stats(event_ids: list) -> tuple:
    """Extrae goles y asistencias de los keyEvents de cada partido."""
    goals   = {}  # player -> {player, team, flag, goals, assists}
    assists = {}

    for eid in event_ids:
        try:
            data = fetch_summary(eid)
        except Exception as e:
            print(f"  AVISO summary {eid}: {e}", file=sys.stderr)
            continue

        for ke in data.get("keyEvents", []):
            if ke.get("type", {}).get("type") != "goal":
                continue
            parts   = ke.get("participants", [])
            team_en = ke.get("team", {}).get("displayName", "")
            team_es = NAMES_ES.get(team_en, team_en)
            flag    = FLAGS.get(team_es, "")

            if parts:
                scorer = parts[0].get("athlete", {}).get("displayName", "")
                if scorer:
                    if scorer not in goals:
                        goals[scorer] = {"player": scorer, "team": team_es, "flag": flag, "goals": 0, "assists": 0}
                    goals[scorer]["goals"] += 1

            if len(parts) > 1:
                assister = parts[1].get("athlete", {}).get("displayName", "")
                if assister:
                    if assister not in assists:
                        assists[assister] = {"player": assister, "team": team_es, "flag": flag, "goals": 0, "assists": 0}
                    assists[assister]["assists"] += 1

    top_scorers = sorted(goals.values(),   key=lambda x: -x["goals"])[:20]
    top_assists = sorted(assists.values(), key=lambda x: -x["assists"])[:20]
    return top_scorers, top_assists


def fetch_all_results(existing: dict) -> tuple:
    """Recorre día a día desde el 11 jun hasta hoy. Returns (results, event_ids)."""
    start = date(2026, 6, 11)
    today = datetime.now(MADRID).date()
    results   = dict(existing)
    event_ids = []

    d = start
    while d <= today:
        dates_param = d.strftime("%Y%m%d")
        try:
            data = fetch_scoreboard(dates_param)
            day_results, day_ids = parse_scoreboard(data)
            for mid, r in day_results.items():
                if r["status"] == "ft" or mid not in results:
                    results[mid] = r
            event_ids.extend(day_ids)
            if day_results:
                print(f"  {d}: {len(day_results)} partidos")
        except Exception as e:
            print(f"  AVISO {d}: {e}", file=sys.stderr)
        d += timedelta(days=1)

    return results, event_ids


def fetch_groups() -> dict:
    resp = requests.get(f"{BASE_V2}/standings", headers=HEADERS, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    groups = {}
    for group in data.get("children", []):
        name   = group.get("name", "")
        m      = re.search(r"Group\s+([A-L])", name)
        if not m:
            continue
        letter  = m.group(1)
        entries = group.get("standings", {}).get("entries", [])

        teams = []
        for entry in entries:
            en_name = entry.get("team", {}).get("displayName", "")
            es_name = NAMES_ES.get(en_name, en_name)
            stats   = {s["name"]: s.get("value", 0) for s in entry.get("stats", []) if "value" in s}

            gf  = int(stats.get("pointsFor",       0))
            gc  = int(stats.get("pointsAgainst",   0))
            dg  = int(stats.get("pointDifferential", gf - gc))
            pts = int(stats.get("points", 0))
            g   = int(stats.get("wins",   0))
            e   = int(stats.get("ties",   0))
            p   = int(stats.get("losses", 0))
            pj  = int(stats.get("gamesPlayed", g + e + p))

            teams.append({
                "team": es_name, "flag": FLAGS.get(es_name, ""),
                "pj": pj, "g": g, "e": e, "p": p,
                "gf": gf, "gc": gc, "dg": dg, "pts": pts,
            })

        if teams:
            groups[letter] = teams  # ESPN ya los devuelve ordenados

    return groups


def main():
    existing = {}
    if OUT_FILE.exists():
        try:
            existing = json.loads(OUT_FILE.read_text(encoding="utf-8"))
        except Exception:
            pass

    print("Obteniendo resultados (ESPN, día a día)…")
    match_results, event_ids = fetch_all_results(existing.get("matchResults", {}))
    print(f"  → {len(match_results)} resultados, {len(event_ids)} partidos terminados")

    print("Obteniendo clasificaciones (ESPN standings)…")
    try:
        groups = fetch_groups()
        print(f"  → {len(groups)} grupos")
    except Exception as e:
        print(f"AVISO standings: {e}", file=sys.stderr)
        groups = existing.get("groups", {})

    if not groups:
        print("Sin datos de grupos — standings.json no se actualiza.", file=sys.stderr)
        sys.exit(0)

    print(f"Obteniendo goleadores/asistentes ({len(event_ids)} summaries)…")
    if event_ids:
        top_scorers, top_assists = parse_top_stats(event_ids)
        print(f"  → {len(top_scorers)} goleadores, {len(top_assists)} asistentes")
    else:
        top_scorers = existing.get("topScorers", [])
        top_assists = existing.get("topAssists", [])

    OUT_FILE.write_text(json.dumps({
        "updated":      datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "groups":       groups,
        "topScorers":   top_scorers,
        "topAssists":   top_assists,
        "matchResults": match_results,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"✓ standings.json actualizado — {len(groups)} grupos, {len(match_results)} resultados, {len(top_scorers)} goleadores")


if __name__ == "__main__":
    main()
