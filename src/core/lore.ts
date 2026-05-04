/*
Mechanics index (keep this list current):

- Core loop
  - Movement costs food (usually 1); mountains/swamps cost 2; hunger can reduce army and end run.
  - Winning: bronze key + gate interaction.
  - Losing: army size hits 0

- Resources
  - Army: combat unit and HP; hits 0 = game over.
  - Food: depletes 1/move, 2 on mountains/swamps; hits 0 reduces army.
  - Food carry cap: 2 per soldier (+50 if you have a tame beast). Excess food gains clamp to the cap.
  - Scout
    - Halves woods/swamp lost chance (floor).
    - Map reveal: when oriented, Scout reveals farms/camps/henges globally; gate/locksmith remain gated by mapping.
  - Bronze key - allows to open Gate, can be only obtained from Locksmith.
  - Tame beast - one per run, increases food carry cap by +50.

- Navigation
  - In-game map
    - Toggle map temporarily overrides lore text; closing restores previous text if unchanged.
    - Rendering is platform-specific (see `src/platform/tic80/`); this file holds the player-facing strings.
  - Coords show "??" while lost; woods/swamp can teleport (lost); signpost/farm re-orient (knowsPosition).
  - run.path records steps; while lost we buffer mapping; on re-orient we backfill mappedness from lostBufferStartIndex.

- Encounters / POIs
  - Combat: fight/flee; deterministic encounter flavor + exit lines.
  - Farms: modal encounter; buy food (gold), buy tame beast (gold, one per run), or leave.
  - Camps: modal encounter; Search grants deterministic reinforcements when ready; Hire Scout costs food; Leave exits.
  - Henges: combat encounter when ready; cooldown; henge-specific encounter line.
  - Gate / Locksmith: locksmith is modal (pay gold or food) and is skipped if you already have the key; gate opens only with key.
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
  ],
  map: [
    "The map shows landmarks, not terrain.",
    "While lost, map only shows what you've found since you went off course.",
  ],
  scout: [
    "A Scout halves your odds of getting lost in woods and swamps.",
    "When you're oriented, a Scout points out farms, camps, and henges.",
  ],
  goal: [
    "Someone saw the Locksmith three nights ago.",
  ]
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
  "Ember Cross",
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
  "Weather Cross",
] as const;

export const TOWN_NAME_POOL = [
  "Stonebridge",
  "Cinder Row",
  "Ember Crossroads",
  "The Long Return",
  "Market of Ash",
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
  "The barn still trades - food for coin, beasts for travelers with purse enough.",
  "Stalls line the yard: rations, and a pensmith's fee for a steady companion.",
  "Someone left this place open. Stock and prices are scratched on the door.",
] as const;

export const FARM_BEAST_ALREADY_LINES = [
  "You already have a beast at heel. Another would be trouble.",
  "One is enough - the pen is closed to you.",
  "Your pack-beast is already yours. No second sale today.",
] as const;

export const FARM_BUY_FOOD_LINES = [
  "Sacks changed hands. The barn nod is all the thanks you get.",
  "Fair weight on the scale - you count every parcel twice.",
  "The trade is quick; hunger won't be, if you ration well.",
] as const;

export const FARM_BUY_BEAST_LINES = [
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
