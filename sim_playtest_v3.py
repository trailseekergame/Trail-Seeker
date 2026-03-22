"""
V3: Push harder toward tension
- Scrap: common [1,2], uncommon [2,3], rare [3,6]  
- Supplies: common [0,1], uncommon [0,1], rare [1,3]
- Seeker whiff: [3,7] HP (was [3,6])
- Gambit whiff: [6,10] HP + [4,8] rover
- Anomaly: 50% chance, [2,5] damage
- Boss: [8,14]
- Gear drop: 8%
"""
import random, statistics

N = 2000; DAYS = 14
HP0=100; ROV0=100; SCR0=15; SUP0=10

def scans(streak): return 4 + [0,0,1,1,2,2,3,3][min(streak,7)] + 1

def scan_type():
    r=random.random()
    if r<0.15: return 'scout'
    if r<0.85: return 'seeker'
    return 'gambit'

WR={'scout':0.01,'seeker':0.16,'gambit':0.36}

def reward(o):
    if o=='whiff': return 0,0
    s={'common':(1,2),'uncommon':(2,3),'rare':(3,6)}
    p={'common':(0,1),'uncommon':(0,1),'rare':(1,3)}
    return random.randint(*s.get(o,(1,2))),random.randint(*p.get(o,(0,1)))

def outcome(st):
    if random.random()<WR[st]: return 'whiff'
    r=random.random()
    if st=='scout': return 'uncommon' if r<0.05 else 'common'
    elif st=='seeker':
        if r<0.10: return 'rare'
        if r<0.40: return 'uncommon'
        return 'common'
    else: return 'rare' if r<0.50 else 'uncommon'

def wdmg(st):
    if st=='scout': return 0,0
    if st=='seeker':
        return (random.randint(3,7),0) if random.random()<0.5 else (0,random.randint(2,5))
    return random.randint(6,10),random.randint(4,8)

def admg():
    if random.random()<0.50: d=random.randint(2,5); return (d,0) if random.random()<0.5 else (0,d)
    return 0,0

def bdmg():
    d=random.randint(8,14); return int(d*0.6),int(d*0.4)

def awdmg(): return random.choice([1,1,0,1,1,2,0]),random.choice([0,2,0,0,1,0,0])
def arwd(): return random.randint(1,3),random.randint(0,2)

def tdur(t):
    if t=='cleared':return 0
    if t=='boss':return 3
    if t=='anomaly':return 2
    if t=='authored':return random.choice([1,1,1,1,2,1,1])
    return 2 if random.random()<0.22 else 1

def tiles():
    t=[]
    for i in range(25):
        if i==0:t.append('cleared')
        elif i==24:t.append('boss')
        elif random.random()<0.12:t.append('anomaly')
        elif random.random()<0.20:t.append('resource')
        else:t.append('unknown')
    for idx in random.sample([i for i in range(1,24) if t[i]!='boss'],min(5,23)):t[idx]='authored'
    return t

RC=5;HC=4

def heal(h,s):
    while h<100 and s>=HC: h=min(100,h+15);s-=HC
    return h,s

def repair(r,c):
    while r<100 and c>=RC: r=min(100,r+15);c-=RC
    return r,c

def sim():
    hp,rv,sc,sp=HP0,ROV0,SCR0,SUP0
    tc=1;tt=tiles();td=[tdur(t) for t in tt]
    wo=0;dtc=None;lhp=100;lrv=100;sk=1
    dhl,drl,dsg,dspg=[],[],[],[]
    for day in range(1,DAYS+1):
        if tc>=25:
            if not dtc:dtc=day-1
            break
        ns=scans(sk);dh=dr=ds=dp=0
        for _ in range(ns):
            if tc>=25 or hp<=0 or rv<=0:break
            si=tc;tt_=tt[si];st=scan_type();oc=outcome(st)
            hd=rd=ss=ps=0
            if oc=='whiff':
                if tt_=='authored':hd,rd=awdmg()
                else:hd,rd=wdmg(st)
            else:
                if tt_=='authored':ss,ps=arwd()
                else:ss,ps=reward(oc)
                if tt_=='anomaly':ah,ar=admg();hd+=ah;rd+=ar
                if tt_=='boss':bh,br=bdmg();hd+=bh;rd+=br
                td[si]-=1
                if td[si]<=0:tc+=1
            hp=max(0,hp-hd);rv=max(0,rv-rd);sc+=ss;sp+=ps
            dh+=hd;dr+=rd;ds+=ss;dp+=ps
            lhp=min(lhp,hp);lrv=min(lrv,rv)
        dhl.append(dh);drl.append(dr);dsg.append(ds);dspg.append(dp)
        if hp<=0:wo+=1;hp=20
        if rv<=0:wo+=1
        hp,sp=heal(hp,sp);rv,sc=repair(rv,sc);sk=min(sk+1,7)
    return {'d':dtc or DAYS,'wo':wo,'hl':statistics.mean(dhl)if dhl else 0,
            'rl':statistics.mean(drl)if drl else 0,'sg':statistics.mean(dsg)if dsg else 0,
            'spg':statistics.mean(dspg)if dspg else 0,'lhp':lhp,'lrv':lrv,
            'sc':sc,'sp':sp,'hp':hp,'rv':rv}

R=[sim() for _ in range(N)]

print("="*60)
print(f"PLAYTEST V3 — {N} players")
print("="*60)
d=[r['d']for r in R]
print(f"\nDays: median {statistics.median(d):.0f}, mean {statistics.mean(d):.1f}, range {min(d)}-{max(d)}")
w=[r['wo']for r in R]
print(f"Wipeouts: {sum(1 for x in w if x==0)/N*100:.1f}% zero, {sum(1 for x in w if x==1)/N*100:.1f}% one, {sum(1 for x in w if x>=2)/N*100:.1f}% two+")
print(f"Daily dmg: HP {statistics.mean([r['hl']for r in R]):.1f}, Rover {statistics.mean([r['rl']for r in R]):.1f}")
lh=[r['lhp']for r in R]
lr=[r['lrv']for r in R]
print(f"Lowest HP: median {statistics.median(lh):.0f}, min {min(lh)} | <50: {sum(1 for x in lh if x<50)/N*100:.1f}% | <30: {sum(1 for x in lh if x<30)/N*100:.1f}%")
print(f"Lowest Rov: median {statistics.median(lr):.0f}, min {min(lr)} | <50: {sum(1 for x in lr if x<50)/N*100:.1f}%")
print(f"Daily income: Scrap {statistics.mean([r['sg']for r in R]):.1f}, Supplies {statistics.mean([r['spg']for r in R]):.1f}")
print(f"End: Scrap {statistics.mean([r['sc']for r in R]):.0f} ({min(r['sc']for r in R)}-{max(r['sc']for r in R)})")
print(f"     Supplies {statistics.mean([r['sp']for r in R]):.0f} ({min(r['sp']for r in R)}-{max(r['sp']for r in R)})")
ah=statistics.mean([r['hl']for r in R]);ar=statistics.mean([r['rl']for r in R])
ai=statistics.mean([r['sg']for r in R]);ap=statistics.mean([r['spg']for r in R])
print(f"Economy: Supply surplus {ap-(ah/15)*4:+.1f}/day, Scrap surplus {ai-(ar/15)*5:+.1f}/day")
