"""Gerador de dados aleatórios (semente fixa) para os testes da Análise. Valores sempre em cêntimos inteiros."""
import json, random, sys
from datetime import date, timedelta

def gerar(seed, n_entries=1500, hoje=date(2026, 11, 6), dias_atras=900, contas=6, futuros=True):
    r = random.Random(seed)
    kinds = ['ordem', 'poupanca', 'carteira', 'investimento', 'ordem', 'carteira', 'poupanca', 'ordem']
    contas_l = []
    for i in range(contas):
        contas_l.append({'id': f'a{i}', 'name': f'Conta {i}' + (' com um nome extremamente comprido para testar o ecrã pequeno' if i == 2 else ''), 'kind': kinds[i % len(kinds)],
                         'opening': r.randint(-80000, 900000) / 100})
    cats = ['habitacao', 'alimentacao', 'restaurantes', 'transportes', 'compras', 'desporto', 'viagens', 'lazer', 'subscricoes', 'saude', 'investimentos', 'outros']
    ents = []
    for i in range(n_entries):
        d = hoje - timedelta(days=r.randint(0, dias_atras))
        if futuros and r.random() < 0.03:
            d = hoje + timedelta(days=r.randint(1, 120))
        k = r.choice(['income', 'expense', 'expense', 'expense', 'transfer'])
        a = r.choice(contas_l)
        dst = None
        if k == 'transfer':
            dst = r.choice([c for c in contas_l if c['id'] != a['id']])
        ents.append({'id': f'e{i}', 'date': d.isoformat(), 'kind': k, 'amount': r.randint(1, 250000) / 100, 'accountId': a['id'], 'destId': dst['id'] if dst else None,
                     'category': r.choice(cats) if k == 'expense' else 'outros', 'note': '', 'goalId': None, 'recId': None})
    return {'accounts': contas_l, 'entries': ents, 'budgets': [], 'goals': [], 'recurring': [], 'invest': []}

if __name__ == '__main__':
    seed = int(sys.argv[1]); out = sys.argv[2]
    json.dump(gerar(seed), open(out, 'w'))
