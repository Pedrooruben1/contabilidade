"""Cálculo INDEPENDENTE da Análise (Python, `datetime`/`calendar`, inteiros em cêntimos). Não partilha código nem algoritmos com a app."""
import bisect, calendar, json, sys
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

def cents(x): return int((Decimal(str(x)) * 100).to_integral_value(rounding=ROUND_HALF_UP))
def d2(s): return date.fromisoformat(s)
def periodo(modo, ancora):
    a = d2(ancora)
    if modo == 'day': return a, a
    if modo == 'week': ini = a - timedelta(days=a.weekday()); return ini, ini + timedelta(days=6)
    if modo == 'month': return date(a.year, a.month, 1), date(a.year, a.month, calendar.monthrange(a.year, a.month)[1])
    return date(a.year, 1, 1), date(a.year, 12, 31)

def mes_anterior(d):
    y, m = (d.year, d.month - 1) if d.month > 1 else (d.year - 1, 12)
    return date(y, m, 1)

def periodo_anterior(modo, ini, fim, hoje):
    if modo == 'day': pi = pf = ini - timedelta(days=1)
    elif modo == 'week': pi, pf = ini - timedelta(days=7), fim - timedelta(days=7)
    elif modo == 'month': pi = mes_anterior(ini); pf = ini - timedelta(days=1)
    else: pi, pf = date(ini.year - 1, 1, 1), date(ini.year - 1, 12, 31)
    if ini <= hoje < fim:                       # período a meio: mesmo número de dias
        corte = pi + timedelta(days=(hoje - ini).days)
        if corte < pf: pf = corte
    return pi, pf

def calcular(dados, hoje_s, modo, ancora, contas_sel, cats_sel, win=7):
    hoje = d2(hoje_s)
    contas = {c['id']: c for c in dados['accounts']}
    S = [i for i in (contas_sel or []) if i in contas] or list(contas)
    Sset = set(S)
    ini, fim = periodo(modo, ancora)
    pini, pfim = periodo_anterior(modo, ini, fim, hoje)
    abertura = sum(cents(contas[i]['opening']) for i in S)
    ents = [e for e in dados['entries'] if d2(e['date']) <= hoje]
    primeiro = {}
    for e in ents:
        for cid in ([e['accountId']] + ([e['destId']] if e['kind'] == 'transfer' and e.get('destId') else [])):
            if cid not in primeiro or d2(e['date']) < primeiro[cid]: primeiro[cid] = d2(e['date'])
    delta = {}
    for e in ents:
        a = cents(e['amount']); dd = 0
        if e['kind'] == 'transfer':
            if e['accountId'] in Sset: dd -= a
            if e.get('destId') in Sset: dd += a
        elif e['accountId'] in Sset: dd = a if e['kind'] == 'income' else -a
        if dd: delta[d2(e['date'])] = delta.get(d2(e['date']), 0) + dd
    maxprim = max((primeiro.get(i, date(9999, 12, 31)) for i in S))
    est = lambda d: d < hoje and d < maxprim
    # saldos: acumulado por data + pesquisa com bisect (da biblioteca do Python)
    fechas = sorted(delta); acum = []; r = 0
    for f in fechas: r += delta[f]; acum.append(r)
    def saldo_em(d):
        i = bisect.bisect_right(fechas, d) - 1
        return abertura + (acum[i] if i >= 0 else 0)
    iniciou = ini <= hoje
    fim_ef = min(fim, hoje)
    init = saldo_em(ini - timedelta(days=1)); final = saldo_em(fim_ef) if iniciou else init
    elapsed = (fim_ef - ini).days + 1 if iniciou else 0
    def agregar(a0, a1, nb, bucket):
        A = dict(inc=0, expAll=0, exp=0, trIn=0, trOut=0, save=0, n=0, nInt=0, byCat={}, buckets=[dict(inc=0, exp=0) for _ in range(nb)])
        for e in ents:
            dd = d2(e['date'])
            if dd < a0 or dd > a1: continue
            a = cents(e['amount'])
            if e['kind'] == 'transfer':
                f, t = e['accountId'] in Sset, e.get('destId') in Sset
                if f and not t: A['trOut'] += a
                elif t and not f: A['trIn'] += a
                elif f and t: A['nInt'] += 1
                if f or t:
                    fa, ta = contas.get(e['accountId']), contas.get(e.get('destId'))
                    if fa and ta and fa['kind'] in ('ordem', 'carteira') and ta['kind'] in ('poupanca', 'investimento'): A['save'] += a
                continue
            if e['accountId'] not in Sset: continue
            A['n'] += 1
            b = A['buckets'][bucket(dd)] if nb else None
            if e['kind'] == 'income':
                A['inc'] += a
                if b is not None: b['inc'] += a
            else:
                A['expAll'] += a; A['byCat'][e['category']] = A['byCat'].get(e['category'], 0) + a
                if not cats_sel or e['category'] in cats_sel:
                    A['exp'] += a
                    if b is not None: b['exp'] += a
        return A
    if modo == 'day': nb, bk = 0, None
    elif modo == 'year': nb, bk = 12, (lambda dd: dd.month - 1)
    else: nb, bk = (fim - ini).days + 1, (lambda dd: (dd - ini).days)
    cur = agregar(ini, fim, nb, bk); prev = agregar(pini, pfim, 0, None)
    if modo == 'day': wini = fim - timedelta(days=29 if win == 30 else 6); wfim = fim
    else: wini, wfim = ini, fim
    serie = []; d = wini; ult = min(wfim, hoje)
    while d <= ult: serie.append(dict(d=d.isoformat(), bal=saldo_em(d), est=est(d))); d += timedelta(days=1)
    return dict(range=dict(start=ini.isoformat(), end=fim.isoformat()), prev=dict(start=pini.isoformat(), end=pfim.isoformat()), elapsed=elapsed,
                init=init, final=final, estInit=est(ini - timedelta(days=1)), estFinal=est(fim_ef) if iniciou else est(ini - timedelta(days=1)),
                inc=cur['inc'], expAll=cur['expAll'], exp=cur['exp'], trIn=cur['trIn'], trOut=cur['trOut'], save=cur['save'], n=cur['n'], nInt=cur['nInt'], byCat=cur['byCat'],
                buckets=[dict(b, start=(date(ini.year, i + 1, 1) if modo == 'year' else ini + timedelta(days=i)).isoformat(), end=((date(ini.year, i + 1, calendar.monthrange(ini.year, i + 1)[1])) if modo == 'year' else ini + timedelta(days=i)).isoformat()) for i, b in enumerate(cur['buckets'])], series=serie, prevAgg=dict(inc=prev['inc'], exp=prev['exp'], expAll=prev['expAll'], n=prev['n'], byCat=prev['byCat']),
                winStart=wini.isoformat(), winEnd=wfim.isoformat())

if __name__ == '__main__':
    packs = json.load(open(sys.argv[1]))
    out = [[calcular(p['data'], p['today'], c['mode'], c['anchor'], c.get('accs'), c.get('cats'), c.get('win', 7)) for c in p['scenarios']] for p in packs]
    json.dump(out, open(sys.argv[2], 'w'))
