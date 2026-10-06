# GAME PROJECT — MASTER PLAN
### Working title: *NIGHTFALL SURVIVORS* (placeholder — prakhar picks the final name)

> A Vampire-Survivors-like: one-thumb survival gameplay, web-first, built for virality,
> wrapped to APK for the Play Store. Quality-first build, 50–100k lines, no deadline —
> quality gates decide when each phase is done.

---

## 1. VISION

**The game:** Top-down arena survival. You move (one thumb / joystick), your weapons
fire automatically, hordes come in waves, you collect XP gems, level up, draft upgrades,
survive as long as possible. Session length 10–20 minutes. Instantly understandable,
infinitely replayable — the genre's proven formula.

**Why this game:**
- Perfect for agents: systems-driven, procedural-friendly, no hand-made story content needed
- Perfect for mobile: one-thumb controls, short sessions, portrait-friendly
- Perfect for virality: "I survived 24 minutes" screenshots beg to be shared on WhatsApp
- Proven market: the genre has multiple mobile hits; the formula is de-risked

**Success criteria (in order):**
1. A playable web link anyone can open in 3 seconds — no install
2. It *feels* good (juice, screenshake, game feel — verified by human playtest)
3. 60fps with 300+ enemies on a mid-range phone
4. Wrapped APK on the Play Store
5. Live-ops running (daily challenges, content drops)

---

## 2. TECH STACK

| Layer | Choice | Why |
|---|---|---|
| Game | TypeScript + HTML5 Canvas, small custom engine | Full agent control, zero framework API-drift risk, instant rebuilds, headless screenshot verification |
| Art | Procedural (code-generated) + CC0 packs | No hand-made assets needed; flat-shaded vector style, trendy and achievable |
| Audio | WebAudio procedural synth + CC0 | No licenses, tiny footprint |
| Backend (light) | FastAPI + Postgres (or Vercel KV) | Leaderboards, daily challenges, remote config only — kept minimal |
| Web deploy | Vercel | Instant viral link |
| Mobile | Capacitor wrap → APK/AAB | One codebase → Play Store |
| Automation | n8n (4 chore workflows) | Deploy pipeline, nightly content, notifications, daily challenge rotation |
| Version control | GitHub (single repo, all systems) | The shared source of truth every tool works from |

**Why not Unity:** iteration speed. Unity batch builds take minutes; web rebuilds are
instant and agents verify via headless screenshots in seconds. For a 2D game at this
scale, Canvas hits 60fps easily. Unity's native-performance edge doesn't matter here;
iteration speed does.

---

## 3. ARCHITECTURE (modules — each becomes a wave workstream)

