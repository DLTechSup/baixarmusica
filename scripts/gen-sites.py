# Gera src/sites.json com os sites que o motor yt-dlp (engine/yt-dlp) consegue baixar.
# Uso: python scripts/gen-sites.py
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'engine', 'yt-dlp'))

from yt_dlp.extractor import gen_extractor_classes  # noqa: E402


def is_adult(ie):
    tests = list(ie.get_testcases(include_onlymatching=False))
    ages = [((t.get('info_dict') or {}).get('age_limit')) for t in tests]
    return bool(ages) and all(a == 18 for a in ages)


sites = {}
for ie in gen_extractor_classes():
    if ie.IE_DESC is False or not ie._WORKING or ie.ie_key() == 'Generic':
        continue
    if is_adult(ie):
        continue
    name = ie.IE_NAME.split(':')[0].strip()
    if not name:
        continue
    key = name.lower()
    entry = sites.setdefault(key, {'name': name, 'desc': '', 'keys': set()})
    # Palavras dos sub-extratores (ex.: "youtube:music:search_url" -> "music"), usadas só na busca
    for part in ie.IE_NAME.lower().replace('_', ':').split(':')[1:]:
        if len(part) > 2 and part not in ('url', 'search', 'playlist', 'user', 'channel', 'tab', 'live', 'video', 'videos'):
            entry['keys'].add(part)
    desc = ie.IE_DESC if isinstance(ie.IE_DESC, str) else ''
    # Só a descrição do extrator principal (sem ":"), não a dos sub-extratores (busca, canais etc.)
    if desc and ':' not in ie.IE_NAME and desc.lower() != name.lower():
        entry['desc'] = desc

result = []
for s in sorted(sites.values(), key=lambda s: s['name'].lower()):
    s['keys'] = ' '.join(sorted(s['keys']))
    result.append({k: v for k, v in s.items() if v})
out = os.path.join(ROOT, 'src', 'sites.json')
with open(out, 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, separators=(',', ':'))
print(f'{len(result)} sites gravados em {out}')
