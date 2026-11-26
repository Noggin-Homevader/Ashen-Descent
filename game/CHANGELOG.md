# Ashen Descent changelog

Each release's section becomes its release notes in the launcher. Add a section for the new version before tagging.

## 2.19.0

- New skill trees. Every class tab is three stat paths of four skills (unlocking at levels 1, 6, 15 and 30): Warrior Might / Finesse / Vigor, Paladin Zeal / Faith / Bulwark, Rogue Blades / Shadows / Poisons, Mage Arcana / Tempo / Warding, Ranger Marksman / Survival / Wilds, Necromancer Bone / Blood / Hex, Shaman Spirit / Earth / Storm. Every subclass adds eight signature skills (levels 3, 10, 22 and 40, ultimates last). The ~900 generated, look-alike tree entries are gone: 252 distinct skills in all, about 20 per build.
- New skill effects: executes (double damage to foes under 25-30% health), double damage to stunned, slowed or fleeing foes, to bleeding, poisoned or burning foes, or to marked foes; lucky strikes that sometimes deal triple; bleeds and burns.
- Stats reworked. No stat adds damage on its own any more. Strength: armour, health, block. Dexterity: attack and cast speed, dodge. Vitality: health, armour, regeneration. Energy: mana, mana regeneration, cooldowns. Luck: crit, cinders, drop rarity.
- Every skill names the stat that powers it and grows 1% per point of it (compared with a typical hero of your level); heals and wards too. Tooltips show the bonus your stat gives.
- Growth: +1 Vitality every level, plus 2 points to place each level - on the level-up window or the character sheet. Auto-assign (on by default) places them on your subclass's recommended stats. Attribute points can be reset for free in camp.
- Existing characters: every skill point is returned once and stats are rebuilt from your level with auto-assign.

## 2.18.0

- Melee foes fight at the reach of their weapon: daggers have to step right in, swords and axes stand a little off, greatswords and scythes sweep from further out, and spears keep you at length. Beasts strike at the reach of their bite, claws or horns (wolves close, bears and crabs further, minotaurs and dragons from well out).
- Every weapon and beast has its own wind-up - quick daggers and bites, slow greatswords, horns and golem fists - shown by a red ring that grows to the edge of its reach. A committed swing lands where it lands: step out of the ring and it misses. Spears, daggers and beasts lunge in as they strike.
- Between swings foes no longer pile onto you: they hold at their reach, circle you and give ground when crowded in.
- Monster sizes are capped by rank, so mutated brutes, great drakes and minotaur brutes stop towering over the screen (their hit areas are unchanged).

## 2.17.2

- No more blobby monsters at any graphics setting. The light version of every model is now worked out ahead of time by collapsing edges in the order that changes the shape least - never across a colour, armour piece or joint, and only while the change stays tiny compared with the model's size. Goblins, skeletons, heroes, spiders, crabs, slimes, golems, wraiths, bats and all gear keep their silhouette and colours at a quarter of the triangles. The old on-the-fly merge is gone; a model without a light version simply draws at full detail.

## 2.17.1

- Far-view models made in Blender for dragons (all four kinds), minotaurs, bears, wolves, imps and the gobtaur's horse. When the game lightens monsters for distance or smoothness, these keep their silhouette, horns, frills, wings, spine and belly plates and armour instead of melting into smooth blobs; only scales, teeth, claws and eyelids are left off.
- On high graphics, monsters keep full detail further from you (light models only start past about twice the old distance), and slow-frame easing keeps nearby monsters at normal detail longer.

## 2.17.0

- Dragons are four different creatures now, each with its own Blender-built body on the shared dragon rig:
  - Dragon (elders and whelps): four legs and great wings, a crown of curved horns with a webbed frill between the cheek horns.
  - Drake: wingless and heavily armoured, a high shoulder hump, massive forearms, a crest of horns swept flat back, and a finned tail fan.
  - Wyvern: two legs, its wings are its arms with a clawed hand at each wrist, and it rears up on its hind legs.
  - Wyrm: a legless serpent that slithers with its neck raised, a finned crest over its skull and neck, and a tail fin.
- Modelled detail on every kind: overlapping scales over the hide, ridged plates down the spine and tail, raised belly plates with dark seams, three toes and a dewclaw on every foot with hooked claws, spikes under the jaw.

## 2.16.2

- Drakes, wyrms and wyverns no longer stand like horses: they crouch low with elbows and knees bowed out, carry the neck forward with the head level, and have heavier shoulders, haunches, knobbed joints and broad splayed feet.
- Dragon hides gain a dark ridge down the back and tail, banded scales along the flanks and darker feet; the Gilded bloodline is a deeper gold.

## 2.16.1

- Minotaurs rebuilt in Blender: a broad V-shaped torso with a narrow waist and hips, defined chest and abs, a proper bull head (long muzzle, wet nose pad, brow, lidded eyes, nose ring), a studded leather war-kilt with a skull-buckled belt, a chest harness, a spiked iron pauldron and banded bracers, dark shaggy lower legs.
- Wolves, bears, imps and dragons gain facial detail: lidded eyes with pupils, brow ridges, nostrils and lip lines.
- The level-up window no longer pops up listing every stat when a character is loaded.

## 2.16.0

Gathering and alchemy.

- **Gathering.** Every dungeon floor except boss floors now has ore veins, old timber and wild flowers. Walk up and press F (or click) to mine, chop or pick; moving or getting hit stops you.
  - Ore gives the forge's crafting metals: copper and bronze, then iron, then steel, silver and gold, then mithril and obsidian, and finally starmetal from fallen stars.
  - Timber gives its woods: ash, oak, yew, ironwood and emberwood.
  - Flowers are for potions. Red ones (Redcap Poppy, Bloodthorn, Heartbloom) make health potions; blue ones (Bluebell, Moonbell, Starlily) make mana potions.
- **Node ranks.** Every node has a rank set by how deep you are. Ore and timber go up to rank 5, flowers to rank 3.
- **Tools.** You need a tool of the node's rank or better: a Pickaxe for ore, a Hatchet for timber, a Sickle for flowers.
  - Everyone starts with Copper tools.
  - Upgrade them at the material stores in the Cinder Forge through Iron, Steel, Mithril and Starmetal. Each step costs Cinders and materials of the rank below.
  - A tool better than the node needs works faster and sometimes yields more.
- **Alchemy.** The cauldron in the Ashbloom Apothecary is now an alchemy station.
  - Brew health or mana potions in **Low**, **Normal** or **High** quality.
  - Low takes rank-1 flowers, Normal rank-2 and High rank-3 plus Ooze Gel to bind it.
  - Each brew makes two potions. You can brew one at a time or five at once.
- **Alchemy improves as you brew.** Every level gives an 8% chance of an extra potion, and from levels 4 and 8 each brew needs one flower fewer.

## 2.15.3

Gelatinous slimes.

- **Slimes now look like jelly:**
  - A clear outer skin over a denser, deeper-coloured inner jelly.
  - A thin puddle of gel spreading on the floor under them.
  - Wet highlights that slide across the skin.
  - Bubbles that rise slowly through the body.
- **They wobble more,** swaying side to side as well as front to back.
- **The hard drip columns are gone** from inside the body.
- **Elemental slimes keep their colours and inner effects.** The swallowed bones and weapons still show through the gel.

## 2.15.2

A level-up window, and your heals and shields now reach your followers.

