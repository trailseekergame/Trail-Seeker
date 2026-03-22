"""
Playtest V2: Test proposed tweaks
Changes from V1:
- Generic scrap: [2,4] → [1,3] common, [3,6] → [2,4] uncommon
- Generic supplies: [0,2] → [0,1] common, [1,3] → [0,2] uncommon
- Seeker whiff damage: [2,5] → [3,6] HP
- Gambit whiff damage: [4,8] → [5,9] HP, [3,6] → [4,7] rover
- Anomaly success chance: 40% → 50%
- Boss damage: [5,10] → [6,12]
- Gear drop chance: 12% → 8%
"""
import random
import statistics

NUM_PLAYERS = 1000
MAX_DAYS = 14
START_HP = 100
START_ROVER = 100
START_SCRAP = 15
START_SUPPLIES = 10

def daily_scans(streak_day):
    base = 4
    bonus = [0, 0, 1, 1, 2, 2, 3, 3][min(streak_day, 7)]
    return base + bonus + 1

def pick_scan_type():
    r = random.random()
    if r < 0.15: return 'scout'
    if r < 0.85: return 'seeker'
    return 'gambit'

WHIFF_RATES = {
    'scout': 0.01,
    'seeker': 0.16,
    'gambit': 0.36,
}

# TWEAKED rewards
def generic_reward(outcome):
    if outcome == 'whiff': return 0, 0
    scrap = {'common': (1,3), 'uncommon': (2,4), 'rare': (4,8)}
    supply = {'common': (0,1), 'uncommon': (0,2), 'rare': (1,4)}
    return random.randint(*scrap.get(outcome,(1,3))), random.randint(*supply.get(outcome,(0,1)))

def roll_outcome(scan_type):
    if random.random() < WHIFF_RATES[scan_type]: return 'whiff'
    r = random.random()
    if scan_type == 'scout':
        return 'uncommon' if r < 0.05 else 'common'
    elif scan_type == 'seeker':
        if r < 0.10: return 'rare'
        if r < 0.40: return 'uncommon'
        return 'common'
    else:
        if r < 0.50: return 'rare'
        return 'uncommon'

# TWEAKED damage
def whiff_damage(scan_type):
    if scan_type == 'scout': return 0, 0
    elif scan_type == 'seeker':
        if random.random() < 0.5:
            return random.randint(3, 6), 0  # was 2,5
        else:
            return 0, random.randint(2, 4)  # was 1,4
    else:
        return random.randint(5, 9), random.randint(4, 7)  # was 4,8 and 3,6

def anomaly_success_damage():
    if random.random() < 0.50:  # was 0.40
        dmg = random.randint(2, 4)
        if random.random() < 0.5: return dmg, 0
        return 0, dmg
    return 0, 0

def authored_whiff_damage():
    return random.choice([1, 1, 0, 1, 1, 2, 0]), random.choice([0, 2, 0, 0, 1, 0, 0])

def authored_success_reward():
    return random.randint(1, 3), random.randint(1, 2)  # slightly lower

def boss_damage():
    dmg = random.randint(6, 12)  # was 5,10
    return int(dmg * 0.6), int(dmg * 0.4)

def tile_durability(tile_type):
    if tile_type == 'cleared': return 0
    if tile_type == 'boss': return 3
    if tile_type == 'anomaly': return 2
    if tile_type == 'authored': return random.choice([1,1,1,1,2,1,1])
    if random.random() < 0.22: return 2
    return 1

def gen_tile_types():
    tiles = []
    for i in range(25):
        if i == 0: tiles.append('cleared')
        elif i == 24: tiles.append('boss')
        elif random.random() < 0.12: tiles.append('anomaly')
        elif random.random() < 0.20: tiles.append('resource')
        else: tiles.append('unknown')
    authored = random.sample([i for i in range(1,24) if tiles[i]!='boss'], min(5,23))
    for idx in authored: tiles[idx] = 'authored'
    return tiles

REPAIR_COST = 5
HEAL_COST = 4

def heal_at_camp(hp, supplies):
    while hp < 100 and supplies >= HEAL_COST:
        hp = min(100, hp + 15)
        supplies -= HEAL_COST
    return hp, supplies

def repair_at_camp(rover, scrap):
    while rover < 100 and scrap >= REPAIR_COST:
        rover = min(100, rover + 15)
        scrap -= REPAIR_COST
    return rover, scrap

