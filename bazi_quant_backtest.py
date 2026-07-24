"""
八字量化回测系统 v2
直接使用四柱（比从生日反推更准确，包含时辰）
依赖: pip install akshare pandas numpy matplotlib
"""

import matplotlib
matplotlib.use('Agg')   # 非交互后端，避免后台GUI线程阻塞网络请求
import akshare as ak
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from datetime import date, datetime
import warnings
warnings.filterwarnings('ignore')

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'Arial Unicode MS']
plt.rcParams['axes.unicode_minus'] = False

# ══════════════════════════════════════════════════════════
# 1. 基础常量
# ══════════════════════════════════════════════════════════

TIANGAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
DIZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
WUXING  = {
    '甲':'木','乙':'木','丙':'火','丁':'火','戊':'土',
    '己':'土','庚':'金','辛':'金','壬':'水','癸':'水',
    '子':'水','丑':'土','寅':'木','卯':'木','辰':'土',
    '巳':'火','午':'火','未':'土','申':'金','酉':'金',
    '戌':'土','亥':'水',
}
NIANGAN_TO_YINMONTH = {0:2,1:4,2:6,3:8,4:0,5:2,6:4,7:6,8:8,9:0}
RIGAN_TO_ZISHI      = {0:0,1:2,2:4,3:6,4:8,5:0,6:2,7:4,8:6,9:8}
WX_ORDER   = ['木','火','土','金','水']
DIZHI_YANG = [True,False,True,False,True,False,True,False,True,False,True,False]

JIEQI_DATES = [
    (1,6),(2,4),(3,6),(4,5),(5,6),(6,6),
    (7,7),(8,7),(9,8),(10,8),(11,7),(12,7),
]
JIEQI_DAY_APPROX = [6,4,6,5,6,6,7,7,8,8,7,7]

CANG_GAN = {
    '子':['癸'],        '丑':['己','癸','辛'], '寅':['甲','丙','戊'],
    '卯':['乙'],        '辰':['戊','乙','癸'], '巳':['丙','庚','戊'],
    '午':['丁','己'],   '未':['己','丁','乙'], '申':['庚','壬','戊'],
    '酉':['辛'],        '戌':['戊','辛','丁'], '亥':['壬','甲'],
}
CANG_RATIOS = [0.6, 0.3, 0.1]

PILLAR_WEIGHTS = {
    'year_tg':8,'year_dz':4,'month_tg':12,'month_dz':40,
    'day_dz':12,'hour_tg':12,'hour_dz':12,
}

# ══════════════════════════════════════════════════════════
# 2. 基础工具函数
# ══════════════════════════════════════════════════════════

def is_yang(char):
    if char in TIANGAN: return TIANGAN.index(char) % 2 == 0
    if char in DIZHI:   return DIZHI_YANG[DIZHI.index(char)]
    return True

def get_cang_gan(dz):
    return [{'tg':tg,'ratio':CANG_RATIOS[i]}
            for i, tg in enumerate(CANG_GAN.get(dz, []))]

def wx_generates(a, b): return (WX_ORDER.index(a)+1)%5 == WX_ORDER.index(b)
def wx_controls(a, b):  return (WX_ORDER.index(a)+2)%5 == WX_ORDER.index(b)

def get_shishen(day_tg, char):
    day_wx = WUXING.get(day_tg); char_wx = WUXING.get(char)
    if not char_wx: return '—'
    same = (is_yang(day_tg) == is_yang(char))
    if char_wx == day_wx:              return '比肩' if same else '劫财'
    if wx_generates(day_wx, char_wx):  return '食神' if same else '伤官'
    if wx_controls(day_wx, char_wx):   return '偏财' if same else '正财'
    if wx_controls(char_wx, day_wx):   return '七杀' if same else '正官'
    if wx_generates(char_wx, day_wx):  return '偏印' if same else '正印'
    return '—'

# ══════════════════════════════════════════════════════════
# 3. 构造四柱（直接使用干支字符）
# ══════════════════════════════════════════════════════════

def make_pillar(tg, dz):
    return {'tg':tg,'dz':dz,'tgIdx':TIANGAN.index(tg),'dzIdx':DIZHI.index(dz)}

def make_bazi(y_tg, y_dz, mo_tg, mo_dz, d_tg, d_dz, h_tg=None, h_dz=None):
    """直接从干支字符构造四柱字典。时柱可选，None表示未知。"""
    return {
        'year':  make_pillar(y_tg,  y_dz),
        'month': make_pillar(mo_tg, mo_dz),
        'day':   make_pillar(d_tg,  d_dz),
        'hour':  make_pillar(h_tg,  h_dz) if h_tg else None,
    }

# ══════════════════════════════════════════════════════════
# 4. 大运计算（仍需生日）
# ══════════════════════════════════════════════════════════

