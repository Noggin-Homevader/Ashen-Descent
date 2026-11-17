# Ashen Descent changelog

Each release's section becomes its release notes in the launcher. Add a section for the new version before tagging.

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
