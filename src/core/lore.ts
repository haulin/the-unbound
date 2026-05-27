/*
Mechanics index (keep this list current):

- Core loop
  - Movement costs food (usually 1); mountains/swamps cost 2; hunger can reduce army and end run.
  - Winning: bronze key + gate interaction.
  - Losing: army size hits 0

- Resources
  - Army: combat unit and HP; hits 0 = game over.
  - Food: depletes 1/move, 2 on mountains/swamps; hits 0 reduces army.
  - Food carry cap: 2 per soldier (the Mule slot raises this by +50). Excess food gains clamp to the cap.
  - Bronze key - opens the Gate; forged only by the Locksmith.
  - The Blood - drawn from the Wyrm; consumed by the Locksmith as the quench.

- Slots
  - Up to 3 held at once, from a roster of 7. Bought at PoIs, sold at The Crossing for half price.
  - Mule (animal) — +50 food carry cap; -1 food per Camp Search. Cannot coexist with Boar.
  - Boar (animal) — opening volley kills ~25% of enemy army at combat start. Cannot coexist with Mule.
  - Scout (person) — halves woods/swamp lost chance; when oriented, reveals farms/camps/henges globally on the map (gate/locksmith/lair remain gated by mapping).
  - Healer (person) — revives 1 wounded per combat; costs -1 gold per Town visit.
  - Captain (person, banner-bearer) — +10% combat odds; +X% ambush in woods and mountains.
  - Fisherman (person) — double lake yields; +1 troop loss per flee.
  - Magpie (animal) — ~30% refund of 1 on any payment (Wyrm bribe included; Crossing sales excluded — those are refunds, not payments). Higher buy price.

- Navigation
  - In-game map
    - Toggle map temporarily overrides lore text; closing restores previous text if unchanged.
    - Rendering is platform-specific (see `src/platform/tic80/`); this file holds the player-facing strings.
  - Coords show "??" while lost; woods/swamp can teleport (lost); signpost/farm re-orient (knowsPosition).
  - run.path records steps; while lost we buffer mapping; on re-orient we backfill mappedness from lostBufferStartIndex.

- Encounters / POIs
  - Combat: fight/flee; deterministic encounter flavor + exit lines.
  - Farms: modal encounter; buy food, hire one slot (varies by farm — Mule, Boar, or Magpie), leave.
  - Camps: modal encounter; Search (deterministic reinforcements when ready); hire one slot (varies by camp — Scout or Captain); leave.
  - Towns: modal encounter; buy food, hire one slot (varies by town — Scout, Healer, or Fisherman), leave. Tavern rumors land later (see backlog).
  - Henges: combat encounter when ready; cooldown; henge-specific encounter line.
  - Gate / Locksmith
    - Locksmith modal: requires the Blood + pay-gold-or-food; skipped if you have the key.
    - Without the Blood: no modal opens; tile shows inline flavor only.
    - Gate opens only with the key.
  - Wyrm Lair
    - PoI placed on a mountain tile; modal combat.
    - Buttons: Fight (draws Blood on win; wyrm survives) / Pay (gold bribe for Blood) / Flee.
  - The Crossing: sell-only PoI. Buttons show each held slot; tapping sells that slot for half its purchase price. 1–2 per map.
  - Fishing lakes: placed PoIs; grant 1-3 food when ready; cooldown 3; do not appear on the map.
  - Rainbow's End: placed PoIs; grant +30 gold once per end (then spent).
  - Woods / Mountains: ambush chance

Note: Not every mechanic must be taught by ambient lore. Short teaching lines can also live in Town rumors (`BARKEEP_TIPS`).
*/

import type { TerrainKind } from "./types";

// ----------------------------
// Narrative / labels
// ----------------------------
export const GOAL_NARRATIVE =
  "The road never ends. It only returns.\nThey say there is a bronze gate that breaks the circle.\nYou mean to find out.";

export const LOST_COORD_LABEL = "??";

export const MAP_HINT_MESSAGE =
  "Map\nThe world, as best you can read it.";

