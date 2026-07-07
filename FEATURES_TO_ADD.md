# Plugsky CLI — TUI Features to Match OpenCode

## Current missing features (priority order)

### P0 — Core UX (implement next)
- [ ] **File references** — type `@` to fuzzy-search project files, auto-add content to context
- [ ] **Inline bash** — type `!ls -la` to run shell commands inline, output added as tool result
- [ ] **Undo/Redo** — `/undo` reverts last message + file changes via git, `/redo` restores
- [ ] **Session compact** — `/compact` summarizes session when context gets long
- [ ] **Details toggle** — `/details` or key to show/hide tool call details inline
- [ ] **Theme picker** — `/themes` lists available themes, select to apply

### P1 — Editor & Export
- [ ] **Editor compose** — `/editor` opens `$EDITOR` to write long messages
- [ ] **Export conversation** — `/export` saves chat to markdown file
- [ ] **Share session** — `/share` creates a shareable link (requires backend)

### P2 — Polish
- [ ] **Mouse support** — scroll with mouse wheel, click to select
- [ ] **Scroll acceleration** — smooth natural scrolling
- [ ] **Desktop notifications** — `/attention` settings for sound + notifications on completion
- [ ] **Thinking toggle** — `/thinking` show/hide model reasoning blocks
- [ ] **Command palette** — `ctrl+p` opens full searchable command list (not just slash)

### P3 — Config
- [ ] **tui.json** — separate config for TUI behavior (keybinds, theme, mouse, scroll, attention)
- [ ] **Keybind customization** — full key remapping via config
- [ ] **Diff rendering** — stacked or auto diff layout for file changes

## Implementation plan

### Phase 1: @ file references + ! bash + undo/redo
Files: `src/tui/components/FilePicker.tsx`, modify `App.tsx` for `@` and `!` detection

### Phase 2: Session management + compact
Files: `src/tui/components/SessionManager.tsx` (already exists, enhance), add compact logic

### Phase 3: Editor, export, themes
Files: `src/tui/components/Editor.tsx`, `src/tui/components/ThemePicker.tsx`

### Phase 4: Mouse, notifications, config
Files: `src/tui/tui.config.ts`, modify `App.tsx` for mouse events
