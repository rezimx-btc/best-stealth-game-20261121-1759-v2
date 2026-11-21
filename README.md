# SHADOW PROTOCOL

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rezimx-btc/best-stealth-game-20261121-1759-v2/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rezimx-btc/best-stealth-game-20261121-1759-v2/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down stealth game. You are **Wren**, infiltrating the **Meridian Archive**
to steal its data cores and slip out unseen.

## How to play

- **3 levels** — The Lobby, The Gallery, The Vault. Each level: collect **3 glowing
  data cores**, then the exit door opens. Reach the exit unseen.
- **Guards patrol with vision cones** — calm tan, red when alert, `?` when
  suspicious, `!` when they see you. Guards patrol, get suspicious, chase,
  search your last seen point, then return to patrol. Suspicion decays when
  you break line of sight, so you can recover.
- **Shadow zones hide you** — stand still or sneak inside a dark pool and the
  panel shows **HIDDEN**: guards cannot see you there.
- **Noise matters** — moving at full speed makes noise rings that guards walk
  over to investigate. **Shift** sneaks: slow and silent.
- **Coin throw** — click anywhere to toss a coin: a clink and a visible noise
  ring pull the nearest guard to that spot.
- **Smoke (Q)** — a puff that blinds vision cones for ~3 seconds. 3 per level.
- **Security cameras** (levels 2–3) sweep the halls with a second kind of cone.
- **Rating per level** — GHOST (never seen, +500), SHADOW (seen but escaped,
  +250), SPOTTED (caught). Cores are +100 each.

## Controls

WASD move · Shift sneak · click throw coin · Q smoke · R restart · M mute

## Run it

Serve this folder with any static server and open `game/index.html` in
desktop Chrome. No network requests, no build step — all files are local.

```
python3 -m http.server
```

## Screenshots

`01-cover.png` mid-gameplay, `02-hide.png` HIDDEN in shadow,
`03-alarm.png` red cone + `!` + CLOSE!, `04-exit.png` level clear.

Entry for the [best stealth game bounty](https://make.fun/bounty/best-stealth-game-20261121-1759) on make.fun.