- **Level-up window.** When you level, a window pops up listing every attribute with what the level gave it (+1 or +0), plus your Health, Mana, Damage, Armor, Crit, Speed and Cooldown cut, old to new. Several level-ups in a row add together until you close it. Drag it by its title bar anywhere on the screen and it stays where you put it.
- **The Stats button is gone,** since there are no points to spend. The character sheet is still in the Folio.
- **Heals and shields that say "allies" now reach your followers,** not only other players:
  - Followers are the person you're escorting home on a rescue quest, and your summons.
  - Group heals, healing novas and sanctuaries heal followers in range.
  - Single-target heals and Renew go to a follower when they're hurt worse than you.
  - Party wards give followers a shield that soaks their next hits.

## 2.15.1

Hoods, pelts, necks and jaws.

- **Hunter hoods and the other cloth hoods** now end at the neck as full head pieces. The shawl that draped over the shoulders and down the back is gone, so quivers, bows and back weapons no longer sink into it.
- **Shaman pelts** (stag, wolf and bear) lose the hide that trailed down the back and sit on the head as full head pieces.
- **More human proportions on the base character:**
  - A squarer jaw with a real angle under the ears.
  - A fuller neck.
  - The top of the torso and the tunic collar sit a little lower, so more of the neck shows between chin and collar. Chest armour collars follow it down.

## 2.15.0

Combat rescaled: smaller numbers, tougher monsters, closer fights.

- **One scale for heroes and monsters.** Damage and health now follow fixed curves by level instead of monsters being sized from your current stats. Strong skills now first reach around 1,000 at about Floor 40. Expect roughly 15–50 at the start, a few hundred by Floor 13 and 600–950 around Floor 25. Big nukes and crits go higher.
- **Monsters last longer and hit harder relative to you:**
  - A normal enemy of your level takes about 8 basic hits, or 3–5 strong skill hits.
  - Brutes take about 14, elites about 20, commanders about 40 and bosses about 180.
  - A normal enemy's blow takes about 7% of your health. Brutes hit for about 11% and bosses for about 15%.
- **Lower health for everyone.** Heroes start with about 55–90 health by class (90–150 at level 1 with starting gear) and gain less per level. Vitality gives 5 health per point instead of 10, and health on gear counts at 40%.
- **Damage rebuilt:**
  - Your hit power is now 3 + 1.1 per level, plus 30% of gear damage and 0.4 per point of your main attribute (0.1 for the other damage attributes).
  - Skill mastery tops out at about +60% instead of +160%.
  - Each skill level adds 5% instead of 18.5%.
  - Item tooltips show what their damage and health are actually worth.
- **Attributes grow by themselves.** Stat points are gone. Every level gives +1 to your class's main attribute and +1 Vitality (Paladins get +1 Strength instead). Your other attributes each have a chance to rise, favouring the two your subclass build recommends. Each level-up shows what you gained, and the character sheet shows each attribute's growth odds. Existing characters have their spent points folded into this automatic growth.
- **Heals and shields come from the caster's power.** Heals, wards, regeneration, sanctuaries, barriers and party heals now give a flat amount based on the healer's level and damage, not a share of the target's health. A big-health tank needs more healing than a mage, and stronger healers heal more.

## 2.14.1

New weapon looks, part two: swords, daggers, staves and bows. And enchanted weapons now take on their element.

- **Swords:** the **Falchion** (a broad blade widening to a clipped point), the elven **Leafblade**, the curved **Sabre** with a knuckle bow, and the serrated **Sawtooth**.
- **Greatswords:** the slab-like **Dragonslayer** and the curved, rune-lit **Moonblade**.
- **Short swords:** the forward-curved **Kopis** and the **Wakizashi**.
- **Holy blades:** the **Sunblade**, with spread wings and a halo.
- **Daggers:** the hooked **Karambit**, the leaf-pointed **Kunai** and the serrated, curved **Fang**.
- **Staves:**
  - **Serpent:** a gilt snake coiling up to an orb.
  - **Ethereal:** three claws holding a floating crystal inside a glowing ring.
  - **Obelisk:** a runed standing stone with circling shards.
  - **Seraph:** gilt wings around a haloed gem.
  - **Thornwood:** a thorny branch curling round glowing berries.
- **Bows:** the **Wingbow** (gilt feathers along the limbs), the **Bladed** longbow (steel blades along the back), the **Serpent** longbow (a gilt snake winding along each limb) and the **Crystal** warbow (crystal-tipped limbs).
- **Enchanted weapons are imbued with their element.** Fire heats the steel to ember red with a molten core and glowing edge. Ice frosts it pale blue. Lightning turns it storm-grey with flickering veins. Shadow and Death blacken it around a lit core. Holy gilds it. Water, Wind, Earth, Nature and Arcane each tint it their own way. On maces, axes and staves only the steel, edge and runes change. The existing flames, frost, arcs and other effects still play on top.
- As before, weapons you already own keep their current look. New ones can roll any style.

## 2.14.0

New weapon looks, part one: spears, polearms and maces.

- **Spears** gain four new forgings: the **Trident** (three barbed tines on a forged crossbar), the **Dragon** spear (a flame-rippled leaf blade rising from a gilt dragon collar with swept horns and a red tassel), the **Boar** spear (a broad midribbed leaf with a toggle crossbar), and the **Ranseur** (a long spike flanked by two wing-like side blades).
- **Polearms** gain the **Naginata** (a long curved blade over a round guard), the **Crescent Moon** (a heavy backswept moon blade with a hooked spur and a tassel), the **Voulge** (a tall cleaver lashed to the haft, rising to a forward point), and the **Crow's Beak** (a hammer face, a long down-curved beak and a top spike).
- **Maces** gain the **Crystal** mace (raw glowing crystals bursting from an iron setting), the **Thornhead** (twisted ribs studded with thorns), and the **Caged Orb** (a glowing orb inside a gilt cage).
- Newly found and crafted weapons can roll any of the new looks. Weapons you already own keep exactly the look they have now.

## 2.13.3

Imps and crabs rebuilt in Blender.

- **Imps** are a wiry little fire demon now: a lean chest over a small pot belly, a big head with a heavy brow, a toothy grin and glowing eyes, long pointed ears, ridged horns curling back, bat wings with a thumb hook, clawed hands, digitigrade legs, and a whip-thin tail ending in a spade. They still hover, flit and lunge with their claws.
- **Crabs** have a proper carapace: a wide shell with a raised rim, a toothed front edge and lateral spines, eyes on stalks, heavy pincers with toothed fingers and dark tips, and smooth jointed legs ending in points. The moving finger of each pincer opens and snaps shut when it attacks.

## 2.13.2

Dragons rebuilt in Blender.

- **Dragons** have a new body shared by whelps, drakes, wyverns, wyrms and elders: a deep keeled chest and lean waist, heavy haunches, a long S-curved neck, a wedge-shaped skull with brow ridges, cheek horns and a long toothed snout, swept-back horns, muscled legs on clawed feet, and a long tail ending in a spade.
- Belly plates run from throat to tail, and a row of spines runs from the head to the tail tip, largest over the shoulders.
- Wings now have a proper arm, three long fingers and a thumb claw, with a scalloped membrane stretched between them. They still fold at rest and beat in flight.
- Every colour (Ember, Frost, Venom, Storm, Shadow, Gilded) and every attack and animation works as before.

## 2.13.1

Minotaurs and gobtaurs rebuilt in Blender.

