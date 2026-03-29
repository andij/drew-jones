# Plan: Chess Learning Game for Kids

## Goal

Create an interactive chess learning game in `src/chess/` for a 5-year-old child using an iPad. The game teaches chess pieces, how they move, and the basics of the game through playful, touch-friendly interactions.

---

## Target Audience & UX Constraints

- **Age:** 5 years old — early reader
- **Device:** iPad (touch screen, no mouse/keyboard)
- **Connection:** Must work fully offline (no CDN dependencies, no network requests)
- **Interaction:** Large touch targets (minimum 44×44px, ideally 60px+), drag-and-drop with touch, bright visuals, simple language, positive reinforcement

---

## Technology Choice

**Vanilla HTML + CSS + JavaScript (single-page app inside an Eleventy page)**

Rationale:
- Eleventy already builds the site — a new `.njk` page at `src/chess/index.njk` slots in naturally
- No framework needed — keeps bundle size zero, no build tooling beyond what exists
- Canvas API or SVG for the board — SVG is better for accessibility and touch hit-testing
- All assets 
  - Piece images as individual SVG files saved in `src/chess/assets/`
  - Sounds as base64 are self-contained
- Works offline once the `_site/` is served or cached — no external fetches
- CSS custom properties from the existing design system can be reused for theming

---

## Architecture

```
src/chess/
├── index.njk          # Eleventy page (uses base.njk layout)
├── chess.css           # Game-specific styles
└── chess.js            # All game logic (single ES module, no dependencies)
```

Eleventy config already passes through `src/assets/`. The chess page will load its own CSS and JS via `<link>` and `<script>` tags within the Nunjucks template. Update `.eleventy.js` to add `src/chess` as a passthrough for the JS/CSS assets, or inline them directly.

---

## Features & Task Breakdown

### Task 1 — Project scaffolding

- Create `src/chess/index.njk` with layout frontmatter (`layout: base.njk`, title, etc.)
- Decide on asset strategy: passthrough copy `src/chess/*.js` and `src/chess/*.css`, or inline everything in the `.njk` template
- Update `.eleventy.js` if passthrough is needed
- Verify `npm start` serves `/chess/` correctly

### Task 2 — Chessboard rendering (SVG)

- Render an 8×8 board using an SVG `<svg>` element with `<rect>` cells
- Use kid-friendly colours (light/dark squares with soft pastels)
- Make the board responsive: `width: 100%; aspect-ratio: 1` so it fills the iPad screen
- Label ranks (1–8) and files (a–h) with large, friendly text

### Task 3 — Chess pieces (SVG icon files in `src/chess/assets/`)

- Create simple, recognisable SVG icons for all 6 piece types (King, Queen, Rook, Bishop, Knight, Pawn) in two colours (white and black)
- Use chunky, cartoon-style outlines suitable for young children
- Place pieces in standard starting positions
- Each piece is a draggable SVG `<g>` group positioned on the board

### Task 4 — Touch interaction (drag & drop)

- Implement touch-based drag and drop using `touchstart`, `touchmove`, `touchend` events
- On touch start: highlight the piece, show valid move squares
- On drag: piece follows finger with slight offset so it's visible above the finger
- On drop: snap to nearest valid square, or animate back if invalid
- Prevent scrolling/zooming while dragging (`touch-action: none` on the board)
- Add `pointerdown`/`pointermove`/`pointerup` as well for cross-device support

### Task 5 — Move validation & legal move highlighting

- Implement movement rules for each piece type:
  - **Pawn:** forward 1 (or 2 from start), diagonal capture
  - **Rook:** horizontal/vertical any distance
  - **Bishop:** diagonal any distance
  - **Knight:** L-shape (2+1)
  - **Queen:** horizontal/vertical/diagonal any distance
  - **King:** 1 square any direction
- Highlight legal squares with a friendly glow or circle when a piece is selected
- Block moves onto own pieces; capture opponent pieces with a satisfying animation

### Task 6 — Learning modes

#### 6a — "Meet the Pieces" (piece explorer)
- Show each piece one at a time with its name, a short description ("The Knight jumps in an L shape!"), and an animation of how it moves
- Big arrow buttons or swipe to go through each piece
- Use large emoji or icons alongside names for pre-readers

#### 6b — "Try It!" (free play)
- Full board with all pieces in starting position
- Child can move any piece (both colours) to experiment
- Valid moves shown; invalid moves gently bounce back
- No win/lose — purely exploratory

#### 6c — "Puzzle Time" (mini challenges)
- Simple puzzles: "Can you move the Knight to the star?"
- Place one piece and one target square; child drags to solve
- Celebrate with confetti/animation on success
- 3–5 puzzles per piece type, progressively harder

### Task 7 — Visual feedback & child-friendly UI

- Large, rounded buttons for mode selection (icons + short labels)
- Cheerful colour palette (extend CSS custom properties)
- Success animations: confetti, stars, bounce effects (CSS animations, no library)
- Gentle error feedback: piece wobbles back, no harsh "wrong" messages
- Sound effects: optional, using inline base64 audio or Web Audio API for simple tones
- Home button to return to mode selection

### Task 8 — Offline capability

- Zero external dependencies: no CDN links, no Google Fonts (use system fonts or embed a small font as base64)
- All SVG icons inline in JS/HTML
- The chess page must NOT rely on Lucide icons or Google Fonts from the base layout — override or provide a chess-specific layout that removes external `<link>` and `<script>` tags
- Consider creating `src/_includes/chess-base.njk` (a copy of `base.njk` without CDN references) to guarantee offline operation

### Task 9 — Responsive & iPad optimisation

- Viewport meta tag already in base layout ✓
- Board sizing: `min(100vw, 100vh)` minus UI chrome
- Mode selection screen: large card buttons in a grid
- Portrait orientation preferred; handle landscape gracefully
- Prevent pinch-zoom on the game area: `touch-action: manipulation` on body
- Use `-webkit-touch-callout: none` and `user-select: none` to prevent iOS long-press menus

### Task 10 — Integration & navigation

- Add a chess link to `src/_data/links.json` so it appears on the home page navigation
- Use an appropriate icon (e.g. a custom chess piece SVG or a generic "gamepad" style icon)
- Test full flow: home page → chess → modes → play → back

---

## Suggested Implementation Order

1. **Task 1** — Scaffolding (get the page rendering at `/chess/`)
2. **Task 8** — Offline layout (create chess-base.njk without CDN deps)
3. **Task 2** — Board rendering
4. **Task 3** — Piece SVGs
5. **Task 4** — Touch drag & drop
6. **Task 5** — Move validation
7. **Task 6b** — Free play mode (brings tasks 2–5 together)
8. **Task 6a** — Meet the Pieces mode
9. **Task 6c** — Puzzle mode
10. **Task 7** — Polish: animations, feedback, sound
11. **Task 9** — Responsive/iPad testing & fixes
12. **Task 10** — Home page integration

---

## Open Questions

- **Audio:** Include simple sound effects (tap, capture, success)? Base64-encoded audio adds file size but enhances the experience for a 5-year-old. Alternatively, use Web Audio API to synthesize short tones.
- **Piece art style:** Minimal geometric SVGs, or more detailed cartoon-style pieces? Cartoon is friendlier but more work to create.
- **AI opponent:** Out of scope for initial build? A simple random-move opponent could be added later for "Play vs Computer" mode.
- **Persistence:** Save puzzle progress to `localStorage`?
