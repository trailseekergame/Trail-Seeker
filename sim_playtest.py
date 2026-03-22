"""
Playtest simulation: Camp → Broken Overpass → Camp loop
Simulates 1000 players doing 7 days of play, tracking:
- HP / Rover at end of each session
- Total scrap / supplies earned
- Wipeouts (HP=0 or Rover=0)
- Days to clear Broken Overpass
- Resource balance (can they afford to heal/repair?)
"""
import random
import statistics

NUM_PLAYERS = 1000
MAX_DAYS = 14

# ─── Starting state ───
START_HP = 100
START_ROVER = 100
START_SCRAP = 15
START_SUPPLIES = 10

# ─── Daily scans (day 1 = streak 1, with exo vest) ───
def daily_scans(streak_day):
    base = 4
    bonus = [0, 0, 1, 1, 2, 2, 3, 3][min(streak_day, 7)]
    vest_bonus = 1  # standard exo vest
    return base + bonus + vest_bonus

# ─── Scan mix: assume early player uses mostly seeker with some scout ───
def pick_scan_type():
    r = random.random()
    if r < 0.15: return 'scout'
    if r < 0.85: return 'seeker'
    return 'gambit'

# ─── Whiff rates (with standard grip gauntlets: -0.04) ───
WHIFF_RATES = {
    'scout': max(0, 0.05 - 0.04),   # 0.01
    'seeker': max(0, 0.20 - 0.04),   # 0.16
    'gambit': max(0.25, 0.40 - 0.04), # 0.36
}

# ─── Generic tile rewards (weighted average of common/uncommon) ───
def generic_reward(outcome):
    if outcome == 'whiff':
        return 0, 0
    scrap_ranges = {'common': (2,4), 'uncommon': (3,6), 'rare': (5,10)}
    supply_ranges = {'common': (0,2), 'uncommon': (1,3), 'rare': (2,5)}
    sr = scrap_ranges.get(outcome, (2,4))
    spr = supply_ranges.get(outcome, (0,2))
    return random.randint(*sr), random.randint(*spr)

def roll_outcome(scan_type):
    if random.random() < WHIFF_RATES[scan_type]:
        return 'whiff'
    r = random.random()
    if scan_type == 'scout':
        return 'uncommon' if r < 0.05 else 'common'
    elif scan_type == 'seeker':
        if r < 0.10: return 'rare'
        if r < 0.40: return 'uncommon'
        return 'common'
    else:  # gambit
        if r < 0.15: return 'rare'  # (legendary mapped to rare for sim)
        if r < 0.50: return 'rare'
        return 'uncommon'

# ─── Damage tables ───
def whiff_damage(scan_type):
    """Returns (hp_dmg, rover_dmg)"""
    if scan_type == 'scout':
        return 0, 0
    elif scan_type == 'seeker':
        if random.random() < 0.5:
            return random.randint(2, 5), 0
        else:
            return 0, random.randint(1, 4)
    else:  # gambit
        return random.randint(4, 8), random.randint(3, 6)

def anomaly_success_damage():
    """40% chance of 2-4 dmg on anomaly tiles"""
    if random.random() < 0.4:
        dmg = random.randint(2, 4)
        if random.random() < 0.5:
            return dmg, 0
        return 0, dmg
    return 0, 0

# ─── Tile type distribution for Broken Overpass ───
# 25 tiles: 1 cleared, 1 boss, ~12% anomaly, ~20% resource, rest unknown
# Plus 5 authored tiles replacing some generics
def gen_tile_types():
    tiles = []
    for i in range(25):
        if i == 0:
            tiles.append('cleared')
        elif i == 24:
            tiles.append('boss')
        elif random.random() < 0.12:
            tiles.append('anomaly')
        elif random.random() < 0.20:
            tiles.append('resource')
        else:
            tiles.append('unknown')
    # Mark ~5 as authored (for sim, they have specific damage profiles)
    authored_indices = random.sample([i for i in range(1, 24) if tiles[i] != 'boss'], min(5, 23))
    for idx in authored_indices:
        tiles[idx] = 'authored'
    return tiles

# ─── Authored tile damage (averaged from the 7 tiles) ───
def authored_whiff_damage():
    """Average: ~1 HP, ~0.3 Rover"""
    return random.choice([1, 1, 0, 1, 1, 2, 0]), random.choice([0, 2, 0, 0, 1, 0, 0])

def authored_success_reward():
    """Average across all 7: ~2.5 scrap, ~2 supplies"""
    return random.randint(1, 4), random.randint(1, 3)