- **Minotaurs** are a new model: a towering bull-headed brute with a massive neck and shoulder hump, a broad muzzle with a nose ring, swept horns, heavy arms, a leather belt with a skull buckle and loincloth, digitigrade legs on cloven hooves, and a tufted tail. They keep their stalk, charge and greataxe swing.
- **Gobtaurs** now ride a proper war-horse body: a deep chest, round barrel and strong croup, muscled forearms over slim cannons, feathered fetlocks and dark hooves, a flowing tail, and a red saddle cloth with gold trim and a leather girth. The goblin rider and their gallop are unchanged.
- Both use the new skeleton, so their bodies bend smoothly as they move, and elemental variants keep their effects.

## 2.13.0

Wolves and bears rebuilt in Blender.

- **Wolves** are rebuilt as one smooth body, shaped from real wolf anatomy: a deep narrow chest and tucked waist, a straight back, long legs with the hind hock well off the ground, a thick ruff round the neck and throat, a broad skull with a long tapering muzzle, upright cupped ears, amber eyes, a full bushy tail, and claws on the paws. They use the same walk, run and bite animations as before, and every elemental wolf keeps its effects.
- **Bears** are a new model too, built like a grizzly: the shoulder hump as the highest point, a heavy deep barrel, thick legs on broad paws with long claws, a big round head with a dished face, a short muzzle and small round ears. They walk with a heavy rolling gait and rear up on their hind legs to maul.
- Both models are now animated with a proper skeleton, so legs, neck, head and jaw move as one flexible body.

## 2.12.7

Elemental monsters that flow, and see-through slimes.

- Monster element effects now give off soft light that blends and fades, instead of being built from solid shapes.
- Fire beasts carry flowing flame tongues that sway from root to tip, glow from deep orange to gold, and throw off embers. Burning enemies get the same flames.
- Ice beasts have sharp faceted crystal spines that catch the light, icicles hanging from the belly, glinting points, cold mist and drifting snow.
- Storm, venom and shadow beasts glow: sparks crackle off their nodes, venom pustules and drips shine, and shadow beasts trail violet motes.
- Slimes are now see-through gel in the colour of their element, with a glassy bright rim and a shine on top. You can see their glowing heart and whatever they've swallowed inside. The big cartoon face is gone; a pair of small eye-lights glows in the gel instead.

## 2.12.6

A clear line between chin and neck.

- The neck is now a slimmer column set back under the skull, so the chin and jaw stand out in front of it, with a visible underside running from the chin back to the throat. Before, the neck came as far forward as the chin and the two blurred together. Male characters also get a faint throat line.

## 2.12.5

Faces with real chins, and hats and helms that fit the head.

- Every character now has a proper chin and jawline. The lower face is a little longer, the chin stands forward under the lip with a soft dip above it, and the jaw narrows toward it.
- Mage hats now sit on the head. The Wizard Hat, Wide Hat, Crooked Hat, Magister Cap and Starcaller Hat were rebuilt in Blender around the actual head and hair. The band rides just above the brow and lower at the nape, and the crown follows the skull before rising into its shape, with no gap or floating box. The Magister Cap is now a softly rounded cap with two gentle peaks.
- Forged helms were rebuilt in Blender around the actual skull, face and chin:
  - The **Greathelm** follows the jaw and chin, with a sight split by a central keel, breathing holes on the right cheek and a riveted brow band.
  - The **Sallet** has a rounded skull with a tail sweeping over the nape, a sight slit, and a bevor that cups the chin and jaw.
  - The **Open Helm** has a nasal, and cheek plates that lie on the cheeks and stop short of the chin. The **Horned Helm** adds swept horns.
- Helm crests now lie along the crown instead of arching above it.

## 2.12.4

Sheaths rebuilt in Blender, a dragon-scale finish, a sheath for each blade when dual wielding, a proper flamberge, and a fixed spear grip.

- Every sheath is now one model built in Blender for its material. Leather is tooled and saddle-stitched. Wood shows its grain between riveted metal rails. Metal has rolled edges and engraved panels. Drakehide is covered in real overlapping dragon scales. Each finish is modelled onto that body and bent to fit the blade you carry.
- The Scaled finish now looks like dragon scale: rounded plates in staggered rows, each lapping over the one below it, domed with a soft ridge, dark where it tucks under and bright at its raised heart.
- Five new finishes: Knotwork, Engraved, Jewelled, Chain-bound and Thorned. There is also a new Chape choice for the tip of the sheath: Plain, Trefoil, or a Drake-head with gem eyes.
- The sheath bench now shows a real 3D view of the sheath you are designing, with your own sword in it.
- Dual wielding: the sheath bench has a Two blades row. Choose a Matching pair, or Separate to design and forge the off-hand blade's sheath on its own.
- The wavy-bladed swords, greatsword and daggers are now true flamberges. The spine stays straight and only the edges ripple, with a straight section above the guard and a straight point, instead of the whole blade snaking.
- Spears point forward again, with both hands on the shaft.
- Dual-wielded blades are held in an open fighting stance: arms out at the sides, elbows bent, both blades raised and angled outward.
- Enhanced gear now shows one level that counts up ("Silver Scythe +8") instead of a trail of numbers like "+2 +4 +5 +6 +7 +8". Items that already have a trail are tidied automatically.
- The chat box hides while a shop or menu window is open, so it no longer shows through them.

## 2.12.3

A natural flow for the fountain, and a movable chat box.

- The fountain's water now flows naturally instead of in neat circles. It turns slowly round the cradle (faster close to it) and drifts outward, carrying soft swirls of light and shadow with the current. Each drop that falls back from the sphere sends its own ripple out across the flow, and glints ride along with the water.
- The chat box is now one of the pieces in Move HUD: drag it anywhere and resize it with the − and + buttons or the mouse wheel, and it stays where you put it.

## 2.12.2

Real water in the Healing Fountain.

- The fountain's pool is now live water instead of a flat blue disc. Ripples run out across it from the cradle and from where the falling drops land, and it shades from deep blue-green in the middle to lighter, clearer water toward the rim, with a pale line of foam against the stone.
- Drops falling from the floating sphere splash where they hit, throwing up a small crown and a spreading ring.
- Glints of light flicker across the surface and caustic light wanders over it.

## 2.12.1

Spears held properly, and mining with a pickaxe.

- Spears are now held the way they were fought with: two hands spread on the shaft, the rear hand at the hip near the butt and the lead hand well forward, the point toward the foe at chest-to-face height, angled slightly in across the body.
- The spear attack is a proper thrust: a short draw back, then the rear hand drives the shaft forward through the lead hand as the point levels out, then it recovers. (Halberds keep their upright guard.)
- Mining is now done by hand. Your character puts their weapon away, turns to the vein, and swings a pickaxe (modelled in Blender) with both hands, raising it overhead and bringing it down into the rock in a steady rhythm, with chips and sparks flying on each strike.
- The Durn rune, ground ring and floating pickaxe are gone from mining. Picking herbs and flowers still uses the Fen spell.

## 2.12.0

New scabbards and a proper sword belt.

- Every scabbard is now a single model made in Blender, rather than a tube with fittings laid over it. It has a metal locket at the throat with a pointed lower edge and a set stone, hanger bands with D-rings, raised core-cord ridges under the leather, a tooled line with lozenges down each face, a stitched seam down the back edge, and an arched metal chape with a button at the tip. Swords, greatswords and daggers each have their own.
- The scabbard is fitted to the blade it holds as it is drawn, so it follows that blade's taper and any curve.
- Characters now wear a sword belt, also modelled in Blender: stitched leather with a buckle and hanging strap end, round studs across the back, and D-ring slides on each hip.
- Swords hang from the belt the way they were worn: on the hip opposite the sword hand, hilt forward and tip trailing back, held by a short strap from the front ring to the scabbard's upper D-ring and a longer one from behind the hip to its lower D-ring. The belt sits low on the hips and dips on the side carrying the sword. Daggers hang from a strap off the ring behind the hip.
- With two swords, each hangs on its own hip from its own hangers.