// ----------------------------
// Tavern rumors / barkeep tips 
// ----------------------------
export const BARKEEP_TIPS = {
  movementAndHunger: [
    "Most steps cost 1 ration. Mountains and swamps cost 2.",
    "If you don't have rations, your soldiers will start to starve.",
  ],
  carryCapacity: [
    "You can only carry so many rations: 2 per soldier.",
    "A tame beast lets you carry 50 more rations.",
    "If you're already full, you can't buy more rations.",
  ],
  lostAndOrientation: [
    "Woods and swamps can pull you off course.",
    "When lost, find a signpost, farm, or town to get your bearings again.",
    "What's nice about the Unbound is that everything is at most 10 leagues away.",
  ],
  map: [
    "The map shows landmarks, not terrain.",
    "While lost, map only shows what you've found since you went off course.",
  ],
  scout: [
    "A Scout halves your odds of getting lost in woods and swamps.",
    "When you're oriented, a Scout points out farms, camps, and henges.",
    "A scout can be hired in a Town - or, if you're lucky, around a Camp's fire.",
  ],
  goal: [
    "Someone saw the Locksmith three nights ago.",
    "The Locksmith won't forge without the quench. Bring blood.",
    "The dragon in the high country bleeds, if you can reach it.",
  ],
  wyrm: [
    "There's a dragon up in the high passes. Old as the stones.",
    "Don't go to the wyrm alone. Even with men, it's a near thing.",
    "You don't have to kill it. Just enough to draw the blood. It heals.",
    "Gold works on the wyrm too, they say. If you've got a lot of it.",
    "The cave with the long wind - that's where it sleeps.",
  ],
  mule: [
    "A mule carries fifty more rations, but it'll take some of yours at every camp.",
    "Sell a tired mule at a Crossing if you can. Half what you paid is fair.",
  ],
  healer: [
    "A hedge-healer can pull a soldier back from a bad day. She'll empty your purse, slowly.",
    "Some towns have one. She'll cost you a coin every time you stop in - bandages, herbs, the salve that smells of iron.",
  ],
  boar: [
    "A trained boar does one thing well, and at the start of a fight. Don't expect it twice in a day.",
    "If you've a mule, a boar won't sit beside it. Pick one.",
  ],
  captain: [
    "A banner makes the men fight straighter. It also makes them seen. Mind your woods and mountains.",
    "If you carry the colours, expect company on bad roads.",
  ],
  fisherman: [
    "A fisherman doubles what a lake gives you. He's heavy gear though. You'll feel it if you run.",
  ],
  magpie: [
    "A magpie palms a coin out of any honest trade. Roughly one in three. Pays for itself if you trade enough.",
    "Don't ask the farmer where she got it. She doesn't know either.",
  ],
  crossing: [
    "Carrying too many companions? A Crossing will take one off your hands. Half what you paid is the going rate.",
    "Drovers at a Crossing buy from anyone. Beasts, banners, even people with somewhere else to be.",
  ],
} as const;

// ----------------------------
// Gate + key / locksmith
// ----------------------------
export const GATE_LOCKED_LINES = [
  "A keyhole with no key. Not yet.",
  "Bronze, but unyielding. You will need the key.",
  "It does not open for hands. Only for the turning.",
] as const;

export const GATE_OPEN_LINES = [
  "The lock turns. The Unbound lets you pass.",
  "Bronze gives way. The road continues.",
] as const;

export const LOCKSMITH_PURCHASE_LINES = [
  "You feed the fire. They finish the key.",
  "A small hammer-song. A key, still warm.",
  "They take what you offer and give you what you came for.",
  "The blade plunges into the vial. The hiss is brief. The key is bronze and done.",
  "The quench is over before you can blink. The key cools in their palm.",
] as const;

export const LOCKSMITH_ENTER_LINES = [
  'The forge offers a key - for a price.',
  'Heat rolls out from the kiln. The smith waits.',
] as const;

export const LOCKSMITH_VISITED_LINES = [
  "The forge is cold. The work is done.",
  "Nothing left to make for you here.",
] as const;