# ─── Boss tile damage ───
def boss_damage():
    dmg = random.randint(5, 10)
    return int(dmg * 0.6), int(dmg * 0.4)

# ─── Tile durability ───
def tile_durability(tile_type):
    if tile_type == 'cleared': return 0
    if tile_type == 'boss': return 3
    if tile_type == 'anomaly': return 2
    if tile_type == 'authored':
        return random.choice([1, 1, 1, 1, 2, 1, 1])  # most are 1
    if random.random() < 0.22:  # hardened rate
        return 2
    return 1

# ─── Heal/Repair at camp ───
REPAIR_COST = 5   # scrap per 15 rover
HEAL_COST = 4     # supplies per 15 hp

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

# ─── Simulate one player ───
def simulate_player():
    hp = START_HP
    rover = START_ROVER
    scrap = START_SCRAP
    supplies = START_SUPPLIES
    
    tiles_cleared = 1  # start tile
    total_tiles = 25
    tile_types = gen_tile_types()
    tile_durs = [tile_durability(t) for t in tile_types]
    
    wipeouts = 0
    days_to_clear = None
    daily_hp_loss = []
    daily_rover_loss = []
    daily_scrap_gain = []
    daily_supply_gain = []
    
    streak = 1
    
    for day in range(1, MAX_DAYS + 1):
        if tiles_cleared >= total_tiles:
            if days_to_clear is None:
                days_to_clear = day - 1
            break
            
        scans = daily_scans(streak)
        day_hp_loss = 0
        day_rover_loss = 0
        day_scrap = 0
        day_supply = 0
        
        for _ in range(scans):
            if tiles_cleared >= total_tiles:
                break
            if hp <= 0 or rover <= 0:
                break
                
            # Pick a tile to scan (next uncleared)
            scan_idx = tiles_cleared  # simplified: scan in order
            if scan_idx >= total_tiles:
                break
            tile_type = tile_types[scan_idx]
            
            scan_type = pick_scan_type()
            outcome = roll_outcome(scan_type)
            
            hp_dmg = 0
            rov_dmg = 0
            s_scrap = 0
            s_supply = 0
            
            if outcome == 'whiff':
                if tile_type == 'authored':
                    hp_dmg, rov_dmg = authored_whiff_damage()
                else:
                    hp_dmg, rov_dmg = whiff_damage(scan_type)
            else:
                # Success rewards
                if tile_type == 'authored':
                    s_scrap, s_supply = authored_success_reward()
                else:
                    s_scrap, s_supply = generic_reward(outcome)
                
                # Anomaly success damage
                if tile_type == 'anomaly':
                    a_hp, a_rov = anomaly_success_damage()
                    hp_dmg += a_hp
                    rov_dmg += a_rov
                
                # Boss damage
                if tile_type == 'boss':
                    b_hp, b_rov = boss_damage()
                    hp_dmg += b_hp
                    rov_dmg += b_rov
                
                # Tile durability
                tile_durs[scan_idx] -= 1
                if tile_durs[scan_idx] <= 0:
                    tiles_cleared += 1
            
            hp = max(0, hp - hp_dmg)
            rover = max(0, rover - rov_dmg)
            scrap += s_scrap
            supplies += s_supply
            day_hp_loss += hp_dmg
            day_rover_loss += rov_dmg
            day_scrap += s_scrap
            day_supply += s_supply
        
        daily_hp_loss.append(day_hp_loss)
        daily_rover_loss.append(day_rover_loss)
        daily_scrap_gain.append(day_scrap)
        daily_supply_gain.append(day_supply)
        
        # Check wipeout
        if hp <= 0:
            wipeouts += 1
            hp = 20  # auto-heal on wipeout
        if rover <= 0:
            wipeouts += 1
        
        # Heal/repair at camp between sessions
        hp, supplies = heal_at_camp(hp, supplies)
        rover, scrap = repair_at_camp(rover, scrap)
        
        streak = min(streak + 1, 7)
    
    return {
        'days_to_clear': days_to_clear or MAX_DAYS,
        'final_hp': hp,
        'final_rover': rover,
        'final_scrap': scrap,
        'final_supplies': supplies,
        'wipeouts': wipeouts,
        'avg_daily_hp_loss': statistics.mean(daily_hp_loss) if daily_hp_loss else 0,
        'avg_daily_rover_loss': statistics.mean(daily_rover_loss) if daily_rover_loss else 0,
        'avg_daily_scrap': statistics.mean(daily_scrap_gain) if daily_scrap_gain else 0,
        'avg_daily_supply': statistics.mean(daily_supply_gain) if daily_supply_gain else 0,
    }

# ─── Run simulation ───
results = [simulate_player() for _ in range(NUM_PLAYERS)]

