"""
Fetches pre-match odds for all World Cup 2026 matches from The Odds API
and writes odds.json to the project root.

Run manually:  python scraper/update_odds.py
Requires env:  ODDS_API_KEY
"""
import os, json, sys
from datetime import datetime, timezone, timedelta
import requests

API_KEY  = os.environ.get('ODDS_API_KEY', '')
SPORT    = 'soccer_fifa_world_cup'
BASE_URL = 'https://api.the-odds-api.com/v4/sports'

# English → Spanish team names (mirrors SQUAD_NAMES_ES in squads.js)
TEAM_ES = {
    'Algeria': 'Argelia', 'Argentina': 'Argentina', 'Australia': 'Australia',
    'Austria': 'Austria', 'Belgium': 'Bélgica',
    'Bosnia and Herzegovina': 'Bosnia', 'Bosnia & Herzegovina': 'Bosnia',
    'Brazil': 'Brasil', 'Canada': 'Canadá', 'Cape Verde': 'Cabo Verde',
    'Colombia': 'Colombia', 'Croatia': 'Croacia', 'Curaçao': 'Curazao',
    'Czech Republic': 'Rep. Checa', 'Czechia': 'Rep. Checa',
    'DR Congo': 'RD Congo', 'Ecuador': 'Ecuador',
    'Egypt': 'Egipto', 'England': 'Inglaterra', 'France': 'Francia',
    'Germany': 'Alemania', 'Ghana': 'Ghana', 'Haiti': 'Haití',
    'Iran': 'RI de Irán', 'Iraq': 'Irak', 'Ivory Coast': 'Costa de Marfil',
    "Côte d'Ivoire": 'Costa de Marfil',
    'Japan': 'Japón', 'Jordan': 'Jordania', 'Mexico': 'México',
    'Morocco': 'Marruecos', 'Netherlands': 'Países Bajos',
    'New Zealand': 'Nueva Zelanda', 'Norway': 'Noruega',
    'Panama': 'Panamá', 'Paraguay': 'Paraguay', 'Portugal': 'Portugal',
    'Qatar': 'Catar', 'Saudi Arabia': 'Arabia Saudí',
    'Scotland': 'Escocia', 'Senegal': 'Senegal', 'South Africa': 'Sudáfrica',
    'South Korea': 'Corea del Sur', 'Korea Republic': 'Corea del Sur',
    'Spain': 'España', 'Sweden': 'Suecia', 'Switzerland': 'Suiza',
    'Tunisia': 'Túnez', 'Turkey': 'Turquía', 'Turkiye': 'Turquía',
    'United States': 'Estados Unidos', 'USA': 'Estados Unidos',
    'Uruguay': 'Uruguay', 'Uzbekistan': 'Uzbekistán', 'Uzbekistán': 'Uzbekistán',
}

# Preferred bookmakers in priority order (EU region)
BOOK_PRIORITY = ['bet365', 'bwin', 'unibet_eu', 'betfair_ex_eu', 'williamhill', 'pinnacle']

# Spain is CEST (UTC+2) throughout the entire tournament (June–July)
CEST = timedelta(hours=2)


def utc_to_spain(utc_str: str) -> tuple[str, str]:
    dt = datetime.fromisoformat(utc_str.replace('Z', '+00:00'))
    sp = dt + CEST
    return sp.strftime('%Y-%m-%d'), sp.strftime('%H:%M')


def make_match_id(home_es: str, away_es: str, date: str, time: str) -> str:
    """Must produce the same value as matchId() in matches.js."""
    home = home_es.replace(' ', '')
    away = away_es.replace(' ', '')
    return f'{date}_{time}_{home}_vs_{away}'


def pick_bookmaker(bookmakers: list) -> dict | None:
    for key in BOOK_PRIORITY:
        bm = next((b for b in bookmakers if b.get('key') == key), None)
        if bm:
            return bm
    return bookmakers[0] if bookmakers else None


def main():
    if not API_KEY:
        print('ERROR: ODDS_API_KEY not set', file=sys.stderr)
        sys.exit(1)

    resp = requests.get(
        f'{BASE_URL}/{SPORT}/odds/',
        params={
            'apiKey':     API_KEY,
            'regions':    'eu',
            'markets':    'h2h',
            'oddsFormat': 'decimal',
        },
        timeout=20,
    )
    resp.raise_for_status()

    matches   = resp.json()
    remaining = resp.headers.get('x-requests-remaining', '?')
    used      = resp.headers.get('x-requests-used', '?')
    print(f'Odds API: {len(matches)} matches · used {used} · {remaining} remaining')

    odds = {}
    for m in matches:
        home_en = m.get('home_team', '')
        away_en = m.get('away_team', '')
        home_es = TEAM_ES.get(home_en, home_en)
        away_es = TEAM_ES.get(away_en, away_en)
        date, time = utc_to_spain(m['commence_time'])

        bm = pick_bookmaker(m.get('bookmakers', []))
        if not bm:
            continue

        h2h = next((mk for mk in bm.get('markets', []) if mk['key'] == 'h2h'), None)
        if not h2h:
            continue

        oc = {o['name']: o['price'] for o in h2h.get('outcomes', [])}
        # Outcomes use the API's own team-name strings
        home_price = oc.get(home_en) or oc.get(home_es)
        away_price = oc.get(away_en) or oc.get(away_es)
        draw_price = oc.get('Draw')

        if not home_price or not away_price:
            continue

        mid = make_match_id(home_es, away_es, date, time)
        odds[mid] = {
            'home':       round(home_price, 2),
            'draw':       round(draw_price, 2) if draw_price else None,
            'away':       round(away_price, 2),
            'bookmaker':  bm['title'],
        }
        print(f'  {mid}: {home_price} · {draw_price} · {away_price} [{bm["title"]}]')

    out  = {'updated': datetime.now(timezone.utc).isoformat(), 'odds': odds}
    path = os.path.join(os.path.dirname(__file__), '..', 'odds.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'Saved {len(odds)} matches → odds.json')


if __name__ == '__main__':
    main()
