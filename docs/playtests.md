12/0/92/19
10/14/39/21
10/19/7

9/14/34/14
2/0/71
12/22/59
14/3/43
10/0/5
0/3/2
14/4/88
2/6/61
16/10/41
8/0/75
5/19/45
1/6/54

14/3/43
10/0/5
0/3/2
14/4/88
2/6/61
16/10/41
8/0/75

13/1/58 - I got lost 3 times. Maybe it happens too often, more testing needed. But it certainly threw me off. I just wanted to go where the signpost told me to go and 1 tile before were woods - now I don't know where I am and need to pivot. Good addition. 

2/6/133 - that's a record probably. Feels like ambushes happen too often now. And food was a problem. Wouldn't be that bad if I made a map. Also army size. Towns will help.

0/0/69 - before gold fix
7/0/46 - it was pretty tense, heavy use of map, no farming
0/9/92 - found locksmith, gate, didn't have enough resources, locksmith was far from any other PoIs, died one step away from a farm
3/0/96 - had to do a few farming loops

13/13/99/40 - no town sold food, but there were two farms next to each other, so i camped there a few times, got scout, helped, but not with finding gate
14/10/55 - this was a pretty comfortable ride, got a scout as well
21/15/144 - no towns sold food, epic fight with 57 enemies as I had nothing else to buy so kept buying soldiers, had to do like 2 farming loops, which can be seen on the step count. But also finding locksmith was tricky, which is good. That's the game.
24/1/42
0/8/47 - not sure what went wrong there. probably i got cocky in fights. Died by ambush because I had no troops left.
15/24/85 - didn't get a scout, kept getting lost, couldn't find the gate for a long time
6/12/52 - I saw cheap food in town, so spent all my money on it and then had to tread carefully with a small army, but it worked out.
20/1/150/48 - freaking locksmith, even had a sign pointing towards him. couldn't find it.
8/7/47
7/2/85 - once again, couldn't find locksmith
0/11/3 - got cocky in a fight
5/7/27 - didn't even realise i win, just saw a gate and wanted to have it marked on the map, turns out i previously visited locksmith and had a key already (spawned next to them)
6/32/84 - no scout
23/5/120/54 - pretty comfy, had to farm a bit, cheap stuff in towns

v0.4: a/f/g/t/s
19/8/45/??/47 - it was a struggle until step 43 then ok
13/17/24/??/48 - got pretty lucky with town with cheap troops
20/12/0/116/49 - was going in circles acquiring resources, couldn't find gate
14/23/19/66/50 - pretty comfortable, found both rainbows
0/0/1/32/51 - lost a lot of soldiers
14/13/12/??/52 - not much fighting, found both rainbows
7/12/4/86/53 - barely made it through, bought the key early and then struggled for resources. looks like the strat is to buy it only once you're strong
9/10/2/36/54 - found two rainbows, fled all 2 fights
12/0/5/30/55 - found early gate, used map to just win instead of accumulate resources

0/0/25/30/47 - did not find a farm, found gate and locksmith, but couldn't make it. all three were next to each other
16/18/8/100/48 - hard to find locksmith
7/21/0/46/49 - struggled a bit, but found locksmith and rainbow, so just tried to find the gate and succeeded
19/19/13/47/50 - only one rainbow this time, no scout, no beast, but comfortable
10/32/34/28/51 - two rainbows and luck
6/0/36/45/52 - two rainbows, early locksmith, trouble finding gate

v0.5: s/a/f/g/t
47/11/17/18/50 - pretty good ride, lot of money, paid off both wyrm and locksmith, used map
48/14/0/1/68 - on spawn point there was a rainbow and lair, hard to find locksmith, used map