export const LOCKSMITH_NO_FOOD_LINES = [
  "No heat, no key.",
  "Come back with enough. The fire needs feeding first.",
  "Others have paid for this before you. Most of them got further than you'd think.",
];

export const LOCKSMITH_NO_BLOOD_LINES = [
  "The forge has heat enough. What it lacks is the quench.",
  "\"Bring me what the kiln cannot make. Then we'll talk.\"",
  "The smith glances at your hands. Empty. They go back to their work.",
  "\"No blood, no bronze. Not the kind that opens what you want opened.\"",
] as const;

export const LOCKSMITH_BLOOD_READY_LINES = [
  "The smith sees the vial. They nod once. The forge is ready.",
  "\"You found it, then.\" The kiln is already lit.",
  "They take the vial without comment. The hammer is in their hand.",
] as const;

// ----------------------------
// The Wyrm / The Lair
// ----------------------------
export const WYRM_NAME = 'The Wyrm';

export const LAIR_NAME_POOL = [
  "The Long Wound",
  "Snake's Roost",
  "The Coiled Hall",
  "Wyrm-Crag",
  "The Sleeping Stone",
  "The Hollow",
] as const;

export const LAIR_FIRST_VISIT_LINES = [
  "A cave mouth that does not echo. Something inside is breathing slowly.",
  "The stone here is warm. Wind comes out of the dark in long, slow exhales.",
  "You smell iron and old smoke. The cave goes back further than it should.",
] as const;

export const WYRM_ENCOUNTER_LINES = [
  "It uncoils. It takes its time.",
  "The dark moves. Then the dark has wings.",
  "It was awake the whole time. It just hadn't moved yet.",
] as const;

export const WYRM_VICTORY_LINES = [
  "It bleeds. You take what you came for. It crawls deeper into the stone.",
  "Enough. You fill the vial. The wyrm withdraws, slow and unkilled.",
  "It does not die. It does not need to. You have the quench.",
] as const;

export const WYRM_PAYOFF_LINES = [
  "Gold for the right to bleed it. A strange trade. It accepts.",
  "You pay. It permits the cut. The vial fills.",
  "The coin disappears into the stone. The wyrm is patient with paying men.",
] as const;

export const WYRM_FLEE_LINES = [
  "You leave the way you came. It does not pursue. It does not need to.",
  "The cave releases you. The Locksmith is no closer.",
] as const;

// ----------------------------
// Terrain lore
// ----------------------------
export const TERRAIN_LORE_BY_KIND: Record<TerrainKind, readonly string[]> = {
  grass: [
    "The grass bends with your passing.",
    "You watch the wind arrive before you do.",
    "A soft field that does not care who crosses it.",
  ],
  road: [
    "The road here remembers other feet.",
    "A track worn down by those who never stopped walking.",
    "The dust rises and settles like it has done this before.",
  ],
  mountain: [
    "The peaks ahead do not look closer. Stone and thin air. Your supplies will feel it.",
    "Narrow passes. Notorious for ambushes.",
    "The wind here forgets to carry sound.",
  ],
  swamp: [
    "Crossing the bog is harder than it looks. You'll need to eat well tonight.",
    "Mist clings. Landmarks lie. You hope you remember the way back.",
    "The reeds whisper. They have heard worse.",
  ],
  woods: [
    "A path that isn't quite a path.",
    "Something moves between the trunks. You move faster.",
    "The trees rearrange themselves while you blink. You hope it is the wind.",
  ],
};

// ----------------------------
// Name pools
// ----------------------------
export const FARM_NAME_POOL = [
  "The Oast",
  "Burnt Acre",
  "Greyfield",
  "Hob's Reach",
  "The Stemming",
  "Fallow End",
  "Cotter's Rise",
] as const;

export const CAMP_NAME_POOL = [
  "The Wayrest",
  "Ember Watch",
  "The Muster",
  "Cold Haven",
  "Ashford",
  "Dusk Halt",
  "The Holdfast",
] as const;

