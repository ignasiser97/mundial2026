#!/usr/bin/env python3
"""
Scraper: Convocados Mundial FIFA 2026
Fuente: Wikipedia (en) — 2026_FIFA_World_Cup_squads
Datos extraídos por jugador:
  - name (nombre completo)
  - first_name / last_name  (si se puede separar)
  - team (selección)
  - confederation (UEFA, CONMEBOL, etc.)
  - position (GK / DF / MF / FW)
  - shirt_number
  - club
  - club_country
  - date_of_birth
  - age
  - caps
  - goals

Uso:
    pip install requests beautifulsoup4 lxml
    python wc2026_scraper.py
    → genera wc2026_squads.json y wc2026_squads.csv
"""

import re
import json
import time
import csv
import sys
from datetime import datetime

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    sys.exit("Instala dependencias: pip install requests beautifulsoup4 lxml")

# ── Configuración ────────────────────────────────────────────────────────────

URL = "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_squads"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
OUTPUT_JSON = "../squads.json"
OUTPUT_CSV  = "wc2026_squads.csv"

# Mapeo confederación → selecciones (para enriquecer el JSON)
CONFEDERATION_MAP = {
    "UEFA": [
        "Albania", "Austria", "Belgium", "Croatia", "Czech Republic",
        "Denmark", "England", "France", "Georgia", "Germany", "Greece",
        "Hungary", "Italy", "Netherlands", "Northern Ireland",
        "Poland", "Portugal", "Romania", "Scotland", "Serbia",
        "Slovakia", "Slovenia", "Spain", "Switzerland", "Turkey",
        "Ukraine", "Wales",
    ],
    "CONMEBOL": [
        "Argentina", "Bolivia", "Brazil", "Chile", "Colombia",
        "Ecuador", "Paraguay", "Peru", "Uruguay", "Venezuela",
    ],
    "CONCACAF": [
        "Canada", "Costa Rica", "Cuba", "El Salvador", "Guatemala",
        "Haiti", "Honduras", "Jamaica", "Mexico", "Panama",
        "Trinidad and Tobago", "United States",
    ],
    "CAF": [
        "Algeria", "Angola", "Cameroon", "Comoros", "Congo",
        "DR Congo", "Egypt", "Equatorial Guinea", "Ghana",
        "Ivory Coast", "Mali", "Mauritania", "Morocco", "Nigeria",
        "Senegal", "South Africa", "Tanzania", "Tunisia",
        "Uganda", "Zambia",
    ],
    "AFC": [
        "Australia", "Bahrain", "China", "Indonesia", "Iran",
        "Iraq", "Japan", "Jordan", "Kuwait", "Kyrgyzstan",
        "North Korea", "Oman", "Palestine", "Qatar", "Saudi Arabia",
        "South Korea", "Syria", "Tajikistan", "Thailand",
        "United Arab Emirates", "Uzbekistan",
    ],
    "OFC": ["New Zealand"],
}

def get_confederation(team: str) -> str:
    for conf, teams in CONFEDERATION_MAP.items():
        if team in teams:
            return conf
    return "Unknown"


# ── Parser ───────────────────────────────────────────────────────────────────

def clean(text: str) -> str:
    """Limpia referencias wiki, notas y espacios extra."""
    text = re.sub(r"\[.*?\]", "", text)   # quita [1], [a], etc.
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_dob(dob_str: str):
    """Extrae fecha de nacimiento y edad del texto wiki."""
    # Formato típico: "(1998-05-15)May 15, 1998(aged 27)" o "May 15, 1998 (aged 27)"
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", dob_str)
    age_match  = re.search(r"aged\s+(\d+)", dob_str)
    dob  = date_match.group(1) if date_match else clean(dob_str)
    age  = int(age_match.group(1)) if age_match else None
    return dob, age


