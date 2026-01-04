# 711BF Gaming - Active Tasks

## In Progress
- [ ] **Modularize game.js** - Split ~1700 line file into modules:
  - `config.js` - Game config, constants, class/pet definitions
  - `player.js` - Player creation, movement, customization
  - `world.js` - Buildings, farm plots, fishing pond, NPCs
  - `ui.js` - Dialogs, menus, character creation screens
  - `multiplayer.js` - Colyseus connection, other player sync
  - `systems.js` - Farming, fishing, cooking, shop mechanics

## Next Up (Phase 2 - Multiplayer)
- [ ] Sync farm plots between players
- [ ] Persist world state to JSON file
- [ ] Sync day/night cycle from server

## Completed This Session
- [x] Basic multiplayer - see other players moving ✅
- [x] Traefik reverse proxy with HTTPS ✅
- [x] Let's Encrypt certificates ✅
- [x] Structured logging with Pino ✅

## Features (Backlog)
- [ ] Interior scenes for buildings
- [ ] More NPC characters with schedules
- [ ] Quest system basics
- [ ] More cooking recipes (unlockable via quests)
- [ ] Weather system
- [ ] Seasonal changes

## Polish
- [ ] Sound effects
- [ ] Background music
- [ ] Particle effects for actions
- [ ] Screen transitions

## Ideas (Someday/Maybe)
- [ ] Multiplayer prototype
- [ ] Mobile touch controls
- [ ] Controller support

---
*See DONE.md for completed features and implementation notes*
