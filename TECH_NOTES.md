# 711BF Gaming - Technical Notes

## Platform Decisions

| Platform | Status | Notes |
|----------|--------|-------|
| **PC (Steam)** | Primary | Main target platform |
| **Web Browser** | Prototype | For early testing and iteration |
| **Nintendo Switch** | Maybe later | TBD |
| **Xbox** | Maybe later | TBD |

---

## Development Path

```
Phase 1: Web Prototype    →    Phase 2: Core Game    →    Phase 3: Full MMO
(prove it's fun)               (real engine)              (servers, scale)
```

---

## Phase 1: Web-Based Prototype

### Goal
Build a playable prototype to test core mechanics before investing in full development.

### What to Prototype First
1. **Movement & Controls** - Does it feel good to move around?
2. **Combat basics** - Simple attack/ability system
3. **One puzzle type** - Environmental puzzle to test the feel
4. **NPC interaction** - Talk to an NPC, see their schedule
5. **Crafting basics** - Gather → Craft → Use loop

### Recommended Tools for Beginners

#### Option A: Phaser.js (2D)
- **What**: JavaScript game framework for 2D games
- **Pros**: Easy to learn, tons of tutorials, runs in browser
- **Cons**: 2D only (but great for testing mechanics!)
- **Good for**: Quick prototyping, learning game dev basics
- **Get started**: https://phaser.io/

#### Option B: PlayCanvas (3D)
- **What**: Web-based 3D game engine with visual editor
- **Pros**: Drag-and-drop editor, real 3D, free tier available
- **Cons**: Less flexible than code-only solutions
- **Good for**: 3D prototyping without heavy coding
- **Get started**: https://playcanvas.com/

#### Option C: Godot with HTML5 Export (2D/3D)
- **What**: Full game engine that can export to web
- **Pros**: Free, open source, can grow with your project
- **Cons**: Steeper learning curve than Phaser
- **Good for**: Starting small but building toward the real game
- **Get started**: https://godotengine.org/

### Our Recommendation
Start with **Phaser.js** for quick 2D prototypes OR **PlayCanvas** if you want 3D from the start. Both are beginner-friendly and run in the browser.

---

## Phase 2: Core Game Development (Future)

### Engine Options for Full Game

| Engine | Pros | Cons | Best For |
|--------|------|------|----------|
| **Godot** | Free, lightweight, beginner-friendly | Smaller community than Unity/Unreal | Indie teams, learning |
| **Unity** | Huge community, tons of assets | Can be complex, licensing changes | Most game types |
| **Unreal** | Gorgeous graphics, powerful | Steep learning curve, heavy | AAA-quality visuals |

### Languages
- **Godot**: GDScript (Python-like) or C#
- **Unity**: C#
- **Unreal**: Blueprints (visual) or C++
- **Web (Phaser/PlayCanvas)**: JavaScript/TypeScript

---

## Phase 3: MMO Infrastructure (Future)

### What MMO Requires
- **Server hosting** - Where the game world lives
- **Database** - Player data, inventories, world state
- **Networking** - Real-time player sync
- **Authentication** - Account system, login
- **Scalability** - Handle many players

### MMO Backend Options (Research Later)
- **Colyseus** - JavaScript multiplayer framework
- **Photon** - Popular game networking
- **PlayFab** - Microsoft's game backend
- **Custom servers** - Full control, more work

### Scale Considerations
| Server Size | Players | Complexity | Recommended Start |
|-------------|---------|------------|-------------------|
| Small | 10-50 | Manageable | ✓ Start here |
| Medium | 100-500 | Moderate | Phase 2 goal |
| Large | 1000+ | Complex | Long-term dream |

---

## Tools We'll Need

### For Prototyping (Phase 1)
- [ ] Code editor (VS Code - already have!)
- [ ] Web browser for testing
- [ ] Phaser.js OR PlayCanvas account
- [ ] Basic image editor for placeholder art (free: GIMP, Photopea)
- [ ] Version control (Git - already have!)

### For Full Development (Later)
- [ ] Game engine (Godot/Unity/Unreal)
- [ ] Art tools (2D and/or 3D)
- [ ] Sound/music tools
- [ ] Project management tool

---

## Learning Resources

### Game Dev Basics
- **YouTube**: Search "[engine name] beginner tutorial"
- **itch.io**: Free game assets for prototyping
- **OpenGameArt.org**: Free sprites, sounds, music

### Phaser.js Specifically
- Official tutorials: https://phaser.io/tutorials
- "Making your first Phaser 3 game" (official guide)

### PlayCanvas Specifically
- Official tutorials: https://developer.playcanvas.com/tutorials/
- Built-in editor makes it visual and approachable

### Godot Specifically
- Official docs: https://docs.godotengine.org/
- GDQuest YouTube channel (excellent tutorials)

---

## Questions to Answer Before Coding

1. **Art style**: What does the game LOOK like? (affects tools)
2. **2D or 3D**: Impacts everything - start with one
3. **Scope of prototype**: What's the MINIMUM to test if it's fun?
4. **Team skills**: Who's doing what? (code, art, design)

---

## Runtime Stack

### Server Runtime: Bun
- **What**: Fast JavaScript/TypeScript runtime (replaces Node.js)
- **Why**: Native TypeScript execution (no ts-node), faster package installs, official Colyseus 0.15+ support
- **Install**: `powershell -c "irm bun.sh/install.ps1 | iex"`
- **Location**: `~/.bun/bin/bun.exe`

### Python Runner: uv
- **What**: Fast Python package manager and runner
- **Why**: Faster startup, consistent tooling with modern Python ecosystem
- **Install**: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
- **Location**: `~/.local/bin/uv.exe`

### How They're Used
- **Colyseus Server**: `bun run dev` (in `server/` directory)
- **HTTP Static Server**: `uv run python -m http.server 3000` (in `prototype/` directory)
- **Traefik**: Native executable for HTTPS reverse proxy

---

## Decisions Made

### Prototype Approach: 2D with Phaser.js
- **Why 2D**: Beginner-friendly, faster to prototype, focus on mechanics
- **Why Phaser.js**: Easy to learn, runs in browser, great tutorials, JavaScript-based
- **Goal**: Prove the core gameplay is fun before going 3D

---

## Next Technical Steps

1. [x] Decide: 2D prototype or 3D prototype? → **2D**
2. [x] Pick a tool → **Phaser.js**
3. [ ] Set up development environment (VS Code + live server)
4. [ ] Follow Phaser.js beginner tutorial
5. [ ] Build simplest possible prototype (movement + one mechanic)
6. [ ] Iterate and add more features

---

*Last updated: 2026-01-04*
