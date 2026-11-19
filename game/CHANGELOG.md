# Ashen Descent changelog

Each release's section becomes its release notes in the launcher. Add a section for the new version before tagging.

## 2.4.4

- **Bandit King's Reaver restored.** The reshaped haft from 2.4.2 came apart into broken segments. The Reaver is back
  to its original model.

## 2.4.3

- **Every monster part has a proper icon.** The higher tiers (Tough Goblin Hide, Dire Wolf Pelt, Ancient Bone Shard,
  Warlord Orc Tusk, Void Iron Scrap and the rest) and the Dragon Scale showed a plain tan orb. Each tier now shows
  its part's picture, tinted for its tier (steel for tier 2; ember, void, spectral or primal for tier 3) and marked
  with tier pips. The Dragon Scale has its own scaled icon.
- **Crafting materials cover every stat.** Strength, Dexterity, Vitality, Energy and Luck now come from several
  materials each, alongside damage, armor, health, mana, crit, speed, block and cooldown reduction:
  - **Strength:** Iron, Obsidian, Ironwood, Emberwood, Rawhide, Ruby (and Orc Tusk and Bone infusions).
  - **Dexterity:** Mithril, Ashwood, Yew, Tanned Leather, Topaz (and Bat Wing infusions).
  - **Vitality:** Oak, Wool, Hardened Leather, Drakehide, Emerald (and Wolf Pelt infusions).
  - **Energy:** Copper, Silver, Linen, Silk, Spellweave, Amethyst, Sapphire (and Ooze Gel infusions).
  - **Luck:** Gold, Quartz, Diamond (and Mutant Essence infusions).
  - **Starmetal** adds a little of every base stat. Ruby, Sapphire, Emerald, Topaz and Onyx keep their on-hit effects
    and now add a stat too.

## 2.4.2

- **Projectiles look like their element.** The yellow glow disc around every projectile is gone. Spells now fly as
  their element: a crackling ball of lightning with arcs that fork as it flies, a ball of fire trailing flames, a
  cluster of ice shards, a swirling orb of water, a tumbling rock, crescents of wind, a seed in a ring of leaves, a
  radiant star, a dark orb trailing shadow, a sickly death-flame and a turning arcane rune.
- **Elemental arrows.** Arrows take their element's colours and effect: the Explosive Arrow is red and burns in
  flight, Storm and Arc Shots crackle, the Shadow Arrow trails smoke, the Harpoon swirls with water, the Poison
  Arrow drips venom. The cast-time bubble on Assassin-style skills stays removed.
- **Bandit King's Reaver** has a straight haft held at the grip, with the head above the hand instead of a curved,
  bow-like shaft held by the butt spike.
- **Camera in doorways and narrow corridors.** Walking through a narrow doorway could put the camera inside the wall
  or press it against the back of the hero's head. The over-the-shoulder offset now centres in tight spaces, and the
  camera keeps a short clear distance behind the hero instead of snapping into the wall.

## 2.4.1