1. **Core engine** — game loop, state machine, object pooling (critical: hundreds of enemies), event bus, save system (localStorage + cloud sync)
2. **Player & input** — touch joystick, keyboard fallback, movement, collision
3. **Weapons system** — data-driven: weapons defined as data files, upgrade paths, evolutions (weapon + passive = evolved form — the genre's core hook)
4. **Enemies & director** — enemy types as data, wave director (difficulty curve over time), elites, bosses
5. **Combat & progression** — damage numbers, HP, XP gems, magnet, leveling, 3-card upgrade draft UI
6. **Procedural art** — code-generated sprites/effects in one consistent flat-shaded style
7. **Juice** — screenshake, hitstop, particles, damage flash, knockback, kill streaks
8. **UI shell** — main menu, HUD, pause, game over, settings
9. **Meta-progression** — persistent unlock shop (coins from runs buy permanent upgrades), achievements, stats screen — *this is the retention engine*
10. **Audio** — procedural SFX synth, adaptive music intensity
11. **Platform** — PWA packaging, Capacitor config, performance profiling hooks
12. **Content data** — 50+ weapons, 100+ enemies, 200+ upgrades as validated JSON data files (the token-burn moat)

**Interface rule:** modules communicate through frozen TypeScript interfaces defined in
Phase 0. No wave may change a shared interface without a documented migration.

---

## 4. BUILD PHASES

### Phase 0 — Pre-production (Rem + prakhar, ~1–2 days)
- Game design doc: full systems spec, numbers/balance targets, art direction bible
- Frozen module interfaces (the contracts every wave builds to)
- Working title locked, repo scaffolded
- **Gate:** design doc approved by prakhar; interfaces frozen

### Phase 1 — Core engine, gray-box playable (GLM swarm, waves 1–2)
- Engine, player movement, 1 weapon, 1 enemy type, basic wave spawning, gray-box arena
- Headless screenshot verification after every wave (Rem reviews)
- **Gate:** playable link — move, auto-attack, enemies die, no crashes. prakhar playtests.

### Phase 2 — Systems (GLM swarm, waves 3–4)
- Full weapons system, enemy director + 10 enemy types, XP/leveling, upgrade draft UI, juice pass #1
- **Gate:** a complete 10-minute run is fun. prakhar's feel notes → fix wave.

### Phase 3 — Content flood (GLM swarm, big burn — use the grant window)
- 50+ weapons, 100+ enemies, 200+ upgrades as validated data; procedural art final pass; balance tables
- n8n nightly content workflow set up (keeps generating post-launch)
- **Gate:** content validation suite green; no duplicate/broken entries

### Phase 4 — Meta & polish (Antigravity + Gemini 3.8, Rem review)
- Meta-progression shop, achievements, audio, Hindi-first i18n, settings, juice pass #2
- **Gate:** retention loop complete — a run earns coins, coins buy upgrades, upgrades change next run

### Phase 5 — Hardening (Rem + subagents)
- Full test suite, performance audit (60fps / 300 enemies / mid-range phone), bugfix waves
- **Gate:** zero known crashers; performance target met on real device (prakhar's phone)

### Phase 6 — Launch (mixed)
- PWA deploy → viral demo link; Capacitor APK build; Play Store listing (screenshots, description, privacy policy — agents prep, prakhar pays $25 + clicks publish)
- n8n live-ops workflows live: deploy pipeline, notifications, daily challenge rotation
- **Gate:** link live, APK installable, store listing submitted

### Phase 7 — Live-ops (ongoing)
- Daily challenges, weekly content drops via n8n, metrics review, balance patches from real player data

---

## 5. DIVISION OF LABOR

| Who | Does | When |
|---|---|---|
| **GLM swarm** (Z Code, 3 concurrent) | Volume generation: Phases 1–3 | NOW — inside the ~5-day grant window |
| **Rem + subagents** | Phase 0 design, interface contracts, code review between waves, Phase 5 hardening, zip deliverables | Throughout |
| **Antigravity + Gemini 3.8** | Continued builds: Phases 4–6 | After GLM grants expire |
| **prakhar** | Playtesting + feel feedback (the one human job), asset pack drops, $25 Play Console, publish clicks | Every phase gate |
| **n8n** | Deploy pipeline, nightly content gen, build notifications, daily challenge rotation | From Phase 3 |

---

## 6. VERIFICATION & QUALITY GATES

- **Every wave:** builds clean + headless screenshots captured → Rem reviews before next wave starts
- **Every phase:** playable link → prakhar playtests → feel notes become a fix wave
- **Performance gate (Phase 5):** 60fps with 300 active enemies on a mid-range Android phone
- **No phase starts until its gate passes.** This is the quality guarantee.
- **Content validation:** JSON schema checks on all generated data — broken entries never reach the game

---

## 7. TIMELINE (quality-first — gates decide, not dates)

- **Days 1–5 (GLM grants live):** Phase 0 → Phase 3. The volume burn happens here.
- **Week 2+:** Phases 4–6 on Antigravity + Rem. Polish, meta, launch.
- **Ongoing:** Phase 7 live-ops.
- No hard deadline. Rushing is how agent projects die; gates are how they ship.

---

## 8. RISKS & MITIGATIONS

| Risk | Mitigation |
|---|---|
| Integration drift at 80k+ lines | Frozen interfaces; Rem reviews every wave merge |
| Game feel (can't be automated) | Human playtest loop every phase — prakhar's notes are first-class work items |
| Scope creep | Phase gates; anything new waits for its phase |
| GLM grants expire mid-build | Volume phases (1–3) scheduled inside the window; Antigravity takes over after |
| Content bloat (broken generated data) | Schema validation suite; bad entries rejected automatically |

---

*Plan written 2026-10-06. Next step: prakhar approves → Phase 0 begins (design doc).*