def parse_squad_table(table, team_name: str) -> list[dict]:
    """Parsea una tabla HTML de convocados de Wikipedia."""
    players = []
    rows = table.find_all("tr")

    for row in rows[1:]:  # skip header
        cols = row.find_all(["td", "th"])
        if len(cols) < 4:
            continue

        texts = [clean(col.get_text(" ", strip=True)) for col in cols]

        # Wikipedia usa columnas: No. | Pos | Player | DOB | Caps | Goals | Club
        # El número de columnas puede variar; detectamos por cantidad
        if len(texts) >= 7:
            shirt   = texts[0]
            pos     = texts[1]
            name    = texts[2]
            dob_raw = texts[3]
            caps    = texts[4]
            goals   = texts[5]
            club_raw = texts[6]
        elif len(texts) == 6:
            shirt   = texts[0]
            pos     = texts[1]
            name    = texts[2]
            dob_raw = texts[3]
            caps    = texts[4]
            goals   = ""
            club_raw = texts[5]
        elif len(texts) == 5:
            shirt   = texts[0]
            pos     = texts[1]
            name    = texts[2]
            dob_raw = texts[3]
            caps    = ""
            goals   = ""
            club_raw = texts[4]
        else:
            continue

        # Filtrar filas de encabezado repetido
        if pos in ("Pos.", "Pos", "#", "No.") or not name:
            continue

        # Limpiar posición: extraer solo GK/DF/MF/FW (Wikipedia a veces añade el dorsal)
        pos_match = re.search(r"\b(GK|DF|MF|FW)\b", pos)
        pos = pos_match.group(1) if pos_match else pos

        # Extraer club y país del club
        # Formato típico: "Real Madrid (ESP)" o "Real Madrid  Spain"
        club_country_match = re.search(r"\(([A-Z]{2,4})\)", club_raw)
        club_country = club_country_match.group(1) if club_country_match else ""
        club_name = re.sub(r"\s*\([A-Z]{2,4}\)\s*", "", club_raw).strip()

        dob, age = parse_dob(dob_raw)

        # Separar nombre/apellido (heurística: última palabra = apellido)
        name_parts = name.split()
        if len(name_parts) >= 2:
            last_name  = name_parts[-1]
            first_name = " ".join(name_parts[:-1])
        else:
            last_name  = name
            first_name = ""

        try:
            shirt_num = int(shirt)
        except ValueError:
            shirt_num = None

        try:
            caps_num = int(caps) if caps else None
        except ValueError:
            caps_num = None

        try:
            goals_num = int(goals) if goals else None
        except ValueError:
            goals_num = None

        players.append({
            "shirt_number": shirt_num,
            "name":         name,
            "first_name":   first_name,
            "last_name":    last_name,
            "team":         team_name,
            "confederation": get_confederation(team_name),
            "position":     pos,
            "date_of_birth": dob,
            "age":          age,
            "caps":         caps_num,
            "goals":        goals_num,
            "club":         club_name,
            "club_country": club_country,
        })

    return players


def scrape() -> list[dict]:
    print(f"Descargando: {URL}")
    resp = requests.get(URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    print(f"  OK — {len(resp.content):,} bytes")

    soup = BeautifulSoup(resp.text, "lxml")
    all_players = []
    teams_found = 0

    # Cada selección tiene un h2 o h3 con su nombre, seguido de tablas
    # Iteramos todos los elementos del contenido principal
    content = soup.find("div", {"id": "mw-content-text"})
    if not content:
        content = soup

    current_team = None

    for tag in content.find_all(["h2", "h3", "table"]):
        if tag.name in ("h2", "h3"):
            heading_text = clean(tag.get_text())
            # Filtrar encabezados que no son selecciones
            skip = ["Contents", "Group", "References", "See also",
                    "External links", "Notes", "edit", "FIFA World Cup"]
            if any(s in heading_text for s in skip):
                current_team = None
                continue
            # Limpiar corchetes y "edit"
            heading_text = re.sub(r"\[edit\]", "", heading_text).strip()
            if heading_text:
                current_team = heading_text

        elif tag.name == "table" and current_team:
            # Verificar que es una tabla de jugadores (tiene columnas Pos.)
            headers_text = tag.get_text()
            if any(kw in headers_text for kw in ["GK", "DF", "MF", "FW", "Pos"]):
                players = parse_squad_table(tag, current_team)
                if players:
                    all_players.extend(players)
                    teams_found += 1
                    print(f"  ✓ {current_team}: {len(players)} jugadores")
                    # Resetear para no duplicar si hay varias tablas por equipo
                    current_team = None

    print(f"\nTotal: {len(all_players)} jugadores / {teams_found} selecciones")
    return all_players


def save_json(players: list[dict], path: str):
    # Agrupar también por selección para mejor legibilidad
    by_team: dict[str, list] = {}
    for p in players:
        by_team.setdefault(p["team"], []).append(p)

    output = {
        "meta": {
            "source": URL,
            "scraped_at": datetime.utcnow().isoformat() + "Z",
            "total_players": len(players),
            "total_teams": len(by_team),
        },
        "players": players,
        "by_team": by_team,
    }

    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"JSON guardado: {path}")


def save_csv(players: list[dict], path: str):
    if not players:
        return
    fields = list(players[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(players)
    print(f"CSV guardado:  {path}")


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    players = scrape()

    if not players:
        print("\n⚠ No se extrajeron jugadores. Posibles causas:")
        print("  - Wikipedia bloqueó la petición (añade cookies/session)")
        print("  - La estructura HTML cambió")
        sys.exit(1)

    save_json(players, OUTPUT_JSON)
    save_csv(players, OUTPUT_CSV)

    # Preview
    print("\n── Muestra (primeros 3 jugadores) ──────────────────")
    for p in players[:3]:
        print(json.dumps(p, ensure_ascii=False, indent=2))
