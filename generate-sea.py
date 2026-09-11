"""Regenerate bundled SEA calendars with: pip install holidays==0.104; python generate-sea.py"""
import json
from pathlib import Path
import holidays

CODES = ['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'TL', 'VN']
output = {}
for code in CODES:
    output[code] = {}
    for year in (2026, 2027):
        national = holidays.country_holidays(code, years=year, language='en_US')
        subdivisions = national.subdivisions
        entries = {}
        for subdivision in subdivisions or (None,):
            calendar = holidays.country_holidays(code, subdiv=subdivision, years=year, language='en_US')
            for day, name in calendar.items():
                if day.year != year:
                    continue
                entry = entries.setdefault((day.isoformat(), name), [])
                if subdivision:
                    entry.append(f'{code}-{subdivision}')
        output[code][str(year)] = [
            {'date': day, 'name': name, 'nationalHoliday': not subdivisions or len(regions) == len(subdivisions),
             'subdivisionCodes': regions or None, 'holidayTypes': ['Public']}
            for (day, name), regions in sorted(entries.items())
        ]
        assert output[code][str(year)], f'Missing calendar: {code} {year}'
Path(__file__).with_name('sea-holidays.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('Generated 2026-2027 calendars for all 11 Southeast Asian countries.')
