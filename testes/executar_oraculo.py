"""Corre o cálculo independente sobre os pacotes (dados + cenários)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from oracle import calcular
packs = json.load(open(sys.argv[1]))
out = [[calcular(p['data'], p['today'], c['mode'], c['anchor'], c.get('accs'), c.get('cats'), c.get('win', 7)) for c in p['scenarios']] for p in packs]
json.dump(out, open(sys.argv[2], 'w'))