def simulate_player():
    hp, rover, scrap, supplies = START_HP, START_ROVER, START_SCRAP, START_SUPPLIES
    tiles_cleared = 1
    total_tiles = 25
    tile_types = gen_tile_types()
    tile_durs = [tile_durability(t) for t in tile_types]
    wipeouts = 0
    days_to_clear = None
    daily_hp_loss, daily_rover_loss = [], []
    daily_scrap_gain, daily_supply_gain = [], []
    streak = 1
    lowest_hp = 100
    lowest_rover = 100
    
    for day in range(1, MAX_DAYS + 1):
        if tiles_cleared >= total_tiles:
            if days_to_clear is None: days_to_clear = day - 1
            break
        scans = daily_scans(streak)
        dhp, drov, dscr, dsup = 0, 0, 0, 0
        
        for _ in range(scans):
            if tiles_cleared >= total_tiles or hp <= 0 or rover <= 0: break
            scan_idx = tiles_cleared
            if scan_idx >= total_tiles: break
            tile_type = tile_types[scan_idx]
            scan_type = pick_scan_type()
            outcome = roll_outcome(scan_type)
            hp_dmg, rov_dmg, s_scrap, s_supply = 0, 0, 0, 0
            
            if outcome == 'whiff':
                if tile_type == 'authored':
                    hp_dmg, rov_dmg = authored_whiff_damage()
                else:
                    hp_dmg, rov_dmg = whiff_damage(scan_type)
            else:
                if tile_type == 'authored':
                    s_scrap, s_supply = authored_success_reward()
                else:
                    s_scrap, s_supply = generic_reward(outcome)
                if tile_type == 'anomaly':
                    a_hp, a_rov = anomaly_success_damage()
                    hp_dmg += a_hp; rov_dmg += a_rov
                if tile_type == 'boss':
                    b_hp, b_rov = boss_damage()
                    hp_dmg += b_hp; rov_dmg += b_rov
                tile_durs[scan_idx] -= 1
                if tile_durs[scan_idx] <= 0: tiles_cleared += 1
            
            hp = max(0, hp - hp_dmg); rover = max(0, rover - rov_dmg)
            scrap += s_scrap; supplies += s_supply
            dhp += hp_dmg; drov += rov_dmg; dscr += s_scrap; dsup += s_supply
            lowest_hp = min(lowest_hp, hp)
            lowest_rover = min(lowest_rover, rover)
        
        daily_hp_loss.append(dhp); daily_rover_loss.append(drov)
        daily_scrap_gain.append(dscr); daily_supply_gain.append(dsup)
        
        if hp <= 0: wipeouts += 1; hp = 20
        if rover <= 0: wipeouts += 1
        
        hp, supplies = heal_at_camp(hp, supplies)
        rover, scrap = repair_at_camp(rover, scrap)
        streak = min(streak + 1, 7)
    
    return {
        'days': days_to_clear or MAX_DAYS, 'hp': hp, 'rover': rover,
        'scrap': scrap, 'supplies': supplies, 'wipeouts': wipeouts,
        'hp_loss': statistics.mean(daily_hp_loss) if daily_hp_loss else 0,
        'rov_loss': statistics.mean(daily_rover_loss) if daily_rover_loss else 0,
        'scrap_gain': statistics.mean(daily_scrap_gain) if daily_scrap_gain else 0,
        'sup_gain': statistics.mean(daily_supply_gain) if daily_supply_gain else 0,
        'lowest_hp': lowest_hp, 'lowest_rover': lowest_rover,
    }

results = [simulate_player() for _ in range(NUM_PLAYERS)]

print("=" * 60)
print(f"PLAYTEST V2 (PROPOSED TWEAKS) — {NUM_PLAYERS} players")
print("=" * 60)

days = [r['days'] for r in results]
print(f"\nDays to clear: median {statistics.median(days):.0f}, mean {statistics.mean(days):.1f}, range {min(days)}-{max(days)}")

wipeouts = [r['wipeouts'] for r in results]
print(f"\nWipeouts: {sum(1 for w in wipeouts if w==0)/NUM_PLAYERS*100:.0f}% zero, {sum(1 for w in wipeouts if w==1)/NUM_PLAYERS*100:.0f}% one, {sum(1 for w in wipeouts if w>=2)/NUM_PLAYERS*100:.0f}% two+")
print(f"  Mean: {statistics.mean(wipeouts):.2f}")

hp_loss = [r['hp_loss'] for r in results]
rov_loss = [r['rov_loss'] for r in results]
print(f"\nDaily damage: HP {statistics.mean(hp_loss):.1f}/session, Rover {statistics.mean(rov_loss):.1f}/session")

lowest_hp = [r['lowest_hp'] for r in results]
lowest_rov = [r['lowest_rover'] for r in results]
print(f"Lowest HP hit:    median {statistics.median(lowest_hp):.0f}, mean {statistics.mean(lowest_hp):.0f} (min {min(lowest_hp)})")
print(f"Lowest Rover hit: median {statistics.median(lowest_rov):.0f}, mean {statistics.mean(lowest_rov):.0f} (min {min(lowest_rov)})")

scrap = [r['scrap_gain'] for r in results]
sup = [r['sup_gain'] for r in results]
print(f"\nDaily income: Scrap {statistics.mean(scrap):.1f}, Supplies {statistics.mean(sup):.1f}")

final = {k: [r[k] for r in results] for k in ['hp','rover','scrap','supplies']}
print(f"\nEnd state: HP {statistics.mean(final['hp']):.0f}, Rover {statistics.mean(final['rover']):.0f}")
print(f"           Scrap {statistics.mean(final['scrap']):.0f} ({min(final['scrap'])}-{max(final['scrap'])})")
print(f"           Supplies {statistics.mean(final['supplies']):.0f} ({min(final['supplies'])}-{max(final['supplies'])})")

avg_hp = statistics.mean(hp_loss)
avg_rov = statistics.mean(rov_loss)
avg_scr = statistics.mean(scrap)
avg_sup = statistics.mean(sup)
print(f"\nEconomy: Supply surplus {avg_sup - (avg_hp/15)*4:+.1f}/day, Scrap surplus {avg_scr - (avg_rov/15)*5:+.1f}/day")
print(f"\n{'='*60}")
