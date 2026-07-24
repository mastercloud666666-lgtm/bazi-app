# -*- coding: utf-8 -*-
"""
五行流年 vs 申万一级行业 相关性分析 2005-2025
只拉年初/年末两个时间点，约42次请求
"""
import akshare as ak
import pandas as pd
import numpy as np
import sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

TIANCAN = {
    2005:'木',2006:'火',2007:'火',2008:'土',2009:'土',
    2010:'金',2011:'金',2012:'水',2013:'水',2014:'木',
    2015:'木',2016:'火',2017:'火',2018:'土',2019:'土',
    2020:'金',2021:'金',2022:'水',2023:'水',2024:'木',2025:'木',
}
GANZHI = {
    2005:'乙酉',2006:'丙戌',2007:'丁亥',2008:'戊子',2009:'己丑',
    2010:'庚寅',2011:'辛卯',2012:'壬辰',2013:'癸巳',2014:'甲午',
    2015:'乙未',2016:'丙申',2017:'丁酉',2018:'戊戌',2019:'己亥',
    2020:'庚子',2021:'辛丑',2022:'壬寅',2023:'癸卯',2024:'甲辰',2025:'乙巳',
}
SECTOR_WX = {
    '农林牧渔':'木','医药生物':'木','轻工制造':'木',
    '电力设备':'火','电子':'火','传媒':'火','化工':'火','家用电器':'火',
    '房地产':'土','建筑材料':'土','建筑装饰':'土','食品饮料':'土','纺织服装':'土',
    '有色金属':'金','钢铁':'金','银行':'金','非银金融':'金',
    '计算机':'金','机械设备':'金','汽车':'金','国防军工':'金',
    '交通运输':'水','公用事业':'水','社会服务':'水','通信':'水',
}

def fetch_first_close(year):
    """拉年初第一个交易日收盘价"""
    for d in range(2, 10):
        try:
            sd = f"{year}01{d:02d}"
            df = ak.index_analysis_daily_sw(symbol='一级行业', start_date=sd, end_date=sd)
            if len(df) == 0: continue
            df.columns = ['code','name','date','close'] + [f'c{i}' for i in range(10)]
            df['date'] = pd.to_datetime(df['date'])
            first_date = df['date'].iloc[0]
            if first_date.year == year:
                return df.set_index('name')['close'].to_dict(), str(first_date.date())
        except: pass
    return {}, ""

def fetch_last_close(year):
    """拉年末最后一个交易日收盘价"""
    for d in range(31, 22, -1):
        try:
            sd = f"{year}12{d:02d}"
            df = ak.index_analysis_daily_sw(symbol='一级行业', start_date=sd, end_date=sd)
            if len(df) == 0: continue
            df.columns = ['code','name','date','close'] + [f'c{i}' for i in range(10)]
            df['date'] = pd.to_datetime(df['date'])
            last_date = df['date'].iloc[0]
            if last_date.year == year:
                return df.set_index('name')['close'].to_dict(), str(last_date.date())
        except: pass
    return {}, ""

# ── 拉数据 ────────────────────────────────────────────────────────
print("拉取年初/年末数据（约42次请求）...")
start_prices = {}  # year -> {sector: price}
end_prices   = {}

for year in range(2005, 2026):
    sp, sd = fetch_first_close(year)
    ep, ed = fetch_last_close(year)
    start_prices[year] = sp
    end_prices[year]   = ep
    sectors_found = len(set(sp.keys()) & set(SECTOR_WX.keys()))
    print(f"  {year}: start={sd} end={ed} mapped_sectors={sectors_found}")

# ── 计算年度收益率 ────────────────────────────────────────────────
rows = []
for year in range(2005, 2026):
    sp = start_prices[year]
    ep = end_prices[year]
    all_sectors = set(sp.keys()) | set(ep.keys())
    for s in all_sectors:
        if s in sp and s in ep and sp[s] > 0:
            ret = ep[s] / sp[s] - 1
            rows.append({'name':s, 'year':year, 'ret':ret})

sector_annual = pd.DataFrame(rows)

# ── 沪深300基准 ───────────────────────────────────────────────────
print("拉取沪深300...")
csi = ak.stock_zh_index_daily(symbol='sh000300')
csi['date'] = pd.to_datetime(csi['date'])
csi['year'] = csi['date'].dt.year
csi_annual = (
    csi.groupby('year')
    .apply(lambda g: g.sort_values('date').iloc[-1]['close'] /
                     g.sort_values('date').iloc[0]['close'] - 1,
           include_groups=False)
    .reset_index(name='csi300')
)
print("  OK")