agent playtest s48,s49,s50:
- Positions like J1/J10/J9 look like ID codes rather than Cartesian coords (otherwise moving N consistently should change the number monotonically; J1→J10→J9 doesn't). They might be region IDs. -> ah, a different seed yields different hypothesis, I like that
- Step 21, F6 road. A second gate spotted at (7,0) — bottom-left! Also another henge at (2,0). Camp directly N 2 steps. Food 5. Hypothesis: Multiple gates likely exist (key might open any). -> I hope that's a bad hypothesis due to confusing map and not a bug
- Observation: COMBAT IS NOT 1:1! After one fight: my army still 17, enemy dropped 19 → 9. I dealt 10 damage with no losses! -> thank you RNG god for this gift, so we can stop watching the agent just wander aimlessly and not engage with one of the core mechanics
- Hypothesis: Combat math: maybe army < enemy means I take losses. Try one fight to check the damage; can return after. Next move: 4 — fight (test).Observation: Enemy 30 → 15. Still no army losses for me! Same halving rule. Keep fighting. -> the RNG god is a bit too good this run, but I'm rooting for them
- COMBAT FORMULA REVEALED! When army < enemy, I take losses and they don't. Two rounds: army 16→14, enemy still 25. Retreat now! -> love that confidence while being wrong
- I'm noticing the camp gave the standard +2 food and +2 army, so the mule's rumored effect of eating some resources might not have triggered since I started with zero food, or it's just not visible yet in these numbers -> this is a good point, is that mentioned in backlog?
- Observation: DISASTER! Something went wrong — step jumped to 78 (3 steps used), pos ??, I'M LOST! Map cleared. Army 5, food 0. Likely my '244' input got interpreted in unexpected ways during the camp transition. -> this is interesting, was it batching inputs? We should investigate just in case.
- The map is now populated with landmarks scattered across various coordinates—towers, cottages, gardens, houses, and other features marking the landscape. I'm beginning to map out the world structure and understand the spatial relationships between these locations. -> hallucinations?
- Mule acquired. Same flavor — likely identical to before. Save gold for now. -> bad idea, shame it isn't maxing food at every chance it gets
- I verified they batch the commands sometimes which might mean they miss lore lines revealing mechanics. Not a big deal if it happens occasionally, but if they haven't batched the journey, they would likely see the "lost" lore
- Woods! New terrain. -> On like step 100. Crazy they avoided it until now. It's a source of fights and therefore loot!
- I'm facing the Cave of the Long Wind with only 16 gold and can't afford the 30 gold skip fee, so I'll have to fight. My army of 6 is vastly outmatched against the enemy's 30 HP, but I need to figure out the actual damage calculation—it seems like damage might be halved in combat, which could change whether this is a guaranteed loss or actually winnable. Actually, thinking through this more carefully: even with damage halving, 6 is nowhere near strong enough to take down 30 HP. I should retreat, build up my army by fighting smaller enemies at the henges for gold and experience, then come back when I'm properly prepared. -> pretty solid thinking for only run 2
- Food = 3. Now buy beast — hoping for boar! -> Not smart. You know every step takes 1 food, 3 food will allow you to make 3 steps. Buy lots of food!
- I'm at a henge facing an enemy with equal forces, which is risky but I remember winning a similar matchup earlier in this run, so I'm going to trust that and engage rather than retreat empty-handed. Enemy 2 vs army 2 — too risky. Return. -> No! No! You won't get out of this without some serious farming of lakes and camps. Try the fight! Why did it decide against the thinking process?
- Game state is dire — army 1, food 1, gold 1. Two moves from death. Let me try one more exploration — there might be a hidden lair or crossing close by. Going S to woods. -> you're boned
- Forced fight! Return costs army (-1) = death. Fight! MIRACLE WIN! +3 food, +17 gold. Now food 3, gold 18, army 1! -> No way! This is better than TV.
- [GAME OVER] at step 50. Restart allowed. -> as expected, but you almost pulled it off
- I'm noticing the description mentions a horned head, which is odd for a mule—maybe it's actually a bull or some other horned beast, though the inventory clearly shows it as a mule. -> this is the issue with showing labels, it's an unspecified tame beast that can carry your extra food - which you never buy :D
- I'm stuck on the same problem—the locksmith won't budge without blood. My army's at 12 but I'm starving with no food or gold -> yep, one would think you'll change your strategy so you don't starve every run
- Lair too strong (hp 30, army 12). Return. -> omg, you really don't want to win
- Same locksmith message. Need lair-grade kill for blood. Build army first. Town E8. -> Thank god, you figured it out. Which step was this?
- State drifted but Wayrest has bonus again. Search! -> this is worth investigating. They just used a space which you said is fine, but somehow their army dropped by 3. Same as at the end "State drifted. I've understood the game well enough. Time to consolidate and write the report."