- **Heals, shields, barriers, regeneration, mana and summons level like damage.** Each starts lower at skill level 1
  (about 70% of its old strength) and adds an even step every level, reaching about 1.7 times the old strength at
  level 15. Examples at levels 1, 5, 10 and 15:
  - **Mending Light:** heals 36% / 51% / 69% / 87% of max HP.
  - **Ice Barrier:** absorbs 103 / 144 / 196 / 247 damage (at that hero's health).
  - **Renewal-type heals:** 3.9% to 9.2% of max HP per second.
  - **Meditate:** restores 28% to 67% of max mana.
  - **Barriers:** damage reduction from 75% of the listed value, +3% of it per level.
  - **Minions:** start at 80% health and damage, +10% health and +7% damage per level.

  Skills that used to rely on a default amount now carry their own, so all of them level. Full heals stay full.
  The skill window shows each amount with what the next level adds.

## 2.4.0

- **Skill levels show what they do.** The skill window lists every number a skill has at its current level, with what
  the next level adds in brackets, for example "Armor +14% (+2%)" or "Base damage 64 (+10)".
- **Damage grows by an even step each level.** Each skill level now adds the same amount of base damage (18.5% of the
  level-1 value: 54, 64, 74, 84 ...), instead of +5% compounding. A skill's base damage is set by the level it is
  learned at. Beside it you see your actual damage with your stats, hero level, mastery and element, and what the
  next level adds to that.
- **Buffs get stronger with their level.** Fury, Stoneskin, Keen Eye, Haste, Quickened, Clarity and Bloodlust used
  to give the same fixed bonus at every level. Each now starts at its level-1 strength and grows per level:
  - **Fury:** damage +15%, +2% per level.
  - **Stoneskin:** armor +10%, +2% per level (at least +8).
  - **Keen Eye:** critical chance +15%, +1% per level.
  - **Haste:** speed +15%, +1.5% per level.
  - **Quickened:** cooldown recovery +18%, +2% per level.
  - **Clarity:** mana regeneration +40%, +4% per level.
  - **Bloodlust:** heals 8% of damage dealt, +0.6% per level.

  The Effects panel shows the strength you cast it with. Heals, wards, barriers, durations and cooldowns also show
  their now and next-level values.

## 2.3.9

- **The Healing Fountain, rebuilt in the style of the Ashen Crystal and the gate.** A dark stepped octagonal dais
  with gilded edges and a turning circle of runes, four rune pillars crowned with water crystals, and a stone cradle.
  Above it floats a sphere of living water: streams spiral up from the basin into it, drops fall back, rings of water
  circle it, and runes orbit it for what it does: Sel (Life) for health, Iska (Insight) and Dren (Clarity) for mana,
  Ith (Tide) for the water. While you are being restored, the runes for what is being restored blaze and a stream of
  water reaches out to you.
- **Eleven new runes: the Marks of the Struggle.** Every effect in a fight now has its own rune:
  - **Bloodlust and War Banner:** Siphon and Rally, which used to borrow Wildfury and Might.
  - **Slowed:** Hinder, which used to wear the Haste rune.
  - **Poison and acid:** Venom and Corrode.
  - **Curses and weakening:** Hex.
  - **Stunned or held:** Bind.
  - **Bleeding:** Rend.
  - **Marked for the kill:** Mark.
  - **Taunted:** Taunt.
  - **A monster in a frenzy:** Frenzy.

  They show in the Effects panel, float over a hero who has the buff, and replace the emoji badges over a monster's
  health bar. The Rune Index has a new section for them.

## 2.3.8

- **Fixed: F did nothing and showed no prompt.** Switching the DPS meter to Party made the game think a window was
  open the whole time, so it hid the F prompt and ignored F (for every character, until the meter went back to
  Solo). The meter's Party view no longer counts as an open window.

## 2.3.7

- **Fixed: the freeze at the start of fights.** Each time a monster died, the loot roll checked every skill in the
  game to see whether it could drop as a tome, and rebuilt your whole skill tree for each one. That took half a
  second or more per kill, so the first kills of a fight froze the game. The skill tree is now built once and reused
  until your class, level or skills change. The check now takes under a millisecond.

## 2.3.6

- **Gear fits together.** Capes now fall over everything worn beneath them:
  - **Robes and skirts:** the cape measures the robe, coat or skirt below the waist and hangs outside it, so they
    no longer push through near the hem.
  - **Sheathed blades:** with a cape on, a blade sheathed at the hip hangs nearly upright beside the leg, under the
    cape instead of spearing through it.
  - **Shields on the back:** a shield carried on the back sits over the cape all the way down, and the cape no
    longer slices through the shield's lower edge.
  - **Weapon and shield both on the back:** a long weapon rides over the shield instead of passing through it.
  - **Quivers and banner poles:** both are worn over the cape.
- **Fixed: "Pick up Tome" in town.** Loot left on a dungeon floor followed the party back to town and sat at an
  unseen spot, holding the F prompt even with empty bags. Town no longer keeps dungeon loot.

## 2.3.5

- **A Healing Fountain in town.** It stands in the plaza south of the campfire, between the Personal Chest and the
  Ashen Crystal: an octagonal stone basin with a two-tier centre piece, water spilling from bowl to bowl, a glowing
  heart-crystal with a jet of water, four crystal lamps and a ring of turning Life runes. Stand near it to restore
  health and mana over time (faster while you stand still), or press F to drink for a quick burst.
- **Fixed: F (and other keys) stopped working.** After typing in a text box, such as the party code or name in
  Fellowship, the box kept the keyboard after its window closed, and the game ignores keys typed into text boxes.
  A key pressed while a hidden box has the keyboard now goes to the game.
- **Fixed: party experience.** Party members who were not the leader missed experience for kills, most often their
  own killing blows. The leader now announces every kill and each member takes their share once.
- **Fixed: the Gift window could not be closed.** Cancel and choosing a player now close it.
- **Items you cannot pick up no longer take over F.** With a full bag, a nearby item shows "Bag full" and talking,
  shops and stairs come first. Tomes show their name in prompts.
- **Options: Character select and Main menu.** In camp they save first. In the dungeon you are asked to click
  twice, since progress since your last save in camp is lost.
- **Spells look like their element on the ground.** Ground spells and bursts are no longer a jelly bubble: Fire is a
  ring of flames, Water a whirlpool, Ice frost and standing shards, Earth jagged rock spikes and glowing cracks,
  Lightning arcs and a charged edge, Nature vines, sprouts and spores, Holy shafts of light, Wind spiralling
  streaks, Shadow and Death dark wisps, Arcane orbiting motes.
- **No more cast ball.** Spells such as the Assassin's Deathtouch flashed a large glowing disc and a dashed ring
  beside the hero, left over from the old top-down view. Weapon swings also drew a second flat arc. Both are gone.
- **Buffs that raise two stats show both runes** in their casting circle.
- **Camera and walls.** The camera now pulls in at once when a wall comes between it and your hero, and checks a
  wider path, so walls no longer hide the character.

## 2.3.4

- **Fixed: shop windows turned into the Fellowship page.** After opening Fellowship (for example to form a party), any
  change in the party redrew the Fellowship page over whatever window was open, such as a shopkeeper's. The page
  now only refreshes while it is the one on screen.
- **Fight reports name the cause of a freeze.** With launcher 1.5.3, the fight-start recorder also profiles the game
  while it records, and for each slow frame it lists the functions that were running. The graphics card's name is
  looked up once, while nothing is happening, instead of when a fight starts.

## 2.3.3

- **Fight-start performance reports.** To track down the stutter that some players still see at the start of a
  fight, the game now records the frames around the start of a fight: two seconds before an enemy comes within
  reach after a quiet spell, and six seconds after. Each frame notes its time and how much of it went on the game's
  own work, shader compiles, data sent to the graphics card, garbage collection and long tasks, plus the graphics
  card's name. With launcher 1.5.0 the report is saved as a perf-*.json file in the launcher's logs folder. The game
  makes at most three a session, never more than one a minute, and costs a few counters per frame.

## 2.3.2

- **A sheath bench and an enchanting altar in the Cinder Forge.** Both are new stations inside Brannoch's forge: walk
  up and press F.
  - The sheath bench stands in the lower-left corner by the ore bins. It is a leatherworker's table with a hide
    pinned out and a scabbard half stitched on it, spools of waxed thread, an awl, a round knife, a pot of wax and a
    stool, with an A-frame rack of finished scabbards behind it in five leathers with brass fittings. It opens the
    Sheaths tab.
  - The enchanting altar stands in the lower-right corner by the door. It is a dark stone plinth banded with
    glowing runes, with a blade laid across it, four element crystals (fire, frost, storm and shadow) on iron posts
    and a ring of carved stones. A rune circle turns on the floor and motes of the four elements circle it. It opens
    the Enchant tab.

## 2.3.1

- **Fixed: classes could not be picked on the new-character screen.** A guard that ignores clicks on class cards
  for a moment while the game switches to fullscreen was still being armed on every click, although since 2.2.0 the
  game no longer goes fullscreen on clicks, so every class click was ignored. The guard now only follows a real
  switch to fullscreen.

## 2.3.0

### Online
- **Parties are easier to find.** Fellowship (in the Folio) now opens with a Party card: form or join a party from
  anywhere, even on your own; friends can join later with the code or an invite. The Muster Board on the Guildhall wall
  still has the full party list.
- **Old launchers are named as the problem.** A game opened by a launcher from before online play (1.1 and older)
  says so when it opens, and on the Social and Muster pages, with where to get the new launcher, instead of talking
  about claude.ai.

### Combat and gear
- **Weapon enchantments.** Brannoch's new Enchant tab (Cinder Forge) binds an element into the weapon you hold for 12
  of its motes and 200 cinders. The weapon glows along its edge in that element's light and gives the element off as
  it moves: flames lick up a fire blade, frost, storm, shadow and the rest drift off it as motes. The first
  enchantment adds 8% damage (at least 1); enchanting again changes the element. Your party sees it too.
- **No more trail line on strikes.** The thick line that traced the weapon tip on every swing is gone; a strike shows
  only its slice, and the head of the slice throws off the element's own particles.
- **Shields look like themselves.** The same shield name can come out as one of a few fitting patterns (a Round
  Shield may be round, a targe or spiked; a Kite may be a kite or a heater; a Tower may be a tower or a pavise; Aegis
  and Holy shields can be winged, and a rare Legendary one has the dragon pattern). Each shield is also painted in one
  of eight heraldic colours, some with a second livery on the trim. A shield's look is fixed: it is worked out from
  its name and level.
- **Every ward has its own look.** Shield skills no longer share one bubble:
  - Bulwark and the Tidebinder's Aegis and Leviathan are wide, low domes.
  - Stoneskin, Granite Hide, Plague Carapace and Molten Shell hug the body, with orbiting stones, rising plague or a
    ring of flames.
  - Ice Barrier is a crystal cage of light, and Arcane Ward turns three tilted rune rings.
  - Holy Shield has a halo and rays, and Wind Guard a spiral of wind.
  - Bubble Ward fills with rising bubbles, Spirit Ward with circling leaves of light, and Soul Shield with circling
    ghost lights.
  - Warsong Ward pulses rings outward, and Abyssal Shell turns a dark wave at your feet.

## 2.2.1

- **One smooth start.** The game window now appears once, already full size, with the title screen painted, and
  the launcher stays on screen until then. Before, the window showed up blank and then jumped to full size.
- **Less work in the background.** The title screen's swirling portal and embers kept rendering, out of sight, for
  the whole session after you clicked past them. They now stop when the title screen is put away. This removes a
  freeze after clicking the title and frees the graphics card during play.
- **Sheaths hang like the real thing.** A sword now hangs from two straps on the belt: a short one to a metal
  locket at the throat and a longer one to a ring band further down. The throat sits forward on the hip with the
  hilt angled forward, and the scabbard leans back about 35 degrees so the tip trails behind the calf, close to
  the leg.
- **New unique: the Bandit King's Reaver.** A War Axe for Warriors with its own model, made from the Bandit Axe:
  a curved, leather-banded haft with an iron spike at each end, a notched crescent blade and a hooked back. It never
  appears as an ordinary named drop. From floor 4 down it can drop from bosses (2%), commanders, uniques and hidden
  bosses (0.5%), and very rarely from anything else. Its stats beat every other named weapon: a third more damage,
  plus strength, vitality, critical chance, attack speed and health.
- **Melee swings flow.** Melee skills drew a thin line made of ten straight pieces that shot out to the skill's
  full range, so they read as long, kinked hairlines. A swing is now a crescent of light that follows the blade: the
  head sweeps across with the swing and a tail fades behind it; a crisp white edge softens into the element's
  colours, thick at the head and tapering to points; and it stays at weapon reach. Gale's three strokes now follow
  one another with a gentle sway instead of shivering.
- **Dome bases are rune circles of what the dome gives.** Instead of a plain glyph and rings, the ground under a
  dome is a rune circle built from its effects: Vor (Ward) for the damage it turns aside, Sel (Life) if it heals,
  Vey (Wind) if it stops arrows. These run round a band between two circles and sit large at the points of a
  star, with the dome's element rune at the heart. The flat bright band where the dome meets the ground is gone.
- **Online by default.** The Social page explains when you are playing offline or while the server is waking up,
  instead of talking about claude.ai.

## 2.2.0

### Smoother fights
- **No more hitch when a fight starts.** We measured the start of fights and found two causes. The game asked
  for fullscreen on your first key press, which was usually the attack key, so the screen resized mid-fight.
  Fullscreen is now only entered from the title screen or the Fullscreen setting. The second cause was spell
  effects whose shaders were only prepared the first time they appeared; they are now all prepared in camp.
- Window resizes are batched, so dragging the window or a panel sliding in no longer causes a burst of resizes.

### Better looking gear
- **Capes rebuilt.** A cape is now five overlapping cloth panels that follow the shape of whatever armour you
  wear, so it sits over the armour instead of passing through it. It ripples, sweeps back as you run, and has a
  trimmed hem, shoulder straps, clasps and a chain across the chest.
- **Sheaths moved to the hip.** Sword sheaths hang from the belt at your side and daggers sit at the back of the
  belt, clear of your hand and leg.
- **Armour detail.** Plate gets a raised centre ridge, rolled edges at the neck and arms, riveted fauld lames
  below the breastplate, and gilt trim. Brigandine shows its rivet grid, leather gets stitched seams and
  buckled straps, and mail has a scalloped hem.

### Easier to use
- Quick settings (⚙) explain what each option does, and the full options are one click away.
- Camp signs no longer overlap each other.
- The Effects panel only appears while something is affecting you, and the DPS meter starts folded.
- Attribute + buttons are greyed out when you have no points to spend.
- The role banners on the new-character screen no longer run their name into the description.

## 2.1.0

### New
- **Account names.** The first time you start, the game asks for an account name and greets you with
  "Welcome back, *name*" from then on. Existing accounts are asked once. Rename it any time in the Vault.
  Your account name is also your party nickname.
- **Party play in the desktop game.** Choose *Party play* in the launcher: play on the online server, host on
  your PC, or join a friend. Parties work exactly as before (make a party, share the code, step through the
  portal together).

## 2.0.0

The first release delivered through the Ashen Descent launcher.

### New
- Stone portals rebuilt as rune-scribed voussoir gates on an octagonal dais, with a matching title-screen gate
- A rune index with 26 original Ashen runes, and rune domes for area shields
- Spells drawn in the shield style: glowing orbs, expanding novas, whirlpools and rings of real flame
- Floating stat runes and armour auras for buffs, and a movable Buffs & Debuffs panel
- Casting sigils under your hero that differ per spell school and grow with spell tier
- DPS meter with solo or party view and a 30-second graph; a separate, movable Party panel

### Fixes
- Party members now see the same monsters at the same time, and stay in step when a window is in the background
- Return Scroll works in a party, with a gathering circle so the group returns together
- Saves are validated before writing, backed up, and repaired on load; Cinders can no longer become "null"
- The casting circle and your shadow no longer appear mirrored away from your hero
- Smoother combat: detail levels and effect warm-up remove the stutter when a fight starts