## 2.11.1

Elemental beasts are made of their element.

- The elemental wolves, spiders, bats and slimes no longer look like ordinary creatures with effects floating over them. Their bodies take the element themselves:
  - Fire: smouldering charcoal hide with ember-lit fur, glowing claws and a burning mouth; fire bats have molten wing membranes and the magma slime glows from inside.
  - Ice: frosted, faintly glowing crystal hide with ice-blue markings.
  - Storm: storm-grey bodies whose markings crackle and flicker with lightning.
  - Venom: sickly green hides with glowing toxic glands.
  - Shadow: near-black bodies veined with pulsing violet.
- Their flame manes, crystal spines, storm nodes, venom pustules and shadow wisps are now fixed to the creature's skeleton, so they move with its back, head and tail as it walks, lunges and flies instead of hanging in the air.

## 2.11.0

Text chat with other players.

- A chat box sits above your health and mana, with two tabs: **General**, which reaches everyone connected to the server, and **Party**, which only your party sees.
- Press Enter to start typing, Enter again to send, and Escape to put it away. Typing "/p" before a message sends it to your party, and "/g" sends it to General, whichever tab is open.
- What people say also floats over their heads for a few seconds when they are nearby.
- Tabs show a count of unread messages, and the box can be shrunk to just its tabs with the button in its corner.
- Party chat turns on as soon as you make or join a party and clears when you leave. General chat needs the online server (open the game from the launcher and connect).
- Messages are plain text, up to 160 characters, and there is a short pause between sends to keep the channel readable.

## 2.10.1

Gathering is now a spell.

- Mining ore calls Durn, the rune of Stone. The rune lights above the vein, a ring of runelight opens on the ground and fills as you work, and a rune-forged pickaxe appears between you and the rock and strikes it in time with the flying chips.
- Picking herbs and flowers calls Fen, the rune of Growth. Motes of growth spiral up around the plant and it slowly rises out of the earth, turning as it comes.
- When the work finishes, the harvest streams through the air into your hands.
- The progress bar names the rune at work (Durn for mining, Fen for gathering).

## 2.10.0

Elemental golems: their bodies are made of their element.

- Golems can now roll one of seven elemental forms, the same way wolves, spiders, bats and slimes do. Deeper floors make them more likely, and the zone tilts the roll (magma golems in the Ember Forge, tide golems in flooded halls, wood and runestone golems in overgrown places, ice and gold in the crystal caves).
- **Tide Golem** (water): a shimmering blue body with water streaming down it and ripples at its feet. Its hits chill.
- **Magma Golem** (lava): dark basalt split by glowing molten cracks, with embers rising off it. Its hits burn.
- **Tempest Golem** (storm): no legs; it rides a spinning tornado of cloud with lightning arcing through it. Its hits shock.
- **Rime Golem** (ice): pale crystal stone with frost spikes along its shoulders and back. Its hits chill.
- **Gilded Golem** (gold): a gold body with crystal clusters. Its hits shock.
- **Runestone Golem** (earth): grey stone with green-glowing rune seams and drifting spores. Its hits drain.
- **Mossbark Golem** (wood): bark and moss with leafy growth and hanging vines. Its hits poison.
- Each has its own elite name and tougher stats, and gives more experience.

## 2.9.4

Real dual-wield stances, and the stash's runes rearranged.

- Fighting with two weapons no longer points both straight ahead. Two swords take a high-low guard: the main blade raised with its point toward the foe, the off-hand blade held lower across the body to parry. Axes and maces are held low at the hips with their heads up, ready to chop, and a dagger in the off hand keeps its reverse grip.
- Attacks alternate: the main hand raises high and outside and cuts down across the body, then the off hand follows with its own cut.
- Main-hand axes and maces can now be paired with an off-hand weapon in the same way, each drawn as itself.
- The stash now carries Lume, Lot and Vor on the front, Brann on the left side and Tarn on the right, each linked into the ember channels. Where Tarn and Brann used to sit, the foot of the front and the top of the lid now hold eight-point star-metal stars with ember hearts.

## 2.9.3

Dual wielding looks right, and the stash wears the real runes.

- A weapon in the off hand is now drawn as itself. A second sword shows as that sword (it used to appear as a small dagger), and axes, maces and daggers in the off hand use their own models too.
- Two swords are held in a matching guard, both blades forward, and the off-hand blade cuts down from high outside.
- Each blade has its own scabbard. With two swords, one hangs on each hip and each is drawn across the body; an off-hand dagger rides at the back of the hip and an off-hand axe or mace hangs from the belt. Sheathing puts both weapons away.
- Longswords are always straight now. The four curved styles (Falchion, Sabre, Scimitar, Khopesh) were remodelled in Blender as the Broadsword, Sidesword, Knightly and Hand-and-a-half, so a crafted Longsword no longer comes out curved.
- The stash chest now carries the actual runes from the Rune Index, carved in their own colours: Lume at the top, Lot and Vor beneath it, Tarn at the foot and Brann on the lid.

## 2.9.2

A new personal stash, modelled in Blender.

- The stash in camp is now a tall chest of polished obsidian bound in star-metal, with star studs climbing its corners and faceted volcanic glass on its sides and back.
- Five carved runes glow in their own colours: Taen (ice blue) at the top of the front, Bruun (green) and Lat (violet) below it, Lumi (pale gold) at the foot, and Var (crimson) on the lid.
- Etched channels of ember light run round the whole chest and link the runes together, flickering softly.
- The lid swings up on its hinges while the stash window is open, with a warm glow inside and rune motes rising out of it.

## 2.9.1

Natural stone and real foliage in the dungeon.

- Cave and mountain walls are now layered rock outcrops modelled in Blender, with crevices, mossy ledges and scree at the foot, and stalactites hanging from many of them.
- Stone pillars are craggy fused stalagmite columns instead of smooth posts, and rubble piles and boulders are proper broken rock with moss caps.
- Trees, undergrowth and the forest walls now have leaves: clusters of individual leaves instead of round green blobs, on all three tree shapes and the fallen logs.

## 2.9.0

Gathering by hand, and rescues you have to bring home.

- Quest herbs and ore are no longer collected by walking over them. Walk up and press F (or click) to pick or mine: picking takes a moment, mining a little longer with sparks and rock chips, and moving or getting hit interrupts it. Ore sometimes gives two.
- Every gatherable has its own model, made in Blender from real references: Ashbloom is a flame lily with curled-back petals, Frostmoss a frosted cushion bristling with ice, Magma Bloom a charred succulent with a glowing heart, Glowcap a cluster of luminous mushrooms, Pearl Kelp waving ribbons with pearls, and Moonpetal a vine of white trumpet flowers. Ember Ore is rock studded with glowing nuggets, Rime Crystals a quartz-like cluster, Cinderite black rock with burning blades, Bog Iron rusty nodules among reeds, Sea Glass frosted pebbles and shells, and Star Shards a fallen star in its crater.
- Rescue quests now end in town. When you find the lost person they join you as an extra party member, with their own party frame and health bar: they follow you, rest to heal when it is quiet, and monsters will go after them. Bring them back to town alive to complete the quest. If they are struck down they flee back into the dark, and you can find them again on the same floor.