def _jieqi_date(year, month):
    idx = ((month-1)%12+12)%12
    m, d = JIEQI_DATES[idx]
    return date(year, m, d)

def calculate_dayun(year_p, month_p, gender, by, bm, bd):
    yang_year = year_p['tgIdx'] % 2 == 0
    forward   = (gender=='男' and yang_year) or (gender=='女' and not yang_year)
    bdate = date(by, bm, bd)
    if forward:
        m, y = bm, by
        jd = _jieqi_date(y, m)
        if jd <= bdate:
            m += 1
            if m > 12: m, y = 1, y+1
            jd = _jieqi_date(y, m)
        days = (jd - bdate).days
    else:
        m, y = bm, by
        jd = _jieqi_date(y, m)
        if jd >= bdate:
            m -= 1
            if m < 1: m, y = 12, y-1
            jd = _jieqi_date(y, m)
        days = (bdate - jd).days
    start_age = round(days / 3)
    ti, di = month_p['tgIdx'], month_p['dzIdx']
    dayuns = []
    for i in range(8):
        if forward: ti=(ti+1)%10; di=(di+1)%12
        else:       ti=(ti-1+10)%10; di=(di-1+12)%12
        dayuns.append({'gz':TIANGAN[ti]+DIZHI[di],'tgIdx':ti,'dzIdx':di,
                       'ageStart':start_age+i*10,'yearStart':by+start_age+i*10})
    return {'startAge':start_age,'dayuns':dayuns}

# ══════════════════════════════════════════════════════════
# 5. 命局分析（支持时柱为 None）
# ══════════════════════════════════════════════════════════

def calc_strength_score(bazi):
    day_tg = bazi['day']['tg']
    score  = 0
    # 构建参与计分的条目（时柱若为 None 则跳过）
    entries = [
        (bazi['year']['tg'],   'year_tg'),
        (bazi['year']['dz'],   'year_dz'),
        (bazi['month']['tg'],  'month_tg'),
        (bazi['month']['dz'],  'month_dz'),
        (bazi['day']['dz'],    'day_dz'),
    ]
    if bazi['hour']:
        entries += [(bazi['hour']['tg'],'hour_tg'),(bazi['hour']['dz'],'hour_dz')]

    for char, key in entries:
        ss = get_shishen(day_tg, char)
        w  = PILLAR_WEIGHTS[key]
        if key == 'month_dz':
            if ss in ['比肩','劫财','正印','偏印']: score += w
            for cg in get_cang_gan(char)[1:]:
                hss = get_shishen(day_tg, cg['tg'])
                if hss in ['比肩','劫财','正印','偏印']: score += w*cg['ratio']*0.4
        elif key in ['year_dz','day_dz','hour_dz']:
            if ss in ['比肩','劫财']: score += w
            for cg in get_cang_gan(char):
                hss = get_shishen(day_tg, cg['tg'])
                if hss in ['比肩','劫财']: score += w*cg['ratio']*0.3
        else:
            if ss in ['比肩','劫财']: score += w
    return min(100, round(score))

def detect_cong_ge(bazi):
    day_tg = bazi['day']['tg']
    positions = [
        (bazi['year']['tg'],8),(bazi['year']['dz'],4),
        (bazi['month']['tg'],12),(bazi['month']['dz'],40),
        (bazi['day']['dz'],12),
    ]
    if bazi['hour']:
        positions += [(bazi['hour']['tg'],12),(bazi['hour']['dz'],12)]
    sw=cw=gw=shw=0
    def add(ss, w):
        nonlocal sw,cw,gw,shw
        if ss in ['比肩','劫财','正印','偏印']: sw+=w
        elif ss in ['正财','偏财']: cw+=w
        elif ss in ['正官','七杀']: gw+=w
        elif ss in ['食神','伤官']: shw+=w
    for char, w in positions:
        add(get_shishen(day_tg,char),w)
        for cg in get_cang_gan(char):
            add(get_shishen(day_tg,cg['tg']),w*cg['ratio']*0.4)
    if sw > 16: return None
    maxw = max(cw,gw,shw)
    if maxw < 24: return None
    if cw==maxw: return '从财格'
    if gw==maxw: return '从官格'
    return '从儿格'