export const HENGE_NAME_POOL = [
  "The Mending",
  "Old Insistence",
  "Crows' Argument",
  "The Recurring",
  "Patient Circle",
  "Weather Stones",
] as const;

export const TOWN_NAME_POOL = [
  "Stonebridge",
  "Cinder Row",
  "Ember Crossroads",
  "The Long Return",
  "Market of Ash",
] as const;

export const CROSSING_NAME_POOL = [
  "Salt",
  "Crow's",
  "Brass",
  "Three-Lane",
  "Big Oak",
  "Stoneford",
  "Pilgrim's",
] as const;

export const GATE_NAME = 'The Gate'
export const LOCKSMITH_NAME = 'Locksmith of the Unbound'

// ----------------------------
// Farms / camps / henges
// ----------------------------
export const FARM_HARVEST_LINES = [
  "Someone left in a hurry. The stores are still full.",
  "The cellar is cold and deep. You help yourself.",
  "Enough here to keep moving. You take what you need.",
  "Unharvested, but not unwelcome. You gather what you can.",
  "The farmer is long gone. The food remains.",
] as const;

export const FARM_ENTER_LINES = [
  "The barn still trades - food for coin, and whatever the farmer has at hand for those with the purse for it.",
  "Stalls line the yard: rations, and a price scratched beside something else.",
  "Someone left this place open. Stock and prices are scratched on the door.",
] as const;

export const MULE_ALREADY_LINES = [
  "You already have a beast at heel. Another would be trouble.",
  "One is enough - the pen is closed to you.",
  "Your pack-beast is already yours. No second sale today.",
] as const;

export const FARM_BUY_FOOD_LINES = [
  "Sacks changed hands. The barn nod is all the thanks you get.",
  "Fair weight on the scale - you count every parcel twice.",
  "The trade is quick; hunger won't be, if you ration well.",
] as const;

export const MULE_BUY_LINES = [
  "Coins pass; a horned head lowers, then follows.",
  "The handler knots the lead - yours now, for better or worse.",
  "Lean muscle, patient eyes. It will carry more than you alone.",
] as const;

export const FARM_REVISIT_LINES = [
  "You already took what there was.",
  "The stores are empty now. Come back later.",
  "Nothing left here. It will regrow in time.",
] as const;

export const FISHING_LAKE_READY_LINES = [
  "A tug on the line. Supper tonight.",
  "The lake gives. You pack it away.",
  "Silver flicker - then weight. Rations secured.",
] as const;

export const FISHING_LAKE_COOLDOWN_LINES = [
  "The fish aren't biting. Not yet.",
  "Still water. Give it time.",
  "Nothing on the hook. Later, maybe.",
] as const;

export const RAINBOW_END_PAYOUT_LINES = [
  "The arc ends here - with weight in your purse.",
  "Light pools where the road stops. Coins find you.",
  "A small fortune in what the sky left behind - not for long, but enough.",
] as const;

export const RAINBOW_END_SPENT_LINES = [
  "Only a memory of color now. Nothing left to take.",
  "The rainbow has moved on. So should you.",
  "You already claimed what lingered here.",
] as const;

export const CAMP_RECRUIT_LINES = [
  "Stragglers around a dying fire. They fall in without a word.",
  "A few souls with nowhere better to be. They join you.",
  "They were waiting for someone. You'll do.",
  "No questions asked. No names given. Your ranks grow.",
  "They look like they've found something. So have you.",
] as const;

export const CAMP_EMPTY_LINES = [
  "The fire is cold. Give it time.",
  "Not yet. The road brings more, but not today.",
  "The word hasn't spread far enough yet. Return later.",
] as const;

export const HENGE_LORE_LINES = [
  "The circle remembers old debts.",
  "The stones do not ask why you are here.",
  "Whatever drew you here drew them first.",
] as const;

export const HENGE_EMPTY_LINES = [
  "The spirits here are quiet. Come back later.",
  "The circle is empty for now.",
  "You do not look back. You do not need to.",
] as const;