## 2.8.2

Blender remodel, part 8: hoods and shoulder pieces.

- The five hoods (hood, cowl, face hood, plague mask hood and cap) and the five shoulder pieces (mantle, shawl, short mantle, shoulder guard and leaf mantle) are reworked in Blender from their fitted shapes. The cloth now hangs in soft vertical drapery folds that deepen toward the hem, pushed outward so nothing sinks into the body, while trims, clasps, spikes, masks and lenses keep their shape.
- Hoods keep exactly how they bend between head and shoulders: each new point takes its weighting from the nearest point of the old hood.

## 2.8.1

Blender remodel, part 7: potions and the apothecary.

- Every potion is a Blender model, in the hand, on the belt, in the bag and on the shop shelves: corks with grain ridges and twine binding on the Minor and Lesser bottles, a wrapped paper label and a red wax seal with drips on the Greater, gilt ribs down every facet of the Grand decanter, little silver wings on the Swiftness collar, riveted bands and a lid loop on Ironskin, a fang stopper on Fury and a leaf tucked under the twine on Renewal. The liquid shows a surface through the glass.
- The apothecary's shelves and counter are dressed with Blender models: specimen jars with labels and something floating inside, skulls, a raven on its perch, candles with wax drips, stone mortars and pestles, wicker-wrapped carboys, brass balance scales with chains and pans, and an open recipe book with a ribbon.
- The cauldron's iron is darker, so the fire under it no longer washes it out.

## 2.8.0

A new zone: the Wildwood.

- The Wildwood is the ninth zone in the descent, floors 25 to 27 of each round. It is deep forest with no masonry at all: every cell is woods, glade or forest pool, built from the new Blender-modelled trees, trunks, stumps, ferns and mushrooms.
- No temple ruins under these trees. Instead the canopy breaks open more often in shafts of light, fairy rings of glowing mushrooms grow in the open clearings, and about a third of the great trees are elders, half again as big, ringed with glowing fungus round their roots.
- Its creatures are beasts of the wood: bears, wolves and spiders, with orcs, stone golems and wraiths deeper in.
- The zone rotation is now nine zones long, so from floor 28 onward each round's zones come one step later than before.

## 2.7.1

Blender remodel, part 6: scenery and the apothecary cauldron.

- Forest floors (Overgrown Temple) are dressed with Blender-modelled scenery: great trees with buttress roots, branches and leafy crowns stand in for pillars, trunks with spreading roots and bracket fungus line the woods, and the floor gets modelled stumps, mossy fallen logs, mushroom clusters (some glowing) and ferns.
- The Ember Forge gets modelled basalt: column clusters round a lava core for pillars, banks of hexagonal columns with lava in the seams along the walls, obsidian shards, smoking vents and toppled anvils with their chains.
- The apothecary's cauldron is a Blender model too: pot-bellied with a rolled lip, clawed feet and ring handles.
- Each piece is lightly reduced so whole floors stay smooth to render, and the old hand-built shapes remain as a fallback while the model pack loads.

## 2.7.0

Sheaths are one piece and hang from something.

- Scabbards are worked on both faces: studs, scales, stitching, filigree, runes, bone plates, cross-wrapping and glowing inlays now run down the back face as well as the front, so a greatsword on your back no longer shows a bare side.
- A greatsword's scabbard hangs from the baldric: short straps run from the strap to metal rings round the scabbard at the locket and a third of the way down. Axes, hammers, staves and bows carried on the back are held the same way, with straps and rings round the haft.
- Daggers and other belt-carried blades hang from a frog: a loop round the belt with a strap down to a collar round the scabbard's throat, instead of a loose block.

## 2.6.9

Blender remodel, part 5: mage hats.

- The Wizard Hat, Wide Hat, Crooked Hat, Magister Cap and Starcaller Hat are rebuilt in Blender: soft folded crowns whose tips flop backwards, wavy brims with gilt edging, banded hatbands with buckles, stitched patches on the Crooked Hat, a feather in the Wide Hat, gold orphreys, a jewel and hanging lappets on the Magister Cap, and stars sewn over the Starcaller Hat with a star at its tip.

## 2.6.8

Blender remodel, part 4: bows and crossbows. Every weapon in the game is now a Blender model.

- Shortbows, longbows and warbows rebuilt with flat, tapering limbs: the Recurve, Elven and Dragonhorn bows curl forward at the tips, the Horn bow is banded horn, the Bone bow is strung with vertebrae, the Lacquered bow is cloth-wrapped dark wood and the Ironshod warbow is banded in iron with runes down the limbs. Every bow has a ridged grip and bone or metal nocks.
- Crossbows rebuilt with a shaped stock, steel prod, rail, nut and trigger: the Arbalest adds a windlass and stirrup, the Repeater a magazine on top.

## 2.6.7

Blender remodel, part 3: staves, skull staves, wands and scythes.

- All 9 staves rebuilt in Blender: roots climbing the Rootbound staff to cradle a glowing seed, a curled Crook, a gilded Crescent moon cupping its gem, a gold Arcane Cage around an orb, a carved Totem with feathers, a Flame brazier, a cluster of Frost crystals, a rayed Sunburst ring and meshed Clockwork gears.
- Skull staves now carry modelled skulls with sockets, teeth and glowing eyes: a vertebra column on the Spine staff, curling horns on the Horned staff, and a lantern hanging from the Lantern staff's hooked arm.
- Wands: tapered, bone-jointed, twin-spiral and thorned, each with its own tip.
- Scythes: curved snaths with both hand grips, slimmer curved blades with polished edges; the Twin scythe has blades both ways, the War scythe a forged upright blade, the Bone snath is ringed with vertebrae, and the Winged, Grave and Halo scythes have their wings, skull and halo.

## 2.6.6

Blender remodel, part 2: every hafted weapon rebuilt in Blender.

- All 30 axes, greataxes, maces, warhammers, mauls, spears and polearms are now Blender models: forged axe heads that flare from a narrow neck to a curved, polished edge, bearded and crescent profiles, iron sockets and butt caps, wrapped grips with raised ridges, and iron bands on the longer hafts.
- Maces get real flanges, ribs and studs; the Morningstar and Spiked maul are covered in forged spikes; the Sceptre has a gilded crown holding a gem.
- Warhammers: the Lucerne has its pronged face, back spike and top spike, the War Pick a curved beak, the Crowned hammer gilded toothed faces. The Stonebound maul is a rope-bound boulder with a glowing stone set in it.
- Spears and polearms: leaf, winged, partisan and pike heads; the Halberd with hook and spike, the curved Glaive, the long-bladed Bardiche and the Poleaxe with hammer and spike.

## 2.6.5

Blender remodel, part 1: every blade weapon rebuilt in Blender.

- All 37 bladed weapons (Longswords, Short Swords, Holy Blades, Greatswords, Daggers, Shivs, Stilettos) are now modelled in Blender: proper diamond and fullered blade cross-sections with polished edges, curved blades that keep their shape along the curve, banded leather grips, bevelled guards and turned pommels with set gems.
- Distinct hilts per style: knuckle bows on the Sabre, Rapier and Parrying sword, a tsuba on the Nodachi, a disc guard on the Rondel, a finger ring on the Ring-hilt stiletto, a halo on the Haloed blade and gilded wings on the Seraphic blade.
- The Khopesh now has its sickle hook, the Kris and Ritual daggers their wavy blades, and the Northman, Cinquedea and Seraphic blades glowing runes in the fuller.
- Baked ambient occlusion on every new model.

