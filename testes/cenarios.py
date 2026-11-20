"""Cria conjuntos de dados (semente fixa) e cenários de análise para comparar a app com o cálculo independente (oracle.py)."""
import json, random, sys, os
from datetime import date, timedelta
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen import gerar

def conjuntos():
    packs = []
    for seed in range(1, 9):                                                      # 8 conjuntos aleatórios
        packs.append(dict(name=f'aleatorio-{seed}', today='2026-11-06', data=gerar(seed, n_entries=300 + seed * 250)))
    # contas com o primeiro movimento tardio (para testar a identificação de saldos estimados)
    d = gerar(21, n_entries=1200)
    for e in list(d['entries']):
        if e['accountId'] in ('a1', 'a3') and e['date'] < '2026-09-15': d['entries'].remove(e)
        elif e.get('destId') in ('a1', 'a3') and e['date'] < '2026-09-15': d['entries'].remove(e)
    packs.append(dict(name='primeiro-movimento-tardio', today='2026-11-06', data=d))
    # contas sem movimentos nenhuns
    d = gerar(22, n_entries=200, contas=3)
    d['accounts'].append({'id': 'vazia', 'name': 'Conta sem movimentos', 'kind': 'carteira', 'opening': 40.0})
    packs.append(dict(name='conta-sem-movimentos', today='2026-11-06', data=d))
    # só movimentos futuros e dados muito recentes
    d = gerar(23, n_entries=300, dias_atras=5)
    packs.append(dict(name='dados-recentes', today='2026-11-06', data=d))
    # decimais difíceis (soma de cêntimos)
    r = random.Random(24); d = gerar(24, n_entries=0, contas=4)
    for i in range(1500):
        dia = date(2026, 11, 6) - timedelta(days=r.randint(0, 400)); k = r.choice(['income', 'expense', 'expense', 'transfer'])
        a = r.choice(d['accounts']); dst = r.choice([c for c in d['accounts'] if c['id'] != a['id']]) if k == 'transfer' else None
        d['entries'].append({'id': f'e{i}', 'date': dia.isoformat(), 'kind': k, 'amount': r.choice([0.01, 0.02, 0.07, 0.1, 0.2, 0.3, 1.1, 2.2, 3.3, 9.99, 19.99, 1234.56, 0.05, 0.15, 33.33]),
                             'accountId': a['id'], 'destId': dst['id'] if dst else None, 'category': r.choice(['outros', 'lazer', 'saude']) if k == 'expense' else 'outros', 'note': '', 'goalId': None, 'recId': None})
    packs.append(dict(name='decimais', today='2026-11-06', data=d))
    # saldos negativos (cartão/descoberto) e despesas grandes
    d = gerar(25, n_entries=600)
    for c in d['accounts']: c['opening'] = -abs(c['opening']) - 100
    packs.append(dict(name='saldos-negativos', today='2026-11-06', data=d))
    # anos bissextos e viragens de ano, com «hoje» em março de 2024
    r = random.Random(26); d = gerar(26, n_entries=0, contas=3)
    for i in range(900):
        dia = date(2024, 3, 10) - timedelta(days=r.randint(0, 800)); k = r.choice(['income', 'expense', 'expense', 'transfer'])
        a = r.choice(d['accounts']); dst = r.choice([c for c in d['accounts'] if c['id'] != a['id']]) if k == 'transfer' else None
        d['entries'].append({'id': f'e{i}', 'date': dia.isoformat(), 'kind': k, 'amount': r.randint(1, 90000) / 100, 'accountId': a['id'], 'destId': dst['id'] if dst else None, 'category': r.choice(['lazer', 'casa'.replace('casa', 'habitacao'), 'outros']) if k == 'expense' else 'outros', 'note': '', 'goalId': None, 'recId': None})
    for dia in ['2024-02-28', '2024-02-29', '2024-03-01', '2023-12-31', '2024-01-01', '2024-12-31']:
        d['entries'].append({'id': 'b' + dia, 'date': dia, 'kind': 'expense', 'amount': 12.34, 'accountId': 'a0', 'destId': None, 'category': 'lazer', 'note': '', 'goalId': None, 'recId': None})
    packs.append(dict(name='bissexto-2024', today='2024-03-10', data=d))
    # hoje a 31/12 e a 01/01 (viragem de ano)
    for hoje in ('2025-12-31', '2026-01-01'):
        d = gerar(27, n_entries=800, hoje=date.fromisoformat(hoje)); packs.append(dict(name=f'hoje-{hoje}', today=hoje, data=d))
    return packs

def cenarios(pack, seed):
    r = random.Random(seed); hoje = date.fromisoformat(pack['today']); ids = [c['id'] for c in pack['data']['accounts']]
    cats = ['habitacao', 'alimentacao', 'restaurantes', 'transportes', 'compras', 'desporto', 'viagens', 'lazer', 'subscricoes', 'saude', 'investimentos', 'outros']
    kinds = {c['kind']: [] for c in pack['data']['accounts']}
    for c in pack['data']['accounts']: kinds[c['kind']].append(c['id'])
    ancoras = ['2024-02-29', '2024-03-01', '2024-12-31', '2025-01-01', '2024-12-30', '2025-12-31', '2026-01-01', '2024-02-28', '2024-01-01', '2023-12-31',
               hoje.isoformat(), (hoje - timedelta(days=1)).isoformat(), hoje.replace(day=1).isoformat(), (hoje + timedelta(days=40)).isoformat(), (hoje + timedelta(days=400)).isoformat()]
    out = []
    for modo in ['day', 'week', 'month', 'year']:
        for anc in ancoras: out.append(dict(mode=modo, anchor=anc, accs=None, cats=None, win=7))
    for _ in range(120):
        anc = (hoje - timedelta(days=r.randint(0, 900))).isoformat()
        accs = r.choice([None, [r.choice(ids)], r.sample(ids, min(len(ids), r.randint(2, 4))), kinds.get('ordem') or None, (kinds.get('ordem', []) + kinds.get('carteira', [])) or None, kinds.get('poupanca') or None])
        cs = r.choice([None, None, [r.choice(cats)], r.sample(cats, r.randint(2, 4))])
        out.append(dict(mode=r.choice(['day', 'week', 'month', 'year']), anchor=anc, accs=accs, cats=cs, win=r.choice([7, 30])))
    return out

if __name__ == '__main__':
    packs = conjuntos()
    for i, p in enumerate(packs): p['scenarios'] = cenarios(p, 1000 + i)
    json.dump(packs, open(sys.argv[1], 'w'))
    print(f'{len(packs)} conjuntos de dados, {sum(len(p["scenarios"]) for p in packs)} cenários')