# ── 合并 ─────────────────────────────────────────────────────────
df = sector_annual.merge(csi_annual, on='year', how='left')
df['alpha']   = df['ret'] - df['csi300']
df['wx']      = df['name'].map(SECTOR_WX)
df['tiancan'] = df['year'].map(TIANCAN)
df = df[df['wx'].notna()]

# ── 核心结论 ─────────────────────────────────────────────────────
print()
print("="*72)
print("【核心】流年天干五行 → 对应板块 vs 其他板块 超额对比")
print("="*72)

results = []
for wx in ['木','火','土','金','水']:
    match_s = [s for s,w in SECTOR_WX.items() if w==wx]
    other_s = [s for s,w in SECTOR_WX.items() if w!=wx]
    years   = [y for y,v in TIANCAN.items() if v==wx]
    for year in years:
        yd = df[df['year']==year]
        ma = yd[yd['name'].isin(match_s)]['alpha'].mean()
        oa = yd[yd['name'].isin(other_s)]['alpha'].mean()
        cr = yd['csi300'].iloc[0] if len(yd)>0 else np.nan
        results.append({'year':year,'gz':GANZHI[year],'wx':wx,
                        'match_alpha':ma,'other_alpha':oa,'csi300':cr,
                        'win': int(ma>oa) if not np.isnan(ma+oa) else 0})

res = pd.DataFrame(results)

print(f"\n{'年份':<6}{'干支':<6}{'天干':<4}{'对应超额':>10}{'其他超额':>10}{'差值':>8}  {'胜'}")
print("-"*56)
for wx in ['木','火','土','金','水']:
    sub = res[res['wx']==wx]
    for _, r in sub.sort_values('year').iterrows():
        ma = f"{r['match_alpha']:+.1%}" if not np.isnan(r['match_alpha']) else "N/A"
        oa = f"{r['other_alpha']:+.1%}" if not np.isnan(r['other_alpha']) else "N/A"
        diff = r['match_alpha']-r['other_alpha']
        ds = f"{diff:+.1%}" if not np.isnan(diff) else "N/A"
        win = "✓" if r['win'] else "✗"
        print(f"{r['year']:<6}{r['gz']:<6}{r['wx']:<4}{ma:>10}{oa:>10}{ds:>8}  {win}")
    wr = sub['win'].mean()
    ad = (sub['match_alpha']-sub['other_alpha']).mean()
    print(f"  →小计  胜率={wr:.0%}  平均超额差={ad:+.1%}")
    print()

# ── 汇总 ────────────────────────────────────────────────────────
print("="*72)
print("【汇总】各五行 胜率 & 超额差均值")
print("="*72)
print(f"\n{'五行':<4}{'4年胜率':>8}{'超额差均值':>12}  {'对应板块'}")
print("-"*60)
for wx in ['木','火','土','金','水']:
    sub  = res[res['wx']==wx]
    wr   = sub['win'].mean()
    ad   = (sub['match_alpha']-sub['other_alpha']).mean()
    secs = '、'.join(s for s,w in SECTOR_WX.items() if w==wx)
    print(f"{wx:<4}{wr:>7.0%}{ad:>+12.1%}  {secs}")

# ── 全行业排名 ───────────────────────────────────────────────────
print()
print("="*72)
print("【排名】五行年中对应板块在全行业的平均排名（1=涨幅最高）")
print("="*72)
print(f"\n{'年份':<6}{'天干':<4}{'平均排名/总数':<16}{'对应板块列表'}")
print("-"*70)
for wx in ['木','火','土','金','水']:
    match_s = [s for s,w in SECTOR_WX.items() if w==wx]
    for year in sorted(y for y,v in TIANCAN.items() if v==wx):
        yd = df[df['year']==year].copy()
        yd['rank'] = yd['ret'].rank(ascending=False)
        total = len(yd)
        md = yd[yd['name'].isin(match_s)]
        avg_rank = md['rank'].mean()
        found = '、'.join(md['name'].tolist())
        print(f"{year:<6}{wx:<4}{avg_rank:.1f}/{total:<12}{found}")
    print()

print("分析完成")