export const HENGE_ENCOUNTER_LINE =
  "You walked into something that was already happening.";

// ----------------------------
// Towns
// ----------------------------
export const TOWN_ENTER_LINES = [
  "A market that learned to survive the loop.",
  "You smell bread, smoke, and old arguments.",
  "A place that pretends the road is straight.",
] as const;

export const TOWN_BUY_LINES = [
  "Coins change hands. You keep moving.",
  "No ceremony. Just trade.",
] as const;

export const TOWN_NO_GOLD_LINES = [
  "Not enough to pay.",
  "Your purse is light.",
] as const;

export const TOWN_SCOUT_HIRE_LINES = [
  "You pay. They fall in beside you.",
  "You pay in food. They lead the way.",
  "\"When you have your bearings, I'll mark what matters.\"",
  "\"Woods and bog won't steal you as often with me ahead.\"",
] as const;

export const TOWN_SCOUT_ALREADY_HAVE_LINES = [
  "\"I'm already watching the road.\"",
  "\"You kept me for a reason. Let me do it.\"",
] as const;

// Town rumors are built in `town.ts` from `BARKEEP_TIPS` (plus extra hints).

// ----------------------------
// Companion slots
// ----------------------------
// Each slot has BUY (hired/bought at a source PoI), ALREADY (refused on duplicate),
// and SELL (at The Crossing) lines. Mechanic-side flavor (what the slot does on
// trigger) lives in BUY lines and BARKEEP_TIPS - we don't fire a separate line
// pool on every event tick; the sprite-flash carries the moment-to-moment feedback.

export const MULE_SELL_LINES = [
  "A drover at the Crossing takes the lead-rope without surprise. The mule does not look back.",
  "Coins back into your purse. The mule joins another company that needed one.",
  "It walks off as it walked on - patient, unconcerned. A road is a road.",
] as const;

export const CAMP_SCOUT_HIRE_LINES = [
  "He spits in the fire. \"Aye. I know these woods. Pay's pay.\"",
  "She looks you over, then your soldiers. Decides you'll do. Takes her share of the rations.",
] as const;

export const CAMP_SCOUT_ALREADY_LINES = [
  "Your scout shakes their head at the man by the fire. One pair of eyes is enough for this road.",
  "The men around the fire glance at your scout. They go back to their drinking.",
] as const;

export const SCOUT_SELL_LINES = [
  "She points down a road you didn't notice was there. \"That way's mine.\" She doesn't wave.",
  "He hefts his pay, nods, and is gone before you've folded your map.",
] as const;

export const HEALER_BUY_LINES = [
  "She brings her own bag. Wax stopper, dark glass, dried things you don't recognize.",
  "A hedge-healer. The hands are stained with old work. She names her price; you pay it.",
] as const;

export const HEALER_ALREADY_LINES = [
  "Your healer is enough. The town's herbwife nods to her and goes back inside.",
  "One healer can handle what your road throws at her. No need for two.",
] as const;

export const HEALER_SELL_LINES = [
  "She goes back to her village. Her bag is heavier than when you found her.",
  "A farmer's wife needs her more than you do. The trade is quiet.",
] as const;

export const BOAR_BUY_LINES = [
  "The handler unties the rope. The boar follows, low and patient. Tusks the colour of old bone.",
  "\"She'll do once, hard, at the start of any fight. Then sleep the rest off.\" You pay.",
] as const;

export const BOAR_ALREADY_LINES = [
  "One boar's enough. The handler latches the pen back up.",
  "Your beast is already keen on the road ahead. No second sale.",
] as const;

export const BOAR_SELL_LINES = [
  "A farrier at the Crossing takes the lead. He'll feed her well; he wants what she's good for.",
  "Coins back. The boar grunts once at her new handler and follows him without looking at you.",
] as const;

export const BOAR_MULE_REFUSED_LINES = [
  "The handler shakes her head. \"You've a mule already. The boar would gore it before morning.\"",
  "\"Mule and boar don't share a road. Pick one.\" The pen stays latched.",
] as const;

