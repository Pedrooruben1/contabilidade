"""Verificação PRÉVIA (antes de implementar): os saldos históricos reconstruídos coincidem com o saldo atual da app?"""
import json, sys, subprocess, os
sys.path.insert(0, os.path.dirname(__file__))
from gen import gerar
from oracle import calcular, cents
from datetime import date
bad = 0; n = 0; limites = 0
for seed in range(1, 61):
    d = gerar(seed, n_entries=400 + seed * 20)
    hoje = '2026-11-06'
    # saldo atual de cada conta segundo a regra da app (saldo inicial + movimentos até hoje, transferências nas duas contas)
    atual = {}
    for c in d['accounts']:
        s = cents(c['opening'])
        for e in d['entries']:
            if e['date'] > hoje: continue
            a = cents(e['amount'])
            if e['kind'] == 'transfer':
                if e['accountId'] == c['id']: s -= a
                if e.get('destId') == c['id']: s += a
            elif e['accountId'] == c['id']: s += a if e['kind'] == 'income' else -a
        atual[c['id']] = s
    for c in d['accounts']:                       # cada conta isolada
        m = calcular(d, hoje, 'year', hoje, [c['id']], None); n += 1
        if m['series'][-1]['bal'] != atual[c['id']]: bad += 1
    m = calcular(d, hoje, 'year', hoje, None, None); n += 1                   # todas juntas
    if m['series'][-1]['bal'] != sum(atual.values()): bad += 1
    if any(p['est'] for p in m['series']): limites += 1
print(f'conjuntos de dados: 60 | séries verificadas: {n} | diferenças entre o saldo reconstruído de hoje e o saldo atual: {bad}')
print(f'conjuntos em que parte da história é estimada (antes do 1.º movimento de alguma conta): {limites} de 60')