def get_xi_yong(score, day_tg, cong_ge):
    day_wx=WUXING[day_tg]; idx=WX_ORDER.index(day_wx)
    yin_wx=WX_ORDER[(idx+4)%5]; bi_wx=day_wx
    shi_wx=WX_ORDER[(idx+1)%5]; cai_wx=WX_ORDER[(idx+2)%5]
    guan_wx=WX_ORDER[(idx+3)%5]
    if cong_ge=='从财格': return {'xi':[cai_wx,guan_wx],'ji':[yin_wx,bi_wx],'label':cong_ge}
    if cong_ge=='从官格': return {'xi':[guan_wx,cai_wx],'ji':[yin_wx,bi_wx],'label':cong_ge}
    if cong_ge=='从儿格': return {'xi':[shi_wx,cai_wx], 'ji':[yin_wx,guan_wx],'label':cong_ge}
    if score>60: return {'xi':[cai_wx,guan_wx],'ji':[yin_wx,bi_wx],'label':'身强'}
    if score<40: return {'xi':[yin_wx,bi_wx],'ji':[cai_wx,guan_wx],'label':'身弱'}
    return {'xi':[cai_wx,guan_wx,yin_wx],'ji':[],'label':'中和'}

def analyze_cai_xing(bazi):
    day_tg=bazi['day']['tg']
    chars=[bazi['year']['tg'],bazi['year']['dz'],
           bazi['month']['tg'],bazi['month']['dz'],
           bazi['day']['dz']]
    if bazi['hour']:
        chars+=[bazi['hour']['tg'],bazi['hour']['dz']]
    zc=pc=0.0
    for c in chars:
        ss=get_shishen(day_tg,c)
        if ss=='正财': zc+=1
        if ss=='偏财': pc+=1
    branches=[bazi['year']['dz'],bazi['month']['dz'],bazi['day']['dz']]
    if bazi['hour']: branches.append(bazi['hour']['dz'])
    for dz in branches:
        for cg in get_cang_gan(dz):
            ss=get_shishen(day_tg,cg['tg'])
            if ss=='正财': zc+=cg['ratio']*0.5
            if ss=='偏财': pc+=cg['ratio']*0.5
    return {'zhengCai':zc,'pianCai':pc}

# ══════════════════════════════════════════════════════════
# 6. 时机评分（逐日，按月计算）
# ══════════════════════════════════════════════════════════

def get_pillars_for_date(d: date):
    year,month,day=d.year,d.month,d.day
    liu_nian={'tg':TIANGAN[((year-4)%10+10)%10],'dz':DIZHI[((year-4)%12+12)%12]}
    year_tg_idx=((year-4)%10+10)%10
    lunar_off=month-2
    if day<JIEQI_DAY_APPROX[month-1]: lunar_off-=1
    mdz=(((lunar_off%12)+12)%12+2)%12
    mtg=(NIANGAN_TO_YINMONTH[year_tg_idx%10]+mdz-2+20)%10
    liu_yue={'tg':TIANGAN[mtg],'dz':DIZHI[mdz]}
    a=(14-month)//12;y2=year+4800-a;m2=month+12*a-3
    jdn=day+(153*m2+2)//5+365*y2+y2//4-y2//100+y2//400-32045
    diff=jdn-2451551
    liu_ri={'tg':TIANGAN[((diff%10)+10)%10],'dz':DIZHI[((diff%12)+12)%12]}
    return liu_nian,liu_yue,liu_ri

def get_current_dayun(dayuns, birth_year, target_year):
    age=target_year-birth_year
    for i,dy in enumerate(dayuns):
        next_start=dayuns[i+1]['ageStart'] if i+1<len(dayuns) else 999
        if dy['ageStart']<=age<next_start: return dy
    return None

def _eval(char, day_tg, xi, ji):
    wx=WUXING.get(char)
    if not wx: return 0
    if wx in xi: return 10
    if wx in ji: return -10
    return 0

def calc_timing_score(dayuns, birth_year, day_tg, xi, ji, target_date: date):
    ln,ly,lr=get_pillars_for_date(target_date)
    dy=get_current_dayun(dayuns,birth_year,target_date.year)
    dy_s=(_eval(TIANGAN[dy['tgIdx']],day_tg,xi,ji)+
          _eval(DIZHI[dy['dzIdx']],day_tg,xi,ji)) if dy else 0
    ln_s=_eval(ln['tg'],day_tg,xi,ji)+_eval(ln['dz'],day_tg,xi,ji)
    ly_s=_eval(ly['tg'],day_tg,xi,ji)+_eval(ly['dz'],day_tg,xi,ji)
    lr_s=_eval(lr['tg'],day_tg,xi,ji)+_eval(lr['dz'],day_tg,xi,ji)
    def norm(s): return ((s+20)/40)*100
    return round(norm(dy_s)*0.35+norm(ln_s)*0.45+norm(ly_s)*0.15+norm(lr_s)*0.05)

# ══════════════════════════════════════════════════════════
# 7. ETF 映射（五行×阴阳）
# ══════════════════════════════════════════════════════════

CSI300_ETF = '510300'   # 沪深300ETF (sh510300)，统一用此ETF测试择时信号
ETF_NAMES = {
    '510300':'沪深300ETF','000300':'沪深300',
}

# ══════════════════════════════════════════════════════════
# 8. 数据获取（带缓存）
# ══════════════════════════════════════════════════════════