## 2.6.4

Every skill gets its own icon.

- **Skill icons are redesigned so skills no longer look alike.** Before, every skill of the same element and kind
  shared one icon, so most of the 1,165 skills had a twin. Each icon is now built from the skill itself:
  - **A central symbol taken from the skill's name**, in its element's colours. There are about 45 symbols, for
    example:
    - a sword for slashes and strikes, a dagger for knives and darts, an axe, a hammer, a spear, an arrow;
    - a shield for wards and aegises, a heart for heals, a skull for death and dirges;
    - an eye for marks, chains for shackles, a swirl for wind, a burst for novas, a moon for shadow, a sun for holy;
    - a flame, a snowflake, a lightning bolt, a rock, a leaf, waves, a blood drop, a rune circle, a totem;
    - claws, a horn for bellows and challenges, a winged boot for dashes, an hourglass for haste, a crown for rallies,
      a ghost for summons, a music note for chants, and more.
  - **An overlay for what the skill does**: three copies for barrages and volleys, rays for novas, a ground ring for
    auras and zones, speed lines for dashes, drips for curses and poisons, a wall base for barriers, chain links for
    chains.
  - **A frame shape for its family**: round for strikes, a hexagon for areas, a diamond for control, a shield crest
    for guards, a petal ring for heals, a star for buffs and a square for summons.
  - **A small second badge** when the name has two ideas in it, so Frost Lance and Frost Nova differ beyond their
    main symbol.
  - **A background pattern and a pip count taken from the name**, so even two skills with the same symbol and element
    look different.
- Skills that already had a hand-made emblem keep it.
- The new icons appear everywhere: the skill tree, the action bar, tomes and tooltips.

## 2.6.3

Dual wielding.

- **Rogues, Warriors and Spellblades can carry two one-handed weapons.** Select a one-handed sword, dagger, axe or
  mace in your bag and press **Off hand** (next to Equip) to carry it in your left hand. Your main weapon must also
  be one-handed.
  - The off-hand weapon adds **60% of its damage** and **all of its other stats**.
  - Fighting with two weapons is **8% faster**.
  - The off-hand weapon is drawn in your left hand with its own full model.
  - Equipping a two-handed main weapon, or a shield, orb or other off-hand item, sends the off-hand weapon back to
    your bag with its normal stats. So does changing to a class that can't dual wield.

## 2.6.2

Each heal-over-time shows its element.

- **Elemental recovery effects.** Fire Recovery, Storm Recovery, Frost Recovery and every other element's
  heal-over-time keep the turning spiral of healing light around you, now tinted to the element, with that element's
  own particles rising through it:
  - **Fire**: embers rise.
  - **Ice / Frost**: snowflakes drift down.
  - **Water**: droplets swirl.
  - **Lightning / Storm**: sparks crackle.
  - **Earth**: grit and green shoots kick up.
  - **Wind**: gusts whip round.
  - **Arcane**: blue and violet motes.
  - **Shadow**: violet smoke.
  - **Holy**: white-gold light rises.
  - **Death**: violet and green wisps.
  - **Nature**: leaves drift down.
- A regen you put on a party member still shows the healing spiral on them, in the default green.

## 2.6.1

Salvage straight from your bag, and better materials make better gear.

- **A salvage bar in the Satchel.** You no longer have to walk to the salvage wheel to break gear down:
  - **Select to salvage**: click gear to tick it, or use the quick picks to tick every Common, Magic or Rare piece (and
    Legendary+ in town), then press **Salvage selected**.
  - **Salvage all**: breaks down everything that matches the rarities you tick underneath it. These are the same rules
    the salvage wheel uses.
  - Locked and equipped gear is never included. Outside town, Legendary and better pieces are greyed out and left
    alone, as before.
  - Salvaging anything Legendary or better asks you to press again to confirm.
  - A message lists what the salvage gave you.
- **Material quality now matters, in cost and in power.** Every craft now has a material quality, worked out from the
  tiers of all its materials, with the main part counting most:
  - **Base stats** scale with quality, from −18% for tier I materials to +48% for tier V. Before, only the main
    material counted, over a smaller range.
  - **Each material's own bonuses** (the extra stats it adds) are up to 72% stronger at tier V.
  - **Each material's own effects** (Burn, Chill, Shock and so on) are up to 60% stronger at tier V. The usual caps
    still apply.
  - **The forging fee** rises with quality, from ×0.75 for tier I to ×1.47 for tier V.
  - The workbench preview shows the quality tier, the stat change and the fee multiplier before you forge.

## 2.6.0

Fixes for gifts at benches, the skill card and subclass hats.

- **Receiving a gift no longer closes your bench or shop.** A gift arriving while you were at a workbench, the forge or
  a shop window used to swap that window for your bag, throwing away a craft in progress. Now the gift goes quietly
  into your bag with its message, and only the Folio, if that's what you have open, refreshes. The same fix covers
  returned gifts and belt changes.
- **The skill card stays inside the book.** Clicking a skill near the right edge of the tree put its card half off
  the page, over the other panel. The card now opens beside the skill on whichever side has room, never past an
  edge. If it's taller than the page, it scrolls inside itself, and its close button no longer sits on the title.
- **Your helm shows the helm you wear.** Subclasses with their own signature headwear (Spellblade, Red, Green and Black
  Mage and others) replaced any equipped hat or circlet with that signature piece. A Magister Cap could show up as a
  laurel or a pointed hat. Now the subclass headwear appears only when you wear no helm, and an equipped helm always
  shows its own model. Hair and eye colours from the subclass still apply.

## 2.5.9

The Ember Forge is now volcanic.

- **The Ember Forge floors (19 to 21, and each time the zone comes round again) are the inside of a volcano.** Before,
  they were dark brick tinted red:
  - **Walls** are hexagonal basalt columns of different heights, with lava glowing in the seams and now and then
    dribbling down the face into a glowing pool. Obsidian spikes stand at their feet.
  - **The ceiling** is black rock split by glowing fissures, hung with spires that drip lava.
  - **The floor** is cracked basalt with lava veins running across it, smoking vents with glowing mouths, obsidian
    shards, slag heaps and drifts of ash.
  - **The old forge** is still there in ruins: broken furnace mouths in the walls still glowing, and toppled anvils
    with lengths of rusted chain.
  - **Pillars** become clusters of basalt columns around a core of lava.
  - **Lighting:** the lava, vents and furnaces now cast warm light, and the zone's light is brighter and redder, so
    you can see where you're going.
- **Ember rooms elsewhere**, such as the last room of other floors, get the same volcanic look.

## 2.5.8

Monster spells are redrawn, and humanoid monsters get more distinct faces.

- **Monster spells look like what they are:**
  - **Wraiths** throw a wailing ghost-skull with glowing pupils and a swirling tail.
  - **Cultists** throw a barbed blood orb that sheds drops.
  - **Oozes** throw a quivering glob with bubbles inside.
  - **Skeletons** throw a spinning bone wreathed in green grave-fire.
  - **Golems** throw a cracked boulder that sheds grit.
  - **Wolves** throw three glowing claw rakes.
  - **Bats** shriek widening rings of sound.
