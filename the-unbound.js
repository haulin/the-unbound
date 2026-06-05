// title:  The Unbound (prototype 0.7.0)
// author: haulin
// desc:   Prototype 0.7.0 toward the North Star
// script: js
// input:  mouse

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 haulin
// See LICENSE for full text.


"use strict";
(() => {
  // src/core/lore.ts
  var GOAL_NARRATIVE = "The road never ends. It only returns.\nThey say there is a bronze gate that breaks the circle.\nYou mean to find out.";
  var LOST_COORD_LABEL = "??";
  var MAP_HINT_MESSAGE = "Map\nThe world, as best you can read it.";
  var BARKEEP_TIPS = {
    movementAndHunger: [
      "Most steps cost 1 ration. Mountains and swamps cost 2.",
      "If you don't have rations, your soldiers will start to starve."
    ],
    carryCapacity: [
      "You can only carry so many rations: 2 per soldier.",
      "A tame beast lets you carry 50 more rations.",
      "If you're already full, you can't buy more rations."
    ],
    lostAndOrientation: [
      "Woods and swamps can pull you off course.",
      "When lost, find a signpost, farm, or town to get your bearings again.",
      "In the Unbound, nothing is more than ten leagues away."
    ],
    terrain: [
      "Swamps and mountains cost double rations. Quiet steps there sometimes pay off."
    ],
    map: [
      "The map shows landmarks, not terrain.",
      "While lost, the map only shows what you've found since you strayed."
    ],
    scout: [
      "A Scout halves your odds of getting lost in woods and swamps.",
      "When oriented, a Scout marks farms, camps, and henges on the map.",
      "Hire a Scout in a Town - or, with luck, at a Camp fire."
    ],
    goal: [
      "Someone saw the Locksmith three nights ago.",
      "The Locksmith won't forge without the quench. Bring blood.",
      "The dragon in the high country bleeds, if you can reach it."
    ],
    wyrm: [
      "There's a dragon up in the high passes. Old as the stones.",
      "Don't go to the wyrm alone. Even with men, it's a near thing.",
      "You don't have to kill it. Just enough to draw the blood. It heals.",
      "Gold works on the wyrm too, they say. If you've got a lot of it.",
      "The cave with the long wind - that's where it sleeps."
    ],
    mule: [
      "A mule carries fifty more rations, but takes some at every camp.",
      "Sell a tired mule at a Crossing if you can. Half what you paid is fair."
    ],
    healer: [
      "A hedge-healer mends after a bad fight. She'll drain your purse, slowly.",
      "Some towns have one. A coin each visit - herbs, bandages, iron-smelling salve."
    ],
    boar: [
      "A trained boar hits hard once, at the start of a fight. Not twice in a day.",
      "If you've a mule, a boar won't sit beside it. Pick one."
    ],
    captain: [
      "A banner steadies the line. It also makes you seen in woods and mountains.",
      "If you carry the colours, expect company on bad roads."
    ],
    combat: [
      "You can meet goblins in the woods and brigands in the mountains.",
      "Only a small wounded band will march for coin - never a full war party."
    ],
    fisherman: [
      "A fisherman doubles lake yield. Heavy kit - you'll feel it when you flee."
    ],
    magpie: [
      "A magpie steals a coin from honest trades. One in three. Worth it if you trade enough.",
      "Don't ask the farmer where she got it. She doesn't know either."
    ],
    crossing: [
      "Too many companions? A Crossing buys one back. Half what you paid is fair.",
      "Drovers buy beasts, banners, even folk with somewhere else to be."
    ]
  };
  var GATE_LOCKED_LINES = [
    "A keyhole with no key. Not yet.",
    "Bronze, but unyielding. You will need the key.",
    "It does not open for hands. Only for the turning."
  ];
  var GATE_OPEN_LINES = [
    "The lock turns. The Unbound lets you pass.",
    "Bronze gives way. The road continues."
  ];
  var LOCKSMITH_PURCHASE_LINES = [
    "You feed the fire. They finish the key.",
    "A small hammer-song. A key, still warm.",
    "They take what you offer and give you what you came for.",
    "The blade plunges into the vial. The hiss is brief. The key is bronze and done.",
    "The quench is over before you can blink. The key cools in their palm."
  ];
  var LOCKSMITH_ENTER_LINES = [
    "The forge offers a key - for a price.",
    "Heat rolls out from the kiln. The smith waits."
  ];
  var LOCKSMITH_VISITED_LINES = [
    "The forge is cold. The work is done.",
    "Nothing left to make for you here."
  ];
  var LOCKSMITH_NO_FOOD_LINES = [
    "No heat, no key.",
    "Come back with enough. The fire needs feeding first.",
    "Others have paid for this before you. Most of them got further than you'd think."
  ];
  var LOCKSMITH_NO_BLOOD_LINES = [
    "The forge has heat enough. What it lacks is the quench.",
    `"Bring me what the kiln cannot make. Then we'll talk."`,
    "The smith glances at your hands. Empty. They go back to their work.",
    '"No blood, no bronze. Not the kind that opens what you want opened."'
  ];
  var LAIR_NAME = "Cave of the Long Wind";
  var WYRM_NO_GOLD_LINES = [
    "You count your purse. The wyrm watches. Not enough.",
    "It huffs once. Patient men with empty hands learn nothing here.",
    "Your gold is short. The wyrm settles back to wait you out."
  ];
  var WYRM_BLED_LINES = [
    "The cave breathes long and slow. The wyrm sleeps deeper now.",
    "You took what you came for. Whatever else lives here is not for you.",
    "The dark is quieter than it was. You leave it that way."
  ];
  var WYRM_ENCOUNTER_LINES = [
    "It uncoils. It takes its time.",
    "The dark moves. Then the dark has wings.",
    "It was awake the whole time. It just hadn't moved yet."
  ];
  var WYRM_VICTORY_LINES = [
    "It bleeds. You take what you came for. It crawls deeper into the stone.",
    "Enough. You fill the vial. The wyrm withdraws, slow and unkilled.",
    "It does not die. It does not need to. You have the quench."
  ];
  var WYRM_PAYOFF_LINES = [
    "Gold for the right to bleed it. A strange trade. It accepts.",
    "You pay. It permits the cut. The vial fills.",
    "The coin disappears into the stone. The wyrm is patient with paying men."
  ];
  var WYRM_FLEE_LINES = [
    "You leave the way you came. It does not pursue. It does not need to.",
    "The cave releases you. The Locksmith is no closer."
  ];
  var TERRAIN_LORE_BY_KIND = {
    grass: [
      "The grass bends with your passing.",
      "You watch the wind arrive before you do.",
      "A soft field that does not care who crosses it."
    ],
    road: [
      "The road here remembers other feet.",
      "A track worn down by those who never stopped walking.",
      "The dust rises and settles like it has done this before."
    ],
    mountain: [
      "The peaks ahead do not look closer. Stone and thin air. Your supplies will feel it.",
      "Narrow passes. Notorious for ambushes.",
      "The wind here forgets to carry sound."
    ],
    swamp: [
      "Crossing the bog is harder than it looks. You'll need to eat well tonight.",
      "Mist clings. Landmarks lie. You hope you remember the way back.",
      "The reeds whisper. They have heard worse."
    ],
    woods: [
      "A path that isn't quite a path.",
      "Something moves between the trunks. You move faster.",
      "The trees rearrange themselves while you blink. You hope it is the wind."
    ]
  };
  var SWAMP_FIND_LINES = [
    "A corpse in the reeds. Tangled roots hide a rotted sack - mushrooms and tarnished coin.",
    "A sunken pack, half swallowed. Edible reeds and a bent penny.",
    "A journeyman's bones in the mud. Roots, berries, a few dull coins left behind.",
    "The mud coughs up a meal and pocket change. You do not ask who lost it."
  ];
  var MOUNTAIN_FIND_LINES = [
    "A frozen climber in a crevice. Coin in the belt pouch and a hard strip of jerky.",
    "Cold stone holds an old stash. Gold first; wax paper of rations beside it.",
    "Someone cached this against winter. Coin, then crumbs. Take both.",
    "The cave yields what climbers left. Dull gold and the last of their bread."
  ];
  var FARM_NAME_POOL = [
    "The Oast",
    "Burnt Acre",
    "Greyfield",
    "Hob's Reach",
    "The Stemming",
    "Fallow End",
    "Cotter's Rise"
  ];
  var CAMP_NAME_POOL = [
    "The Wayrest",
    "Ember Watch",
    "The Muster",
    "Cold Haven",
    "Ashford",
    "Dusk Halt",
    "The Holdfast"
  ];
  var HENGE_NAME_POOL = [
    "The Mending",
    "Old Insistence",
    "Crows' Argument",
    "The Recurring",
    "Patient Circle",
    "Weather Stones"
  ];
  var TOWN_NAME_POOL = [
    "Stonebridge",
    "Cinder Row",
    "Ember Crossroads",
    "The Long Return",
    "Market of Ash"
  ];
  var GATE_NAME = "The Gate";
  var LOCKSMITH_NAME = "Locksmith of the Unbound";
  var FARM_ENTER_LINES = [
    "The barn still trades: rations for coin, and whatever else the farmer will sell.",
    "Stalls line the yard: rations, and a price scratched beside something else.",
    "Someone left this place open. Stock and prices are scratched on the door."
  ];
  var FARM_BUY_FOOD_LINES = [
    "Sacks changed hands. The barn nod is all the thanks you get.",
    "Fair weight on the scale - you count every parcel twice.",
    "The trade is quick; hunger won't be, if you ration well."
  ];
  var MULE_BUY_LINES = [
    "Coins pass; a horned head lowers, then follows.",
    "The handler knots the lead - yours now, for better or worse.",
    "Lean muscle, patient eyes. It will carry more than you alone."
  ];
  var FISHING_LAKE_READY_LINES = [
    "A tug on the line. Supper tonight.",
    "The lake gives. You pack it away.",
    "Silver flicker - then weight. Rations secured."
  ];
  var FISHING_LAKE_COOLDOWN_LINES = [
    "The fish aren't biting. Not yet.",
    "Still water. Give it time.",
    "Nothing on the hook. Later, maybe."
  ];
  var RAINBOW_END_PAYOUT_LINES = [
    "The arc ends here - with weight in your purse.",
    "Light pools where the road stops. Coins find you.",
    "A small fortune in what the sky left behind - not for long, but enough."
  ];
  var RAINBOW_END_SPENT_LINES = [
    "Only a memory of color now. Nothing left to take.",
    "The rainbow has moved on. So should you.",
    "You already claimed what lingered here."
  ];
  var CAMP_RECRUIT_LINES = [
    "Stragglers around a dying fire. They fall in without a word.",
    "A few souls with nowhere better to be. They join you.",
    "They were waiting for someone. You'll do.",
    "No questions asked. No names given. Your ranks grow.",
    "They look like they've found something. So have you."
  ];
  var CAMP_ENTER_LINES = [
    "Smoke on the horizon. Someone always stops here.",
    "A ring of stones and a fire that never quite goes out.",
    "Word travels slower than hunger. This is where both catch up."
  ];
  var CAMP_EMPTY_LINES = [
    "The fire is cold. Give it time.",
    "Not yet. The road brings more, but not today.",
    "The word hasn't spread far enough yet. Return later."
  ];
  var HENGE_EMPTY_LINES = [
    "The spirits here are quiet. Come back later.",
    "The circle is empty for now.",
    "You do not look back. You do not need to."
  ];
  var TOWN_ENTER_LINES = [
    "A market that learned to survive the loop.",
    "You smell bread, smoke, and old arguments.",
    "A place that pretends the road is straight."
  ];
  var TOWN_BUY_LINES = [
    "Coins change hands. You keep moving.",
    "No ceremony. Just trade."
  ];
  var TOWN_NO_GOLD_LINES = [
    "Not enough to pay.",
    "Your purse is light."
  ];
  var TOWN_SCOUT_HIRE_LINES = [
    "You pay. They fall in beside you.",
    "You pay in food. They lead the way.",
    `"When you have your bearings, I'll mark what matters."`,
    `"Woods and bog won't steal you as often with me ahead."`
  ];
  var CAMP_SCOUT_HIRE_LINES = [
    `He spits in the fire. "Aye. I know these woods. Pay's pay."`,
    "She looks you over, then your soldiers. Decides you'll do. Takes her share of the rations."
  ];
  var HEALER_BUY_LINES = [
    "She brings her own bag. Wax stopper, dark glass, dried things you don't recognize.",
    "A hedge-healer. The hands are stained with old work. She names her price; you pay it."
  ];
  var COMPANION_ALREADY_LINES = [
    "You already have one like that at heel. The road doesn't need two.",
    "That place in your company is taken. The offer stands open, but not for you.",
    "Same face, same pack - you cannot hire what you already keep."
  ];
  var PARTY_FULL_LINES = [
    "Your party is full. Someone must leave before another can join.",
    "Three is all the road will carry. Make room first.",
    "No more hands to hire - the company is crowded enough."
  ];
  var TOWN_RUMOR_EXHAUSTED_LINES = [
    `The barkeep turns the cup in his hands. "That's all I've got for you this visit."`,
    `He shakes his head once. "Come back when you've walked off what I told you."`,
    "No more whispers today. The room has heard enough of your coin."
  ];
  var LOST_FLAVOR_LINES = [
    "The road loops. You do not.",
    "The horizon reads the same in every direction.",
    "Further than expected. Not where you were.",
    "Lost between one step and the next."
  ];
  var BRIGAND_ENCOUNTER_LINES = [
    "They were already here.",
    "Company. The unwanted kind.",
    "This was always going to happen."
  ];
  var BRIGAND_VICTORY_LINES = [
    "To the victor go the spoils.",
    "You took what you could and moved on.",
    "They will not follow you again."
  ];
  var BRIGAND_FLEE_LINES = [
    "You left one of your own behind so the journey can continue.",
    "You turned away. Not everyone followed.",
    "You survived. That is not the same as winning."
  ];
  var BRIGAND_RECRUIT_SUCCESS_LINES = [
    "They lower their blades. Coins jingle in your bag.",
    "Their captain spits, pockets the silver, falls in behind you.",
    "A handshake, a purse. No oath beyond the pay.",
    "The biggest of them counts the coin twice. Then nods.",
    "They name a price. You meet it. The road has new company.",
    "Bound coin from the fallen. The living follow you now.",
    "They strip their dead, hand you the spoils, then bend the knee.",
    "Coin from the slain, oaths from the breathing. A fair trade.",
    "Their fallen pay your purse; the standing pay your wage.",
    "Spoils of the dead, oaths of the living. The bargain is old."
  ];
  var BRIGAND_RECRUIT_NO_FUNDS_LINES = [
    "Empty pockets earn empty oaths.",
    "They weigh your purse with a look. It buys nothing.",
    "No coin, no company. They turn back to their fire.",
    "They have heard better offers from poorer men.",
    "Words are cheap. They are not."
  ];
  var BRIGAND_RECRUIT_NOT_WOUNDED_LINES = [
    "They laugh in your face.",
    "Too many of them still standing to listen.",
    "They have not bled enough to need you.",
    "Their captain waves you off. The blades stay drawn.",
    "Come back when the road has thinned them."
  ];
  var BRIGAND_RECRUIT_TOO_MANY_LINES = [
    "Too proud yet. They will not bend.",
    "Still too many to follow one man.",
    "No banner of yours is large enough for this lot.",
    "They count themselves and find no need of you.",
    "A band this size answers only to itself."
  ];
  var GOBLIN_ENCOUNTER_LINES = [
    "Yellow eyes between the trees. Small, and many.",
    "The brambles move wrong. Something low, something quick.",
    "A scuttling in the undergrowth. Then teeth.",
    "They were waiting. They are always waiting.",
    "Low shapes break from the ferns. Knives in small hands."
  ];
  var GOBLIN_VICTORY_LINES = [
    "They scatter shrieking. A half-eaten haunch left in the dirt.",
    "Their nest empties as fast as it filled. The stores they hoarded are yours.",
    "Bones, sacks, a side of someone's salt pork. They leave more than they think.",
    "They flee into the dark with high small sounds. You step over what they dropped.",
    "Their cache stinks but it feeds. Enough to eat tonight."
  ];
  var GOBLIN_FLEE_LINES = [
    "You crash through the brambles. Their cackling follows for a while, then thins.",
    "Branches whip your face. Behind you, small fast feet, then nothing.",
    "You don't look back. The laughter does not need to be answered.",
    "The trees close behind you. Whatever they were is not what they were a moment ago.",
    "You break for the road. They don't follow far - there are easier roads."
  ];
  var GOBLIN_NOT_RECRUITABLE_LINES = [
    "Goblins follow no banner. They scatter when paid.",
    "Your coin means nothing to them. They eat the man who carries it.",
    "They are not yours to lead. Nothing is.",
    "They take what they can and break for the trees. That is the only company they keep.",
    "Try to pay one and you have already lost the purse."
  ];
  var HENGE_ARRIVAL_LINES = [
    "Stones loom black against the sky. Banners hang in the still air.",
    "A circle of standing stones, blood-stained at their feet. Men wait between them.",
    "The grass at the henge has been trampled into mud. Someone is sworn here.",
    "Painted shields lean on the stones. The men who lean with them straighten as you arrive.",
    "Smoke from a low fire. A standard you don't recognise. They saw you long before this."
  ];
  var HENGE_VICTORY_LINES = [
    "The stones drink the silence. The banner falls and is not lifted again.",
    "The oath that held them together breaks here. You take what they kept.",
    "Their dead are heaped at the stones. You leave the circle to them.",
    "The standard goes down between two of the stones. No one rises to right it.",
    "A henge bought in blood. The road continues, heavier than it was."
  ];
  var HENGE_RECRUIT_SUCCESS_LINES = [
    "They kneel between the stones and pledge. Old oaths transfer easily enough.",
    "The remaining few set their banner against yours. Their oath is shorter than they think.",
    'They lay their blades on the stone. "This circle is yours now." Coin changes hands.',
    "The standard-bearer salutes you and falls in. The henge is empty behind him.",
    // Partial-loot framing for henge: the survivors hand over the spoils
    // gathered from their fallen sisters and brothers as part of the bargain.
    "They gather their fallen's spoils, pour them at your feet, and fall in beside you.",
    'The survivors strip their dead between the stones. "What was theirs is yours, captain."',
    "Coin from the cairns, oaths from the living. The henge has done this before."
  ];
  var HENGE_ENCOUNTER_LINES = BRIGAND_ENCOUNTER_LINES;
  var HENGE_FLEE_LINES = BRIGAND_FLEE_LINES;
  var HENGE_RECRUIT_NO_FUNDS_LINES = BRIGAND_RECRUIT_NO_FUNDS_LINES;
  var HENGE_RECRUIT_NOT_WOUNDED_LINES = BRIGAND_RECRUIT_NOT_WOUNDED_LINES;
  var HENGE_RECRUIT_TOO_MANY_LINES = BRIGAND_RECRUIT_TOO_MANY_LINES;
  var GAME_OVER_LINES = [
    "The last of them fell somewhere you won't remember. The world keeps turning.",
    "You came with an army. You leave with nothing.\nThe gate remains closed.",
    "Alone now. The road goes on without you."
  ];

  // src/core/spriteIds.ts
  var SPRITES = {
    // 16x16 world tiles (player walks on these).
    terrain: {
      plains: 8,
      gravel: 10,
      woods: 4,
      swamp: 6,
      mountains: 2,
      cave: 38
    },
    // 16x16 POI tiles (overworld placement + illustration).
    poi: {
      lake: 34,
      farm: 66,
      henge: 36,
      locksmith: 68,
      signpost: 42,
      rainbow: 76,
      town: 72,
      camp: 74,
      gate: 78,
      gateOpen: 46
    },
    // 16x16 things the player accumulates (stats / plate labels / grid buttons).
    inventory: {
      food: 194,
      bloodVial: 198,
      beast: 226,
      bronzeKey: 196,
      army: 200,
      scout: 228,
      healer: 232,
      gold: 204
    },
    // 16x16 opponent-side stats and boss illustrations.
    enemies: {
      wyrm: 134,
      enemy: 132,
      goblin: 130
    },
    // 16x16 verbs with no real-world referent.
    actions: {
      return: 98,
      fight: 100,
      map: 102,
      minimap: 104,
      // "debug map" in sheet notes; used as minimap toggle
      search: 106,
      restart: 108,
      goal: 110,
      rumor: 142
    },
    // 16x16 decorative centerpieces for encounter grids (never actionable).
    centers: {
      farmBarn: 162,
      locksmithKiln: 164,
      marketStall: 168,
      campfire: 170,
      tombstone: 174
    },
    // 8x8 small stat icons (seed / position / steps band).
    small: {
      seed: 234,
      position: 235,
      steps: 250
    },
    // 8x8 UI chrome (nine-slice borders, map markers, texture overlay).
    ui: {
      // Nine-slice top-left tile ids. Variants escalate with player progress:
      // default → blood (vial held) → bronze (key forged).
      panelBorder: 258,
      panelBorderBlood: 261,
      panelBorderBronze: 264,
      mapHereMarker: 306,
      mapBackground: 307,
      previewGrain: 308,
      badgePrice: 310,
      badgeLeft: 311
    }
  };
  function inventorySpriteId(slotId) {
    const key = slotId;
    return SPRITES.inventory[key];
  }

  // src/core/constants.ts
  var SCOUT_GLOBAL_REVEAL_KINDS = ["farm", "camp", "henge", "town"];
  var WORLD_WIDTH = 10;
  var WORLD_HEIGHT = 10;
  var INITIAL_SEED = 47;
  var ENABLE_ANIMATIONS = true;
  var SIGNPOST_COUNT = 6;
  var GATE_LOCKSMITH_MIN_DISTANCE = 7;
  var LOCKSMITH_LAIR_MIN_DISTANCE = 4;
  var CAMP_COUNT = 3;
  var CAMP_COOLDOWN_MOVES = 3;
  var CAMP_FOOD_GAIN = 2;
  var TOWN_COUNT = 3;
  var TOWN_FOOD_BUNDLE = 3;
  var TOWN_TROOPS_BUNDLE = 2;
  var TOWN_PRICE_FOOD_MIN = 5;
  var TOWN_PRICE_FOOD_MAX = 8;
  var TOWN_PRICE_TROOPS_MIN = 5;
  var TOWN_PRICE_TROOPS_MAX = 10;
  var TOWN_PRICE_RUMOR_MIN = 2;
  var TOWN_PRICE_RUMOR_MAX = 4;
  var COMPANION_HIRE_GOLD_MIN = 15;
  var COMPANION_HIRE_GOLD_MAX = 20;
  var HEALER_UPKEEP_GOLD = 1;
  var TOWN_RUMORS_PER_VISIT_MAX = 3;
  var POI_MIN_OFFERS = 1;
  var POI_MAX_OFFERS = 3;
  var HENGE_COUNT = 3;
  var INITIAL_ARMY_SIZE = 10;
  var MAP_GEN_NOISE = "NOISE";
  var MAP_GEN_ALGORITHM = MAP_GEN_NOISE;
  var NOISE_SMOOTH_PASSES = 2;
  var NOISE_VALUE_MAX = 1e4;
  var INITIAL_FOOD = 15;
  var INITIAL_GOLD = 15;
  var FOOD_COST_DEFAULT = 1;
  var FOOD_COST_SWAMP = 2;
  var FOOD_COST_MOUNTAIN = 2;
  var FOOD_WARNING_THRESHOLD = 5;
  var FARM_COUNT = 3;
  var FISHING_LAKE_COUNT = 6;
  var FISHING_LAKE_COOLDOWN_MOVES = 3;
  var RAINBOW_END_MIN_DISTANCE = 7;
  var RAINBOW_END_GOLD_PAYOUT = 30;
  var FARM_BUY_FOOD_GOLD_COST = 3;
  var FARM_BUY_FOOD_AMOUNT = 3;
  var BEAST_CARRY_CAP_BONUS = 50;
  var LOCKSMITH_KEY_FOOD_COST = 10;
  var LOCKSMITH_KEY_GOLD_COST = 20;
  var WYRM_PAY_GOLD_COST = 30;
  var WYRM_INITIAL_HEALTH = 40;
  var MAX_PARTY_SLOTS = 3;
  var TERRAIN_KINDS = ["grass", "road", "mountain", "grass", "swamp", "woods", "road"];
  var FEATURE_KINDS = [
    "gate",
    "gateOpen",
    "locksmith",
    "lair",
    "signpost",
    "farm",
    "camp",
    "henge",
    "town",
    "fishingLake",
    "rainbowEnd"
  ];
  var TERRAIN = {
    grass: { spriteId: SPRITES.terrain.plains },
    road: { spriteId: SPRITES.terrain.gravel },
    mountain: { spriteId: SPRITES.terrain.mountains },
    swamp: { spriteId: SPRITES.terrain.swamp },
    woods: { spriteId: SPRITES.terrain.woods }
  };
  var FEATURES = {
    gate: { spriteId: SPRITES.poi.gate },
    gateOpen: { spriteId: SPRITES.poi.gateOpen },
    locksmith: { spriteId: SPRITES.poi.locksmith },
    lair: { spriteId: SPRITES.terrain.cave },
    signpost: { spriteId: SPRITES.poi.signpost },
    farm: { spriteId: SPRITES.poi.farm },
    camp: { spriteId: SPRITES.poi.camp },
    henge: { spriteId: SPRITES.poi.henge },
    town: { spriteId: SPRITES.poi.town },
    fishingLake: { spriteId: SPRITES.poi.lake },
    rainbowEnd: { spriteId: SPRITES.poi.rainbow }
  };
  function spriteIdForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "swamp":
      case "woods":
        return TERRAIN[kind].spriteId;
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "lair":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
      case "town":
      case "fishingLake":
      case "rainbowEnd":
        return FEATURES[kind].spriteId;
    }
  }
  function terrainLoreLinesForKind(kind) {
    switch (kind) {
      case "grass":
      case "road":
      case "mountain":
      case "swamp":
      case "woods":
        return TERRAIN_LORE_BY_KIND[kind];
      case "gate":
      case "gateOpen":
      case "locksmith":
      case "lair":
      case "signpost":
      case "farm":
      case "camp":
      case "henge":
      case "town":
      case "fishingLake":
      case "rainbowEnd":
        return [];
    }
  }
  var FOOD_DELTA_FRAMES = 36;
  var WOODS_AMBUSH_PERCENT = 25;
  var WOODS_LOST_PERCENT = 10;
  var SWAMP_LOST_PERCENT = 20;
  var MOUNTAIN_AMBUSH_PERCENT = 25;
  var TELEPORT_MIN_DISTANCE = 4;
  var SWAMP_FIND_PERCENT = 15;
  var SWAMP_FIND_FOOD_BASE = 8;
  var SWAMP_FIND_GOLD_BASE = 2;
  var MOUNTAIN_FIND_PERCENT = 15;
  var MOUNTAIN_FIND_GOLD_BASE = 8;
  var MOUNTAIN_FIND_FOOD_BASE = 2;
  var TERRAIN_FIND_AMOUNT_NOISE = 2;
  var GRID_TRANSITION_STEP_FRAMES = 5;
  var BRIGAND_RECRUIT_MAX_REMAINING = 5;
  var BRIGAND_GOLD_NOISE = 3;
  var BRIGAND_FOOD_MAX = 4;
  var GOBLIN_GOLD_MAX = 2;
  var GOBLIN_FOOD_FACTOR = 0.4;
  var GOBLIN_FOOD_NOISE = 1;
  var HENGE_COOLDOWN_MOVES = 3;
  var HENGE_BAND_MIN = 10;
  var HENGE_BAND_MAX = 40;
  var HENGE_GOLD_NOISE = 3;
  var HENGE_GOLD_BONUS = 10;
  var HENGE_FOOD_FACTOR = 0.2;
  var HENGE_FOOD_NOISE = 1;
  var ACTION_NEW_RUN = "NEW_RUN";
  var ACTION_RESTART = "RESTART";
  var ACTION_MOVE = "MOVE";
  var ACTION_SHOW_GOAL = "SHOW_GOAL";
  var ACTION_TOGGLE_MINIMAP = "TOGGLE_MINIMAP";
  var ACTION_TOGGLE_MAP = "TOGGLE_MAP";
  var ACTION_TICK = "TICK";
  var MOVE_SLIDE_FRAMES = 15;
  var LORE_MAX_CHARS_PER_LINE = 20;

  // src/core/math.ts
  function wrapIndex(i, size) {
    const r = i % size;
    return r < 0 ? r + size : r;
  }
  function torusDelta(from, to, size) {
    const raw = to - from;
    const a = raw;
    const b = raw - size;
    const c = raw + size;
    let best = a;
    for (const cand of [b, c]) {
      if (Math.abs(cand) < Math.abs(best)) best = cand;
      else if (Math.abs(cand) === Math.abs(best) && cand > best) best = cand;
    }
    return best;
  }
  function manhattan(dx, dy) {
    return Math.abs(dx) + Math.abs(dy);
  }
  function dirLabel(dx, dy) {
    let s = "";
    if (dy < 0) s += "N";
    else if (dy > 0) s += "S";
    if (dx < 0) s += "W";
    else if (dx > 0) s += "E";
    return s;
  }

  // src/core/cells.ts
  function getCellAt(world, pos) {
    return world.cells[pos.y][pos.x];
  }
  function getSpriteIdAt(world, x, y) {
    const tx = wrapIndex(x, world.width);
    const ty = wrapIndex(y, world.height);
    const cell = world.cells[ty][tx];
    return spriteIdForKind(cell.kind);
  }
  function cellIdForPos(world, pos) {
    return pos.y * world.width + pos.x;
  }
  function posForCellId(world, cellId2) {
    return { x: cellId2 % world.width, y: Math.floor(cellId2 / world.width) };
  }
  function setCellAt(world, pos, nextCell) {
    const cells = world.cells;
    const row = cells[pos.y];
    const nextRow = row.slice();
    nextRow[pos.x] = nextCell;
    const nextCells = cells.slice();
    nextCells[pos.y] = nextRow;
    return { ...world, cells: nextCells };
  }
  function findCellByKind(cells, kind) {
    for (let y = 0; y < cells.length; y++) {
      const row = cells[y];
      for (let x = 0; x < row.length; x++) {
        if (row[x].kind === kind) return { x, y };
      }
    }
    return null;
  }

  // src/core/rng.ts
  function xorshift32(x) {
    x = x >>> 0;
    x ^= x << 13 >>> 0;
    x ^= x >>> 17;
    x ^= x << 5 >>> 0;
    return x >>> 0;
  }
  function u32(x) {
    return x >>> 0;
  }
  function seedToRngState(seed) {
    let s = (seed ^ 2779096485) >>> 0;
    if (s === 0) s = 1;
    return s;
  }
  function normalizeMaxExclusive(maxExclusive) {
    if (!Number.isFinite(maxExclusive)) return 1;
    const n = Math.trunc(maxExclusive);
    return n <= 0 ? 1 : n;
  }
  function randInt(rngState, maxExclusive) {
    const next = xorshift32(u32(rngState));
    const m = normalizeMaxExclusive(maxExclusive);
    return { rngState: next, value: next % m };
  }
  function domainSalt(label) {
    let h = 0;
    for (let i = 0; i < label.length; i++) {
      h = Math.imul(31, h) + label.charCodeAt(i) | 0;
    }
    return h >>> 0;
  }
  function resolveSalt(salt) {
    if (salt == null) return 0;
    return u32(typeof salt === "string" ? domainSalt(salt) : salt);
  }
  function hashSeedStepCellInternal(opts) {
    const base = seedToRngState(opts.seed | 0);
    const stepMix = u32(Math.imul(opts.stepCount | 0, 2654435761));
    const cellId2 = u32(opts.cellId | 0);
    const salt = resolveSalt(opts.salt);
    return xorshift32(u32(base ^ stepMix ^ cellId2 ^ salt));
  }
  function pickIndex(state2, length) {
    const m = length | 0;
    if (m <= 0) return 0;
    const h = hashSeedStepCellInternal(state2);
    return u32(h) % m;
  }
  function pickIntExclusive(state2, maxExclusive) {
    const m = normalizeMaxExclusive(maxExclusive);
    const h = hashSeedStepCellInternal(state2);
    return u32(h) % m;
  }
  function pickIntInRange(state2, minInclusive, maxInclusive) {
    const span = maxInclusive - minInclusive + 1;
    return minInclusive + pickIntExclusive(state2, span);
  }
  function pickFromPool(state2, pool) {
    if (!pool.length) return void 0;
    return pool[pickIndex(state2, pool.length)];
  }
  function shuffledIndices(args) {
    const n = Number.isFinite(args.length) ? Math.trunc(args.length) : 0;
    if (n <= 0) return [];
    const out = [];
    for (let i = 0; i < n; i++) out.push(i);
    if (n <= 1) return out;
    const baseSalt = resolveSalt(args.salt);
    const cellId2 = n | 0;
    for (let i = n - 1; i > 0; i--) {
      const j = pickIntExclusive({ seed: args.seed, stepCount: 0, cellId: cellId2, salt: baseSalt ^ i }, i + 1);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }
  function stable(args) {
    const { seed, placeId, pool, salt } = args;
    if (!pool.length) return "";
    const state2 = salt == null ? { seed, stepCount: 0, cellId: placeId } : { seed, stepCount: 0, cellId: placeId, salt };
    return pickFromPool(state2, pool) || pool[0] || "";
  }
  function perMove(args) {
    const { seed, stepCount, cellId: cellId2, pool, salt } = args;
    if (!pool.length) return "";
    const state2 = salt == null ? { seed, stepCount, cellId: cellId2 } : { seed, stepCount, cellId: cellId2, salt };
    return pickFromPool(state2, pool) || pool[0] || "";
  }
  function cursorAdvance(args) {
    const { seed, pool } = args;
    const n = pool.length;
    if (n <= 0) return { line: "", nextCursor: args.cursor };
    const indices = args.salt == null ? shuffledIndices({ seed, length: n }) : shuffledIndices({ seed, length: n, salt: args.salt });
    const idx = indices[args.cursor % n] ?? 0;
    const line = pool[idx] || pool[0] || "";
    return { line, nextCursor: args.cursor + 1 };
  }
  function getCopyCursors(run) {
    return run.copyCursors ?? {};
  }
  function advanceRunCursor(args) {
    const cursors = getCopyCursors(args.run);
    const cursor = cursors[args.tag] ?? 0;
    const pick = args.salt == null ? cursorAdvance({ seed: args.seed, cursor, pool: args.pool }) : cursorAdvance({ seed: args.seed, cursor, pool: args.pool, salt: args.salt });
    const nextCursors = { ...cursors, [args.tag]: pick.nextCursor };
    return { line: pick.line, run: { ...args.run, copyCursors: nextCursors } };
  }
  function createTileRandom(args) {
    const seed = args.world.seed;
    const cellId2 = cellIdForPos(args.world, args.pos);
    const stepCount = args.stepCount;
    return {
      stableLine: (pool, opts) => opts?.salt == null ? stable({ seed, placeId: opts?.placeId ?? cellId2, pool }) : stable({ seed, placeId: opts?.placeId ?? cellId2, pool, salt: opts.salt }),
      perMoveLine: (pool, opts) => opts?.salt == null ? perMove({ seed, stepCount, cellId: opts?.cellId ?? cellId2, pool }) : perMove({ seed, stepCount, cellId: opts?.cellId ?? cellId2, pool, salt: opts.salt })
    };
  }
  function createRunCopyRandom(state2) {
    const seed = state2.world.seed;
    const stepCount = state2.run.stepCount;
    const cellId2 = cellIdForPos(state2.world, state2.player.position);
    return {
      stableLine: (pool, opts) => opts?.salt == null ? stable({ seed, placeId: opts?.placeId ?? cellId2, pool }) : stable({ seed, placeId: opts?.placeId ?? cellId2, pool, salt: opts.salt }),
      perMoveLine: (pool, opts) => opts?.salt == null ? perMove({ seed, stepCount: opts?.stepCount ?? stepCount, cellId: opts?.cellId ?? cellId2, pool }) : perMove({ seed, stepCount: opts?.stepCount ?? stepCount, cellId: opts?.cellId ?? cellId2, pool, salt: opts.salt }),
      advanceCursor: (tag, pool, opts) => {
        const next = opts?.salt == null ? advanceRunCursor({ run: state2.run, seed, tag, pool }) : advanceRunCursor({ run: state2.run, seed, tag, pool, salt: opts.salt });
        return { line: next.line, nextState: { ...state2, run: next.run } };
      }
    };
  }
  function createStreamRandom(rngState) {
    let rng = rngState;
    const intExclusive = (maxExclusive) => {
      const r = randInt(rng, maxExclusive);
      rng = r.rngState;
      return r.value;
    };
    return {
      intExclusive,
      // Inclusive on both ends. Callers pass ordered (min ≤ max) constants;
      // we don't normalize because the only places this is used pair compile-
      // time literals like FOO_MIN/FOO_MAX.
      intInRange: (minInclusive, maxInclusive) => minInclusive + intExclusive(maxInclusive - minInclusive + 1),
      get rngState() {
        return rng;
      }
    };
  }
  function createStreamRandomFromSeed(seed, domain) {
    const mixed = domain == null ? seed | 0 : ((seed | 0) ^ domainSalt(domain)) >>> 0;
    return createStreamRandom(seedToRngState(mixed));
  }
  var RNG = {
    // Facades (preferred)
    createTileRandom,
    createRunCopyRandom,
    createStreamRandom,
    createStreamRandomFromSeed,
    // Keyed deterministic helpers (stable, no global rngState consumption).
    // `salt` may be a string label for a second draw at the same seed/step/cell.
    keyedIntExclusive: pickIntExclusive,
    keyedIntInRange: pickIntInRange
  };

  // src/core/gameOver.ts
  function gameOverMessage(seed, stepCount) {
    if (!GAME_OVER_LINES.length) return "";
    const idx = RNG.keyedIntExclusive({ seed, stepCount, cellId: 0 }, GAME_OVER_LINES.length);
    return GAME_OVER_LINES[idx] ?? "";
  }
  function applyArmyZeroGameOver(state2) {
    if (state2.resources.armySize > 0) return state2;
    return {
      ...state2,
      encounter: null,
      run: { ...state2.run, isGameOver: true },
      ui: { ...state2.ui, message: gameOverMessage(state2.world.seed, state2.run.stepCount) }
    };
  }

  // src/core/mechanics/registry.ts
  function buildMechanicIndex(mechanics) {
    const seenIds = /* @__PURE__ */ new Set();
    const ownerByKind = {};
    const onEnterTileByKind2 = {};
    const rightGridByEncounterKind2 = {};
    const reduceEncounterActionByEncounterKind2 = {};
    const illustrationByEncounterKind = {};
    const deltaAnchorsByTargetByEncounterKind = {};
    const previewEncounterByEncounterKind = {};
    const poiSignpostByKind = {};
    const mapLabelByKind = {};
    const enterFoodCostByKind2 = {};
    const moveEventPolicyByKind = {};
    const combatVariantByKind = {};
    const onCombatClosedByKind = {};
    const seenEncounterKinds = /* @__PURE__ */ new Set();
    for (let i = 0; i < mechanics.length; i++) {
      const m = mechanics[i];
      if (seenIds.has(m.id)) {
        throw new Error(`Duplicate mechanic id: ${m.id}`);
      }
      seenIds.add(m.id);
      if (m.encounter) {
        const ek = m.encounter.kind;
        if (seenEncounterKinds.has(ek)) {
          throw new Error(`Duplicate encounterKind: ${ek}`);
        }
        seenEncounterKinds.add(ek);
        if (m.encounter.rightGrid) rightGridByEncounterKind2[ek] = m.encounter.rightGrid;
        if (m.encounter.reduceAction) reduceEncounterActionByEncounterKind2[ek] = m.encounter.reduceAction;
        if (m.encounter.illustrationSpriteId) illustrationByEncounterKind[ek] = m.encounter.illustrationSpriteId;
        if (m.encounter.deltaAnchorsByTarget) {
          deltaAnchorsByTargetByEncounterKind[ek] = m.encounter.deltaAnchorsByTarget;
        }
        if (m.encounter.previewEncounter) previewEncounterByEncounterKind[ek] = m.encounter.previewEncounter;
      }
      const costByKind = m.enterFoodCostByKind;
      if (costByKind) {
        for (const kindKey of Object.keys(costByKind)) {
          if (!m.kinds.includes(kindKey)) {
            throw new Error(`Mechanic ${m.id} sets enterFoodCostByKind for ${kindKey} but does not claim that kind`);
          }
          const cost = costByKind[kindKey];
          if (cost < 0) {
            throw new Error(`enterFoodCostByKind for ${kindKey} must be >= 0`);
          }
        }
      }
      const policyByKind = m.moveEventPolicyByKind;
      if (policyByKind) {
        for (const kindKey of Object.keys(policyByKind)) {
          if (!m.kinds.includes(kindKey)) {
            throw new Error(`Mechanic ${m.id} sets moveEventPolicyByKind for ${kindKey} but does not claim that kind`);
          }
          const policy = policyByKind[kindKey];
          const ambushPercent = policy.ambushPercent;
          const lostPercent = policy.lostPercent;
          if (ambushPercent < 0 || lostPercent < 0 || ambushPercent > 100 || lostPercent > 100 || ambushPercent + lostPercent > 100) {
            throw new Error(
              `MoveEventPolicy for ${kindKey} must have ambushPercent and lostPercent in [0, 100] with sum <= 100`
            );
          }
        }
      }
      for (let k = 0; k < m.kinds.length; k++) {
        const kind = m.kinds[k];
        const prevOwner = ownerByKind[kind];
        if (prevOwner) {
          throw new Error(`Duplicate kind ownership: ${kind} claimed by ${prevOwner} and ${m.id}`);
        }
        ownerByKind[kind] = m.id;
        if (m.onEnterTile) onEnterTileByKind2[kind] = m.onEnterTile;
        if (m.mapLabel != null) mapLabelByKind[kind] = m.mapLabel;
        if (m.poiSignpost) poiSignpostByKind[kind] = m.poiSignpost;
        const variantForKind = m.combatVariantByKind?.[kind];
        if (variantForKind) combatVariantByKind[kind] = variantForKind;
        if (m.onCombatClosed) onCombatClosedByKind[kind] = m.onCombatClosed;
        const cost = costByKind?.[kind];
        if (cost != null) enterFoodCostByKind2[kind] = cost;
        const policy = policyByKind?.[kind];
        if (policy) moveEventPolicyByKind[kind] = policy;
      }
    }
    return {
      ownerByKind,
      onEnterTileByKind: onEnterTileByKind2,
      rightGridByEncounterKind: rightGridByEncounterKind2,
      reduceEncounterActionByEncounterKind: reduceEncounterActionByEncounterKind2,
      illustrationByEncounterKind,
      deltaAnchorsByTargetByEncounterKind,
      previewEncounterByEncounterKind,
      poiSignpostByKind,
      mapLabelByKind,
      enterFoodCostByKind: enterFoodCostByKind2,
      moveEventPolicyByKind,
      combatVariantByKind,
      onCombatClosedByKind
    };
  }

  // src/core/worldgen.ts
  var TERRAIN_KIND_SET = new Set(TERRAIN_KINDS);
  function isTerrainCell(cell) {
    return TERRAIN_KIND_SET.has(cell.kind);
  }
  function cellId(x, y) {
    return cellIdForPos({ width: WORLD_WIDTH }, { x, y });
  }
  function torusManhattanDistance(a, b) {
    const dx = torusDelta(a.x, b.x, WORLD_WIDTH);
    const dy = torusDelta(a.y, b.y, WORLD_HEIGHT);
    return manhattan(dx, dy);
  }
  function clampMinTorusDistance(minDistance) {
    const maxPossible = Math.floor(WORLD_WIDTH / 2) + Math.floor(WORLD_HEIGHT / 2);
    return Math.max(0, Math.min(minDistance, maxPossible));
  }
  var PLACE_FEATURE_MAX_ATTEMPTS = WORLD_WIDTH * WORLD_HEIGHT * 50;
  function placeFeature(cells, rngState, opts) {
    const placed = [];
    const rng = RNG.createStreamRandom(rngState);
    const minD = opts.awayFrom ? clampMinTorusDistance(opts.awayFrom.minDistance) : 0;
    let attempts = 0;
    while (placed.length < opts.count) {
      if (attempts >= PLACE_FEATURE_MAX_ATTEMPTS) {
        throw new Error(
          `placeFeature: exhausted ${PLACE_FEATURE_MAX_ATTEMPTS} attempts after placing ${placed.length}/${opts.count} features \u2014 predicate may have no candidates on this seed`
        );
      }
      attempts += 1;
      const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT);
      const x = v % WORLD_WIDTH;
      const y = Math.floor(v / WORLD_WIDTH);
      const here = cells[y][x];
      if (!opts.canPlaceAt(x, y, here)) continue;
      if (opts.awayFrom && torusManhattanDistance({ x, y }, opts.awayFrom.pos) < minD) continue;
      cells[y][x] = opts.buildCell({ x, y, rng });
      placed.push({ x, y });
    }
    return { placed, rngState: rng.rngState };
  }
  function placeNamedFeature(cells, rngState, opts) {
    const remainingNames = [...opts.namePool];
    const res = placeFeature(cells, rngState, {
      count: opts.count,
      canPlaceAt: opts.canPlaceAt,
      buildCell: ({ x, y, rng }) => {
        let name = opts.fallbackName;
        if (remainingNames.length > 0) {
          const idx = rng.intExclusive(remainingNames.length);
          name = remainingNames.splice(idx, 1)[0] || opts.fallbackName;
        }
        return opts.buildCell({ x, y, name, rng });
      }
    });
    return res.rngState;
  }
  function placeFeatureFromSeed(cells, seed, domain, opts) {
    const stream = RNG.createStreamRandomFromSeed(seed, domain);
    return placeFeature(cells, stream.rngState, opts);
  }
  function placeNamedFeatureFromSeed(cells, seed, domain, opts) {
    const stream = RNG.createStreamRandomFromSeed(seed, domain);
    placeNamedFeature(cells, stream.rngState, opts);
  }
  function buildOfferSets(args) {
    const mustCover = args.mustCover ?? args.pool;
    const { poiCount, minOffers, maxOffers, pool, categoryOf, requiredOnEveryPoi, rng } = args;
    if (minOffers < 1) throw new Error("minOffers must be >= 1");
    if (maxOffers < minOffers) throw new Error("maxOffers must be >= minOffers");
    const slots = Array.from({ length: poiCount }, () => []);
    const place = (offer) => {
      for (let t = 0; t < poiCount; t++) {
        const row = slots[t];
        if (row.length < maxOffers && !row.includes(offer)) {
          row.push(offer);
          return;
        }
      }
      for (let t = 0; t < poiCount; t++) {
        const row = slots[t];
        if (row.length < maxOffers) {
          row.push(offer);
          return;
        }
      }
    };
    for (const offer of mustCover) place(offer);
    for (let t = 0; t < poiCount; t++) {
      const row = slots[t];
      for (const required of requiredOnEveryPoi ?? []) {
        if (row.includes(required)) continue;
        if (row.length < maxOffers) row.push(required);
        else replaceLastHireWith(row, required, categoryOf);
      }
    }
    for (let t = 0; t < poiCount; t++) {
      ensureNonHireOffer(slots[t], pool, categoryOf, maxOffers);
      const target = rng.intInRange(minOffers, maxOffers);
      backfillPoi(slots[t], pool, target, maxOffers, rng);
      ensureNonHireOffer(slots[t], pool, categoryOf, maxOffers);
      if (slots[t].length < minOffers) {
        throw new Error(`buildOfferSets: poi ${t} has fewer than minOffers after backfill`);
      }
      if (slots[t].length > maxOffers) {
        throw new Error(`buildOfferSets: poi ${t} exceeds maxOffers`);
      }
    }
    return slots;
  }
  function replaceLastHireWith(row, offer, categoryOf) {
    for (let i = row.length - 1; i >= 0; i--) {
      if (categoryOf(row[i]) === "companion_hire") {
        row[i] = offer;
        return;
      }
    }
    row[row.length - 1] = offer;
  }
  function ensureNonHireOffer(row, pool, categoryOf, maxOffers) {
    if (row.some((o) => categoryOf(o) !== "companion_hire")) return;
    const economy = pool.find((o) => categoryOf(o) !== "companion_hire" && !row.includes(o));
    if (!economy) return;
    if (row.length < maxOffers) row.push(economy);
    else replaceLastHireWith(row, economy, categoryOf);
  }
  function backfillPoi(row, pool, target, maxOffers, rng) {
    const cap = Math.min(target, maxOffers);
    while (row.length < cap) {
      const available = pool.filter((o) => !row.includes(o));
      if (available.length === 0) break;
      row.push(available[rng.intExclusive(available.length)]);
    }
  }

  // src/core/teleport.ts
  var FEATURE_KIND_SET = new Set(FEATURE_KINDS);
  function isTerrain(kind) {
    return !FEATURE_KIND_SET.has(kind);
  }
  function pickTeleportDestination(args) {
    const { world, origin } = args;
    const r = RNG.createStreamRandom(args.rngState);
    const candidates = [];
    let maxD = 0;
    for (let y = 0; y < world.height; y++) {
      const row = world.cells[y];
      for (let x = 0; x < world.width; x++) {
        const cell = row[x];
        if (!isTerrain(cell.kind)) continue;
        if (x === origin.x && y === origin.y) continue;
        const dx = torusDelta(origin.x, x, world.width);
        const dy = torusDelta(origin.y, y, world.height);
        const d = manhattan(dx, dy);
        candidates.push({ x, y, d });
        if (d > maxD) maxD = d;
      }
    }
    const target = Math.min(TELEPORT_MIN_DISTANCE, maxD);
    const eligible = candidates.filter((c) => c.d >= target);
    const pool = eligible.length > 0 ? eligible : candidates;
    if (pool.length === 0) {
      return { destination: origin, rngState: r.rngState };
    }
    const pick = pool[r.intExclusive(pool.length)];
    return { destination: { x: pick.x, y: pick.y }, rngState: r.rngState };
  }

  // src/core/uiAnim.ts
  function enqueueAnim(ui, anim) {
    const id = Math.max(1, Math.trunc(ui.anim.nextId));
    const a = { id, ...anim };
    const nextActive = ui.anim.active.concat([a]);
    return {
      message: ui.message,
      leftPanel: ui.leftPanel,
      clock: ui.clock,
      anim: { nextId: id + 1, active: nextActive }
    };
  }
  function enqueueGridTransition(ui, args) {
    const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0);
    const durationFrames = stepFrames * 4;
    const startFrame = args.startFrame ?? ui.clock.frame;
    return enqueueAnim(ui, {
      kind: "gridTransition",
      startFrame,
      durationFrames,
      blocksInput: true,
      params: { from: args.from, to: args.to }
    });
  }
  function enqueueDeltas(ui, args) {
    const startFrame = args.startFrame ?? ui.clock.frame;
    let next = ui;
    for (let i = 0; i < args.deltas.length; i++) {
      const delta = args.deltas[i];
      if (!delta) continue;
      next = enqueueAnim(next, {
        kind: "delta",
        startFrame,
        durationFrames: FOOD_DELTA_FRAMES,
        blocksInput: false,
        params: { target: args.target, delta }
      });
    }
    return next;
  }

  // src/core/mechanics/encounterHelpers.ts
  var POI_TITLE_FALLBACK = {
    Town: "A Town",
    Farm: "A Farm",
    Camp: "A Camp",
    Henge: "A Henge"
  };
  function poiTitleFor(name, suffix) {
    const trimmed = name?.trim();
    if (trimmed) return `${trimmed} ${suffix}`;
    return POI_TITLE_FALLBACK[suffix];
  }
  function loreMessage(title, body) {
    const t = title?.trim();
    if (!t) return body;
    return `${t}
${body}`;
  }
  function loreTitleFromRestore(restoreMessage) {
    const i = restoreMessage.indexOf("\n");
    if (i < 0) return void 0;
    const title = restoreMessage.slice(0, i).trim();
    return title || void 0;
  }
  function setLoreMessage(state2, title, body) {
    return { ...state2, ui: { ...state2.ui, message: loreMessage(title, body) } };
  }
  function combatLoreMessage(state2, body) {
    const enc = state2.encounter;
    const title = enc?.restoreMessage ? loreTitleFromRestore(enc.restoreMessage) : void 0;
    return loreMessage(title, body);
  }
  function openNamedPoiEncounter(args) {
    const message = loreMessage(args.title, args.enterBody);
    const encounter = {
      kind: args.kind,
      sourceCellId: args.sourceCellId,
      restoreMessage: message,
      ...args.extra
    };
    return {
      message,
      encounter,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: args.kind }]
    };
  }
  function setEncounterMessage(state2, title, line) {
    return setLoreMessage(state2, title, line);
  }
  function noGoldResponse(state2, prefix) {
    const line = encounterStableLine(state2, "noGold", TOWN_NO_GOLD_LINES);
    return setEncounterMessage(state2, prefix, line);
  }
  function encounterStableLine(state2, tag, pool) {
    const enc = state2.encounter;
    const salt = enc ? `${enc.kind}.${enc.sourceCellId}.${tag}` : tag;
    return RNG.createRunCopyRandom(state2).stableLine(pool, { salt });
  }
  function refuseCompanionHire(prevState, prefix, slot) {
    const party = prevState.resources.party;
    if (party.length >= MAX_PARTY_SLOTS) {
      const line = encounterStableLine(prevState, "party.full", PARTY_FULL_LINES);
      return setEncounterMessage(prevState, prefix, line);
    }
    if (party.includes(slot)) {
      const line = encounterStableLine(prevState, `companion.already.${slot}`, COMPANION_ALREADY_LINES);
      return setEncounterMessage(prevState, prefix, line);
    }
    return null;
  }
  function leaveEncounter(state2, fromGrid) {
    const enc = state2.encounter;
    const restore = enc?.restoreMessage ?? state2.ui.message;
    const baseUi = { ...state2.ui, message: restore };
    if (!ENABLE_ANIMATIONS) {
      return { ...state2, encounter: null, ui: baseUi };
    }
    const uiWith = enqueueGridTransition(baseUi, { from: fromGrid, to: "overworld" });
    return { ...state2, encounter: null, ui: uiWith };
  }
  function resourceDeltasFromDiff(prev, next) {
    const out = [];
    const food = next.food - prev.food;
    if (food) out.push({ target: "food", delta: food });
    const gold = next.gold - prev.gold;
    if (gold) out.push({ target: "gold", delta: gold });
    const army = next.armySize - prev.armySize;
    if (army) out.push({ target: "army", delta: army });
    return out;
  }
  function pushResourceDeltas(out, target, values) {
    for (let i = 0; i < values.length; i++) {
      const delta = values[i];
      if (delta) out.push({ target, delta });
    }
  }
  function applyDeltas(state2, args) {
    const resources = args.resources ?? state2.resources;
    const run = args.run ?? state2.run;
    const deltas = args.deltas ?? (args.resources != null ? resourceDeltasFromDiff(state2.resources, resources) : []);
    const baseUi = { ...state2.ui, message: args.message };
    const baseNext = {
      ...state2,
      resources,
      run,
      ui: baseUi
    };
    if (!ENABLE_ANIMATIONS) return baseNext;
    let uiWith = baseUi;
    for (let i = 0; i < deltas.length; i++) {
      const d = deltas[i];
      uiWith = enqueueDeltas(uiWith, { target: d.target, deltas: [d.delta] });
    }
    return { ...baseNext, ui: uiWith };
  }
  function applyDeltasAndClose(state2, args, fromGrid) {
    const next = applyDeltas(state2, args);
    if (!ENABLE_ANIMATIONS) return { ...next, encounter: null };
    const uiWith = enqueueGridTransition(next.ui, { from: fromGrid, to: "overworld" });
    return { ...next, encounter: null, ui: uiWith };
  }
  function buy(resources, spec) {
    const goldCost = spec.gold ?? 0;
    const foodCost = spec.food ?? 0;
    if (resources.gold < goldCost || resources.food < foodCost) return { outcome: "noFunds" };
    const gain = spec.gain;
    const foodGain = gain.food ?? 0;
    const armyGain = gain.armySize ?? 0;
    let inventory = resources.inventory;
    if (gain.inventory) {
      for (const slot of gain.inventory) {
        if (!inventory.includes(slot)) inventory = [...inventory, slot];
      }
    }
    let party = resources.party;
    if (gain.party) {
      for (const slot of gain.party) party = appendPartySlot(party, slot);
    }
    const next = {
      ...resources,
      gold: resources.gold - goldCost,
      food: resources.food - foodCost + foodGain,
      armySize: resources.armySize + armyGain,
      inventory,
      party
    };
    const deltas = [];
    if (goldCost) deltas.push({ target: "gold", delta: -goldCost });
    const netFood = foodGain - foodCost;
    if (netFood) deltas.push({ target: "food", delta: netFood });
    if (armyGain) deltas.push({ target: "army", delta: armyGain });
    return { outcome: "ok", resources: next, deltas };
  }
  function hireCompanion(prevState, args) {
    const refused = refuseCompanionHire(prevState, args.prefix, args.slotId);
    if (refused) return refused;
    const result = buy(prevState.resources, { gold: args.goldCost, gain: { party: [args.slotId] } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, args.prefix);
    return applyDeltas(prevState, {
      resources: result.resources,
      message: loreMessage(args.prefix, args.successLine),
      deltas: result.deltas
    });
  }
  function appendPartySlot(party, slot) {
    if (party.includes(slot)) return [...party];
    if (party.length >= MAX_PARTY_SLOTS) return [...party];
    return [...party, slot];
  }
  var GRID_SLOT_FILL_ORDER = ["left", "top", "bottom"];
  function offersToGridLayout(offers) {
    const layout = { left: null, top: null, bottom: null };
    for (let i = 0; i < GRID_SLOT_FILL_ORDER.length && i < offers.length; i++) {
      layout[GRID_SLOT_FILL_ORDER[i]] = offers[i];
    }
    return layout;
  }
  function attachGridBadge(cell, badge, s) {
    if (!badge) return cell;
    const resolved = typeof badge === "function" ? badge(s) : badge;
    return resolved ? { ...cell, badge: resolved } : cell;
  }
  function resolveActionSlot(slot, s) {
    if (!slot) return null;
    return typeof slot === "function" ? slot(s) : slot;
  }
  function gridButton(table, action) {
    return { spriteId: table[action].spriteId, action: { type: action } };
  }
  function badgedGridButton(table, action, badge) {
    return (s) => attachGridBadge(gridButton(table, action), badge, s);
  }
  function offerGridCell(table, action) {
    return (s) => attachGridBadge(gridButton(table, action), table[action].badge, s);
  }
  function makeRightGrid(spec) {
    const illustrationFor = (s) => typeof spec.illustrationSpriteId === "function" ? spec.illustrationSpriteId(s) : spec.illustrationSpriteId;
    const provider = (s, row, col) => {
      if (row === 1 && col === 2) {
        const cell = {
          spriteId: SPRITES.actions.return,
          action: spec.leaveAction
        };
        if (spec.leaveBadge) {
          const lb = typeof spec.leaveBadge === "function" ? spec.leaveBadge(s) : spec.leaveBadge;
          if (lb) cell.badge = lb;
        }
        return cell;
      }
      if (row === 1 && col === 1) {
        return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: 0 }, action: null };
      }
      if (row === 0 && col === 1) return resolveActionSlot(spec.top, s) ?? { action: null };
      if (row === 1 && col === 0) return resolveActionSlot(spec.left, s) ?? { action: null };
      if (row === 2 && col === 1) return resolveActionSlot(spec.bottom, s) ?? { action: null };
      return { action: null };
    };
    return { provider, illustrationFor };
  }
  function previewEncounterProvider(kind) {
    return () => ({ kind, sourceCellId: -1, restoreMessage: "" });
  }
  function applyEnterAnims(ui, anims, startFrame) {
    let next = ui;
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      const offset = a.afterFrames ?? 0;
      next = enqueueGridTransition(next, { from: a.from, to: a.to, startFrame: startFrame + offset });
    }
    return next;
  }
  function onEnterDefaultTerrain(ctx) {
    const { cell, world, pos, stepCount } = ctx;
    const r = RNG.createTileRandom({ world, stepCount, pos });
    return { message: r.perMoveLine(terrainLoreLinesForKind(cell.kind)) };
  }
  function rollMoveEvent(args) {
    const { policy, hasScout, source, rngKeys } = args;
    const ambushPercent = policy.ambushPercent;
    let lostPercent = policy.lostPercent;
    if (hasScout && policy.scoutLostHalves) {
      lostPercent = Math.floor(lostPercent / 2);
    }
    if (ambushPercent + lostPercent === 0) return null;
    const percentile = RNG.keyedIntExclusive(rngKeys, 100);
    if (percentile < ambushPercent) {
      return { kind: "fight", source };
    }
    if (percentile < ambushPercent + lostPercent) {
      return { kind: "lost", source };
    }
    return null;
  }
  function tryQuietFind(spec, ctx) {
    const { rngKeys, tileRand, resources } = ctx;
    const findRoll = RNG.keyedIntExclusive({ ...rngKeys, salt: spec.rollSalt }, 100);
    if (findRoll >= spec.findPercent) return void 0;
    const foodGain = Math.max(
      0,
      spec.foodBase + RNG.keyedIntInRange({ ...rngKeys, salt: spec.foodSalt }, -spec.amountNoise, spec.amountNoise)
    );
    const goldGain = Math.max(
      0,
      spec.goldBase + RNG.keyedIntInRange({ ...rngKeys, salt: spec.goldSalt }, -spec.amountNoise, spec.amountNoise)
    );
    return {
      message: tileRand.perMoveLine(spec.lines),
      resources: {
        ...resources,
        food: resources.food + foodGain,
        gold: resources.gold + goldGain
      }
    };
  }
  function resolveTerrainMove(args) {
    const { moveEventSource, policy, world, pos, stepCount, resources, hasScout, tileMessage, onQuiet } = args;
    const rngKeys = { seed: world.seed, stepCount, cellId: cellIdForPos(world, pos) };
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    const event = rollMoveEvent({
      policy,
      hasScout,
      source: moveEventSource,
      rngKeys
    });
    if (!event) {
      const quietCtx = { tileMessage, rngKeys, tileRand, resources };
      const custom = onQuiet?.(quietCtx);
      if (custom) {
        const resolved = {
          outcome: "quiet",
          message: custom.message,
          ...custom.resources !== void 0 ? { resources: custom.resources } : {}
        };
        return { tileMessage, resolved };
      }
      return { tileMessage, resolved: { outcome: "quiet", message: tileMessage } };
    }
    if (event.kind === "fight") {
      return { tileMessage, resolved: { outcome: "fight" } };
    }
    const td = pickTeleportDestination({ world, origin: pos, rngState: world.rngState });
    const nextWorld = { ...world, rngState: td.rngState };
    const lostMessage = RNG.createTileRandom({ world: nextWorld, stepCount, pos }).perMoveLine(
      LOST_FLAVOR_LINES
    );
    return {
      tileMessage,
      resolved: {
        outcome: "lost",
        world: nextWorld,
        teleportTo: td.destination,
        message: lostMessage
      }
    };
  }
  function tileEnterFromTerrainMove(resolved, onFight) {
    switch (resolved.outcome) {
      case "quiet":
        return {
          message: resolved.message,
          ...resolved.resources ? { resources: resolved.resources } : {}
        };
      case "fight":
        return onFight();
      case "lost":
        return {
          world: resolved.world,
          teleportTo: resolved.teleportTo,
          message: resolved.message
        };
    }
  }

  // src/core/mechanics/defs/gate.ts
  var onEnterGate = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "gate" && cell.kind !== "gateOpen") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    if (!resources.inventory.includes("bronzeKey")) {
      const line2 = r.perMoveLine(GATE_LOCKED_LINES);
      return { message: loreMessage(GATE_NAME, line2) };
    }
    const nextWorld = cell.kind === "gateOpen" ? world : setCellAt(world, pos, { kind: "gateOpen" });
    const line = r.perMoveLine(GATE_OPEN_LINES);
    return { world: nextWorld, hasWon: true, message: loreMessage(GATE_NAME, line) };
  };
  var placeGate = ({ cells, rngState, seed }) => {
    const locksmithPos = findCellByKind(cells, "locksmith");
    if (!locksmithPos) throw new Error("placeGate: locksmith must be placed before gate");
    placeFeatureFromSeed(cells, seed, "place.gate", {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      awayFrom: { pos: locksmithPos, minDistance: GATE_LOCKSMITH_MIN_DISTANCE },
      buildCell: () => ({ kind: "gate" })
    });
    return { rngState };
  };
  var gateMechanic = {
    id: "gate",
    kinds: ["gate", "gateOpen"],
    mapLabel: "G",
    onEnterTile: onEnterGate,
    poiSignpost: {
      rank: 0,
      name: () => GATE_NAME
    },
    placeWorld: placeGate
  };

  // src/core/mechanics/defs/locksmith.ts
  var ACTION_LOCKSMITH_PAY_GOLD = "LOCKSMITH_PAY_GOLD";
  var ACTION_LOCKSMITH_PAY_FOOD = "LOCKSMITH_PAY_FOOD";
  var ACTION_LOCKSMITH_LEAVE = "LOCKSMITH_LEAVE";
  var LOCKSMITH_ACTIONS = {
    [ACTION_LOCKSMITH_PAY_GOLD]: {
      spriteId: SPRITES.inventory.gold,
      reduce: reduceLocksmithPayGold,
      badge: { variant: "price", text: `-${LOCKSMITH_KEY_GOLD_COST}` }
    },
    [ACTION_LOCKSMITH_PAY_FOOD]: {
      spriteId: SPRITES.inventory.food,
      reduce: reduceLocksmithPayFood,
      badge: { variant: "price", text: `-${LOCKSMITH_KEY_FOOD_COST}` }
    }
  };
  var onEnterLocksmith = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "locksmith") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    if (resources.inventory.includes("bronzeKey")) {
      const line2 = r.perMoveLine(LOCKSMITH_VISITED_LINES);
      return { message: loreMessage(LOCKSMITH_NAME, line2) };
    }
    if (!resources.inventory.includes("bloodVial")) {
      const line2 = r.perMoveLine(LOCKSMITH_NO_BLOOD_LINES);
      return { message: loreMessage(LOCKSMITH_NAME, line2) };
    }
    const line = r.stableLine(LOCKSMITH_ENTER_LINES);
    return openNamedPoiEncounter({
      kind: "locksmith",
      sourceCellId: cellIdForPos(world, pos),
      title: LOCKSMITH_NAME,
      enterBody: line
    });
  };
  var reduceLocksmithAction = (prevState, action) => {
    if (action.type !== ACTION_LOCKSMITH_LEAVE && !(action.type in LOCKSMITH_ACTIONS)) return null;
    if (action.type === ACTION_LOCKSMITH_LEAVE) return leaveEncounter(prevState, "locksmith");
    const enc = prevState.encounter;
    return LOCKSMITH_ACTIONS[action.type].reduce(prevState, enc);
  };
  function reduceLocksmithPayGold(prevState, enc) {
    const rnd = RNG.createRunCopyRandom(prevState);
    const result = buy(prevState.resources, { gold: LOCKSMITH_KEY_GOLD_COST, gain: { inventory: ["bronzeKey"] } });
    if (result.outcome === "noFunds") {
      return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(TOWN_NO_GOLD_LINES, { cellId: enc.sourceCellId }));
    }
    return applyDeltasAndClose(prevState, {
      resources: consumeBlood(result.resources),
      message: loreMessage(LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)),
      deltas: result.deltas
    }, "locksmith");
  }
  var placeLocksmith = ({ cells, rngState, seed }) => {
    const lairPos = findCellByKind(cells, "lair");
    if (!lairPos) throw new Error("placeLocksmith: wyrm lair must be placed before locksmith");
    placeFeatureFromSeed(cells, seed, "place.locksmith", {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      awayFrom: { pos: lairPos, minDistance: LOCKSMITH_LAIR_MIN_DISTANCE },
      buildCell: () => ({ kind: "locksmith" })
    });
    return { rngState };
  };
  function reduceLocksmithPayFood(prevState, _enc) {
    const rnd = RNG.createRunCopyRandom(prevState);
    const result = buy(prevState.resources, { food: LOCKSMITH_KEY_FOOD_COST, gain: { inventory: ["bronzeKey"] } });
    if (result.outcome === "noFunds") {
      return setEncounterMessage(prevState, LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_NO_FOOD_LINES));
    }
    return applyDeltasAndClose(prevState, {
      resources: consumeBlood(result.resources),
      message: loreMessage(LOCKSMITH_NAME, rnd.perMoveLine(LOCKSMITH_PURCHASE_LINES)),
      deltas: result.deltas
    }, "locksmith");
  }
  function consumeBlood(resources) {
    if (!resources.inventory.includes("bloodVial")) return resources;
    return { ...resources, inventory: resources.inventory.filter((slot) => slot !== "bloodVial") };
  }
  var { provider: locksmithRightGrid, illustrationFor: locksmithIllustration } = makeRightGrid({
    leaveAction: { type: ACTION_LOCKSMITH_LEAVE },
    illustrationSpriteId: SPRITES.centers.locksmithKiln,
    top: offerGridCell(LOCKSMITH_ACTIONS, ACTION_LOCKSMITH_PAY_GOLD),
    left: offerGridCell(LOCKSMITH_ACTIONS, ACTION_LOCKSMITH_PAY_FOOD)
  });
  var locksmithMechanic = {
    id: "locksmith",
    kinds: ["locksmith"],
    mapLabel: "L",
    onEnterTile: onEnterLocksmith,
    poiSignpost: {
      rank: 10,
      name: () => LOCKSMITH_NAME
    },
    placeWorld: placeLocksmith,
    encounter: {
      kind: "locksmith",
      reduceAction: reduceLocksmithAction,
      previewEncounter: previewEncounterProvider("locksmith"),
      rightGrid: locksmithRightGrid,
      illustrationSpriteId: locksmithIllustration
    }
  };

  // src/core/signpost.ts
  var SIGNPOST_MIN_TARGET_DISTANCE = 2;
  function formatNearestPoiSignpostMessage(playerPos, world) {
    const cells = world.cells;
    const poiSignpostByKind = MECHANIC_INDEX.poiSignpostByKind;
    const candidates = [];
    for (let y = 0; y < cells.length; y++) {
      const row = cells[y];
      for (let x = 0; x < row.length; x++) {
        const cell = row[x];
        const contribution = poiSignpostByKind[cell.kind];
        if (!contribution) continue;
        candidates.push({
          rank: contribution.rank,
          cellSerial: y * world.width + x,
          name: contribution.name(cell),
          pos: { x, y }
        });
      }
    }
    if (candidates.length === 0) return "";
    function evalCandidate(c) {
      const dx = torusDelta(playerPos.x, c.pos.x, world.width);
      const dy = torusDelta(playerPos.y, c.pos.y, world.height);
      return { ...c, dx, dy, d: manhattan(dx, dy) };
    }
    function isBetter(a, b) {
      if (a.d !== b.d) return a.d < b.d;
      if (a.rank !== b.rank) return a.rank < b.rank;
      return a.cellSerial < b.cellSerial;
    }
    let bestAny = null;
    let bestFar = null;
    for (let i = 0; i < candidates.length; i++) {
      const e = evalCandidate(candidates[i]);
      if (!bestAny || isBetter(e, bestAny)) bestAny = e;
      if (e.d > SIGNPOST_MIN_TARGET_DISTANCE && (!bestFar || isBetter(e, bestFar))) bestFar = e;
    }
    const chosen = bestFar || bestAny;
    const dir = dirLabel(chosen.dx, chosen.dy);
    return `${chosen.name}
${dir}, ${chosen.d} leagues away.`;
  }

  // src/core/mechanics/defs/signpost.ts
  var onEnterSignpost = ({ world, pos }) => ({
    message: formatNearestPoiSignpostMessage(pos, world),
    knowsPosition: true
  });
  var placeSignposts = ({ cells, rngState, seed }) => {
    placeFeatureFromSeed(cells, seed, "place.signpost", {
      count: SIGNPOST_COUNT,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: () => ({ kind: "signpost" })
    });
    return { rngState };
  };
  var signpostMechanic = {
    id: "signpost",
    kinds: ["signpost"],
    onEnterTile: onEnterSignpost,
    placeWorld: placeSignposts
  };

  // src/core/foodCarry.ts
  function foodCarryCap(res) {
    const cap = 2 * Math.max(0, Math.trunc(res.armySize));
    return res.party.includes("beast") ? cap + BEAST_CARRY_CAP_BONUS : cap;
  }
  var FOOD_CARRY_FULL_MESSAGE = "You can't carry more food.";
  function applyFoodCapOnGain(prev, next) {
    if (next.food <= prev.food) return next;
    const cap = foodCarryCap(next);
    if (next.food <= cap) return next;
    return { ...next, food: Math.max(prev.food, cap) };
  }

  // src/core/mechanics/defs/farm.ts
  var ACTION_FARM_BUY_FOOD = "FARM_BUY_FOOD";
  var ACTION_FARM_BUY_BEAST = "FARM_BUY_BEAST";
  var ACTION_FARM_LEAVE = "FARM_LEAVE";
  var FARM_OFFERS = {
    [ACTION_FARM_BUY_FOOD]: {
      category: "economy",
      spriteId: SPRITES.inventory.food,
      reduce: reduceFarmBuyFood,
      badge: () => ({ variant: "price", text: `-${FARM_BUY_FOOD_GOLD_COST}` })
    },
    [ACTION_FARM_BUY_BEAST]: {
      category: "companion_hire",
      spriteId: SPRITES.inventory.beast,
      reduce: reduceFarmBuyBeast,
      badge: (s) => {
        const farm = getCellAt(s.world, s.player.position);
        return { variant: "price", text: `-${farm.companionHireGold}` };
      }
    }
  };
  var FARM_OFFER_POOL = Object.keys(FARM_OFFERS);
  var onEnterFarm = ({ cell, world, pos, stepCount }) => {
    if (cell.kind !== "farm") return {};
    const farmCell = getCellAt(world, pos);
    if (!farmCell || farmCell.kind !== "farm") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.stableLine(FARM_ENTER_LINES, { placeId: farmCell.id });
    return {
      ...openNamedPoiEncounter({
        kind: "farm",
        sourceCellId: cellIdForPos(world, pos),
        title: poiTitleFor(farmCell.name, "Farm"),
        enterBody: line
      }),
      knowsPosition: true
    };
  };
  var reduceFarmAction = (prevState, action) => {
    if (action.type !== ACTION_FARM_LEAVE && !(action.type in FARM_OFFERS)) return null;
    if (action.type === ACTION_FARM_LEAVE) return leaveEncounter(prevState, "farm");
    const farm = getCellAt(prevState.world, prevState.player.position);
    return FARM_OFFERS[action.type].reduce(prevState, farm);
  };
  function reduceFarmBuyFood(prevState, farm) {
    const title = poiTitleFor(farm.name, "Farm");
    if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
      return setEncounterMessage(prevState, title, FOOD_CARRY_FULL_MESSAGE);
    }
    const result = buy(prevState.resources, { gold: FARM_BUY_FOOD_GOLD_COST, gain: { food: FARM_BUY_FOOD_AMOUNT } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, title);
    const clamped = applyFoodCapOnGain(prevState.resources, result.resources);
    const appliedFoodDelta = clamped.food - prevState.resources.food;
    const deltas = result.deltas.map((d) => d.target === "food" ? { ...d, delta: appliedFoodDelta } : d);
    const line = encounterStableLine(prevState, "farm.buyFood", FARM_BUY_FOOD_LINES);
    return applyDeltas(prevState, {
      resources: clamped,
      message: loreMessage(title, line),
      deltas
    });
  }
  var placeNamedFarms = ({ cells, rngState, seed }) => {
    const offerSets = buildOfferSets({
      poiCount: FARM_COUNT,
      minOffers: POI_MIN_OFFERS,
      maxOffers: POI_MAX_OFFERS,
      pool: FARM_OFFER_POOL,
      categoryOf: (offer) => FARM_OFFERS[offer].category,
      requiredOnEveryPoi: [ACTION_FARM_BUY_FOOD],
      rng: RNG.createStreamRandomFromSeed(seed, "farm.offers")
    });
    let farmIndex = 0;
    placeNamedFeatureFromSeed(cells, seed, "place.farm", {
      count: FARM_COUNT,
      namePool: FARM_NAME_POOL,
      fallbackName: "A Farm",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name, rng }) => {
        const offers = [...offerSets[farmIndex]];
        const companionHireGold = rng.intInRange(COMPANION_HIRE_GOLD_MIN, COMPANION_HIRE_GOLD_MAX);
        farmIndex++;
        return { kind: "farm", id: cellId(x, y), name, offers, companionHireGold };
      }
    });
    return { rngState };
  };
  function farmOfferSlot(s, slot) {
    const farm = getCellAt(s.world, s.player.position);
    const offer = offersToGridLayout(farm.offers)[slot];
    return offer ? offerGridCell(FARM_OFFERS, offer)(s) : null;
  }
  function reduceFarmBuyBeast(prevState, farm) {
    const title = poiTitleFor(farm.name, "Farm");
    const rnd = RNG.createRunCopyRandom(prevState);
    return hireCompanion(prevState, {
      prefix: title,
      slotId: "beast",
      goldCost: farm.companionHireGold,
      successLine: rnd.perMoveLine(MULE_BUY_LINES, { cellId: farm.id })
    });
  }
  var { provider: farmRightGrid, illustrationFor: farmIllustration } = makeRightGrid({
    leaveAction: { type: ACTION_FARM_LEAVE },
    illustrationSpriteId: SPRITES.centers.farmBarn,
    top: (s) => farmOfferSlot(s, "top"),
    left: (s) => farmOfferSlot(s, "left")
  });
  var farmMechanic = {
    id: "farm",
    kinds: ["farm"],
    mapLabel: "F",
    onEnterTile: onEnterFarm,
    poiSignpost: {
      rank: 20,
      name: (cell) => `${cell.name || "A Farm"} Farm`
    },
    placeWorld: placeNamedFarms,
    encounter: {
      kind: "farm",
      reduceAction: reduceFarmAction,
      previewEncounter: previewEncounterProvider("farm"),
      rightGrid: farmRightGrid,
      illustrationSpriteId: farmIllustration
    }
  };

  // src/core/mechanics/defs/camp.ts
  var ACTION_CAMP_SEARCH = "CAMP_SEARCH";
  var ACTION_CAMP_HIRE_SCOUT = "hireScout";
  var ACTION_CAMP_LEAVE = "CAMP_LEAVE";
  var CAMP_OFFERS = {
    [ACTION_CAMP_SEARCH]: {
      category: "economy",
      spriteId: SPRITES.actions.search,
      reduce: reduceCampSearch
    },
    [ACTION_CAMP_HIRE_SCOUT]: {
      category: "companion_hire",
      spriteId: SPRITES.inventory.scout,
      reduce: reduceCampHireScout,
      badge: (s) => {
        const camp = getCellAt(s.world, s.player.position);
        return { variant: "price", text: `-${camp.companionHireGold}` };
      }
    }
  };
  var CAMP_OFFER_POOL = Object.keys(CAMP_OFFERS);
  function computeCampArmyGain(args) {
    return RNG.keyedIntInRange({ seed: args.seed, stepCount: args.stepCount, cellId: args.campId }, 1, 2);
  }
  var placeNamedCamps = ({ cells, rngState, seed }) => {
    const offerSets = buildOfferSets({
      poiCount: CAMP_COUNT,
      minOffers: POI_MIN_OFFERS,
      maxOffers: POI_MAX_OFFERS,
      pool: CAMP_OFFER_POOL,
      categoryOf: (offer) => CAMP_OFFERS[offer].category,
      rng: RNG.createStreamRandomFromSeed(seed, "camp.offers")
    });
    let campIndex = 0;
    placeNamedFeatureFromSeed(cells, seed, "place.camp", {
      count: CAMP_COUNT,
      namePool: CAMP_NAME_POOL,
      fallbackName: "A Camp",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name, rng }) => {
        const offers = [...offerSets[campIndex]];
        const companionHireGold = rng.intInRange(COMPANION_HIRE_GOLD_MIN, COMPANION_HIRE_GOLD_MAX);
        campIndex++;
        return { kind: "camp", id: cellId(x, y), name, nextReadyStep: 0, offers, companionHireGold };
      }
    });
    return { rngState };
  };
  function campOfferSlot(s, slot) {
    const camp = getCellAt(s.world, s.player.position);
    const offer = offersToGridLayout(camp.offers)[slot];
    return offer ? offerGridCell(CAMP_OFFERS, offer)(s) : null;
  }
  var onEnterCamp = ({ cell, world, pos, stepCount }) => {
    if (cell.kind !== "camp") return {};
    const camp = getCellAt(world, pos);
    if (!camp || camp.kind !== "camp") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.stableLine(CAMP_ENTER_LINES, { placeId: camp.id });
    return openNamedPoiEncounter({
      kind: "camp",
      sourceCellId: cellIdForPos(world, pos),
      title: poiTitleFor(camp.name, "Camp"),
      enterBody: line
    });
  };
  var reduceCampAction = (prevState, action) => {
    if (action.type !== ACTION_CAMP_LEAVE && !(action.type in CAMP_OFFERS)) return null;
    if (action.type === ACTION_CAMP_LEAVE) return leaveEncounter(prevState, "camp");
    return CAMP_OFFERS[action.type].reduce(prevState);
  };
  function reduceCampSearch(prevState) {
    const campCell = getCellAt(prevState.world, prevState.player.position);
    const title = poiTitleFor(campCell.name, "Camp");
    const stepCount = prevState.run.stepCount;
    const prevRes = prevState.resources;
    const rnd = RNG.createRunCopyRandom(prevState);
    const readyAt = campCell.nextReadyStep ?? 0;
    if (stepCount < readyAt) {
      const line2 = rnd.perMoveLine(CAMP_EMPTY_LINES, { cellId: campCell.id });
      return setEncounterMessage(prevState, title, line2);
    }
    const armyGain = computeCampArmyGain({ seed: prevState.world.seed, campId: campCell.id, stepCount });
    const nextCampCell = { ...campCell, nextReadyStep: stepCount + CAMP_COOLDOWN_MOVES };
    const nextWorld = setCellAt(prevState.world, prevState.player.position, nextCampCell);
    const gained = { ...prevRes, food: prevRes.food + CAMP_FOOD_GAIN, armySize: prevRes.armySize + armyGain };
    const nextResources = applyFoodCapOnGain(prevRes, gained);
    const foodGain = nextResources.food - prevRes.food;
    const line = rnd.perMoveLine(CAMP_RECRUIT_LINES, { cellId: campCell.id });
    return applyDeltas(
      { ...prevState, world: nextWorld },
      {
        resources: nextResources,
        message: loreMessage(title, line),
        deltas: [
          { target: "food", delta: foodGain },
          { target: "army", delta: armyGain }
        ]
      }
    );
  }
  function reduceCampHireScout(prevState) {
    const camp = getCellAt(prevState.world, prevState.player.position);
    const title = poiTitleFor(camp.name, "Camp");
    const rnd = RNG.createRunCopyRandom(prevState);
    return hireCompanion(prevState, {
      prefix: title,
      slotId: "scout",
      goldCost: camp.companionHireGold,
      successLine: rnd.perMoveLine(CAMP_SCOUT_HIRE_LINES, { cellId: camp.id, salt: "camp.scout.hire" })
    });
  }
  var { provider: campRightGrid, illustrationFor: campIllustration } = makeRightGrid({
    leaveAction: { type: ACTION_CAMP_LEAVE },
    illustrationSpriteId: SPRITES.centers.campfire,
    top: (s) => campOfferSlot(s, "top"),
    left: (s) => campOfferSlot(s, "left"),
    bottom: (s) => campOfferSlot(s, "bottom")
  });
  var campMechanic = {
    id: "camp",
    kinds: ["camp"],
    mapLabel: "C",
    onEnterTile: onEnterCamp,
    poiSignpost: {
      rank: 40,
      name: (cell) => `${cell.name || "A Camp"} Camp`
    },
    placeWorld: placeNamedCamps,
    encounter: {
      kind: "camp",
      reduceAction: reduceCampAction,
      previewEncounter: previewEncounterProvider("camp"),
      rightGrid: campRightGrid,
      illustrationSpriteId: campIllustration
    }
  };

  // src/core/mechanics/defs/combat.ts
  var ACTION_FIGHT = "FIGHT";
  var ACTION_COMBAT_PAY = "COMBAT_PAY";
  var ACTION_RETURN = "RETURN";
  var COMBAT_ACTIONS = {
    [ACTION_FIGHT]: { spriteId: SPRITES.actions.fight, reduce: reduceCombatFight },
    [ACTION_COMBAT_PAY]: { spriteId: SPRITES.inventory.gold, reduce: reduceCombatPay },
    [ACTION_RETURN]: { spriteId: SPRITES.actions.return, reduce: reduceCombatReturn }
  };
  function spawnEnemyArmy(opts) {
    const playerArmy = Math.max(0, Math.trunc(opts.playerArmy));
    const min = Math.max(2, playerArmy - 2);
    const max = Math.max(min, 2 * playerArmy);
    const r = RNG.createStreamRandom(opts.rngState);
    return { rngState: r.rngState, enemyArmy: r.intInRange(min, max) };
  }
  function resolveFightRound(opts) {
    const playerArmy = Math.max(0, Math.trunc(opts.playerArmy));
    const enemyArmy = Math.max(0, Math.trunc(opts.enemyArmy));
    const r = RNG.createStreamRandom(opts.rngState);
    const w = r.intExclusive(playerArmy + opts.playerRollBonus);
    const b = r.intExclusive(enemyArmy + opts.enemyRollBonus);
    if (w >= b) {
      const nextEnemyArmy = Math.floor(enemyArmy / 2);
      const killed = enemyArmy - nextEnemyArmy;
      return { rngState: r.rngState, outcome: "playerHit", nextEnemyArmy, enemyDelta: nextEnemyArmy - enemyArmy, killed };
    }
    return { rngState: r.rngState, outcome: "enemyHit", nextEnemyArmy: enemyArmy, enemyDelta: 0, killed: 0 };
  }
  function isPreviewSentinel(sourceCellId) {
    return sourceCellId < 0;
  }
  function combatVariantForEncounter(state2) {
    const enc = state2.encounter;
    if (!enc || enc.kind !== "combat") return previewPlaceholderVariant;
    if (isPreviewSentinel(enc.sourceCellId)) return previewPlaceholderVariant;
    const cell = getCellAt(state2.world, posForCellId(state2.world, enc.sourceCellId));
    return MECHANIC_INDEX.combatVariantByKind[cell.kind] ?? previewPlaceholderVariant;
  }
  function applyHealerMend(resources, enc) {
    if (!resources.party.includes("healer")) return resources;
    const roundLosses = Math.max(0, enc.armyAtCombatStart - resources.armySize);
    const mend = Math.min(2, roundLosses);
    if (mend <= 0) return resources;
    return { ...resources, armySize: resources.armySize + mend };
  }
  function applyCombatClosed(state2, outcome, encounter) {
    if (isPreviewSentinel(encounter.sourceCellId)) return state2;
    const cell = getCellAt(state2.world, posForCellId(state2.world, encounter.sourceCellId));
    const hook = MECHANIC_INDEX.onCombatClosedByKind[cell.kind];
    if (!hook) return state2;
    return hook(state2, outcome, encounter);
  }
  function finishCombatClose(intermediate, enc, outcome, extraDeltas) {
    const beforeMend = intermediate.resources;
    const afterMend = applyHealerMend(beforeMend, enc);
    const closed = applyCombatClosed({ ...intermediate, resources: afterMend }, outcome, enc);
    const deltas = [...extraDeltas, ...resourceDeltasFromDiff(beforeMend, afterMend)];
    return applyDeltas(closed, {
      message: closed.ui.message,
      resources: afterMend,
      run: closed.run,
      deltas
    });
  }
  function combatFightBadge(state2) {
    const enc = state2.encounter;
    if (!enc || enc.kind !== "combat") return null;
    if (enc.enemyArmySize <= 0) return null;
    return { variant: "left", text: `${enc.enemyArmySize}` };
  }
  function combatPayBadge(state2) {
    const enc = state2.encounter;
    if (!enc || enc.kind !== "combat") return null;
    const variant = combatVariantForEncounter(state2);
    if (variant.payment.isEligible(enc, state2.resources) !== "ok") return null;
    const cost = variant.payment.computeCost(enc);
    return { variant: "price", text: `-${cost}` };
  }
  var { provider: combatRightGrid, illustrationFor: combatIllustration } = makeRightGrid({
    leaveAction: { type: ACTION_RETURN },
    leaveBadge: { variant: "price", text: "-1" },
    illustrationSpriteId: (s) => combatVariantForEncounter(s).illustrationSpriteId,
    left: badgedGridButton(COMBAT_ACTIONS, ACTION_FIGHT, combatFightBadge),
    top: badgedGridButton(COMBAT_ACTIONS, ACTION_COMBAT_PAY, combatPayBadge)
  });
  var reduceCombatAction = (prevState, action) => {
    if (!(action.type in COMBAT_ACTIONS)) return null;
    return COMBAT_ACTIONS[action.type].reduce(prevState);
  };
  function reduceCombatPay(prevState) {
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "combat") return prevState;
    const variant = combatVariantForEncounter(prevState);
    const payment = variant.payment;
    const eligibility = payment.isEligible(enc, prevState.resources);
    if (eligibility !== "ok") {
      const lines = payment.failLines[eligibility];
      if (!lines || lines.length === 0) {
        throw new Error(`combat.pay: variant has no failLines.${eligibility}`);
      }
      const line = encounterStableLine(prevState, `combat.pay.${eligibility}`, lines);
      return {
        ...prevState,
        encounter: enc,
        ui: { ...prevState.ui, message: combatLoreMessage(prevState, line) || prevState.ui.message }
      };
    }
    const cost = payment.computeCost(enc);
    const prevRes = prevState.resources;
    const prevWorld = prevState.world;
    const prevUi = prevState.ui;
    const afterDeduct = { ...prevRes, gold: prevRes.gold - cost };
    const afterTroops = payment.onSuccess(afterDeduct, enc);
    let nextResources = afterTroops;
    let nextWorld = prevWorld;
    let lootGoldGain = 0;
    let lootFoodGain = 0;
    if (variant.recruitLootScale) {
      const scale = variant.recruitLootScale(enc);
      const reward = variant.victoryReward(afterTroops, prevWorld.rngState, enc);
      const fullGoldGain = reward.resources.gold - afterTroops.gold;
      const fullFoodGain = reward.resources.food - afterTroops.food;
      lootGoldGain = Math.floor(fullGoldGain * scale);
      lootFoodGain = Math.floor(fullFoodGain * scale);
      const withLoot = {
        ...afterTroops,
        gold: afterTroops.gold + lootGoldGain,
        food: afterTroops.food + lootFoodGain
      };
      nextResources = applyFoodCapOnGain(prevRes, withLoot);
      lootFoodGain = nextResources.food - afterTroops.food;
      nextWorld = { ...prevWorld, rngState: reward.rngState };
    }
    const successPick = RNG.createRunCopyRandom(prevState).advanceCursor("combat.pay.success", payment.successLines);
    const baseUi = { ...prevUi, message: combatLoreMessage(prevState, successPick.line || "") || prevUi.message };
    const intermediate = {
      world: nextWorld,
      player: prevState.player,
      run: successPick.nextState.run,
      resources: nextResources,
      encounter: null,
      ui: baseUi
    };
    const closeOutcome = variant.recruitLootScale ? "recruit" : "paid";
    const payDeltas = [];
    pushResourceDeltas(payDeltas, "gold", [-cost, ...lootGoldGain > 0 ? [lootGoldGain] : []]);
    if (lootFoodGain > 0) pushResourceDeltas(payDeltas, "food", [lootFoodGain]);
    let next = finishCombatClose(intermediate, enc, closeOutcome, payDeltas);
    if (!ENABLE_ANIMATIONS) return next;
    return { ...next, ui: enqueueGridTransition(next.ui, { from: "combat", to: "overworld" }) };
  }
  function reduceCombatReturn(prevState) {
    if (!prevState.encounter) return prevState;
    if (prevState.encounter.kind !== "combat") return prevState;
    const enc = prevState.encounter;
    const prevUi = prevState.ui;
    const prevRes = prevState.resources;
    const nextArmy = prevRes.armySize - 1;
    const armyDepleted = nextArmy <= 0;
    const nextResources = { ...prevRes, armySize: Math.max(0, nextArmy) };
    const fleeVariant = combatVariantForEncounter(prevState);
    const fleePick = armyDepleted ? null : RNG.createRunCopyRandom(prevState).advanceCursor("combat.exit.flee", fleeVariant.fleeLines);
    const nextRun = armyDepleted ? prevState.run : fleePick.nextState.run;
    const nextMessage = armyDepleted ? prevUi.message : combatLoreMessage(prevState, fleePick.line || "") || prevUi.message;
    const baseUi = { ...prevUi, message: nextMessage };
    const intermediate = {
      world: prevState.world,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: null,
      ui: baseUi
    };
    const closed = armyDepleted ? intermediate : applyCombatClosed(intermediate, "flee", enc);
    let next = applyDeltas(closed, {
      message: closed.ui.message,
      resources: nextResources,
      run: closed.run,
      deltas: [{ target: "army", delta: -1 }]
    });
    if (!ENABLE_ANIMATIONS) return next;
    return {
      ...next,
      ui: armyDepleted ? next.ui : enqueueGridTransition(next.ui, { from: "combat", to: "overworld" })
    };
  }
  function reduceCombatFight(prevState) {
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "combat") return prevState;
    const prevEnemy = enc.enemyArmySize;
    if (prevEnemy <= 0) {
      return { world: prevState.world, player: prevState.player, run: prevState.run, resources: prevState.resources, encounter: null, ui: prevState.ui };
    }
    const prevRes = prevState.resources;
    const prevUi = prevState.ui;
    const variant = combatVariantForEncounter(prevState);
    const round = resolveFightRound({
      rngState: prevState.world.rngState,
      playerArmy: prevRes.armySize,
      enemyArmy: prevEnemy,
      playerRollBonus: variant.playerRollBonus,
      enemyRollBonus: variant.enemyRollBonus
    });
    const foodDeltas = [];
    const goldDeltas = [];
    const armyDeltas = [];
    const enemyDeltas = [];
    let nextResources = prevRes;
    let nextEncounter = enc;
    if (round.outcome === "playerHit") {
      const nextEnemy = round.nextEnemyArmy;
      const killed = round.killed;
      if (killed) enemyDeltas.push(-killed);
      nextEncounter = nextEnemy <= 0 ? null : { ...enc, enemyArmySize: nextEnemy };
    } else {
      nextResources = { ...nextResources, armySize: nextResources.armySize - 1 };
      armyDeltas.push(-1);
    }
    let nextWorld = { ...prevState.world, rngState: round.rngState };
    if (round.outcome === "playerHit" && nextEncounter == null) {
      const reward = variant.victoryReward(nextResources, nextWorld.rngState, enc);
      const goldDelta = reward.resources.gold - nextResources.gold;
      if (goldDelta) goldDeltas.push(goldDelta);
      nextResources = reward.resources;
      nextWorld = { ...nextWorld, rngState: reward.rngState };
    }
    nextResources = applyFoodCapOnGain(prevRes, nextResources);
    const appliedFoodDelta = nextResources.food - prevRes.food;
    if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta);
    const armyDepleted = nextResources.armySize <= 0;
    const victoryPick = !armyDepleted && nextEncounter == null ? RNG.createRunCopyRandom(prevState).advanceCursor("combat.exit.victory", variant.victoryLines) : null;
    const nextRun = armyDepleted ? prevState.run : nextEncounter == null ? victoryPick.nextState.run : prevState.run;
    const nextMessage = nextEncounter == null && !armyDepleted ? combatLoreMessage(prevState, victoryPick.line || "") || prevUi.message : prevUi.message;
    const baseUi = { message: nextMessage, leftPanel: prevUi.leftPanel, clock: prevUi.clock, anim: prevUi.anim };
    const intermediate = {
      world: nextWorld,
      player: prevState.player,
      run: nextRun,
      resources: nextResources,
      encounter: armyDepleted ? null : nextEncounter,
      ui: baseUi
    };
    const fightDeltas = [];
    pushResourceDeltas(fightDeltas, "food", foodDeltas);
    pushResourceDeltas(fightDeltas, "gold", goldDeltas);
    pushResourceDeltas(fightDeltas, "army", armyDeltas);
    pushResourceDeltas(fightDeltas, "enemyArmy", enemyDeltas);
    let next;
    if (!armyDepleted && nextEncounter == null) {
      next = finishCombatClose(intermediate, enc, "victory", fightDeltas);
    } else {
      next = applyDeltas(intermediate, {
        message: intermediate.ui.message,
        resources: nextResources,
        run: nextRun,
        deltas: fightDeltas
      });
    }
    next = { ...next, encounter: armyDepleted ? null : nextEncounter };
    if (!ENABLE_ANIMATIONS) return next;
    if (!armyDepleted && nextEncounter == null) {
      next = { ...next, ui: enqueueGridTransition(next.ui, { from: "combat", to: "overworld" }) };
    }
    return next;
  }
  function rolledEnemySpawn(playerArmy) {
    return (rngState) => spawnEnemyArmy({ rngState, playerArmy });
  }
  function fixedEnemySpawn(enemyArmy) {
    const clamped = Math.max(0, Math.trunc(enemyArmy));
    return (rngState) => ({ rngState, enemyArmy: clamped });
  }
  function startCombatEncounter(args) {
    const spawned = args.spawnEnemy(args.world.rngState);
    const nextWorld = { ...args.world, rngState: spawned.rngState };
    const encounter = {
      kind: "combat",
      enemyArmySize: spawned.enemyArmy,
      initialSpawn: spawned.enemyArmy,
      armyAtCombatStart: Math.max(0, args.playerArmySize),
      sourceCellId: cellIdForPos(nextWorld, args.pos),
      restoreMessage: args.restoreMessage
    };
    return {
      world: nextWorld,
      encounter,
      message: args.encounterMessage,
      enterAnims: [{ kind: "gridTransition", from: "overworld", to: "combat" }]
    };
  }
  var previewPlaceholderVariant = {
    illustrationSpriteId: SPRITES.enemies.enemy,
    encounterLines: [],
    victoryLines: [],
    fleeLines: [],
    playerRollBonus: 0,
    enemyRollBonus: 0,
    payment: {
      computeCost: () => 0,
      isEligible: () => "unrecruitable",
      successLines: [],
      failLines: { unrecruitable: [] },
      onSuccess: (resources) => resources
    },
    victoryReward: (resources, rngState) => ({ resources, rngState })
  };
  var combatMechanic = {
    id: "combat",
    kinds: [],
    encounter: {
      kind: "combat",
      rightGrid: combatRightGrid,
      illustrationSpriteId: combatIllustration,
      reduceAction: reduceCombatAction,
      deltaAnchorsByTarget: { enemyArmy: { row: 1, col: 0, goodSign: -1 } },
      previewEncounter: () => ({
        kind: "combat",
        enemyArmySize: 0,
        initialSpawn: 0,
        armyAtCombatStart: 0,
        sourceCellId: -1,
        restoreMessage: ""
      })
    }
  };

  // src/core/mechanics/defs/mountain.ts
  var mountainPolicy = { ambushPercent: MOUNTAIN_AMBUSH_PERCENT, lostPercent: 0 };
  var MOUNTAIN_QUIET_FIND = {
    findPercent: MOUNTAIN_FIND_PERCENT,
    lines: MOUNTAIN_FIND_LINES,
    foodBase: MOUNTAIN_FIND_FOOD_BASE,
    goldBase: MOUNTAIN_FIND_GOLD_BASE,
    amountNoise: TERRAIN_FIND_AMOUNT_NOISE,
    rollSalt: "mountain.find.roll",
    foodSalt: "mountain.find.food",
    goldSalt: "mountain.find.gold"
  };
  function brigandRecruitCost(enc) {
    return enc.enemyArmySize * enc.enemyArmySize;
  }
  function brigandRecruitEligibility(enc, resources) {
    if (enc.enemyArmySize > BRIGAND_RECRUIT_MAX_REMAINING) return "tooMany";
    if (enc.enemyArmySize >= enc.initialSpawn) return "notWounded";
    if (resources.gold < brigandRecruitCost(enc)) return "noFunds";
    return "ok";
  }
  function brigandRecruitLootScale(enc) {
    if (enc.initialSpawn <= 0) return 0;
    return (enc.initialSpawn - enc.enemyArmySize) / enc.initialSpawn;
  }
  function brigandVictoryReward(resources, rngState, enc) {
    const r = RNG.createStreamRandom(rngState);
    const baseGold = Math.max(0, enc.initialSpawn + r.intInRange(-BRIGAND_GOLD_NOISE, BRIGAND_GOLD_NOISE));
    const foodBonus = r.intExclusive(BRIGAND_FOOD_MAX + 1);
    const next = {
      ...resources,
      gold: resources.gold + baseGold,
      food: resources.food + foodBonus
    };
    return { resources: next, rngState: r.rngState };
  }
  var brigandCombatVariant = {
    illustrationSpriteId: SPRITES.enemies.enemy,
    encounterLines: BRIGAND_ENCOUNTER_LINES,
    victoryLines: BRIGAND_VICTORY_LINES,
    fleeLines: BRIGAND_FLEE_LINES,
    playerRollBonus: 5,
    enemyRollBonus: 5,
    payment: {
      computeCost: brigandRecruitCost,
      isEligible: brigandRecruitEligibility,
      successLines: BRIGAND_RECRUIT_SUCCESS_LINES,
      failLines: {
        noFunds: BRIGAND_RECRUIT_NO_FUNDS_LINES,
        notWounded: BRIGAND_RECRUIT_NOT_WOUNDED_LINES,
        tooMany: BRIGAND_RECRUIT_TOO_MANY_LINES
      },
      onSuccess: (resources, enc) => ({ ...resources, armySize: resources.armySize + enc.enemyArmySize })
    },
    victoryReward: brigandVictoryReward,
    recruitLootScale: brigandRecruitLootScale
  };
  var onEnterMountain = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "mountain") return {};
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind("mountain"));
    const { tileMessage: restoreMessage, resolved } = resolveTerrainMove({
      moveEventSource: "mountain",
      policy: mountainPolicy,
      world,
      pos,
      stepCount,
      resources,
      hasScout: resources.party.includes("scout"),
      tileMessage,
      onQuiet: (ctx) => tryQuietFind(MOUNTAIN_QUIET_FIND, ctx)
    });
    return tileEnterFromTerrainMove(
      resolved,
      () => startCombatEncounter({
        world,
        pos,
        playerArmySize: resources.armySize,
        spawnEnemy: rolledEnemySpawn(resources.armySize),
        encounterMessage: tileRand.perMoveLine(brigandCombatVariant.encounterLines),
        restoreMessage
      })
    );
  };
  var mountainMechanic = {
    id: "mountain",
    kinds: ["mountain"],
    enterFoodCostByKind: { mountain: FOOD_COST_MOUNTAIN },
    moveEventPolicyByKind: { mountain: mountainPolicy },
    onEnterTile: onEnterMountain,
    combatVariantByKind: { mountain: brigandCombatVariant }
  };

  // src/core/mechanics/defs/henge.ts
  function hengeVictoryReward(resources, rngState, enc) {
    const r = RNG.createStreamRandom(rngState);
    const baseGold = Math.max(0, enc.initialSpawn + r.intInRange(-HENGE_GOLD_NOISE, HENGE_GOLD_NOISE)) + HENGE_GOLD_BONUS;
    const foodBase = Math.round(HENGE_FOOD_FACTOR * enc.initialSpawn);
    const food = Math.max(0, foodBase + r.intInRange(-HENGE_FOOD_NOISE, HENGE_FOOD_NOISE));
    const next = {
      ...resources,
      gold: resources.gold + baseGold,
      food: resources.food + food
    };
    return { resources: next, rngState: r.rngState };
  }
  var hengeCombatVariant = {
    illustrationSpriteId: SPRITES.enemies.enemy,
    encounterLines: HENGE_ENCOUNTER_LINES,
    victoryLines: HENGE_VICTORY_LINES,
    fleeLines: HENGE_FLEE_LINES,
    playerRollBonus: 5,
    enemyRollBonus: 5,
    payment: {
      computeCost: brigandRecruitCost,
      isEligible: brigandRecruitEligibility,
      successLines: HENGE_RECRUIT_SUCCESS_LINES,
      failLines: {
        noFunds: HENGE_RECRUIT_NO_FUNDS_LINES,
        notWounded: HENGE_RECRUIT_NOT_WOUNDED_LINES,
        tooMany: HENGE_RECRUIT_TOO_MANY_LINES
      },
      onSuccess: (resources, enc) => ({ ...resources, armySize: resources.armySize + enc.enemyArmySize })
    },
    victoryReward: hengeVictoryReward,
    recruitLootScale: brigandRecruitLootScale
  };
  var hengeSpawn = (rngState) => {
    const r = RNG.createStreamRandom(rngState);
    const span = HENGE_BAND_MAX - HENGE_BAND_MIN + 1;
    const enemyArmy = HENGE_BAND_MIN + r.intExclusive(span);
    return { rngState: r.rngState, enemyArmy };
  };
  var onHengeCombatClosed = (state2, outcome, encounter) => {
    const pos = posForCellId(state2.world, encounter.sourceCellId);
    const cell = getCellAt(state2.world, pos);
    if (cell.kind !== "henge") return state2;
    if (outcome === "flee") {
      const next2 = { ...cell, currentGroup: encounter.enemyArmySize };
      return { ...state2, world: setCellAt(state2.world, pos, next2) };
    }
    const next = {
      ...cell,
      currentGroup: null,
      nextReadyStep: state2.run.stepCount + HENGE_COOLDOWN_MOVES
    };
    return { ...state2, world: setCellAt(state2.world, pos, next) };
  };
  var onEnterHenge = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "henge") return {};
    const hengeCell = getCellAt(world, pos);
    if (!hengeCell || hengeCell.kind !== "henge") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const title = poiTitleFor(hengeCell.name, "Henge");
    const readyAt = hengeCell.nextReadyStep ?? 0;
    if (hengeCell.currentGroup == null && stepCount < readyAt) {
      const line = r.perMoveLine(HENGE_EMPTY_LINES, { cellId: hengeCell.id });
      return { message: loreMessage(title, line) };
    }
    if (hengeCell.currentGroup != null) {
      const tileMessage2 = loreMessage(title, r.perMoveLine(HENGE_ARRIVAL_LINES, { cellId: hengeCell.id }));
      return startCombatEncounter({
        world,
        pos,
        playerArmySize: resources.armySize,
        spawnEnemy: fixedEnemySpawn(hengeCell.currentGroup),
        encounterMessage: tileMessage2,
        restoreMessage: tileMessage2
      });
    }
    const tileMessage = loreMessage(title, r.perMoveLine(HENGE_ARRIVAL_LINES, { cellId: hengeCell.id }));
    const result = startCombatEncounter({
      world,
      pos,
      playerArmySize: resources.armySize,
      spawnEnemy: hengeSpawn,
      encounterMessage: tileMessage,
      restoreMessage: tileMessage
    });
    const nextHenge = { ...hengeCell, currentGroup: result.encounter.enemyArmySize };
    return { ...result, world: setCellAt(result.world, pos, nextHenge) };
  };
  var placeHenges = ({ cells, rngState, seed }) => {
    placeNamedFeatureFromSeed(cells, seed, "place.henge", {
      count: HENGE_COUNT,
      namePool: HENGE_NAME_POOL,
      fallbackName: "A Henge",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name }) => ({ kind: "henge", id: cellId(x, y), name, nextReadyStep: 0, currentGroup: null })
    });
    return { rngState };
  };
  var hengeMechanic = {
    id: "henge",
    kinds: ["henge"],
    mapLabel: "H",
    moveEventPolicyByKind: { henge: { ambushPercent: 100, lostPercent: 0 } },
    onEnterTile: onEnterHenge,
    poiSignpost: {
      rank: 50,
      name: (cell) => `${cell.name || "A Henge"} Henge`
    },
    placeWorld: placeHenges,
    combatVariantByKind: { henge: hengeCombatVariant },
    onCombatClosed: onHengeCombatClosed
  };

  // src/core/mechanics/defs/town.ts
  var ACTION_TOWN_BUY_FOOD = "buyFood";
  var ACTION_TOWN_BUY_TROOPS = "buyTroops";
  var ACTION_TOWN_HIRE_SCOUT = "hireScout";
  var ACTION_TOWN_HIRE_HEALER = "hireHealer";
  var ACTION_TOWN_BUY_RUMOR = "buyRumors";
  var ACTION_TOWN_LEAVE = "TOWN_LEAVE";
  function townPriceBadge(s, priceKey) {
    const town = getCellAt(s.world, s.player.position);
    return { variant: "price", text: `-${town.prices[priceKey]}` };
  }
  var TOWN_OFFERS = {
    [ACTION_TOWN_BUY_FOOD]: {
      category: "economy",
      spriteId: SPRITES.inventory.food,
      priceKey: "foodGold",
      reduce: reduceTownBuyFood,
      badge: (s) => townPriceBadge(s, "foodGold")
    },
    [ACTION_TOWN_BUY_TROOPS]: {
      category: "economy",
      spriteId: SPRITES.inventory.army,
      priceKey: "troopsGold",
      reduce: reduceTownBuyTroops,
      badge: (s) => townPriceBadge(s, "troopsGold")
    },
    [ACTION_TOWN_HIRE_SCOUT]: {
      category: "companion_hire",
      spriteId: SPRITES.inventory.scout,
      priceKey: "companionHireGold",
      reduce: reduceTownHireScout,
      badge: (s) => townPriceBadge(s, "companionHireGold")
    },
    [ACTION_TOWN_HIRE_HEALER]: {
      category: "companion_hire",
      spriteId: SPRITES.inventory.healer,
      priceKey: "companionHireGold",
      reduce: reduceTownHireHealer,
      badge: (s) => townPriceBadge(s, "companionHireGold")
    },
    [ACTION_TOWN_BUY_RUMOR]: {
      category: "economy",
      spriteId: SPRITES.actions.rumor,
      priceKey: "rumorGold",
      reduce: reduceTownBuyRumor,
      badge: (s) => townPriceBadge(s, "rumorGold")
    }
  };
  var TOWN_OFFER_POOL = Object.keys(TOWN_OFFERS);
  function rumorPool() {
    const pool = [];
    const groups = Object.values(BARKEEP_TIPS);
    for (let i = 0; i < groups.length; i++) {
      const lines = groups[i];
      for (let j = 0; j < lines.length; j++) pool.push(lines[j]);
    }
    return pool;
  }
  var onEnterTown = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "town") return {};
    const town = getCellAt(world, pos);
    if (!town || town.kind !== "town") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.stableLine(TOWN_ENTER_LINES, { placeId: town.id });
    let nextResources = resources;
    if (resources.party.includes("healer") && resources.gold >= HEALER_UPKEEP_GOLD) {
      nextResources = { ...resources, gold: resources.gold - HEALER_UPKEEP_GOLD };
    }
    const opened = openNamedPoiEncounter({
      kind: "town",
      sourceCellId: cellIdForPos(world, pos),
      title: poiTitleFor(town.name, "Town"),
      enterBody: line,
      extra: { rumorsBought: 0 }
    });
    return { ...opened, knowsPosition: true, resources: nextResources };
  };
  var reduceTownAction = (prevState, action) => {
    if (action.type !== ACTION_TOWN_LEAVE && !(action.type in TOWN_OFFERS)) return null;
    if (action.type === ACTION_TOWN_LEAVE) return leaveEncounter(prevState, "town");
    const town = getCellAt(prevState.world, prevState.player.position);
    return TOWN_OFFERS[action.type].reduce(prevState, town);
  };
  function reduceTownBuyFood(prevState, town) {
    const title = poiTitleFor(town.name, "Town");
    if (prevState.resources.food >= foodCarryCap(prevState.resources)) {
      return setEncounterMessage(prevState, title, FOOD_CARRY_FULL_MESSAGE);
    }
    const result = buy(prevState.resources, { gold: town.prices.foodGold, gain: { food: town.bundles.food } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, title);
    const clamped = applyFoodCapOnGain(prevState.resources, result.resources);
    const appliedFoodDelta = clamped.food - prevState.resources.food;
    const deltas = result.deltas.map((d) => d.target === "food" ? { ...d, delta: appliedFoodDelta } : d);
    const line = encounterStableLine(prevState, "town.buyFood", TOWN_BUY_LINES);
    return applyDeltas(prevState, {
      resources: clamped,
      message: loreMessage(title, line),
      deltas
    });
  }
  function reduceTownBuyTroops(prevState, town) {
    const title = poiTitleFor(town.name, "Town");
    const result = buy(prevState.resources, { gold: town.prices.troopsGold, gain: { armySize: town.bundles.troops } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, title);
    const line = encounterStableLine(prevState, "town.buyTroops", TOWN_BUY_LINES);
    return applyDeltas(prevState, {
      resources: result.resources,
      message: loreMessage(title, line),
      deltas: result.deltas
    });
  }
  function reduceTownHireScout(prevState, town) {
    const title = poiTitleFor(town.name, "Town");
    const refused = refuseCompanionHire(prevState, title, "scout");
    if (refused) return refused;
    const rnd = RNG.createRunCopyRandom(prevState);
    const result = buy(prevState.resources, { gold: town.prices.companionHireGold, gain: { party: ["scout"] } });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, title);
    return applyDeltas(prevState, {
      resources: result.resources,
      message: loreMessage(title, rnd.perMoveLine(TOWN_SCOUT_HIRE_LINES, { cellId: town.id })),
      deltas: result.deltas
    });
  }
  function reduceTownHireHealer(prevState, town) {
    const title = poiTitleFor(town.name, "Town");
    const rnd = RNG.createRunCopyRandom(prevState);
    return hireCompanion(prevState, {
      prefix: title,
      slotId: "healer",
      goldCost: town.prices.companionHireGold,
      successLine: rnd.perMoveLine(HEALER_BUY_LINES, { cellId: town.id })
    });
  }
  function reduceTownBuyRumor(prevState, town) {
    const title = poiTitleFor(town.name, "Town");
    const enc = prevState.encounter;
    if (!enc || enc.kind !== "town") return prevState;
    if (enc.rumorsBought >= TOWN_RUMORS_PER_VISIT_MAX) {
      const line = encounterStableLine(prevState, "rumor.cap", TOWN_RUMOR_EXHAUSTED_LINES);
      return setEncounterMessage(prevState, title, line);
    }
    const result = buy(prevState.resources, { gold: town.prices.rumorGold, gain: {} });
    if (result.outcome === "noFunds") return noGoldResponse(prevState, title);
    const pool = rumorPool();
    const pick = RNG.createRunCopyRandom(prevState).advanceCursor(`town.rumor.${town.id}`, pool, { salt: town.id });
    const nextEncounter = { ...enc, rumorsBought: enc.rumorsBought + 1 };
    return applyDeltas(
      { ...prevState, encounter: nextEncounter, run: pick.nextState.run },
      {
        resources: result.resources,
        message: loreMessage(title, pick.line),
        deltas: result.deltas
      }
    );
  }
  var placeNamedTowns = ({ cells, rngState, seed }) => {
    const offerSets = buildOfferSets({
      poiCount: TOWN_COUNT,
      minOffers: POI_MIN_OFFERS,
      maxOffers: POI_MAX_OFFERS,
      pool: TOWN_OFFER_POOL,
      categoryOf: (offer) => TOWN_OFFERS[offer].category,
      rng: RNG.createStreamRandomFromSeed(seed, "town.offers")
    });
    let townIndex = 0;
    placeNamedFeatureFromSeed(cells, seed, "place.town", {
      count: TOWN_COUNT,
      namePool: TOWN_NAME_POOL,
      fallbackName: "A Town",
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y, name, rng }) => {
        const offers = [...offerSets[townIndex]];
        const foodGold = rng.intInRange(TOWN_PRICE_FOOD_MIN, TOWN_PRICE_FOOD_MAX);
        const troopsGold = rng.intInRange(TOWN_PRICE_TROOPS_MIN, TOWN_PRICE_TROOPS_MAX);
        const companionHireGold = rng.intInRange(COMPANION_HIRE_GOLD_MIN, COMPANION_HIRE_GOLD_MAX);
        const rumorGold = rng.intInRange(TOWN_PRICE_RUMOR_MIN, TOWN_PRICE_RUMOR_MAX);
        const cell = {
          kind: "town",
          id: cellId(x, y),
          name,
          offers,
          prices: { foodGold, troopsGold, companionHireGold, rumorGold },
          bundles: { food: TOWN_FOOD_BUNDLE, troops: TOWN_TROOPS_BUNDLE }
        };
        townIndex++;
        return cell;
      }
    });
    return { rngState };
  };
  function townOfferSlot(s, slot) {
    const town = getCellAt(s.world, s.player.position);
    const offer = offersToGridLayout(town.offers)[slot];
    return offer ? offerGridCell(TOWN_OFFERS, offer)(s) : null;
  }
  var { provider: townRightGrid, illustrationFor: townIllustration } = makeRightGrid({
    leaveAction: { type: ACTION_TOWN_LEAVE },
    illustrationSpriteId: SPRITES.centers.marketStall,
    top: (s) => townOfferSlot(s, "top"),
    left: (s) => townOfferSlot(s, "left"),
    bottom: (s) => townOfferSlot(s, "bottom")
  });
  var townMechanic = {
    id: "town",
    kinds: ["town"],
    mapLabel: "T",
    onEnterTile: onEnterTown,
    poiSignpost: {
      rank: 30,
      name: (cell) => `${cell.name || "A Town"} Town`
    },
    placeWorld: placeNamedTowns,
    encounter: {
      kind: "town",
      reduceAction: reduceTownAction,
      previewEncounter: previewEncounterProvider("town"),
      rightGrid: townRightGrid,
      illustrationSpriteId: townIllustration
    }
  };

  // src/core/mechanics/defs/woods.ts
  var woodsPolicy = {
    ambushPercent: WOODS_AMBUSH_PERCENT,
    lostPercent: WOODS_LOST_PERCENT,
    scoutLostHalves: true
  };
  function goblinVictoryReward(resources, rngState, enc) {
    const r = RNG.createStreamRandom(rngState);
    const gold = r.intExclusive(GOBLIN_GOLD_MAX + 1);
    const foodBase = Math.round(GOBLIN_FOOD_FACTOR * enc.initialSpawn);
    const food = Math.max(0, foodBase + r.intInRange(-GOBLIN_FOOD_NOISE, GOBLIN_FOOD_NOISE));
    const next = {
      ...resources,
      gold: resources.gold + gold,
      food: resources.food + food
    };
    return { resources: next, rngState: r.rngState };
  }
  var goblinCombatVariant = {
    illustrationSpriteId: SPRITES.enemies.goblin,
    encounterLines: GOBLIN_ENCOUNTER_LINES,
    victoryLines: GOBLIN_VICTORY_LINES,
    fleeLines: GOBLIN_FLEE_LINES,
    playerRollBonus: 6,
    enemyRollBonus: 3,
    payment: {
      computeCost: () => 0,
      isEligible: () => "unrecruitable",
      successLines: [],
      failLines: { unrecruitable: GOBLIN_NOT_RECRUITABLE_LINES },
      onSuccess: (resources) => resources
    },
    victoryReward: goblinVictoryReward
  };
  var onEnterWoods = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "woods") return {};
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind("woods"));
    const { tileMessage: restoreMessage, resolved } = resolveTerrainMove({
      moveEventSource: "woods",
      policy: woodsPolicy,
      world,
      pos,
      stepCount,
      resources,
      hasScout: resources.party.includes("scout"),
      tileMessage
    });
    return tileEnterFromTerrainMove(
      resolved,
      () => startCombatEncounter({
        world,
        pos,
        playerArmySize: resources.armySize,
        spawnEnemy: rolledEnemySpawn(resources.armySize),
        encounterMessage: tileRand.perMoveLine(goblinCombatVariant.encounterLines),
        restoreMessage
      })
    );
  };
  var woodsMechanic = {
    id: "woods",
    kinds: ["woods"],
    moveEventPolicyByKind: { woods: woodsPolicy },
    onEnterTile: onEnterWoods,
    combatVariantByKind: { woods: goblinCombatVariant }
  };

  // src/core/mechanics/defs/swamp.ts
  var swampPolicy = {
    ambushPercent: 0,
    lostPercent: SWAMP_LOST_PERCENT,
    scoutLostHalves: true
  };
  var SWAMP_QUIET_FIND = {
    findPercent: SWAMP_FIND_PERCENT,
    lines: SWAMP_FIND_LINES,
    foodBase: SWAMP_FIND_FOOD_BASE,
    goldBase: SWAMP_FIND_GOLD_BASE,
    amountNoise: TERRAIN_FIND_AMOUNT_NOISE,
    rollSalt: "swamp.find.roll",
    foodSalt: "swamp.find.food",
    goldSalt: "swamp.find.gold"
  };
  var onEnterSwamp = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "swamp") return {};
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    const tileMessage = tileRand.perMoveLine(terrainLoreLinesForKind("swamp"));
    const { resolved } = resolveTerrainMove({
      moveEventSource: "swamp",
      policy: swampPolicy,
      world,
      pos,
      stepCount,
      resources,
      hasScout: resources.party.includes("scout"),
      tileMessage,
      onQuiet: (ctx) => tryQuietFind(SWAMP_QUIET_FIND, ctx)
    });
    return tileEnterFromTerrainMove(resolved, () => ({}));
  };
  var swampMechanic = {
    id: "swamp",
    kinds: ["swamp"],
    enterFoodCostByKind: { swamp: FOOD_COST_SWAMP },
    moveEventPolicyByKind: { swamp: swampPolicy },
    onEnterTile: onEnterSwamp
  };

  // src/core/mechanics/defs/fishingLake.ts
  var onEnterFishingLake = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "fishingLake") return {};
    const lake = getCellAt(world, pos);
    if (!lake || lake.kind !== "fishingLake") return {};
    if (stepCount < lake.nextReadyStep) {
      const r2 = RNG.createTileRandom({ world, stepCount, pos });
      return {
        message: r2.perMoveLine(FISHING_LAKE_COOLDOWN_LINES, { cellId: lake.id })
      };
    }
    const sr = RNG.createStreamRandom(world.rngState);
    const gain = sr.intExclusive(3) + 1;
    const r = RNG.createTileRandom({ world, stepCount, pos });
    const line = r.perMoveLine(FISHING_LAKE_READY_LINES, { cellId: lake.id });
    const nextLake = { ...lake, nextReadyStep: stepCount + FISHING_LAKE_COOLDOWN_MOVES };
    const nextWorld = setCellAt({ ...world, rngState: sr.rngState }, pos, nextLake);
    return {
      world: nextWorld,
      resources: {
        ...resources,
        food: resources.food + gain
      },
      message: line
    };
  };
  var placeFishingLakes = ({ cells, rngState, seed }) => {
    placeFeatureFromSeed(cells, seed, "place.fishingLake", {
      count: FISHING_LAKE_COUNT,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y }) => ({ kind: "fishingLake", id: cellId(x, y), nextReadyStep: 0 })
    });
    return { rngState };
  };
  var fishingLakeMechanic = {
    id: "fishingLake",
    kinds: ["fishingLake"],
    onEnterTile: onEnterFishingLake,
    placeWorld: placeFishingLakes
  };

  // src/core/mechanics/defs/rainbowEnd.ts
  var onEnterRainbowEnd = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "rainbowEnd") return {};
    const rainbowEndCell = getCellAt(world, pos);
    if (!rainbowEndCell || rainbowEndCell.kind !== "rainbowEnd") return {};
    const tileRand = RNG.createTileRandom({ world, stepCount, pos });
    if (rainbowEndCell.hasPaidOut) {
      return { message: tileRand.perMoveLine(RAINBOW_END_SPENT_LINES, { cellId: rainbowEndCell.id }) };
    }
    const nextCell = { ...rainbowEndCell, hasPaidOut: true };
    const nextWorld = setCellAt(world, pos, nextCell);
    return {
      world: nextWorld,
      resources: { ...resources, gold: resources.gold + RAINBOW_END_GOLD_PAYOUT },
      message: tileRand.perMoveLine(RAINBOW_END_PAYOUT_LINES, { cellId: rainbowEndCell.id })
    };
  };
  var placeRainbowEnds = ({ cells, rngState, seed }) => {
    let stream = RNG.createStreamRandomFromSeed(seed, "place.rainbowEnd");
    const first = placeFeature(cells, stream.rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      buildCell: ({ x, y }) => ({ kind: "rainbowEnd", id: cellId(x, y), hasPaidOut: false })
    });
    stream = RNG.createStreamRandom(first.rngState);
    placeFeature(cells, stream.rngState, {
      count: 1,
      canPlaceAt: (_x, _y, here) => isTerrainCell(here),
      awayFrom: { pos: first.placed[0], minDistance: RAINBOW_END_MIN_DISTANCE },
      buildCell: ({ x, y }) => ({ kind: "rainbowEnd", id: cellId(x, y), hasPaidOut: false })
    });
    return { rngState };
  };
  var rainbowEndMechanic = {
    id: "rainbowEnd",
    kinds: ["rainbowEnd"],
    mapLabel: "R",
    onEnterTile: onEnterRainbowEnd,
    placeWorld: placeRainbowEnds
  };

  // src/core/mechanics/defs/wyrm.ts
  var wyrmCombatVariant = {
    illustrationSpriteId: SPRITES.enemies.wyrm,
    encounterLines: WYRM_ENCOUNTER_LINES,
    victoryLines: WYRM_VICTORY_LINES,
    fleeLines: WYRM_FLEE_LINES,
    playerRollBonus: 5,
    enemyRollBonus: 5,
    payment: {
      computeCost: () => WYRM_PAY_GOLD_COST,
      isEligible: (_enc, resources) => resources.gold < WYRM_PAY_GOLD_COST ? "noFunds" : "ok",
      successLines: WYRM_PAYOFF_LINES,
      failLines: { noFunds: WYRM_NO_GOLD_LINES },
      onSuccess: (resources) => {
        if (resources.inventory.includes("bloodVial")) return resources;
        return { ...resources, inventory: [...resources.inventory, "bloodVial"] };
      }
    },
    victoryReward: (resources, rngState) => {
      if (resources.inventory.includes("bloodVial")) return { resources, rngState };
      return {
        resources: { ...resources, inventory: [...resources.inventory, "bloodVial"] },
        rngState
      };
    }
  };
  var onEnterWyrm = ({ cell, world, pos, stepCount, resources }) => {
    if (cell.kind !== "lair") return {};
    const lair = getCellAt(world, pos);
    if (lair.kind !== "lair") return {};
    const r = RNG.createTileRandom({ world, stepCount, pos });
    if (lair.isBled) {
      const line = r.perMoveLine(WYRM_BLED_LINES, { cellId: lair.id });
      return { message: loreMessage(LAIR_NAME, line) };
    }
    const tileMessage = loreMessage(LAIR_NAME, r.perMoveLine(WYRM_ENCOUNTER_LINES, { cellId: lair.id }));
    return startCombatEncounter({
      world,
      pos,
      playerArmySize: resources.armySize,
      spawnEnemy: fixedEnemySpawn(WYRM_INITIAL_HEALTH),
      encounterMessage: tileMessage,
      restoreMessage: tileMessage
    });
  };
  var placeWyrm = ({ cells, rngState, seed }) => {
    placeFeatureFromSeed(cells, seed, "place.wyrm", {
      count: 1,
      canPlaceAt: (_x, _y, here) => here.kind === "mountain",
      buildCell: ({ x, y }) => ({ kind: "lair", id: cellId(x, y), isBled: false })
    });
    return { rngState };
  };
  function onWyrmCombatClosed(state2, outcome, encounter) {
    if (outcome === "flee") return state2;
    const pos = posForCellId(state2.world, encounter.sourceCellId);
    const cell = getCellAt(state2.world, pos);
    if (cell.kind !== "lair") return state2;
    if (cell.isBled) return state2;
    const next = { ...cell, isBled: true };
    return { ...state2, world: setCellAt(state2.world, pos, next) };
  }
  var wyrmMechanic = {
    id: "wyrm",
    kinds: ["lair"],
    mapLabel: "W",
    onEnterTile: onEnterWyrm,
    poiSignpost: {
      rank: 15,
      name: () => LAIR_NAME
    },
    placeWorld: placeWyrm,
    combatVariantByKind: { lair: wyrmCombatVariant },
    onCombatClosed: onWyrmCombatClosed
  };

  // src/core/mechanics/index.ts
  var MECHANICS = [
    wyrmMechanic,
    locksmithMechanic,
    gateMechanic,
    farmMechanic,
    campMechanic,
    townMechanic,
    hengeMechanic,
    signpostMechanic,
    fishingLakeMechanic,
    rainbowEndMechanic,
    woodsMechanic,
    swampMechanic,
    mountainMechanic,
    combatMechanic
  ];
  var MECHANIC_INDEX = buildMechanicIndex(MECHANICS);

  // src/core/world.ts
  function boxBlurIntGridWrap(grid, w, h) {
    const out = [];
    for (let y = 0; y < h; y++) {
      const row = [];
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = wrapIndex(x + dx, w);
            const ny = wrapIndex(y + dy, h);
            sum += grid[ny][nx];
          }
        }
        row.push(Math.floor(sum / 9));
      }
      out.push(row);
    }
    return out;
  }
  function generateBaseTerrainCells(seed) {
    const vals = [];
    const rng = RNG.createStreamRandomFromSeed(seed, "place.terrain");
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        row.push(rng.intExclusive(NOISE_VALUE_MAX));
      }
      vals.push(row);
    }
    let V = vals;
    for (let p = 0; p < NOISE_SMOOTH_PASSES; p++) {
      V = boxBlurIntGridWrap(V, WORLD_WIDTH, WORLD_HEIGHT);
    }
    let minV = V[0][0];
    let maxV = V[0][0];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const v = V[y][x];
        if (v < minV) minV = v;
        if (v > maxV) maxV = v;
      }
    }
    const span = maxV - minV || 1;
    const kindByBucket = TERRAIN_KINDS;
    const bucketCount = kindByBucket.length;
    const cells = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      const row = [];
      for (let x = 0; x < WORLD_WIDTH; x++) {
        let bucket = Math.floor(bucketCount * (V[y][x] - minV) / span);
        if (bucket < 0) bucket = 0;
        if (bucket >= bucketCount) bucket = bucketCount - 1;
        row.push({ kind: kindByBucket[bucket] });
      }
      cells.push(row);
    }
    return cells;
  }
  function pickStart(seed) {
    const rng = RNG.createStreamRandomFromSeed(seed, "place.start");
    const v = rng.intExclusive(WORLD_WIDTH * WORLD_HEIGHT);
    const x = v % WORLD_WIDTH;
    const y = Math.floor(v / WORLD_WIDTH);
    return { startPosition: { x, y }, rngState: rng.rngState };
  }
  function generateWorld(seed) {
    const cells = generateBaseTerrainCells(seed);
    let rngState = 0;
    for (let i = 0; i < MECHANICS.length; i++) {
      const m = MECHANICS[i];
      if (!m.placeWorld) continue;
      rngState = m.placeWorld({ cells, rngState, seed }).rngState;
    }
    const startPick = pickStart(seed);
    rngState = startPick.rngState;
    const world = {
      seed,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
      mapGenAlgorithm: MAP_GEN_ALGORITHM,
      cells,
      rngState
    };
    return { world, startPosition: startPick.startPosition };
  }

  // src/core/types.ts
  var LEFT_PANEL_KIND_AUTO = "auto";
  var LEFT_PANEL_KIND_SPRITE = "sprite";
  var LEFT_PANEL_KIND_MINIMAP = "minimap";
  var LEFT_PANEL_KIND_MAP = "map";

  // src/core/gameMap.ts
  function updateRunPathMemoryAfterMove(args) {
    const prevPath = args.prevPath ?? [];
    let path = prevPath.concat([{ pos: args.nextPos, isMapped: false }]);
    let lostBufferStartIndex = args.prevLostBufferStartIndex ?? null;
    if (args.teleported) {
      lostBufferStartIndex = path.length - 1;
    }
    if (!args.nextKnowsPosition && lostBufferStartIndex == null) {
      lostBufferStartIndex = path.length - 1;
    }
    if (args.nextKnowsPosition) {
      if (lostBufferStartIndex != null) {
        const start = Math.max(0, Math.min(lostBufferStartIndex, path.length - 1));
        const mapped = path.slice();
        for (let i = start; i < mapped.length; i++) {
          const step = mapped[i];
          if (step.isMapped) continue;
          mapped[i] = { pos: step.pos, isMapped: true };
        }
        path = mapped;
        lostBufferStartIndex = null;
      } else {
        const idx = path.length - 1;
        const step = path[idx];
        if (!step.isMapped) {
          const mapped = path.slice();
          mapped[idx] = { pos: step.pos, isMapped: true };
          path = mapped;
        }
      }
    }
    return { path, lostBufferStartIndex };
  }
  function computeGameMapView(s) {
    const { mapLabelByKind } = MECHANIC_INDEX;
    const showPlayer = !!s.run.knowsPosition;
    const markers = [];
    const seen = /* @__PURE__ */ new Set();
    function push(pos, label, isMapped) {
      const k = `${label}@${pos.x},${pos.y}`;
      if (seen.has(k)) return;
      seen.add(k);
      markers.push({ pos, label, isMapped });
    }
    const candidates = [];
    const path = s.run.path ?? [];
    if (s.run.knowsPosition) {
      if (s.resources.party.includes("scout")) {
        for (let y = 0; y < s.world.height; y++) {
          for (let x = 0; x < s.world.width; x++) {
            const kind = s.world.cells[y][x].kind;
            if (!SCOUT_GLOBAL_REVEAL_KINDS.includes(kind)) continue;
            candidates.push({ pos: { x, y }, isMapped: true });
          }
        }
      }
      for (let i = 0; i < path.length; i++) {
        const step = path[i];
        if (!step.isMapped) continue;
        candidates.push({ pos: step.pos, isMapped: true });
      }
    } else {
      const start = s.run.lostBufferStartIndex ?? path.length;
      for (let i = Math.max(0, start); i < path.length; i++) {
        const step = path[i];
        candidates.push({ pos: step.pos, isMapped: step.isMapped });
      }
    }
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const kind = s.world.cells[c.pos.y][c.pos.x].kind;
      const label = mapLabelByKind[kind];
      if (!label) continue;
      push(c.pos, label, c.isMapped);
    }
    return { markers, showPlayer };
  }

  // src/core/reducer.ts
  var { onEnterTileByKind } = MECHANIC_INDEX;
  var { enterFoodCostByKind } = MECHANIC_INDEX;
  var { reduceEncounterActionByEncounterKind } = MECHANIC_INDEX;
  function tickClock(ui) {
    return {
      message: ui.message,
      leftPanel: ui.leftPanel,
      clock: { frame: ui.clock.frame + 1 },
      anim: ui.anim
    };
  }
  function pruneExpiredAnims(ui) {
    const frame = ui.clock.frame;
    const active = ui.anim.active;
    const kept = [];
    for (let i = 0; i < active.length; i++) {
      const a = active[i];
      const startFrame = a.startFrame;
      const durationFrames = a.durationFrames;
      const endFrame = startFrame + Math.max(0, durationFrames);
      if (frame < endFrame) kept.push(a);
    }
    if (kept.length === active.length) return ui;
    return {
      message: ui.message,
      leftPanel: ui.leftPanel,
      clock: ui.clock,
      anim: { nextId: ui.anim.nextId, active: kept }
    };
  }
  function hasBlockingAnim(ui) {
    const active = ui.anim.active;
    for (let i = 0; i < active.length; i++) {
      if (active[i].blocksInput) return true;
    }
    return false;
  }
  function clearSpriteFocusIfAny(ui) {
    if (ui.leftPanel.kind === LEFT_PANEL_KIND_SPRITE) return { kind: LEFT_PANEL_KIND_AUTO };
    return ui.leftPanel;
  }
  function initialMessageForStart() {
    return GOAL_NARRATIVE;
  }
  function reduceGoal(s) {
    const prevUi = s.ui;
    const prevLeftPanel = prevUi.leftPanel;
    const nextLeftPanel = prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? prevLeftPanel : { kind: LEFT_PANEL_KIND_SPRITE, spriteId: SPRITES.actions.goal };
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: GOAL_NARRATIVE,
        leftPanel: nextLeftPanel
      }
    };
  }
  function reduceToggleMinimap(s) {
    const prevUi = s.ui;
    const prevLeftPanel = prevUi.leftPanel;
    if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
      const nextMessage = prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message;
      return {
        world: s.world,
        player: s.player,
        run: s.run,
        resources: s.resources,
        encounter: s.encounter,
        ui: {
          clock: prevUi.clock,
          anim: prevUi.anim,
          message: nextMessage,
          leftPanel: { kind: LEFT_PANEL_KIND_MINIMAP }
        }
      };
    }
    const nextLeftPanel = prevLeftPanel.kind === LEFT_PANEL_KIND_MINIMAP ? { kind: LEFT_PANEL_KIND_AUTO } : { kind: LEFT_PANEL_KIND_MINIMAP };
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: prevUi.message,
        leftPanel: nextLeftPanel
      }
    };
  }
  function reduceToggleMap(s) {
    const prevUi = s.ui;
    const prevLeftPanel = prevUi.leftPanel;
    if (prevLeftPanel.kind === LEFT_PANEL_KIND_MAP) {
      const restoreMessage = prevUi.message === MAP_HINT_MESSAGE ? prevLeftPanel.restoreMessage : prevUi.message;
      return {
        world: s.world,
        player: s.player,
        run: s.run,
        resources: s.resources,
        encounter: s.encounter,
        ui: {
          clock: prevUi.clock,
          anim: prevUi.anim,
          message: restoreMessage,
          leftPanel: prevLeftPanel.restoreLeftPanel
        }
      };
    }
    return {
      world: s.world,
      player: s.player,
      run: s.run,
      resources: s.resources,
      encounter: s.encounter,
      ui: {
        clock: prevUi.clock,
        anim: prevUi.anim,
        message: MAP_HINT_MESSAGE,
        leftPanel: { kind: LEFT_PANEL_KIND_MAP, restoreLeftPanel: prevLeftPanel, restoreMessage: prevUi.message }
      }
    };
  }
  function reduceMove(prevState, dx, dy) {
    if (prevState.run.isGameOver || prevState.run.hasWon) return prevState;
    if (prevState.encounter) return prevState;
    const world = prevState.world;
    const prevPos = prevState.player.position;
    const nextPos = {
      x: (prevPos.x + dx + world.width) % world.width,
      y: (prevPos.y + dy + world.height) % world.height
    };
    const cell = world.cells[nextPos.y][nextPos.x];
    const nextStepCount = prevState.run.stepCount + 1;
    const prevRes = prevState.resources;
    const prevFood = prevRes.food;
    const cost = enterFoodCostByKind[cell.kind] ?? FOOD_COST_DEFAULT;
    const foodDeltas = [];
    const goldDeltas = [];
    const armyDeltas = [];
    let food;
    let armySize;
    if (prevFood >= cost) {
      food = prevFood - cost;
      foodDeltas.push(-cost);
      armySize = prevRes.armySize;
    } else {
      food = 0;
      if (prevFood > 0) foodDeltas.push(-prevFood);
      armySize = prevRes.armySize - 1;
      armyDeltas.push(-1);
    }
    const baseResources = { ...prevRes, food, armySize };
    const wouldGameOver = baseResources.armySize <= 0;
    const ctx = { cell, world, pos: nextPos, stepCount: nextStepCount, resources: baseResources };
    const outcome = wouldGameOver ? {} : (onEnterTileByKind[cell.kind] ?? onEnterDefaultTerrain)(ctx);
    const nextWorld = outcome.world ?? world;
    const nextResources = applyFoodCapOnGain(baseResources, outcome.resources ?? baseResources);
    const appliedFoodDelta = nextResources.food - baseResources.food;
    if (appliedFoodDelta) foodDeltas.push(appliedFoodDelta);
    const appliedGoldDelta = nextResources.gold - baseResources.gold;
    if (appliedGoldDelta) goldDeltas.push(appliedGoldDelta);
    const nextHasWon = prevState.run.hasWon || !!outcome.hasWon;
    const isGameOver = nextResources.armySize <= 0;
    const nextEncounter = outcome.encounter ?? null;
    const teleported = outcome.teleportTo != null;
    const landingPos = teleported ? outcome.teleportTo : nextPos;
    const finalKnowsPosition = teleported ? false : prevState.run.knowsPosition || !!outcome.knowsPosition;
    const message = isGameOver ? gameOverMessage(nextWorld.seed, nextStepCount) : outcome.message ?? onEnterDefaultTerrain(ctx).message;
    const prevUi = prevState.ui;
    const baseUi = {
      message,
      leftPanel: clearSpriteFocusIfAny(prevUi),
      clock: prevUi.clock,
      anim: prevUi.anim
    };
    const mem = updateRunPathMemoryAfterMove({
      prevPath: prevState.run.path,
      prevLostBufferStartIndex: prevState.run.lostBufferStartIndex,
      nextPos: landingPos,
      nextKnowsPosition: finalKnowsPosition,
      teleported
    });
    const baseState = {
      world: nextWorld,
      player: { position: landingPos },
      run: {
        ...prevState.run,
        stepCount: nextStepCount,
        hasWon: nextHasWon,
        isGameOver,
        knowsPosition: finalKnowsPosition,
        path: mem.path,
        lostBufferStartIndex: mem.lostBufferStartIndex
      },
      resources: nextResources,
      encounter: nextEncounter,
      ui: baseUi
    };
    if (!ENABLE_ANIMATIONS) return baseState;
    const moveDeltas = [];
    pushResourceDeltas(moveDeltas, "food", foodDeltas);
    pushResourceDeltas(moveDeltas, "gold", goldDeltas);
    pushResourceDeltas(moveDeltas, "army", armyDeltas);
    let next = applyDeltas(baseState, { message, deltas: moveDeltas });
    const slideStart = next.ui.clock.frame;
    if (outcome.enterAnims && outcome.enterAnims.length) {
      next = { ...next, ui: applyEnterAnims(next.ui, outcome.enterAnims, slideStart + MOVE_SLIDE_FRAMES) };
    }
    if (teleported) {
      next = { ...next, ui: enqueueGridTransition(next.ui, { startFrame: slideStart, from: "blank", to: "overworld" }) };
    } else {
      next = {
        ...next,
        ui: enqueueAnim(next.ui, {
          kind: "moveSlide",
          startFrame: slideStart,
          durationFrames: MOVE_SLIDE_FRAMES,
          blocksInput: true,
          params: { fromPos: { x: prevPos.x, y: prevPos.y }, toPos: { x: nextPos.x, y: nextPos.y }, dx, dy }
        })
      };
    }
    return next;
  }
  function reduceRestart(s) {
    const next = processAction(null, { type: ACTION_NEW_RUN, seed: s.world.seed + 1 });
    return next || s;
  }
  function processAction(prevState, action) {
    if (prevState == null) {
      if (action.type !== ACTION_NEW_RUN) return null;
    }
    if (action.type === ACTION_NEW_RUN) {
      const seed = Math.trunc(action.seed);
      const generated = generateWorld(seed);
      const world = generated.world;
      const playerPos = generated.startPosition;
      const hasWon = false;
      const baseUi = {
        message: initialMessageForStart(),
        leftPanel: { kind: LEFT_PANEL_KIND_AUTO },
        clock: { frame: 0 },
        anim: { nextId: 1, active: [] }
      };
      const ui = ENABLE_ANIMATIONS ? enqueueGridTransition(baseUi, { startFrame: 0, from: "blank", to: "overworld" }) : baseUi;
      return {
        world,
        player: { position: { x: playerPos.x, y: playerPos.y } },
        run: {
          stepCount: 0,
          hasWon,
          isGameOver: false,
          knowsPosition: false,
          path: [],
          lostBufferStartIndex: null,
          copyCursors: {}
        },
        resources: {
          food: INITIAL_FOOD,
          gold: INITIAL_GOLD,
          armySize: INITIAL_ARMY_SIZE,
          inventory: [],
          party: []
        },
        encounter: null,
        ui
      };
    }
    if (prevState == null) return null;
    if (action.type === ACTION_TICK) return reduceTick(prevState);
    if (action.type === ACTION_RESTART) return reduceRestart(prevState);
    if (action.type === ACTION_SHOW_GOAL) return reduceGoal(prevState);
    if (action.type === ACTION_TOGGLE_MINIMAP) return reduceToggleMinimap(prevState);
    if (action.type === ACTION_TOGGLE_MAP) return reduceToggleMap(prevState);
    if (prevState.encounter && !prevState.run.isGameOver && !prevState.run.hasWon) {
      const handler = reduceEncounterActionByEncounterKind[prevState.encounter.kind];
      if (handler) {
        const next = handler(prevState, action);
        if (next != null) return applyArmyZeroGameOver(next);
      }
    }
    if (action.type === ACTION_MOVE) return reduceMove(prevState, action.dx, action.dy);
    return prevState;
  }
  function reduceTick(prevState) {
    const tickedUi = ENABLE_ANIMATIONS ? pruneExpiredAnims(tickClock(prevState.ui)) : prevState.ui;
    return { ...prevState, ui: tickedUi };
  }

  // src/core/rightGrid.ts
  var { rightGridByEncounterKind } = MECHANIC_INDEX;
  function encounterIllustrationSpriteId(s) {
    const enc = s.encounter;
    if (!enc) return null;
    return MECHANIC_INDEX.illustrationByEncounterKind[enc.kind]?.(s) ?? null;
  }
  function getRightGridCellDef(s, row, col) {
    if (row === 0 && col === 0) return { spriteId: SPRITES.actions.goal, action: { type: ACTION_SHOW_GOAL } };
    if (row === 2 && col === 0) return { spriteId: SPRITES.actions.minimap, action: { type: ACTION_TOGGLE_MINIMAP } };
    if (row === 2 && col === 2) return { spriteId: SPRITES.actions.restart, action: { type: ACTION_RESTART } };
    if (row === 0 && col === 2) {
      return { spriteId: SPRITES.actions.map, action: { type: ACTION_TOGGLE_MAP } };
    }
    const isRunOver = !!(s.run.isGameOver || s.run.hasWon);
    if (s.encounter) {
      const p = rightGridByEncounterKind[s.encounter.kind];
      return p ? p(s, row, col) : { action: null };
    }
    if (row === 0 && col === 1) return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: -1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: -1 } };
    if (row === 1 && col === 0) return { tilePreview: { kind: "relativeToPlayer", dx: -1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: -1, dy: 0 } };
    if (row === 1 && col === 1) return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: 0 }, action: null };
    if (row === 1 && col === 2) return { tilePreview: { kind: "relativeToPlayer", dx: 1, dy: 0 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 1, dy: 0 } };
    if (row === 2 && col === 1) return { tilePreview: { kind: "relativeToPlayer", dx: 0, dy: 1 }, action: isRunOver ? null : { type: ACTION_MOVE, dx: 0, dy: 1 } };
    return { action: null };
  }

  // src/platform/tic80/layout.ts
  var SCREEN_HEIGHT = 136;
  var PANEL_LEFT_WIDTH = 128;
  var PANEL_RIGHT_WIDTH = 112;
  var RIGHT_PANEL_X = PANEL_LEFT_WIDTH;
  var GRID_COLS = 3;
  var GRID_ROWS = 3;
  var CELL_SIZE_PX = 24;
  var CELL_GAP_PX = 4;
  var GRID_WIDTH_PX = GRID_COLS * CELL_SIZE_PX + (GRID_COLS - 1) * CELL_GAP_PX;
  var GRID_HEIGHT_PX = GRID_ROWS * CELL_SIZE_PX + (GRID_ROWS - 1) * CELL_GAP_PX;
  var GRID_ORIGIN_X = RIGHT_PANEL_X + Math.floor((PANEL_RIGHT_WIDTH - GRID_WIDTH_PX) / 2);
  var PANEL_FRAME_TILE_PX = 8;
  var RIGHT_PANEL_TOP_BAND_H = 8;
  var RIGHT_PANEL_BOTTOM_BAND_H = 16;
  var RIGHT_PANEL_BAND_BLEED_PX = 2;
  var RIGHT_PANEL_TOP_BAND_Y = PANEL_FRAME_TILE_PX - RIGHT_PANEL_BAND_BLEED_PX;
  var RIGHT_PANEL_TOP_DIVIDER_Y = PANEL_FRAME_TILE_PX + RIGHT_PANEL_TOP_BAND_H;
  var RIGHT_PANEL_BOTTOM_BAND_Y = SCREEN_HEIGHT - PANEL_FRAME_TILE_PX - RIGHT_PANEL_BOTTOM_BAND_H + RIGHT_PANEL_BAND_BLEED_PX;
  var RIGHT_PANEL_BOTTOM_DIVIDER_Y = SCREEN_HEIGHT - PANEL_FRAME_TILE_PX - RIGHT_PANEL_BOTTOM_BAND_H - 1;
  var gridAvailTop = RIGHT_PANEL_TOP_DIVIDER_Y + 1;
  var gridAvailH = RIGHT_PANEL_BOTTOM_DIVIDER_Y - gridAvailTop;
  var GRID_ORIGIN_Y = gridAvailTop + Math.floor((gridAvailH - GRID_HEIGHT_PX) / 2);
  var RIGHT_PANEL_INNER_X = RIGHT_PANEL_X + PANEL_FRAME_TILE_PX;
  var RIGHT_PANEL_INNER_W = PANEL_RIGHT_WIDTH - PANEL_FRAME_TILE_PX * 2;
  var LEFT_PANEL_INNER_X = PANEL_FRAME_TILE_PX;
  var LEFT_PANEL_INNER_W = PANEL_LEFT_WIDTH - PANEL_FRAME_TILE_PX * 2;
  function hitTestGridCell(mouseX, mouseY) {
    if (mouseX < GRID_ORIGIN_X) return null;
    if (mouseX >= GRID_ORIGIN_X + GRID_WIDTH_PX) return null;
    if (mouseY < GRID_ORIGIN_Y) return null;
    if (mouseY >= GRID_ORIGIN_Y + GRID_HEIGHT_PX) return null;
    const relX = mouseX - GRID_ORIGIN_X;
    const relY = mouseY - GRID_ORIGIN_Y;
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    const col = Math.floor(relX / pitch);
    const row = Math.floor(relY / pitch);
    const inCellX = relX - col * pitch;
    const inCellY = relY - row * pitch;
    if (inCellX >= CELL_SIZE_PX) return null;
    if (inCellY >= CELL_SIZE_PX) return null;
    return { row, col };
  }

  // src/platform/tic80/input.ts
  function sampleMouse() {
    const m = mouse();
    const out = { mouseX: m[0], mouseY: m[1], mouseLeftDown: !!m[2] };
    return out;
  }
  function deriveRenderHints(state2, mouseX, mouseY) {
    const cell = hitTestGridCell(mouseX, mouseY);
    if (!cell) return { rightGridHoverCell: null };
    const def = getRightGridCellDef(state2, cell.row, cell.col);
    if (!def.action) return { rightGridHoverCell: null };
    return { rightGridHoverCell: cell };
  }
  function actionForClick(state2, mouseX, mouseY) {
    const cell = hitTestGridCell(mouseX, mouseY);
    if (!cell) return null;
    const { row, col } = cell;
    const def = getRightGridCellDef(state2, row, col);
    const a = def.action;
    return a || null;
  }

  // src/platform/tic80/uiConstants.ts
  var UI_COLOR_BG = 0;
  var UI_COLOR_TEXT = 12;
  var UI_COLOR_DIM = 15;
  var UI_COLOR_GOOD = 5;
  var UI_COLOR_WARN = 4;
  var UI_COLOR_BAD = 2;
  var UI_COLOR_POI_NAME = 11;
  var UI_COLOR_POI_DESC = 13;
  var UI_COLOR_GRID_HOVER_TINT = 15;
  var UI_COLOR_RIGHT_STATS_TEXT = UI_COLOR_POI_DESC;
  var UI_COLOR_GRID_CELL_BORDER = 14;
  var UI_COLOR_GRID_CELL_BORDER_META = 15;
  var UI_GRID_CELL_BORDER_DOUBLE_INSET = 2;
  var UI_COLOR_RIGHT_PANEL_DIVIDER = 15;
  var UI_STATS_BAND_ITEM_GAP_PX = 3;
  var UI_STATS_BAND_ICON_VALUE_GAP_PX = 2;
  var UI_HELD_BAND_ICON_GAP_PX = 2;
  var UI_ILLUSTRATION_SCALE = 4;
  var UI_TEXTURE_TILE_PX = 8;
  var UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR = 8;
  var UI_MAP_VIEWPORT_CELLS = 9;
  var UI_MAP_CELL_PITCH_PX = 6;
  var UI_MAP_POI_TEXT_COLOR = 13;
  var UI_MAP_POI_UNCOMMITTED_TEXT_COLOR = UI_COLOR_BG;
  var UI_MAP_POI_TEXT_OFFSET_X_PX = 1;
  var UI_RIGHT_GRID_SPRITE_SCALE = 1;
  var UI_RIGHT_GRID_SPRITE_W = 2;
  var UI_RIGHT_GRID_SPRITE_H = 2;
  var UI_RIGHT_GRID_COLORKEY = 0;
  var UI_BADGE_HEIGHT_PX = 7;
  var UI_BADGE_PAD_X = 2;
  var UI_BADGE_PAD_RIGHT = 1;
  var UI_BADGE_PAD_Y = 1;
  var UI_BADGE_OFFSET_X = 1;
  var UI_BADGE_OFFSET_Y = 4;
  var UI_BADGE_PILL_CAP_PX = 4;
  var UI_BADGE_PILL_SHEET_W_PX = 8;
  var UI_BADGE_PILL_COLORKEY = 0;
  var UI_BADGE_MINUS_WIDTH_PX = 4;
  var UI_BADGE_DIGIT1_WIDTH_PX = 5;
  var UI_BADGE_DIGIT_WIDTH_PX = 6;
  var UI_LEFT_PANEL_PADDING = 8;
  var UI_LORE_PADDING_X = 9;
  var UI_LEFT_PANEL_INNER_GAP = 12;
  var UI_LEFT_PANEL_LORE_TOP_GAP = 7;
  var UI_COLOR_LEFT_PANEL_DIVIDER = 15;
  var UI_LEFT_PANEL_DIVIDER_GAP_PX = 5;
  var UI_LEFT_PANEL_STATS_OPTICAL_LIFT_PX = 3;
  var UI_STATUS_ICON_SIZE = 8;
  var UI_HERO_RESOURCE_GAP_PX = 2;
  var UI_AFTER_RESOURCES_GAP_PX = 2;
  var UI_ARMY_ICON_W_PX = 16;
  var UI_ARMY_ICON_H_PX = 16;
  var UI_ARMY_VALUE_OFFSET_X = UI_ARMY_ICON_W_PX + 3;
  var UI_ARMY_VALUE_OFFSET_Y = 5;
  var UI_DELTA_OFFSET_X = 2;
  var UI_DELTA_OFFSET_Y = 2;
  var UI_DELTA_RISE_PX = 6;
  var UI_DELTA_GAP_PX = -4;
  var UI_FOOD_ICON_W_PX = 16;
  var UI_FOOD_ICON_H_PX = 16;
  var UI_ICON_VALUE_OFFSET_X = UI_FOOD_ICON_W_PX + 3;
  var UI_ICON_VALUE_OFFSET_Y = 5;
  var UI_GOLD_ICON_W_PX = 16;
  var UI_GOLD_ICON_H_PX = 16;
  var UI_GOLD_VALUE_OFFSET_X = UI_GOLD_ICON_W_PX + 3;
  var UI_GOLD_VALUE_OFFSET_Y = 5;
  var UI_SMALL_STATS_START_OFFSET_Y = UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX + UI_FOOD_ICON_H_PX + UI_AFTER_RESOURCES_GAP_PX;

  // src/platform/tic80/nineSlice.ts
  function int(n) {
    return Math.floor(n);
  }
  function clampInt(n, min) {
    return Math.max(min, int(n));
  }
  function withClip(x, y, w, h, draw) {
    clip(x, y, w, h);
    draw();
    clip();
  }
  function drawTiledHoriz(spriteId, x, y, w, stepPx, colorkey, scale) {
    for (let dx = 0; dx < w; dx += stepPx) spr(spriteId, x + dx, y, colorkey, scale);
  }
  function drawTiledVert(spriteId, x, y, h, stepPx, colorkey, scale) {
    for (let dy = 0; dy < h; dy += stepPx) spr(spriteId, x, y + dy, colorkey, scale);
  }
  function drawNineSliceFrame(x, y, w, h, topLeftSpriteId, opts = {}) {
    const tilePx = clampInt(opts.tilePx ?? 8, 1);
    const scale = clampInt(opts.scale ?? 1, 1);
    const colorkey = opts.colorkey ?? 0;
    const wPx = int(w);
    const hPx = int(h);
    if (wPx <= 0) return;
    if (hPx <= 0) return;
    const tileScreenPx = tilePx * scale;
    if (wPx < tileScreenPx * 2 || hPx < tileScreenPx * 2) {
      const c = opts.fallbackBorderColor;
      if (c != null) rectb(x, y, wPx, hPx, c);
      return;
    }
    const x0 = int(x);
    const y0 = int(y);
    const x1 = x0 + wPx - tileScreenPx;
    const y1 = y0 + hPx - tileScreenPx;
    const innerW = wPx - tileScreenPx * 2;
    const innerH = hPx - tileScreenPx * 2;
    const topRowStart = topLeftSpriteId;
    const midRowStart = topLeftSpriteId + 16;
    const botRowStart = topLeftSpriteId + 32;
    spr(topRowStart, x0, y0, colorkey, scale);
    spr(topRowStart + 2, x1, y0, colorkey, scale);
    spr(botRowStart, x0, y1, colorkey, scale);
    spr(botRowStart + 2, x1, y1, colorkey, scale);
    withClip(x0 + tileScreenPx, y0, innerW, tileScreenPx, () => {
      drawTiledHoriz(topRowStart + 1, x0 + tileScreenPx, y0, innerW, tileScreenPx, colorkey, scale);
    });
    withClip(x0 + tileScreenPx, y1, innerW, tileScreenPx, () => {
      drawTiledHoriz(botRowStart + 1, x0 + tileScreenPx, y1, innerW, tileScreenPx, colorkey, scale);
    });
    withClip(x0, y0 + tileScreenPx, tileScreenPx, innerH, () => {
      drawTiledVert(midRowStart, x0, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale);
    });
    withClip(x1, y0 + tileScreenPx, tileScreenPx, innerH, () => {
      drawTiledVert(midRowStart + 2, x1, y0 + tileScreenPx, innerH, tileScreenPx, colorkey, scale);
    });
  }

  // src/platform/tic80/rightGridRenderPlan.ts
  var GRID_CROSS_REVEAL_ORDER = [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 2, col: 1 },
    { row: 1, col: 2 }
  ];
  function gridCrossRevealPhaseIndex(row, col) {
    for (let i = 0; i < GRID_CROSS_REVEAL_ORDER.length; i++) {
      const cell = GRID_CROSS_REVEAL_ORDER[i];
      if (cell.row === row && cell.col === col) return i;
    }
    return -1;
  }
  function findGridTransitionAnim(s) {
    if (!ENABLE_ANIMATIONS) return null;
    const anims = s.ui.anim.active;
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (a.kind === "gridTransition") return a;
    }
    return null;
  }
  function transitionModeForCell(s, row, col) {
    const transition = findGridTransitionAnim(s);
    if (!transition) return null;
    const idx = gridCrossRevealPhaseIndex(row, col);
    if (idx < 0) return null;
    const frame = s.ui.clock.frame | 0;
    const start = transition.startFrame | 0;
    if (frame < start) return transition.params.from;
    const stepFrames = Math.max(1, GRID_TRANSITION_STEP_FRAMES | 0);
    const phase = Math.floor((frame - start) / stepFrames);
    return phase >= idx ? transition.params.to : transition.params.from;
  }
  function synthesizeStateForMode(s, mode) {
    if (mode === "overworld") return { ...s, encounter: null };
    if (s.encounter && s.encounter.kind === mode) return s;
    const provider = MECHANIC_INDEX.previewEncounterByEncounterKind[mode];
    return { ...s, encounter: provider ? provider() : null };
  }
  function viewFromDef(def, s) {
    if (def.tilePreview && def.tilePreview.kind === "relativeToPlayer") {
      const p = s.player.position;
      return {
        spriteId: getSpriteIdAt(s.world, p.x + def.tilePreview.dx, p.y + def.tilePreview.dy),
        category: "terrain"
      };
    }
    if (def.spriteId != null) return { spriteId: def.spriteId, category: "action" };
    return { spriteId: null, category: "empty" };
  }
  function badgeGlyphWidthPx(ch) {
    if (ch === "-") return UI_BADGE_MINUS_WIDTH_PX;
    if (ch === "1") return UI_BADGE_DIGIT1_WIDTH_PX;
    return UI_BADGE_DIGIT_WIDTH_PX;
  }
  function badgeTextWidthPx(text) {
    let w = 0;
    for (let i = 0; i < text.length; i++) {
      w += badgeGlyphWidthPx(text[i]);
    }
    return w;
  }
  function badgeTopLeftPx(row, col) {
    const o = cellOriginPx(row, col);
    return {
      x: o.x + UI_BADGE_OFFSET_X,
      y: o.y - UI_BADGE_HEIGHT_PX + UI_BADGE_OFFSET_Y
    };
  }
  function viewForCell(s, row, col) {
    if (isMetaCornerCell({ row, col })) {
      const def2 = getRightGridCellDef(s, row, col);
      return { spriteId: def2.spriteId ?? null, category: "meta" };
    }
    if (row === 1 && col === 1) {
      const def2 = getRightGridCellDef(s, row, col);
      const view2 = viewFromDef(def2, s);
      return { spriteId: view2.spriteId, category: "empty" };
    }
    const mode = transitionModeForCell(s, row, col);
    if (mode === "blank") return { spriteId: null, category: "empty" };
    const stateAt = mode != null ? synthesizeStateForMode(s, mode) : s;
    const def = getRightGridCellDef(stateAt, row, col);
    const view = viewFromDef(def, stateAt);
    const badge = def.badge;
    return badge ? { ...view, badge } : view;
  }
  function cellOriginPx(row, col) {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    return { x: GRID_ORIGIN_X + col * pitch, y: GRID_ORIGIN_Y + row * pitch };
  }
  function badgeTextAnchorPx(row, col) {
    const topLeft = badgeTopLeftPx(row, col);
    return {
      x: topLeft.x + UI_BADGE_PAD_X,
      y: topLeft.y + UI_BADGE_PAD_Y
    };
  }
  function spriteOriginInCellPx(row, col) {
    const spriteSize = 16 * UI_RIGHT_GRID_SPRITE_SCALE;
    const spriteOffset = Math.floor((CELL_SIZE_PX - spriteSize) / 2);
    const o = cellOriginPx(row, col);
    return { x: o.x + spriteOffset, y: o.y + spriteOffset };
  }
  function rectOp(x, y, w, h, color) {
    return { kind: "rect", x, y, w, h, color };
  }
  function rectbOp(x, y, w, h, color) {
    return { kind: "rectb", x, y, w, h, color };
  }
  function borderOpsForCell(row, col, category) {
    if (category === "empty") return [];
    const o = cellOriginPx(row, col);
    const size = CELL_SIZE_PX;
    if (category === "meta") {
      return [rectbOp(o.x, o.y, size, size, UI_COLOR_GRID_CELL_BORDER_META)];
    }
    if (category === "action") {
      return [rectbOp(o.x, o.y, size, size, UI_COLOR_GRID_CELL_BORDER)];
    }
    const inset = UI_GRID_CELL_BORDER_DOUBLE_INSET;
    const color = UI_COLOR_GRID_CELL_BORDER;
    return [
      rectbOp(o.x, o.y, size, size, color),
      rectbOp(o.x + inset, o.y + inset, size - inset * 2, size - inset * 2, color)
    ];
  }
  function badgeOpsForCell(row, col, badge) {
    const padLeft = UI_BADGE_PAD_X;
    const padRight = UI_BADGE_PAD_RIGHT;
    const padY = UI_BADGE_PAD_Y;
    const h = UI_BADGE_HEIGHT_PX;
    const textW = badgeTextWidthPx(badge.text);
    const w = textW + padLeft + padRight;
    const topLeft = badgeTopLeftPx(row, col);
    const spriteId = badge.variant === "price" ? SPRITES.ui.badgePrice : SPRITES.ui.badgeLeft;
    const fg = UI_COLOR_TEXT;
    return [
      {
        kind: "badgePill",
        spriteId,
        x: topLeft.x,
        y: topLeft.y,
        w,
        h,
        capPx: UI_BADGE_PILL_CAP_PX,
        sheetWidthPx: UI_BADGE_PILL_SHEET_W_PX,
        colorkey: UI_BADGE_PILL_COLORKEY
      },
      { kind: "print", x: topLeft.x + padLeft, y: topLeft.y + padY, text: badge.text, color: fg }
    ];
  }
  function actionCellOps(row, col, category, badge) {
    const ops = borderOpsForCell(row, col, category);
    if (badge && category === "action") ops.push(...badgeOpsForCell(row, col, badge));
    return ops;
  }
  function cellBorderOps(s) {
    const ops = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const view = viewForCell(s, row, col);
        ops.push(...actionCellOps(row, col, view.category, view.badge));
      }
    }
    return ops;
  }
  function sprOp(spriteId, x, y) {
    return {
      kind: "spr",
      spriteId,
      x,
      y,
      colorkey: UI_RIGHT_GRID_COLORKEY,
      scale: UI_RIGHT_GRID_SPRITE_SCALE,
      w: UI_RIGHT_GRID_SPRITE_W,
      h: UI_RIGHT_GRID_SPRITE_H,
      flip: 0,
      rotate: 0
    };
  }
  function drawHoverTintOps(cell) {
    const o = cellOriginPx(cell.row, cell.col);
    return [rectOp(o.x, o.y, CELL_SIZE_PX, CELL_SIZE_PX, UI_COLOR_GRID_HOVER_TINT)];
  }
  function findMoveSlideAnim(s) {
    if (!ENABLE_ANIMATIONS) return null;
    const anims = s.ui.anim.active;
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (a.kind === "moveSlide") return a;
    }
    return null;
  }
  function isMetaCornerCell(cell) {
    return cell.row === 0 && cell.col === 0 || // goal
    cell.row === 0 && cell.col === 2 || // map
    cell.row === 2 && cell.col === 0 || // minimap
    cell.row === 2 && cell.col === 2;
  }
  function rightPanelBoundsPx() {
    return {
      x: RIGHT_PANEL_X,
      y: 0,
      w: PANEL_RIGHT_WIDTH,
      h: SCREEN_HEIGHT
    };
  }
  function gridBoundsPx() {
    return {
      x: GRID_ORIGIN_X,
      y: GRID_ORIGIN_Y,
      w: GRID_WIDTH_PX,
      h: CELL_SIZE_PX * GRID_ROWS + CELL_GAP_PX * (GRID_ROWS - 1)
    };
  }
  function maskOutsideGridOps() {
    const panel = rightPanelBoundsPx();
    const grid = gridBoundsPx();
    const ops = [];
    if (grid.y > panel.y) ops.push(rectOp(panel.x, panel.y, panel.w, grid.y - panel.y, UI_COLOR_BG));
    const bottomY = grid.y + grid.h;
    const panelBottomY = panel.y + panel.h;
    if (panelBottomY > bottomY) ops.push(rectOp(panel.x, bottomY, panel.w, panelBottomY - bottomY, UI_COLOR_BG));
    if (grid.x > panel.x) ops.push(rectOp(panel.x, grid.y, grid.x - panel.x, grid.h, UI_COLOR_BG));
    const rightX = grid.x + grid.w;
    const panelRightX = panel.x + panel.w;
    if (panelRightX > rightX) ops.push(rectOp(rightX, grid.y, panelRightX - rightX, grid.h, UI_COLOR_BG));
    return ops;
  }
  function maskGridGapsOps() {
    const pitch = CELL_SIZE_PX + CELL_GAP_PX;
    const gx0 = GRID_ORIGIN_X + CELL_SIZE_PX;
    const gx1 = GRID_ORIGIN_X + pitch + CELL_SIZE_PX;
    const gy0 = GRID_ORIGIN_Y + CELL_SIZE_PX;
    const gy1 = GRID_ORIGIN_Y + pitch + CELL_SIZE_PX;
    const row0Y = GRID_ORIGIN_Y + 0 * pitch;
    const row2Y = GRID_ORIGIN_Y + 2 * pitch;
    const col0X = GRID_ORIGIN_X + 0 * pitch;
    const col2X = GRID_ORIGIN_X + 2 * pitch;
    return [
      // Vertical gap segments (4): only rows 0 and 2.
      rectOp(gx0, row0Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      rectOp(gx0, row2Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      rectOp(gx1, row0Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      rectOp(gx1, row2Y, CELL_GAP_PX, CELL_SIZE_PX, UI_COLOR_BG),
      // Horizontal gap segments (4): only cols 0 and 2.
      rectOp(col0X, gy0, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG),
      rectOp(col2X, gy0, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG),
      rectOp(col0X, gy1, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG),
      rectOp(col2X, gy1, CELL_SIZE_PX, CELL_GAP_PX, UI_COLOR_BG)
    ];
  }
  function buildStaticPlan(s, hover) {
    const ops = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (hover && hover.row === row && hover.col === col) ops.push(...drawHoverTintOps({ row, col }));
        const view = viewForCell(s, row, col);
        if (view.spriteId == null) continue;
        const o = spriteOriginInCellPx(row, col);
        ops.push(sprOp(view.spriteId, o.x, o.y));
      }
    }
    ops.push(...cellBorderOps(s));
    return { ops };
  }
  function buildMoveSlidePlan(s, anim, hover) {
    const frame = s.ui.clock.frame | 0;
    const startFrame = anim.startFrame | 0;
    const durationFrames = Math.max(1, anim.durationFrames | 0);
    const t = Math.max(0, Math.min(durationFrames, frame - startFrame));
    const pX = CELL_SIZE_PX + CELL_GAP_PX;
    const dx = anim.params.dx | 0;
    const dy = anim.params.dy | 0;
    const shiftX = -dx * pX;
    const shiftY = -dy * pX;
    const offX = Math.floor(shiftX * t / durationFrames);
    const offY = Math.floor(shiftY * t / durationFrames);
    const fromPos = anim.params.fromPos;
    const toPos = anim.params.toPos;
    const ops = [];
    const cross = [
      { row: 0, col: 1, ox: 0, oy: -1 },
      { row: 1, col: 0, ox: -1, oy: 0 },
      { row: 1, col: 1, ox: 0, oy: 0 },
      { row: 1, col: 2, ox: 1, oy: 0 },
      { row: 2, col: 1, ox: 0, oy: 1 }
    ];
    if (hover && !isMetaCornerCell(hover)) ops.push(...drawHoverTintOps(hover));
    for (let i = 0; i < cross.length; i++) {
      const c = cross[i];
      const spriteId = getSpriteIdAt(s.world, fromPos.x + c.ox, fromPos.y + c.oy);
      const o = spriteOriginInCellPx(c.row, c.col);
      ops.push(sprOp(spriteId, o.x + offX, o.y + offY));
    }
    for (let i = 0; i < cross.length; i++) {
      const c = cross[i];
      const spriteId = getSpriteIdAt(s.world, toPos.x + c.ox, toPos.y + c.oy);
      const o = spriteOriginInCellPx(c.row, c.col);
      ops.push(sprOp(spriteId, o.x + offX - shiftX, o.y + offY - shiftY));
    }
    ops.push(...maskOutsideGridOps(), ...maskGridGapsOps());
    const corners = [
      { row: 0, col: 0, spriteId: SPRITES.actions.goal },
      { row: 2, col: 0, spriteId: SPRITES.actions.minimap },
      { row: 2, col: 2, spriteId: SPRITES.actions.restart },
      { row: 0, col: 2, spriteId: SPRITES.actions.map }
    ];
    for (let i = 0; i < corners.length; i++) {
      const c = corners[i];
      const cellO = cellOriginPx(c.row, c.col);
      ops.push(rectOp(cellO.x, cellO.y, CELL_SIZE_PX, CELL_SIZE_PX, UI_COLOR_BG));
      if (hover && hover.row === c.row && hover.col === c.col) ops.push(...drawHoverTintOps({ row: c.row, col: c.col }));
      if (c.spriteId != null) {
        const o = spriteOriginInCellPx(c.row, c.col);
        ops.push(sprOp(c.spriteId, o.x, o.y));
      }
    }
    ops.push(...cellBorderOps(s));
    return { ops };
  }
  function buildRightGridRenderPlan(s, hints) {
    const hover = hints.rightGridHoverCell;
    const moveSlide = findMoveSlideAnim(s);
    if (!moveSlide) return buildStaticPlan(s, hover);
    return buildMoveSlidePlan(s, moveSlide, hover);
  }

  // src/platform/tic80/render.ts
  function renderFrame(s, hints) {
    cls(UI_COLOR_BG);
    drawRightPanel(s, hints);
    drawLeftPanel(s);
  }
  var FONT_CHAR_PX = 6;
  function formatA1(position) {
    const col = String.fromCharCode("A".charCodeAt(0) + position.x);
    const row = String(position.y + 1);
    return col + row;
  }
  function formatPositionLabel(s) {
    return s.run.knowsPosition ? formatA1(s.player.position) : LOST_COORD_LABEL;
  }
  function wrapText(text, maxChars) {
    const paragraphs = String(text || "").split("\n");
    const out = [];
    for (let p = 0; p < paragraphs.length; p++) {
      const words = String(paragraphs[p] || "").split(/\s+/).filter(Boolean);
      let line = "";
      for (const w of words) {
        const next = line ? `${line} ${w}` : w;
        if (next.length > maxChars && line) {
          out.push(line);
          line = w;
        } else {
          line = next;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }
  function loreLinesForMessage(message, maxChars) {
    const rawMessage = String(message || "");
    const firstNl = rawMessage.indexOf("\n");
    const title = firstNl >= 0 ? rawMessage.slice(0, firstNl) : "";
    const body = firstNl >= 0 ? rawMessage.slice(firstNl + 1) : rawMessage;
    const out = [];
    const titleLines = title ? wrapText(title, maxChars) : [];
    const bodyLines = body ? wrapText(body, maxChars) : [];
    for (let i = 0; i < titleLines.length; i++) out.push({ text: titleLines[i], color: UI_COLOR_POI_NAME });
    for (let i = 0; i < bodyLines.length; i++) out.push({ text: bodyLines[i], color: UI_COLOR_POI_DESC });
    return out;
  }
  function drawIllustrationWithTextureOverlay(spriteId, x, y) {
    spr(spriteId, x, y, -1, UI_ILLUSTRATION_SCALE, 0, 0, 2, 2);
    const illPx = 16 * UI_ILLUSTRATION_SCALE;
    for (let oy = 0; oy < illPx; oy += UI_TEXTURE_TILE_PX) {
      for (let ox = 0; ox < illPx; ox += UI_TEXTURE_TILE_PX) {
        spr(SPRITES.ui.previewGrain, x + ox, y + oy, UI_TEXTURE_OVERLAY_TRANSPARENT_COLOR, 1);
      }
    }
  }
  function deltaAnchorsFromGridSpecs(specs) {
    const anchors = {};
    for (const targetKey of Object.keys(specs)) {
      const spec = specs[targetKey];
      if (!spec) continue;
      const pt = badgeTextAnchorPx(spec.row, spec.col);
      const anchor = { x: pt.x, y: pt.y };
      if (spec.goodSign != null) anchor.goodSign = spec.goodSign;
      anchors[targetKey] = anchor;
    }
    return anchors;
  }
  function drawDeltaOverlays(s, anchors) {
    if (!ENABLE_ANIMATIONS) return;
    const anims = s.ui.anim.active;
    const frame = s.ui.clock.frame;
    const cursorByTarget = {};
    for (let i = 0; i < anims.length; i++) {
      const a = anims[i];
      if (a.kind !== "delta") continue;
      const anchor = anchors[a.params.target];
      if (!anchor) continue;
      const delta = a.params.delta;
      if (!delta) continue;
      const dur = Math.max(1, a.durationFrames);
      const t = Math.max(0, Math.min(dur, frame - a.startFrame));
      const p = t / dur;
      const label = delta > 0 ? `+${delta}` : `${delta}`;
      const goodSign = anchor.goodSign ?? 1;
      const color = delta * goodSign > 0 ? UI_COLOR_GOOD : UI_COLOR_BAD;
      const dy = UI_DELTA_OFFSET_Y - Math.floor(p * UI_DELTA_RISE_PX);
      const xCursor = cursorByTarget[a.params.target] ?? anchor.x + UI_DELTA_OFFSET_X;
      print(label, xCursor, anchor.y + dy, color);
      cursorByTarget[a.params.target] = xCursor + label.length * FONT_CHAR_PX + UI_DELTA_GAP_PX;
    }
  }
  function drawMap(s, x, y, sizePx) {
    const { markers } = computeGameMapView(s);
    const w = Math.max(1, s.world.width);
    const h = Math.max(1, s.world.height);
    const viewport = Math.max(1, UI_MAP_VIEWPORT_CELLS);
    const pitch = Math.max(1, UI_MAP_CELL_PITCH_PX);
    const radius = Math.floor(viewport / 2);
    const gridX = x + Math.floor((sizePx - pitch * viewport) / 2);
    const gridY = y + Math.floor((sizePx - pitch * viewport) / 2);
    const centerX = gridX + radius * pitch;
    const centerY = gridY + radius * pitch;
    const px = s.player.position.x;
    const py = s.player.position.y;
    for (let vy = -radius; vy <= radius; vy++) {
      for (let vx = -radius; vx <= radius; vx++) {
        spr(SPRITES.ui.mapBackground, centerX + vx * pitch, centerY + vy * pitch, 0);
      }
    }
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      const dx = torusDelta(px, m.pos.x, w);
      const dy = torusDelta(py, m.pos.y, h);
      if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue;
      const color = m.isMapped ? UI_MAP_POI_TEXT_COLOR : UI_MAP_POI_UNCOMMITTED_TEXT_COLOR;
      print(m.label, centerX + dx * pitch + UI_MAP_POI_TEXT_OFFSET_X_PX, centerY + dy * pitch, color);
    }
    spr(SPRITES.ui.mapHereMarker, centerX - 1, centerY - 1, 0);
  }
  function panelFrameTopLeftFor(s) {
    const inv = s.resources.inventory;
    if (inv.includes("bronzeKey")) return SPRITES.ui.panelBorderBronze;
    if (inv.includes("bloodVial")) return SPRITES.ui.panelBorderBlood;
    return SPRITES.ui.panelBorder;
  }
  function drawLeftPanel(s) {
    rect(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, UI_COLOR_BG);
    drawNineSliceFrame(0, 0, PANEL_LEFT_WIDTH, SCREEN_HEIGHT, panelFrameTopLeftFor(s), {
      fallbackBorderColor: UI_COLOR_DIM
    });
    const pos = s.player.position;
    const spriteIdAtPos = getSpriteIdAt(s.world, pos.x, pos.y);
    const leftPanel = s.ui.leftPanel;
    const illSize = 16 * UI_ILLUSTRATION_SCALE;
    const illX = UI_LEFT_PANEL_PADDING;
    const illY = UI_LEFT_PANEL_PADDING;
    if (leftPanel.kind === LEFT_PANEL_KIND_MINIMAP) {
      drawMinimap(s);
    } else if (leftPanel.kind === LEFT_PANEL_KIND_MAP) {
      drawMap(s, illX, illY, illSize);
    } else if (leftPanel.kind === LEFT_PANEL_KIND_SPRITE) {
      drawIllustrationWithTextureOverlay(leftPanel.spriteId, illX, illY);
    } else if (s.run.isGameOver) {
      drawIllustrationWithTextureOverlay(SPRITES.centers.tombstone, illX, illY);
    } else {
      const illSpriteId = encounterIllustrationSpriteId(s) ?? spriteIdAtPos;
      drawIllustrationWithTextureOverlay(illSpriteId, illX, illY);
    }
    const statusX = illX + illSize + UI_LEFT_PANEL_INNER_GAP;
    const fontH = 6;
    const messageLineH = fontH + 1;
    const headerBandBottomY = illY + illSize;
    const horizontalDividerY = headerBandBottomY + Math.floor((UI_LEFT_PANEL_LORE_TOP_GAP - 1) / 2);
    const statusBlockH = 3 * UI_ARMY_ICON_H_PX + 2 * UI_HERO_RESOURCE_GAP_PX;
    const statusCenteredY = illY + Math.ceil((horizontalDividerY - illY - statusBlockH) / 2);
    const statusY = Math.max(illY, statusCenteredY - UI_LEFT_PANEL_STATS_OPTICAL_LIFT_PX);
    const armyX = statusX;
    const armyY = statusY;
    spr(SPRITES.inventory.army, armyX, armyY, -1, 1, 0, 0, 2, 2);
    const armyValueX = armyX + UI_ARMY_VALUE_OFFSET_X;
    const armyValueY = armyY + UI_ARMY_VALUE_OFFSET_Y;
    const armyColor = s.resources.armySize < 6 ? UI_COLOR_WARN : UI_COLOR_TEXT;
    print(`${s.resources.armySize}`, armyValueX, armyValueY, armyColor);
    const foodX = statusX;
    const foodY = armyY + UI_ARMY_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX;
    spr(SPRITES.inventory.food, foodX, foodY, -1, 1, 0, 0, 2, 2);
    const foodValueX = foodX + UI_ICON_VALUE_OFFSET_X;
    const foodValueY = foodY + UI_ICON_VALUE_OFFSET_Y;
    const foodColor = s.resources.food < FOOD_WARNING_THRESHOLD ? UI_COLOR_WARN : UI_COLOR_TEXT;
    print(`${s.resources.food}`, foodValueX, foodValueY, foodColor);
    const goldX = statusX;
    const goldY = foodY + UI_FOOD_ICON_H_PX + UI_HERO_RESOURCE_GAP_PX;
    spr(SPRITES.inventory.gold, goldX, goldY, -1, 1, 0, 0, 2, 2);
    const goldValueX = goldX + UI_GOLD_VALUE_OFFSET_X;
    const goldValueY = goldY + UI_GOLD_VALUE_OFFSET_Y;
    print(`${s.resources.gold}`, goldValueX, goldValueY, UI_COLOR_TEXT);
    drawDeltaOverlays(s, {
      army: { x: armyX, y: armyY },
      food: { x: foodX, y: foodY },
      gold: { x: goldX, y: goldY }
    });
    const statusBottomY = goldY + UI_GOLD_ICON_H_PX + UI_AFTER_RESOURCES_GAP_PX;
    const headerBottomY = Math.max(headerBandBottomY, statusBottomY);
    drawLeftPanelDividers(illX, illY, illSize, horizontalDividerY);
    const msgY = headerBottomY + UI_LEFT_PANEL_LORE_TOP_GAP;
    const headline = s.run.isGameOver ? { text: "GAME OVER", color: UI_COLOR_BAD } : s.run.hasWon ? { text: "YOU WIN", color: UI_COLOR_GOOD } : null;
    const headlineRows = headline ? 1 : 0;
    const maxLines = Math.max(0, Math.floor((SCREEN_HEIGHT - msgY - 4) / messageLineH) - headlineRows);
    const lore = loreLinesForMessage(s.ui.message, LORE_MAX_CHARS_PER_LINE);
    const textStartY = headline ? msgY + messageLineH : msgY;
    if (headline) print(headline.text, UI_LORE_PADDING_X, msgY, headline.color);
    let printed = 0;
    for (let i = 0; i < lore.length && printed < maxLines; i++) {
      const line = lore[i];
      print(line.text, UI_LORE_PADDING_X, textStartY + printed * messageLineH, line.color);
      printed++;
    }
  }
  function drawRightPanel(s, hints) {
    const plan = buildRightGridRenderPlan(s, hints);
    drawRightGridOps(plan.ops);
    drawRightStatsBand(s);
    drawRightHeldBand(s);
    drawRightPanelDividers();
    drawRightPanelFrame(s);
    const encounterKind = s.encounter?.kind ?? null;
    if (encounterKind) {
      const anchorSpecs = MECHANIC_INDEX.deltaAnchorsByTargetByEncounterKind[encounterKind];
      if (anchorSpecs) drawDeltaOverlays(s, deltaAnchorsFromGridSpecs(anchorSpecs));
    }
  }
  function drawRightPanelFrame(s) {
    drawNineSliceFrame(RIGHT_PANEL_X, 0, PANEL_RIGHT_WIDTH, SCREEN_HEIGHT, panelFrameTopLeftFor(s), {
      fallbackBorderColor: UI_COLOR_DIM
    });
  }
  function drawRightStatsBand(s) {
    const items = [
      { iconSpriteId: SPRITES.small.seed, value: `${s.world.seed}` },
      { iconSpriteId: SPRITES.small.position, value: formatPositionLabel(s) },
      { iconSpriteId: SPRITES.small.steps, value: `${s.run.stepCount}` }
    ];
    const iconSize = UI_STATUS_ICON_SIZE;
    const iconValueGap = UI_STATS_BAND_ICON_VALUE_GAP_PX;
    const itemGap = UI_STATS_BAND_ITEM_GAP_PX;
    let contentW = 0;
    for (let i = 0; i < items.length; i++) {
      contentW += iconSize + iconValueGap + items[i].value.length * FONT_CHAR_PX;
    }
    contentW += (items.length - 1) * itemGap;
    const bandY = RIGHT_PANEL_TOP_BAND_Y;
    const iconY = bandY + Math.floor((RIGHT_PANEL_TOP_BAND_H - iconSize) / 2);
    const textY = bandY + Math.floor((RIGHT_PANEL_TOP_BAND_H - FONT_CHAR_PX) / 2);
    let x = RIGHT_PANEL_INNER_X + Math.floor((RIGHT_PANEL_INNER_W - contentW) / 2);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      spr(item.iconSpriteId, x, iconY, -1);
      x += iconSize + iconValueGap;
      print(item.value, x, textY, UI_COLOR_RIGHT_STATS_TEXT);
      x += item.value.length * FONT_CHAR_PX + itemGap;
    }
  }
  function drawRightHeldBand(s) {
    const heldIcons = heldStatusIcons(s);
    if (heldIcons.length === 0) return;
    const iconSize = 16;
    const iconGap = UI_HELD_BAND_ICON_GAP_PX;
    const contentW = heldIcons.length * iconSize + (heldIcons.length - 1) * iconGap;
    const bandY = RIGHT_PANEL_BOTTOM_BAND_Y;
    const iconY = bandY + Math.floor((RIGHT_PANEL_BOTTOM_BAND_H - iconSize) / 2);
    let x = RIGHT_PANEL_INNER_X + Math.floor((RIGHT_PANEL_INNER_W - contentW) / 2);
    for (const spriteId of heldIcons) {
      spr(spriteId, x, iconY, 0, 1, 0, 0, 2, 2);
      x += iconSize + iconGap;
    }
  }
  function drawRightPanelDividers() {
    rect(RIGHT_PANEL_INNER_X, RIGHT_PANEL_TOP_DIVIDER_Y, RIGHT_PANEL_INNER_W, 1, UI_COLOR_RIGHT_PANEL_DIVIDER);
    rect(RIGHT_PANEL_INNER_X, RIGHT_PANEL_BOTTOM_DIVIDER_Y, RIGHT_PANEL_INNER_W, 1, UI_COLOR_RIGHT_PANEL_DIVIDER);
  }
  function drawLeftPanelDividers(illX, illY, illSize, horizontalY) {
    const verticalX = illX + illSize + Math.floor(UI_LEFT_PANEL_INNER_GAP / 2);
    const verticalH = Math.max(0, horizontalY - illY - UI_LEFT_PANEL_DIVIDER_GAP_PX);
    rect(verticalX, illY, 1, verticalH, UI_COLOR_LEFT_PANEL_DIVIDER);
    rect(LEFT_PANEL_INNER_X, horizontalY, LEFT_PANEL_INNER_W, 1, UI_COLOR_LEFT_PANEL_DIVIDER);
  }
  var INVENTORY_STATUS_ORDER = ["bronzeKey", "bloodVial"];
  function heldStatusIcons(s) {
    const out = [];
    for (let i = 0; i < INVENTORY_STATUS_ORDER.length; i++) {
      const id = INVENTORY_STATUS_ORDER[i];
      if (!s.resources.inventory.includes(id)) continue;
      const spriteId = inventorySpriteId(id);
      if (spriteId != null) out.push(spriteId);
    }
    for (let i = 0; i < s.resources.party.length; i++) {
      const spriteId = inventorySpriteId(s.resources.party[i]);
      if (spriteId != null) out.push(spriteId);
    }
    return out;
  }
  function drawHorizontalBadgePill(spriteId, x, y, w, h, capPx, sheetWidthPx, colorkey) {
    const wPx = Math.max(0, Math.floor(w));
    const hPx = Math.max(0, Math.floor(h));
    if (wPx === 0 || hPx === 0) return;
    const cap = Math.max(1, Math.floor(capPx));
    const sheetW = Math.max(cap * 2, Math.floor(sheetWidthPx));
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    if (wPx <= cap * 2) {
      clip(x0, y0, wPx, hPx);
      spr(spriteId, x0, y0, colorkey, 1);
      clip();
      return;
    }
    clip(x0, y0, cap, hPx);
    spr(spriteId, x0, y0, colorkey, 1);
    clip();
    const rightX = x0 + wPx - cap;
    clip(rightX, y0, cap, hPx);
    spr(spriteId, rightX + cap - sheetW, y0, colorkey, 1);
    clip();
    const midX = x0 + cap;
    const midW = wPx - cap * 2;
    const seamCol = cap - 1;
    clip(midX, y0, midW, hPx);
    for (let dx = 0; dx < midW; dx++) {
      spr(spriteId, midX + dx - seamCol, y0, colorkey, 1);
    }
    clip();
  }
  function drawRightGridOps(ops) {
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      if (op.kind === "rect") rect(op.x, op.y, op.w, op.h, op.color);
      else if (op.kind === "rectb") rectb(op.x, op.y, op.w, op.h, op.color);
      else if (op.kind === "print") print(op.text, op.x, op.y, op.color);
      else if (op.kind === "badgePill") {
        drawHorizontalBadgePill(op.spriteId, op.x, op.y, op.w, op.h, op.capPx, op.sheetWidthPx, op.colorkey);
      } else spr(op.spriteId, op.x, op.y, op.colorkey, op.scale, op.flip, op.rotate, op.w, op.h);
    }
  }
  var MINIMAP_CELL_PX = 6;
  var MINIMAP_TILE_CACHE = {};
  function getMinimapTilePixels(tileId) {
    const k = tileId | 0;
    const cached = MINIMAP_TILE_CACHE[k];
    if (cached) return cached;
    const scratchX = UI_LEFT_PANEL_PADDING;
    const scratchY = UI_LEFT_PANEL_PADDING;
    spr(k, scratchX, scratchY, -1, 1, 0, 0, 2, 2);
    const out = [];
    for (let py = 0; py < MINIMAP_CELL_PX; py++) {
      for (let px = 0; px < MINIMAP_CELL_PX; px++) {
        const off = (16 - MINIMAP_CELL_PX) / 2 | 0;
        const sx = scratchX + off + px;
        const sy = scratchY + off + py;
        out.push(pix(sx, sy));
      }
    }
    rect(scratchX, scratchY, 16, 16, UI_COLOR_BG);
    MINIMAP_TILE_CACHE[k] = out;
    return out;
  }
  function drawMinimap(s) {
    const world = s.world;
    const illX = UI_LEFT_PANEL_PADDING;
    const illY = UI_LEFT_PANEL_PADDING;
    const margin = 2;
    const cellPx = MINIMAP_CELL_PX;
    const originX = illX + margin;
    const originY = illY + margin;
    const present = {};
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        present[getSpriteIdAt(world, x, y) | 0] = true;
      }
    }
    for (const k in present) getMinimapTilePixels(Number(k));
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const spriteId = getSpriteIdAt(world, x, y);
        const mini = getMinimapTilePixels(spriteId);
        const dx = originX + x * cellPx;
        const dy = originY + y * cellPx;
        let i = 0;
        for (let py = 0; py < cellPx; py++) {
          for (let px = 0; px < cellPx; px++) {
            pix(dx + px, dy + py, mini[i++]);
          }
        }
      }
    }
    const p = s.player.position;
    rectb(originX + p.x * cellPx, originY + p.y * cellPx, cellPx, cellPx, UI_COLOR_TEXT);
  }

  // src/platform/tic80/entry.ts
  var state = null;
  var prevMouseLeftDown = false;
  function TIC() {
    const { mouseX, mouseY, mouseLeftDown } = sampleMouse();
    const justPressed = mouseLeftDown && !prevMouseLeftDown;
    prevMouseLeftDown = mouseLeftDown;
    if (state == null) state = processAction(null, { type: ACTION_NEW_RUN, seed: INITIAL_SEED });
    if (state == null) return;
    state = processAction(state, { type: ACTION_TICK });
    if (state == null) return;
    if (justPressed && !hasBlockingAnim(state.ui)) {
      const action = actionForClick(state, mouseX, mouseY);
      if (action) {
        const next = processAction(state, action);
        if (next) state = next;
      }
    }
    const hints = deriveRenderHints(state, mouseX, mouseY);
    renderFrame(state, hints);
  }
  globalThis.TIC = TIC;
})();

// title:  The Unbound (prototype 0.7.0)
// author: haulin
// desc:   Prototype 0.7.0 toward the North Star
// script: js
// input:  mouse