_cache: dict = {}

def _etf_prefix(code: str) -> str:
    return 'sh' if code.startswith('5') else 'sz'

def fetch_prices(code: str):
    if code in _cache: return _cache[code]
    import requests, threading
    result = [None]; exc = [None]
    def _do():
        try:
            if code == '000300':
                df=ak.stock_zh_index_daily(symbol='sh000300')
                df=df[['date','close']].copy()
            else:
                symbol=f"{_etf_prefix(code)}{code}"
                df=ak.fund_etf_hist_sina(symbol=symbol)
                df=df[['date','close']].copy()
            df['date']=pd.to_datetime(df['date'])
            df=df.sort_values('date').set_index('date')
            result[0]=df
        except Exception as e:
            exc[0]=e
    t=threading.Thread(target=_do,daemon=True); t.start(); t.join(timeout=45)
    if t.is_alive():
        print(f"  TIMEOUT {code} 超时跳过"); return None
    if exc[0]:
        print(f"  ERR {code} 获取失败: {exc[0]}"); return None
    _cache[code]=result[0]
    print(f"  OK {code}({ETF_NAMES.get(code,code)}): "
          f"{result[0].index.min().date()} ~ {result[0].index.max().date()}")
    return result[0]

def preload_data():
    """主程序启动时统一预加载，后续全走缓存"""
    print("预加载行情数据...")
    fetch_prices('000300')
    fetch_prices(CSI300_ETF)
    print("预加载完成\n")

def get_aligned_series(code, idx):
    df=fetch_prices(code)
    if df is None: return pd.Series(np.nan,index=idx)
    return df['close'].reindex(idx,method='ffill')

def build_market_regime(idx):
    """市场状态：bull（沪深300>MA250且MA250上升）/ normal（>MA120）/ bear（过滤）
    MA在全量历史上计算，避免回测初期数据不足导致bull信号缺失。"""
    csi=fetch_prices('000300')
    if csi is None: return pd.Series('normal',index=idx)
    full=csi['close']                              # 全量历史（2002至今）
    ma120_full=full.rolling(120,min_periods=60).mean()
    ma250_full=full.rolling(250,min_periods=200).mean()
    ma250_lag =ma250_full.shift(20)
    # 切到回测区间
    close  =full.reindex(idx,method='ffill')
    ma120  =ma120_full.reindex(idx,method='ffill')
    ma250  =ma250_full.reindex(idx,method='ffill')
    ma250_l=ma250_lag.reindex(idx,method='ffill')
    regime =pd.Series('bear',index=idx)
    regime[close>ma120]='normal'
    regime[(close>ma250)&(ma250>ma250_l)]='bull'
    return regime

# ══════════════════════════════════════════════════════════
# 9. 完整命盘分析
# ══════════════════════════════════════════════════════════

def full_analysis(bazi, gender, by, bm, bd):
    dy_r    =calculate_dayun(bazi['year'],bazi['month'],gender,by,bm,bd)
    score   =calc_strength_score(bazi)
    cong_ge =detect_cong_ge(bazi)
    xi_yong =get_xi_yong(score,bazi['day']['tg'],cong_ge)
    cai_xing=analyze_cai_xing(bazi)
    return {
        'bazi':bazi,'dayuns':dy_r['dayuns'],
        'birthYear':by,'dayTg':bazi['day']['tg'],
        'dayYang':is_yang(bazi['day']['tg']),
        'score':score,'xiYong':xi_yong,'caiXing':cai_xing,
    }

# ══════════════════════════════════════════════════════════
# 10. ETF权重（正偏财比例 → 阴阳 ETF 分配）
# ══════════════════════════════════════════════════════════

def get_etf_weights(ana):
    """统一使用沪深300ETF，仅通过择时评分控制仓位，不做ETF选择。"""
    return {CSI300_ETF: 1.0}

# ══════════════════════════════════════════════════════════
# 11. 仓位决策
# ══════════════════════════════════════════════════════════

def score_to_position(score, regime='normal'):
    """
    bull  (>MA250，强牛)：底仓50%保底，评分最高可加至100%
    normal(>MA120)     ：无底仓，评分在25%~75%之间调节
    bear  (≤MA120)     ：清仓0%
    """
    if regime == 'bear':
        return 0.0
    if regime == 'bull':
        if score >= 70: return 1.00
        if score >= 55: return 0.80
        if score >= 45: return 0.60
        if score >= 35: return 0.50   # 底仓保底
        return 0.50                   # 牛市不低于50%
    else:  # normal
        if score >= 70: return 0.75
        if score >= 55: return 0.60
        if score >= 45: return 0.50
        if score >= 35: return 0.35
        return 0.25

TRADE_COST=0.0003