- **Humanoid monsters are easier to tell apart:**
  - **Goblins** have a heavy brow, warts, a crooked nose ring, brass hoops down each ear, a scar and a necklace of
    teeth and beads.
  - **Orcs** have a heavy brow, black war paint and red chin stripes, chipped tusks, a bull nose ring, iron ear hoops,
    a scar, a braided beard with bone beads and a necklace of claws.
  - **Cultists** have a glowing brand on the brow inside the hood and a bone mask over the jaw.
  - **Wraiths** have eye-light trailing back into the hood and a torn veil.

## 2.5.7

Real mage hats.

- **Three new mage hats**, each modelled to fit the head:
  - **Crooked Hat**: a tall crown that leans back and droops at the tip, with a wavy brim, a buckled band, a sewn-on
    patch and a little bell-star hanging from the tip.
  - **Magister Cap**: a stiff gold-trimmed band with a set gem at the front, under a soft crown that puffs out over it,
    and a gold tassel on a cord.
  - **Starcaller Hat**: a tall cone over an upturned, trimmed brim, with stars on the crown and a crescent moon at
    the tip.
- **Circlets are now rare for Mages.** Mage helms drop as the Wizard Hat, Wide Hat or one of the new hats most of the
  time. The Circlet is about one helm in eleven.
- **The smith can make all six Mage helm patterns**, including the new hats.
- A Mage helm now always looks like what its name says.

## 2.5.6

Monster elements, mutations and ailments are redrawn.

- **Elemental beasts wear their element.** The fire, ice, storm, venom and shadow variants of wolves, spiders, bats
  and oozes now show their element clearly:
  - **Fire** (Cinderfang and kin): a flickering flame mane down the back, a burning tail, glowing ember cracks along
    the flanks and burning eyes. Embers drift up off them.
  - **Ice** (Rimefang and kin): crystal spines down the back, a frost coat, snowflakes circling the body and icy eyes.
    Snow sifts off them.
  - **Storm** (Thunderpaw and kin): glowing conductor nodes along the spine with arcs crackling between them, the odd
    bolt to the ground, and sparks circling.
  - **Venom** (Bogstalker and kin): pulsing pustules, venom dripping from the belly and glowing eyes.
  - **Shadow** (Duskhowler and kin): smoke rising off the back, shadow trailing from the tail and violet eyes.
- **Mutated wanderers look mutated:**
  - **Bloodsurge**: glowing veins, orbiting blood drops and a pulsing pool at the feet.
  - **Crystal-Grown**: crystal clusters on the shoulders and back, with shards orbiting.
  - **Voidtouched**: two counter-rotating void rings and a rift eye watching over the head.
  - **Plague-Ridden**: boils, a cloud of flies and gas puffing at the feet.
  - **Stormborn**: a little thundercloud overhead throwing bolts down, and arcs on the body.
- **Elemental floor bosses** wear a crown of their element (flames, ice spikes, crackling nodes, radiant rays,
  floating stones or rising smoke) and a ring of it at their feet.
- **What your hits do now shows on the monster:**
  - **Burning**: flames lick up the body.
  - **Chilled**: ice crystals grow on it and the ground under it freezes.
  - **Stunned or shocked**: arcs crackle round it and stars circle its head.
  - **Poisoned**: green bubbles rise off it.
  - **Bleeding**: blood drips, more with each stack.
  - **Lowered defence**: violet cracks show on its body.

## 2.5.5

Forest floors: the Overgrown Temple is now a real forest, and forest glades grow into other dungeons.

- **The Overgrown Temple is a forest.** On floors 7 to 9 (and each time the zone comes round again) the halls are no
  longer green-tinted brick. They are woods:
  - Walls are deep forest, fronted by tree trunks with spreading roots, moss, bracket fungi, undergrowth and leafy
    masses at every height. Vines hang from the canopy edge.
  - The ceiling is a leaf canopy with hanging clumps and vines, and gaps where light comes through.
  - The floor is grass and moss, dressed with grass tufts, ferns, wildflowers, red and pale mushrooms, glowing
    blue-green and violet mushrooms, stumps, fallen mossy logs and roots creeping out from the trees.
  - Pillars become great trees with buttress roots, branches and their own crowns.
  - The temple the forest swallowed still shows through: broken columns, toppled column drums and mossy slabs.
  - Reeds grow at the water's edge.
  - Some rooms in the zone are still temple halls, so you move between ruins and woods.
  - Forest floors are lit a little brighter, with a greener haze, so the woods read clearly.
- **Forest glades elsewhere.** On any floor outside the forest and the Ember Forge, a room now and then has become a
  forest glade, opening straight off the brick corridors.

## 2.5.4

A capes-and-shawls fix and a rebuilt Ashbloom Apothecary.

- **Capes no longer poke through shawls and mantles.** When you wear a mantle, shawl or spiked mantle with a cape, the
  cape now tucks underneath it and hangs free below its edge. The cape's top band, shoulder straps and collar clasps
  are tucked away under the shoulder piece too, so nothing shows through it.
- **A real cauldron.** The middle of the apothecary now has a pot-bellied iron cauldron:
  - It stands on three clawed feet, with a cast band of rivets, ring handles and a rolled lip.
  - A green brew bubbles inside with froth at the rim, and a wooden ladle is propped in it.
  - It sits over a crossed-log fire with glowing embers, inside a ring of hearth stones.
  - A stool with a sack of herbs and a banded bucket stand beside it.
- **An apothecary cabinet behind Mother Ashbloom.** A tall cabinet now fills the back wall:
  - Below is a chest of labelled drawers with brass knobs.
  - Above are shelves of books with gilt bands, specimen jars (some with something floating in them), bottles, skulls,
    scrolls, mortars and candles.
  - Big stoppered carboys and a stuffed raven sit on top, herb bundles hang from the carved cornice, and a library
    ladder runs on a brass rail.
- **A dressed counter.** The counter now holds brass scales, an open recipe book, a mortar and pestle, a jar of
  powder, a small rack of vials and a candle at each end.

## 2.5.3

Roomier shops, party members inside them, and new potion models.

- **A bigger Cinder Forge.** The forge is now 960 by 760, so every bench has room to walk around and use.
  - The anvil and the Dragonforge are on the left, the workbench and recipe racks on the right, and the crystal altar
    and material stores sit by the counter.
  - The breaking wheel, the lectern, the sheath bench and the enchanting altar line the front by the door.
  - Four hanging lanterns light the larger room.
  - Ask Brannoch "Where is everything?" for directions to the new layout.
- **Shop instances for parties.** Party members inside the same shop can now see each other, with name tags, walking
  around the room.
  - Players outside your party never appear inside your shop.
  - The town's notice board and the musician's stage no longer show up inside shop rooms.
  - In town, a player who is in a shop still appears at its door, as before.
  - When a party member walks in, a short message tells you.
- **New potion models, one per potion.** Each potion is now a single solid bottle with glass, liquid, cork, seal and
  metal fittings, and its size matches its grade:
  - **Minor** is a small vial.
  - **Lesser** is a round flask tied with twine.
  - **Greater** is a tall bottle with a label and a red wax seal.
  - **Grand** is a large faceted decanter with gilt bands and a glowing gem stopper.
  - The elixirs each have their own shape: a slim teardrop for Swift Tonic, a banded iron jar for Stoneskin Draught, a
    long-necked flask with a bone stopper for Fury Draught, and a gourd for Regen Salve.
  - The same models appear on the apothecary's stands (turning slowly, faster when you hover one), on dropped loot,
    and as the icons in your bag, belt and shop windows. Smaller grades draw smaller in their icons.