# ─── Report ───
print("=" * 60)
print(f"PLAYTEST SIMULATION — {NUM_PLAYERS} players, up to {MAX_DAYS} days")
print("=" * 60)

days = [r['days_to_clear'] for r in results]
print(f"\nDays to clear Broken Overpass:")
print(f"  Median: {statistics.median(days):.0f}")
print(f"  Mean:   {statistics.mean(days):.1f}")
print(f"  Min:    {min(days)}, Max: {max(days)}")
print(f"  <7 days: {sum(1 for d in days if d < 7)/NUM_PLAYERS*100:.0f}%")
print(f"  7-9 days: {sum(1 for d in days if 7 <= d <= 9)/NUM_PLAYERS*100:.0f}%")
print(f"  10+ days: {sum(1 for d in days if d >= 10)/NUM_PLAYERS*100:.0f}%")

wipeouts = [r['wipeouts'] for r in results]
print(f"\nWipeouts (HP=0 or Rover=0 during a run):")
print(f"  Zero wipeouts: {sum(1 for w in wipeouts if w == 0)/NUM_PLAYERS*100:.0f}%")
print(f"  1 wipeout:     {sum(1 for w in wipeouts if w == 1)/NUM_PLAYERS*100:.0f}%")
print(f"  2+ wipeouts:   {sum(1 for w in wipeouts if w >= 2)/NUM_PLAYERS*100:.0f}%")
print(f"  Mean:           {statistics.mean(wipeouts):.2f}")

hp_loss = [r['avg_daily_hp_loss'] for r in results]
rov_loss = [r['avg_daily_rover_loss'] for r in results]
print(f"\nAverage daily damage:")
print(f"  HP loss/session:    {statistics.mean(hp_loss):.1f} (range {min(hp_loss):.0f}-{max(hp_loss):.0f})")
print(f"  Rover loss/session: {statistics.mean(rov_loss):.1f} (range {min(rov_loss):.0f}-{max(rov_loss):.0f})")

scrap_gain = [r['avg_daily_scrap'] for r in results]
supply_gain = [r['avg_daily_supply'] for r in results]
print(f"\nAverage daily income:")
print(f"  Scrap/session:    {statistics.mean(scrap_gain):.1f}")
print(f"  Supplies/session: {statistics.mean(supply_gain):.1f}")

final_hp = [r['final_hp'] for r in results]
final_rover = [r['final_rover'] for r in results]
final_scrap = [r['final_scrap'] for r in results]
final_supply = [r['final_supplies'] for r in results]
print(f"\nEnd-of-chapter resource state:")
print(f"  HP:       {statistics.mean(final_hp):.0f} avg ({min(final_hp)}-{max(final_hp)})")
print(f"  Rover:    {statistics.mean(final_rover):.0f} avg ({min(final_rover)}-{max(final_rover)})")
print(f"  Scrap:    {statistics.mean(final_scrap):.0f} avg ({min(final_scrap)}-{max(final_scrap)})")
print(f"  Supplies: {statistics.mean(final_supply):.0f} avg ({min(final_supply)}-{max(final_supply)})")

# ─── Economy check: can players afford to heal between sessions? ───
# Heal costs 4 supplies per 15 HP, repair costs 5 scrap per 15 rover
# Average daily HP loss ~X means they need X/15 * 4 = Y supplies/day for healing
avg_hp = statistics.mean(hp_loss)
avg_rov = statistics.mean(rov_loss)
heal_supply_needed = (avg_hp / 15) * 4
repair_scrap_needed = (avg_rov / 15) * 5
avg_scrap_in = statistics.mean(scrap_gain)
avg_supply_in = statistics.mean(supply_gain)

print(f"\nEconomy balance check:")
print(f"  Supplies needed for healing: {heal_supply_needed:.1f}/day")
print(f"  Supplies earned:             {avg_supply_in:.1f}/day")
print(f"  Supply surplus:              {avg_supply_in - heal_supply_needed:+.1f}/day")
print(f"  Scrap needed for repair:     {repair_scrap_needed:.1f}/day")
print(f"  Scrap earned:                {avg_scrap_in:.1f}/day")
print(f"  Scrap surplus:               {avg_scrap_in - repair_scrap_needed:+.1f}/day")

print(f"\n{'=' * 60}")
print("TARGET: 'a little heat but not frustrating'")
print("  Ideal: 5-10 HP loss/session, ~1-3 rover loss/session")
print("  Ideal: <5% full wipeout rate over chapter 1")
print("  Ideal: net positive resources after healing/repair")
print(f"{'=' * 60}")
