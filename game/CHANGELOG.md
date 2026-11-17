# Ashen Descent changelog

Each release's section becomes its release notes in the launcher. Add a section for the new version before tagging.

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