- **Shop windows show wares on display.** Each item sits in a larger card, in a lit niche on a small pedestal, with the
  price on a brass tag.

## 2.5.2

Every bench has its own menu, and the shop windows get a detail pass.

- **One menu per bench.** Inside a shop, each bench, board and counter opens only its own window: no tab bar, and no
  "Other stalls" button. Walk to the bench you need. A brass plaque at the top of the window names the bench you are at.
- **New benches in the Cinder Forge,** for the work that had no bench of its own:
  - **The breaking wheel** (left of the door): a breaking block with a vise, a treadle grindstone, a barrel of broken
    blades and a scrap heap. Salvage.
  - **The material stores** (back right): shelves of ingots, leather rolls and cloth bolts, a tray of gems, crates and
    a barrel. Materials.
  - **The recipe lectern** (right of the door): an open book by candlelight and a basket of scrolls. Recipe Book.
  - **The crystal altar** (left of the counter): a stepped stone plinth ringed with runes, a crystal cluster, and a
    crystal that floats and turns above it. Crystals.
  - The workbench, recipe racks, anvil, Dragonforge, sheath bench and enchanting altar keep their work.
- **New benches in the Guildhall:**
  - **The ledger desk** (left of the counter): the great ledger, inkwell and quill, candle and chair. My Quests.
  - **The bounty board** (left of the door): wanted posters with red seals under a monster skull. Bestiary Bounties.
  - **The guild armory** (back right): a weapon rack and an armor stand in guild colours. Guild Shop.
  - The Quest Board, Muster Board and store stall keep their work.
- **Keepers point the way.** Brannoch, Maren and Old Pell no longer open every bench from the conversation; ask them
  "Where is everything?" and they tell you where each bench stands.
- **The camp menu is a directory** of every stall and what it does, with Save game. It no longer jumps you into shops.
- **Shop and bench windows, more detail, same design:** filigree in all four corners and a crest at the top, a fine
  leather grain and vignette, a turning rune ring round the keeper's medallion, a flourish under the title, bevelled
  chips, riveted panels, engraved section headings, item cards with a lift and a sweep of light on hover, gilt-edged
  buttons with an ember sheen on the main ones, inset bars and a matching scrollbar. The conversation box matches.

## 2.5.1

Armor overhaul, part 2: shoulders, fur and bracers.

- **Fixed: class shoulder pads poking through modelled shoulder gear.** A class's own default pads were still drawn
  inside mantles, shawls, spiked mantles, shoulderguards and leaf pads, showing as a pale dome on top of them. They
  now only appear when no shoulder piece is worn.
- **Leather Shoulderguards remodelled.** The old guard was a dome on three flat bands stacked straight down, like a
  hamburger. It is now a domed cop over the shoulder with three lames that tilt and step outward down the arm, each
  with a darker rolled edge and rivets fore and aft.
- **Spaulders and leather shoulder pads** step down the slope of the arm with shadowed, overlapping edges instead of
  stacked discs with pale rims.
- **Fur collars and fur trims are layered pelts:** a dark underlayer, staggered tufts of different sizes and lie, and
  tapering locks in two uneven rows with lighter tips. Before they looked like a ring of foam with drips. Fur on
  shoulder pieces is a ruff of tufts instead of one round bun.
- **Bracers and glove cuffs fit the forearm.** They were scaled about 20% past the arm and looked like tubes. Bracers
  also gain two lacing straps and a slight crease.

## 2.5.0

Armor overhaul, part 1: cloth that hangs, and a bow fix.

- **Robes and coats hang in folds.** Skirts ripple into soft folds that deepen toward the hem, and the hem trim follows
  them. The front opening and its trim stay flat. Capes still fall outside the folds, never through them.
- **Trousers and leather boots crease.** Cloth trousers show gentle creases down the thigh and shin, and leather boot
  shafts slouch at the ankle. Plate worn over them still fits cleanly outside.
- **Metal armor is a deeper tone,** so plate, pauldrons and helms catch highlights instead of looking flat.
- **Fixed: bows held by a fat barrel.** In 2.4.9 the new wound grip on shortbows, longbows and warbows came out four
  times too thick (the grip sits in front of the limbs and its size was measured from the wrong point). Bows have a
  slim wound grip now. Scythes, which have two grips, keep their original handles.

## 2.4.9

Weapon overhaul, part 4: staves and ranged weapons.

- **Staves, skull staves, wands, shortbows, longbows, warbows and crossbows** (27 styles) get wound leather grips, wood
  grain on their shafts and limbs, and baked shadowing around their heads, cages, nocks and fittings.
- Every weapon in the game has now had the overhaul pass.

## 2.4.8

Weapon overhaul, part 3: hafted weapons, and depth on every weapon so far.

- **Maces, warhammers, war mauls, spears, halberds and scythes** (24 styles) get wound leather grips and visible wood
  grain on their hafts.
- **Baked shadowing on 74 weapons.** Every axe, blade and hafted weapon now carries ambient occlusion: sockets, guards,
  flanges, spikes and the joins between parts darken naturally, so the models read as solid forged pieces instead of
  evenly lit shapes.

## 2.4.7

Weapon overhaul, part 2: every blade. Swords, short swords, holy blades, greatswords, daggers, shivs and stilettos
(37 styles) keep their shapes and gain detail:

- **Wound leather grips** with raised spiralling ridges replace the smooth grip cylinders.
- **Tonal steel:** each blade is darker along its spine and fuller and brightens toward the bevel, with a polished
  cutting edge, so the cross-section reads at a glance.
- **Steel reflections are less orange.** The warm horizon reflection added in 2.4.6 is toned down, so blades stay
  steel-coloured in firelight.

## 2.4.6

Weapon overhaul, part 1: axes and greataxes, and steel that looks like steel.

- **Every axe and greataxe is remodelled** (Bearded, Twin-bit, Crescent, Hatchet, Francisca, Dwarven and Spiked
  axes; Bearded, Twin-bit and Executioner greataxes):
  - Blades are now wedges, thick at the eye and ground down to a polished, bevelled cutting edge, instead of flat plates.
    The steel darkens toward the eye like forged metal.
  - Heads join the haft along the full height of a forged eye with flared lips, and iron langets are riveted down the
    haft.
  - Hafts taper and swell, show wood grain and end in an iron butt cap. Grips are wound leather with stitched collars
    (gilt on Magic and above).
  - Gems sit in proper settings on Rare and above, and runes are inlaid in the cheeks on Legendary and above.
- **Steel reads as steel on every weapon.** Metal reflects a darker sky with a warm horizon, faces seen head-on are
  darker than faces seen at an angle, and blades are a deeper steel so their bright edges stand out. Before, swords,
  axe heads and mace heads looked flat cream-white in warm light.

## 2.4.5

- **Enchanted weapons, upgraded.** Every enchanted weapon keeps its soft glow along the edge, now with a bright core
  line, and each element has its own effect on top:
  - **Fire:** flames up the blade and rising embers.
  - **Ice:** cold mist and drifting frost crystals.
  - **Lightning:** arcs crackling along the blade and jumping off it.
  - **Water:** a stream spiralling around the blade.
  - **Wind:** two thin gusts winding around it.
  - **Earth:** grit and pebbles falling away.
  - **Nature:** a twining vine of light and drifting spores.
  - **Shadow and Death:** dark purple or sickly green flames.
  - **Holy:** a radiant edge with sparkling glints.
  - **Arcane:** motes orbiting the blade on a turning ring.

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