export const MULE_BOAR_REFUSED_LINES = [
  "The farmer looks past you at the boar. \"My mule will not share a road with that. Pick one.\"",
  "\"Boar at heel? Then no mule from me. Pens stay shut for mixed company.\"",
] as const;

export const CAPTAIN_BUY_LINES = [
  "A banner-bearer. The flag is patched in three colours, all of them wrong. The men straighten anyway.",
  "He takes your coin and shoulders the pole. \"Carry it high and the company carries itself. Carry it through woods and the woods know.\"",
] as const;

export const CAPTAIN_ALREADY_LINES = [
  "Your standard already flies. Another would only confuse the line.",
  "One banner per company. The man waves you off without rancour.",
] as const;

export const CAPTAIN_SELL_LINES = [
  "He furls the flag, takes his pay, walks off whistling. The company feels lighter and quieter at once.",
  "A new captain takes the pole at the Crossing. Your soldiers murmur once and then are quiet.",
] as const;

export const FISHERMAN_BUY_LINES = [
  "Rod over one shoulder. A wide hat that has seen more weather than most men.",
  "He squints at you, then at the road. \"Where there's water, there's two suppers if I'm with you.\"",
] as const;

export const FISHERMAN_ALREADY_LINES = [
  "Your fisherman is already in the company. The man on the bench gives him a nod and lets it be.",
  "One rod's enough on most roads. The trade does not happen.",
] as const;

export const FISHERMAN_SELL_LINES = [
  "He shoulders his rod and his gear and is gone toward whatever lake you weren't going to.",
  "The Crossing takes him cheerfully. Someone needed a fisherman; you needed coin.",
] as const;

export const MAGPIE_BUY_LINES = [
  "The farmer wraps her in cloth. She is heavier than she looks. One coin disappears as you reach for the door.",
  "\"She'll find what falls off other men's tables.\" The price is steep; you pay it anyway.",
] as const;

export const MAGPIE_ALREADY_LINES = [
  "Your magpie watches the farmer's birds and chitters. No second sale today.",
  "One magpie is enough trouble. The pen stays closed.",
] as const;

export const MAGPIE_SELL_LINES = [
  "A tinker at the Crossing takes her without asking. She rides on his hat as he walks off.",
  "Coins back. She blinks once, twice, and is gone with someone else's company.",
] as const;

// ----------------------------
// The Crossing
// ----------------------------
export const CROSSING_ENTER_LINES = [
  "Three roads meet under an oak that has seen more travellers than it can count. Drovers, factors, smiths - someone is always buying.",
  "The Crossing trades in what walks. A company arrives heavy; it leaves lighter. Coin moves the other way.",
] as const;

export const CROSSING_EMPTY_LINES = [
  "You have nothing to leave behind. The Crossing watches you pass.",
  "A drover lifts his hat to you. \"Light company. Nothing to trade, then?\" He returns to his fire.",
] as const;

// ----------------------------
// Lost + combat + game over
// ----------------------------
export const LOST_FLAVOR_LINES = [
  "The road loops. You do not.",
  "The horizon reads the same in every direction.",
  "Further than expected. Not where you were.",
  "Lost between one step and the next.",
] as const;

export const COMBAT_ENCOUNTER_LINES = [
  "They were already here.",
  "Company. The unwanted kind.",
  "This was always going to happen.",
] as const;

export const COMBAT_FLEE_EXIT_LINES = [
  "You left one of your own behind so the journey can continue.",
  "You turned away. Not everyone followed.",
  "You survived. That is not the same as winning.",
] as const;

export const COMBAT_VICTORY_EXIT_LINES = [
  "To the victor go the spoils.",
  "You took what you could and moved on.",
  "They will not follow you again.",
] as const;

export const GAME_OVER_LINES = [
  "The last of them fell somewhere you won't remember. The world keeps turning.",
  "You came with an army. You leave with nothing.\nThe gate remains closed.",
  "Alone now. The road goes on without you.",
] as const;