# ══════════════════════════════════════════════════════════
# 12. 单人回测
# ══════════════════════════════════════════════════════════

def run_backtest(name, gender, by, bm, bd,
                 y_tg, y_dz, mo_tg, mo_dz, d_tg, d_dz,
                 h_tg=None, h_dz=None,
                 start='2019-01-01', end='2025-12-31',
                 initial_cash=100_000):

    bazi    = make_bazi(y_tg,y_dz,mo_tg,mo_dz,d_tg,d_dz,h_tg,h_dz)
    ana     = full_analysis(bazi,gender,by,bm,bd)
    xi      = ana['xiYong']
    weights = get_etf_weights(ana)
    day_tg  = ana['dayTg']

    zc=ana['caiXing']['zhengCai']; pc=ana['caiXing']['pianCai']
    total=zc+pc
    yr=zc/total if total else 0.5; yr2=pc/total if total else 0.5
    hour_str=f"{h_tg}{h_dz}" if h_tg else "时辰未知"

    print(f"\n{'='*55}")
    print(f"  {name}  {by}/{bm}/{bd} {hour_str} {gender}")
    print(f"  四柱: {y_tg}{y_dz} {mo_tg}{mo_dz} {d_tg}{d_dz} {hour_str}")
    print(f"  日主:{day_tg}({WUXING[day_tg]}) {'阳' if ana['dayYang'] else '阴'}  "
          f"强弱:{ana['score']}分 {xi['label']}")
    print(f"  喜用:{'、'.join(xi['xi'])}  忌:{'、'.join(xi['ji']) or '—'}")
    print(f"  正财:{zc:.1f} 偏财:{pc:.1f} → 阳ETF:{yr:.0%} 阴ETF:{yr2:.0%}")
    etf_str=', '.join(f"{ETF_NAMES.get(k,k)}({v:.0%})" for k,v in weights.items())
    print(f"  ETF: {etf_str}")

    if not weights:
        print("  ✗ 无喜用五行对应ETF，跳过"); return None

    all_codes=list(weights.keys())+['000300']
    print(f"  加载行情...")
    for c in all_codes: fetch_prices(c)

    csi_df=fetch_prices('000300')
    if csi_df is None: return None
    idx=csi_df.loc[start:end,'close'].index
    if idx.empty: return None

    price_dict={}
    for code in weights:
        s=get_aligned_series(code,idx)
        if s.dropna().__len__()<20:
            print(f"  ⚠ {code} 数据不足，以消费ETF(159928)代替")
            code='159928'; s=get_aligned_series(code,idx)
        price_dict[code]=s

    csi_s    =get_aligned_series('000300',idx)
    regime_s =build_market_regime(idx)

    # 每月4次打分（流日每7天更新一次，捕捉周级别信号）
    score_s=pd.Series(0,index=idx,dtype=float)
    prev_week_key=None; cur_score=50
    for dt in idx:
        week_key=(dt.year, dt.month, (dt.day-1)//7)
        if week_key!=prev_week_key:
            prev_week_key=week_key
            cur_score=calc_timing_score(
                ana['dayuns'],ana['birthYear'],day_tg,
                xi['xi'],xi['ji'],dt.date())
        score_s[dt]=cur_score

    # 每月4次调仓（每跨越7天周界触发）
    pf_val  =pd.Series(0.0,index=idx)
    cash    =float(initial_cash)
    holdings={c:0.0 for c in weights}
    prev_pos=-1.0
    prev_week_r=None

    for i,dt in enumerate(idx):
        week_r=(dt.year, dt.month, (dt.day-1)//7)
        rebal=(week_r!=prev_week_r) or (i==0)
        prev_week_r=week_r
        if rebal:
            score =int(score_s[dt])
            regime=str(regime_s[dt])
            pos   =score_to_position(score, regime)
            if pos!=prev_pos:
                for code,sh in list(holdings.items()):
                    if sh>0:
                        px=price_dict.get(code,pd.Series()).get(dt)
                        if px and not np.isnan(px):
                            cash+=sh*px*(1-TRADE_COST); holdings[code]=0.0
                if pos>0:
                    invest=cash*pos
                    for code,w in weights.items():
                        alloc=invest*w
                        px=price_dict.get(code,pd.Series()).get(dt)
                        if px and not np.isnan(float(px)) and float(px)>0:
                            sh=alloc/float(px)*(1-TRADE_COST)
                            holdings[code]=holdings.get(code,0)+sh
                            cash-=alloc
                prev_pos=pos

        total_val=cash
        for code,sh in holdings.items():
            if sh>0:
                px=price_dict.get(code,pd.Series()).get(dt)
                if px and not np.isnan(float(px)): total_val+=sh*float(px)
        pf_val[dt]=total_val

    csi_start=float(csi_s.dropna().iloc[0])
    bm_val   =csi_s/csi_start*initial_cash

    pf=pf_val.dropna(); bm=bm_val.dropna()
    common=pf.index.intersection(bm.index)
    pf,bm=pf[common],bm[common]
    if len(pf)<10: return None

    years=(common[-1]-common[0]).days/365.25
    ar =(pf.iloc[-1]/initial_cash)**(1/years)-1 if years>0 else 0
    bmr=(bm.iloc[-1]/initial_cash)**(1/years)-1 if years>0 else 0
    dd =(pf-pf.cummax())/pf.cummax()
    mdd=float(dd.min())
    dr =pf.pct_change().dropna()
    sp =float(dr.mean()/dr.std()*np.sqrt(252)) if dr.std()>0 else 0

    print(f"  【结果】年化:{ar:.1%}  基准:{bmr:.1%}  "
          f"超额:{ar-bmr:+.1%}  最大回撤:{mdd:.1%}  夏普:{sp:.2f}")

    return {
        'name':name,'ana':ana,'weights':weights,
        'pf':pf,'bm':bm,
        'metrics':{'ar':ar,'bmr':bmr,'alpha':ar-bmr,'mdd':mdd,'sharpe':sp,
                   'total':pf.iloc[-1]/initial_cash-1},
    }

# ══════════════════════════════════════════════════════════
# 13. 可视化
# ══════════════════════════════════════════════════════════

def plot_results(results, cols=2):
    valid=[r for r in results if r]
    if not valid: print("无有效结果"); return
    n=len(valid)
    rows=(n+cols-1)//cols
    fig,axes=plt.subplots(rows,cols,figsize=(14*cols//2,4*rows),squeeze=False)
    axlist=axes.flatten()

    for i,(ax,r) in enumerate(zip(axlist,valid)):
        m=r['metrics']; xi=r['ana']['xiYong']
        pf=r['pf']/r['pf'].iloc[0]*100
        bm=r['bm']/r['bm'].iloc[0]*100
        ax.plot(pf.index,pf.values,color='#C62828',lw=1.5,label='八字策略')
        ax.plot(bm.index,bm.values,color='#1565C0',lw=1.0,ls='--',label='沪深300')
        ax.fill_between(pf.index,pf.values,bm.values,
                        where=pf.values>=bm.values,alpha=0.1,color='#C62828')
        ax.fill_between(pf.index,pf.values,bm.values,
                        where=pf.values<bm.values,alpha=0.1,color='#1565C0')
        dt=r['ana']['dayTg']
        zc=r['ana']['caiXing']['zhengCai']; pc=r['ana']['caiXing']['pianCai']
        etf_s=' '.join(f"{ETF_NAMES.get(k,k)}{v:.0%}" for k,v in r['weights'].items())
        title=(f"{r['name']}  {dt}({WUXING[dt]}) {'、'.join(xi['xi'])} {xi['label']}\n"
               f"{etf_s}\n"
               f"年化:{m['ar']:.1%} 超额:{m['alpha']:+.1%} 回撤:{m['mdd']:.1%} 夏普:{m['sharpe']:.2f}")
        ax.set_title(title,fontsize=7.5,pad=4,loc='left')
        ax.set_ylabel('净值(=100)',fontsize=8)
        ax.legend(fontsize=7,loc='upper left')
        ax.grid(True,alpha=0.2)
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%y-%m'))
        ax.tick_params(labelsize=7)

    for ax in axlist[len(valid):]: ax.set_visible(False)
    plt.tight_layout(h_pad=2.5,w_pad=2)
    out='bazi_quant_backtest.png'
    plt.savefig(out,dpi=130,bbox_inches='tight')
    plt.show()
    print(f"\n图表已保存: {out}")

# ══════════════════════════════════════════════════════════
# 14. 命主数据（从截图四柱直接录入，过滤出生年>2010）
# 格式: (姓名, 性别, 生年, 月, 日, 年干, 年支, 月干, 月支, 日干, 日支, 时干, 时支)
# 时干/时支为 None 表示时辰不详
# ══════════════════════════════════════════════════════════

PERSONS = [
    ('啊',           '男', 1988,  8, 21, '戊','辰','庚','申','戊','申','庚','申'),
    ('Cq女',         '女', 1988, 12,  2, '戊','辰','癸','亥','辛','卯','壬','辰'),
    ('程钰',         '女', 1995,  1, 15, '甲','戌','丁','丑','丙','午','庚','寅'),
    ('程远',         '男', 1963,  1, 31, '壬','寅','癸','丑','甲','戌','庚','午'),
    ('程宇宸',       '女', 1990,  8,  4, '庚','午','癸','未','辛','丑','庚','寅'),
    ('传奇妹夫',     '男', 1990, 12, 20, '庚','午','戊','子','己','未','丙','寅'),
    ('CPR',          '女', 1994,  8, 16, '甲','戌','壬','申','甲','戌','壬','申'),
    ('Cq男',         '男', 1988, 11, 23, '戊','辰','癸','亥','壬','午','癸','卯'),
    ('代',           '男', 1993,  1, 31, '壬','申','癸','丑','壬','子','辛','丑'),
    ('戴常',         '男', 1960,  6, 24, '庚','子','壬','午','癸','未','乙','卯'),
    ('戴元媛',       '女', 1990,  1,  4, '己','巳','丙','子','己','巳','己','巳'),
    ('大珂国学',     '女', 1996,  6, 28, '丙','子','甲','午','丙','申','己','丑'),
    ('大侄子对象',   '女', 2003,  9, 24, '癸','未','辛','酉','庚','子','丙','子'),
    ('大侄子毅',     '男', 2003,  8, 25, '癸','未','庚','申','庚','午','丙','子'),
    ('东东',         '男', 1987,  7, 18, '丁','卯','丁','未','戊','辰','丁','巳'),
    ('Fl',           '男', 1986,  5, 24, '丙','寅','癸','巳','戊','辰','乙','卯'),
    ('郭艾伦',       '男', 1993, 11, 14, '癸','酉','癸','亥','己','亥','壬','申'),
    ('黄日华',       '女', 1990,  5,  9, '庚','午','辛','巳','甲','戌','戊','辰'),
    ('胡姐',         '女', 1971,  1,  8, '庚','戌','己','丑','癸','巳','戊','午'),
    ('九龙道长',     '男', 1980,  3, 25, '庚','申','己','卯','丁','酉','壬','寅'),
    ('Kylie',        '女', 1995,  1, 12, '甲','戌','丁','丑','癸','卯','乙','卯'),
    ('李苏涛',       '男', 1985,  3,  4, '乙','丑','戊','寅','壬','寅','辛','亥'),
    ('柳忠祥',       '男', 1974,  1,  2, '癸','丑','甲','子','癸','卯','壬','子'),
    ('Lxt',          '女', 1990,  9, 14, '庚','午','乙','酉','壬','午','癸','卯'),
    ('马为',         '女', 1993, 12,  4, '癸','酉','癸','亥','己','未','丁','卯'),
    ('么么撒',       '女', 1985,  2, 15, '乙','丑','戊','寅','乙','酉','己','卯'),
    ('宋丽娜',       '女', 1959,  4,  4, '己','亥','丁','卯','丙','辰','戊','戌'),
    ('孙洁',         '女', 1969, 10,  8, '己','酉','癸','酉','丙','辰','庚','寅'),
    ('孙平恒大',     '女', 1987, 11, 20, '丁','卯','辛','亥','癸','酉', None, None),
    ('孙倩倩',       '女', 1990,  5, 26, '庚','午','辛','巳','辛','卯','乙','未'),
    ('谭鑫龙',       '男', 1988,  5, 11, '戊','辰','丁','巳','丙','寅','丁','酉'),
    ('特朗普',       '男', 1946,  6, 14, '丙','戌','甲','午','己','未','己','巳'),
    ('Tsq',          '男', 1956, 12, 11, '丙','申','庚','子','壬','子','辛','丑'),
    ('小沈阳',       '男', 1981,  5,  7, '辛','酉','癸','巳','乙','酉','丁','丑'),
    ('圆圆爸爸',     '男', 1962,  2, 28, '壬','寅','壬','寅','丁','酉','辛','丑'),
    ('圆圆妈妈',     '女', 1964, 12, 23, '甲','辰','丙','子','丙','午','庚','寅'),
    ('圆圆姐',       '女', 1989, 10, 10, '己','巳','甲','戌','癸','卯','丁','巳'),
    ('圆圆姨夫',     '男', 1966,  9, 20, '丙','午','丁','酉','壬','午','庚','子'),
    ('张富跃',       '男', 1959, 11, 24, '己','亥','乙','亥','庚','戌','丙','戌'),
    ('张丽',         '女', 1986,  3,  7, '丙','寅','辛','卯','庚','戌','壬','午'),
    ('张松',         '女', 1968,  8,  8, '戊','申','庚','申','庚','戌','戊','子'),
    ('张文',         '男', 1991, 10, 29, '辛','未','戊','戌','壬','申','丙','午'),
    ('张跃芳',       '女', 1963,  6, 23, '癸','卯','戊','午','丁','酉','辛','亥'),
    ('郑会杰',       '男', 1994, 10, 29, '甲','戌','甲','戌','戊','子','戊','午'),
    ('钟声',         '女', 1990, 10, 12, '庚','午','丙','戌','庚','戌','丙','戌'),
    ('周勃舒',       '男', 1990,  3,  7, '庚','午','己','卯','辛','未','辛','卯'),
    ('周顾',         '男', 1978,  1, 14, '丁','巳','癸','丑','丙','子','壬','辰'),
]

# ══════════════════════════════════════════════════════════
# 15. 主程序
# ══════════════════════════════════════════════════════════

def run_period(label, start, end, initial_cash=100_000):
    """跑一段时间区间，返回结果列表"""
    print(f"\n{'#'*70}")
    print(f"# {label}  |  {start} ~ {end}  |  底仓50% 每月4次调仓")
    print(f"{'#'*70}\n")
    results=[]
    for p in PERSONS:
        name,gender,by,bm,bd = p[0],p[1],p[2],p[3],p[4]
        y_tg,y_dz,mo_tg,mo_dz,d_tg,d_dz = p[5],p[6],p[7],p[8],p[9],p[10]
        h_tg = p[11] if len(p)>11 else None
        h_dz = p[12] if len(p)>12 else None
        r = run_backtest(name,gender,by,bm,bd,
                         y_tg,y_dz,mo_tg,mo_dz,d_tg,d_dz,h_tg,h_dz,
                         start=start,end=end,initial_cash=initial_cash)
        results.append(r)
    return results

def print_summary(label, results):
    valid=[r for r in results if r]
    beat=sum(1 for r in valid if r['metrics']['alpha']>0)
    print(f"\n{'='*80}")
    print(f"  {label}  |  {beat}/{len(valid)} 人跑赢基准 ({beat/len(valid):.0%})")
    print(f"{'='*80}")
    print(f"{'命主':<10}{'日主':<4}{'格局':<7}{'策略年化':>9}{'基准年化':>9}"
          f"{'超额':>8}{'最大回撤':>9}{'夏普':>7}")
    print('-'*80)
    for r in sorted(valid, key=lambda x: -x['metrics']['alpha']):
        m=r['metrics']; xi=r['ana']['xiYong']; dt=r['ana']['dayTg']
        flag="+" if m['alpha']>0 else (" " if m['alpha']==0 else "-")
        print(f"{r['name']:<10}{dt:<4}{xi['label']:<7}"
              f"{m['ar']:>9.1%}{m['bmr']:>9.1%}"
              f"{m['alpha']:>+8.1%}{m['mdd']:>9.1%}{m['sharpe']:>7.2f}  {flag}")
    avg_alpha=sum(r['metrics']['alpha'] for r in valid)/len(valid)
    avg_sh   =sum(r['metrics']['sharpe'] for r in valid)/len(valid)
    print(f"\n  平均超额: {avg_alpha:+.2%}   平均夏普: {avg_sh:.2f}   胜率: {beat/len(valid):.0%}")
    return valid

if __name__ == '__main__':
    INITIAL_CASH = 100_000
    preload_data()   # 统一预加载，避免回测中途网络超时

    # ── 段1：牛市 2019-2021 ───────────────────────────────
    res_bull  = run_period("牛市段", "2019-01-01", "2021-12-31", INITIAL_CASH)
    bull_valid = print_summary("牛市段 2019-2021", res_bull)

    # ── 段2：震荡熊市 2022-2024 ───────────────────────────
    res_bear  = run_period("震荡段", "2022-01-01", "2024-12-31", INITIAL_CASH)
    bear_valid = print_summary("震荡段 2022-2024", res_bear)

    # ── 对比汇总 ──────────────────────────────────────────
    print(f"\n{'='*80}")
    print(f"  牛市 vs 震荡 对比（按牛市超额排序）")
    print(f"{'='*80}")
    print(f"{'命主':<10}{'牛市超额':>9}{'牛市夏普':>9}  {'震荡超额':>9}{'震荡夏普':>9}  {'牛>震荡?':>8}")
    print('-'*80)
    bull_map={r['name']:r for r in bull_valid}
    bear_map={r['name']:r for r in bear_valid}
    names=[r['name'] for r in sorted(bull_valid,key=lambda x:-x['metrics']['alpha'])]
    for name in names:
        b=bull_map.get(name); s=bear_map.get(name)
        if not b or not s: continue
        bm=b['metrics']; sm=s['metrics']
        better="YES" if bm['alpha']>sm['alpha'] else "no"
        print(f"{name:<10}{bm['alpha']:>+9.1%}{bm['sharpe']:>9.2f}  "
              f"{sm['alpha']:>+9.1%}{sm['sharpe']:>9.2f}  {better:>8}")

    # ── 绘图 ─────────────────────────────────────────────
    for label, valid in [("牛市2019-2021", bull_valid), ("震荡2022-2024", bear_valid)]:
        vs=sorted(valid, key=lambda r:-r['metrics']['ar'])
        for chunk in [vs[i:i+12] for i in range(0,len(vs),12)]:
            plot_results(chunk, cols=2)
