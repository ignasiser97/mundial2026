#!/usr/bin/env python3
"""
Actualiza standings.json con los datos de la API de API-Football.
Liga 1 = FIFA World Cup, temporada 2026.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests
from dotenv import load_dotenv

# Carga .env si existe (desarrollo local); en GitHub Actions usa el Secret directamente
load_dotenv(Path(__file__).parent.parent / ".env")

API_KEY = os.environ.get("API_FOOTBALL_KEY", "")
BASE_URL = "https://v3.football.api-sports.io"
LEAGUE_ID = 1       # FIFA World Cup
SEASON    = 2026

OUT_FILE = Path(__file__).parent.parent / "standings.json"

# Traducción de nombres de equipos de inglés a español
NAMES_ES = {
    "Mexico":              "México",
    "South Korea":         "Corea del Sur",
    "Czech Republic":      "Rep. Checa",
    "South Africa":        "Sudáfrica",
    "Canada":              "Canadá",
    "Switzerland":         "Suiza",
    "Bosnia":              "Bosnia",
    "Qatar":               "Catar",
    "Brazil":              "Brasil",
    "Morocco":             "Marruecos",
    "Scotland":            "Escocia",
    "Haiti":               "Haití",
    "USA":                 "Estados Unidos",
    "United States":       "Estados Unidos",
    "Australia":           "Australia",
    "Turkey":              "Turquía",
    "Paraguay":            "Paraguay",
    "Germany":             "Alemania",
    "Ivory Coast":         "Costa de Marfil",
    "Ecuador":             "Ecuador",
    "Curacao":             "Curazao",
    "Netherlands":         "Países Bajos",
    "Japan":               "Japón",
    "Sweden":              "Suecia",
    "Tunisia":             "Túnez",
    "Belgium":             "Bélgica",
    "New Zealand":         "Nueva Zelanda",
    "Iran":                "RI de Irán",
    "Egypt":               "Egipto",
    "Spain":               "España",
    "Uruguay":             "Uruguay",
    "Saudi Arabia":        "Arabia Saudí",
    "Cape Verde":          "Cabo Verde",
    "France":              "Francia",
    "Senegal":             "Senegal",
    "Norway":              "Noruega",
    "Iraq":                "Irak",
    "Argentina":           "Argentina",
    "Austria":             "Austria",
    "Algeria":             "Argelia",
    "Jordan":              "Jordania",
    "Portugal":            "Portugal",
    "Colombia":            "Colombia",
    "DR Congo":            "RD Congo",
    "Uzbekistan":          "Uzbekistán",
    "England":             "Inglaterra",
    "Croatia":             "Croacia",
    "Ghana":               "Ghana",
    "Panama":              "Panamá",
}

FLAGS = {
    "México":          "🇲🇽", "Corea del Sur":  "🇰🇷", "Rep. Checa":    "🇨🇿", "Sudáfrica":     "🇿🇦",
    "Canadá":          "🇨🇦", "Suiza":          "🇨🇭", "Bosnia":        "🇧🇦", "Catar":         "🇶🇦",
    "Brasil":          "🇧🇷", "Marruecos":      "🇲🇦", "Escocia":       "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "Haití":         "🇭🇹",
    "Estados Unidos":  "🇺🇸", "Australia":      "🇦🇺", "Turquía":       "🇹🇷", "Paraguay":      "🇵🇾",
    "Alemania":        "🇩🇪", "Costa de Marfil":"🇨🇮", "Ecuador":       "🇪🇨", "Curazao":       "🇨🇼",
    "Países Bajos":    "🇳🇱", "Japón":          "🇯🇵", "Suecia":        "🇸🇪", "Túnez":         "🇹🇳",
    "Bélgica":         "🇧🇪", "Nueva Zelanda":  "🇳🇿", "RI de Irán":    "🇮🇷", "Egipto":        "🇪🇬",
    "España":          "🇪🇸", "Uruguay":        "🇺🇾", "Arabia Saudí":  "🇸🇦", "Cabo Verde":    "🇨🇻",
    "Francia":         "🇫🇷", "Senegal":        "🇸🇳", "Noruega":       "🇳🇴", "Irak":          "🇮🇶",
    "Argentina":       "🇦🇷", "Austria":        "🇦🇹", "Argelia":       "🇩🇿", "Jordania":      "🇯🇴",
    "Portugal":        "🇵🇹", "Colombia":       "🇨🇴", "RD Congo":      "🇨🇩", "Uzbekistán":    "🇺🇿",
    "Inglaterra":      "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "Croacia":        "🇭🇷", "Ghana":         "🇬🇭", "Panamá":        "🇵🇦",
}


def _headers() -> dict:
    return {
        "x-apisports-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
    }


def fetch_standings() -> dict:
    resp = requests.get(
        f"{BASE_URL}/standings",
        headers=_headers(),
        params={"league": LEAGUE_ID, "season": SEASON},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()


def fetch_results() -> dict:
    """Devuelve {match_id: {home_score, away_score}} para partidos ya jugados."""
    resp = requests.get(
        f"{BASE_URL}/fixtures",
        headers=_headers(),
        params={"league": LEAGUE_ID, "season": SEASON},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    CEST = timezone(timedelta(hours=2))
    results = {}

    for fix in data.get("response", []):
        status = fix.get("fixture", {}).get("status", {}).get("short", "")
        if status not in ("FT", "AET", "PEN"):
            continue

        goals = fix.get("goals", {})
        home_score = goals.get("home")
        away_score = goals.get("away")
        if home_score is None or away_score is None:
            continue

        # Fecha y hora en CEST
        date_raw = fix.get("fixture", {}).get("date", "")
        try:
            dt_utc = datetime.fromisoformat(date_raw)
            dt_cest = dt_utc.astimezone(CEST)
        except ValueError:
            continue

        date_str = dt_cest.strftime("%Y-%m-%d")
        time_str = dt_cest.strftime("%H:%M")

        home_en = fix.get("teams", {}).get("home", {}).get("name", "")
        away_en = fix.get("teams", {}).get("away", {}).get("name", "")
        home_es = NAMES_ES.get(home_en, home_en)
        away_es = NAMES_ES.get(away_en, away_en)

        # Mismo formato que matchId() en el frontend
        label = f"{home_es} vs {away_es}"
        label = re.sub(r"\s+vs\s+", "_vs_", label)
        label = label.replace(" ", "")
        match_id = f"{date_str}_{time_str}_{label}"

        results[match_id] = {"home": int(home_score), "away": int(away_score)}

    return results


def fetch_top_stats(endpoint: str) -> list:
    resp = requests.get(
        f"{BASE_URL}/players/{endpoint}",
        headers=_headers(),
        params={"league": LEAGUE_ID, "season": SEASON},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()

    result = []
    for item in data.get("response", [])[:20]:
        player = item["player"]
        stats  = item["statistics"][0]
        en_name = stats["team"]["name"]
        es_name = NAMES_ES.get(en_name, en_name)
        result.append({
            "player":  player["name"],
            "team":    es_name,
            "flag":    FLAGS.get(es_name, ""),
            "goals":   stats["goals"]["total"]   or 0,
            "assists": stats["goals"]["assists"]  or 0,
        })
    return result


def parse_groups(raw: dict) -> dict:
    response = raw.get("response", [])
    if not response:
        raise ValueError("La API no devolvió datos de clasificación.")

    standings_list = response[0]["league"]["standings"]
    groups = {}

    for group_standing in standings_list:
        if not group_standing:
            continue

        # El nombre del grupo viene como "Group A", "Group B", etc.
        group_label = group_standing[0].get("group", "")
        letter = group_label.replace("Group ", "").strip()
        if not letter:
            continue

        teams = []
        for entry in group_standing:
            en_name = entry["team"]["name"]
            es_name = NAMES_ES.get(en_name, en_name)
            teams.append({
                "team": es_name,
                "flag": FLAGS.get(es_name, ""),
                "pj":   entry["all"]["played"],
                "g":    entry["all"]["win"],
                "e":    entry["all"]["draw"],
                "p":    entry["all"]["lose"],
                "gf":   entry["all"]["goals"]["for"],
                "gc":   entry["all"]["goals"]["against"],
                "dg":   entry["goalsDiff"],
                "pts":  entry["points"],
            })

        groups[letter] = teams

    return groups


def main() -> None:
    if not API_KEY:
        print("ERROR: Falta la variable de entorno API_FOOTBALL_KEY", file=sys.stderr)
        sys.exit(1)

    print("Consultando API-Football...")
    try:
        raw = fetch_standings()
    except requests.RequestException as e:
        print(f"ERROR al llamar a la API: {e}", file=sys.stderr)
        sys.exit(1)

    errors = raw.get("errors", {})
    if errors:
        print(f"ERROR de la API: {errors}", file=sys.stderr)
        sys.exit(1)

    try:
        groups = parse_groups(raw)
    except (ValueError, KeyError, IndexError) as e:
        print(f"ERROR al procesar los datos: {e}", file=sys.stderr)
        sys.exit(1)

    if not groups:
        print("No hay datos de grupos todavía (el torneo aún no ha comenzado).", file=sys.stderr)
        sys.exit(0)

    print("Obteniendo goleadores y asistentes…")
    try:
        top_scorers = fetch_top_stats("topscorers")
        top_assists = fetch_top_stats("topassists")
    except requests.RequestException as e:
        print(f"AVISO: No se pudieron obtener estadísticas: {e}", file=sys.stderr)
        top_scorers, top_assists = [], []

    print("Obteniendo resultados de partidos…")
    try:
        match_results = fetch_results()
    except requests.RequestException as e:
        print(f"AVISO: No se pudieron obtener resultados: {e}", file=sys.stderr)
        match_results = {}

    result = {
        "updated":       datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "groups":        groups,
        "topScorers":    top_scorers,
        "topAssists":    top_assists,
        "matchResults":  match_results,
    }

    OUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✓ standings.json actualizado — {len(groups)} grupos, {len(match_results)} resultados")


if __name__ == "__main__":
    main()
