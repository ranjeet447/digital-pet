# Digital Pet

Digital Pet is an open-source companion for websites and desktop computers. The
default pet is Shiro, based on the real golden retriever Shiro. He stays above
normal app windows, walks and runs around the screen, follows the cursor,
performs his trained commands, plays with balls, and takes naps. Web integrations
can change the pet's name with the `name` attribute.

## Run from source

Requirements: macOS 13 or newer and the Xcode Command Line Tools.

```bash
swift run ShiroPet
```

Use the paw icon in the menu bar to bring Shiro to the cursor, send him for a
persistent nap in the nearest corner, choose a command, change his size, pause
him, or quit.

You can also:

- Click Shiro to make him perform a trick.
- Drag Shiro to another spot on the screen.
- Choose **Take a Nap in Corner** to keep Shiro asleep out of the way while you
  work. He stays there until clicked or given another command.
- Choose **All Tricks & Commands** to ask for sit, walk, run, jump, down, sleep,
  roll over, handshake, hi-five, salute, namaste, speak, quiet, or fetch.
- Choose **Size** to switch between 75%, 100%, 125%, and 150%. The setting is
  remembered the next time Shiro starts.
- Enable **Cursor Mischief** from the menu to let him occasionally nudge the
  pointer when it is nearby. macOS may request Accessibility permission.

## Build a macOS app

```bash
chmod +x scripts/package-app.sh
./scripts/package-app.sh
open "dist/Digital Pet.app"
```

The generated app is ad-hoc signed for local use. A public release should use an
Apple Developer ID certificate, hardened runtime, and notarization.

## Current MVP

- Transparent, borderless, always-on-top native window
- Autonomous idle, walking, running, chasing, and sleeping states
- Shiro-inspired honey-gold coat, broad muzzle, feathered ears, chest, legs, and tail
- All 14 trained commands available individually from the menu
- Animated ball collection and fetch with several ball colors
- Persistent Small, Normal, Large, and Extra Large display sizes
- Cursor awareness and optional cursor mischief
- Menu-bar controls
- Multi-monitor-aware positioning

The dog is currently drawn in code. A future art pass can replace `PetView` with
sprite sheets based on photos or illustrations of the real Shiro without changing
the window or behavior engine.

## Web version

The reusable website package lives in [`web/`](web/). It is a dependency-free
Canvas Web Component that can be installed from npm or loaded as a standalone
ES module on any website.

```html
<script type="module" src="/digital-pet.js"></script>
<digital-pet name="Shiro"></digital-pet>
```

See [`web/README.md`](web/README.md) for commands, attributes, JavaScript APIs,
framework examples, and publishing steps.

## Cross-platform parity

Windows and Linux desktop versions are planned. All platforms follow the same
feature requirements in
[`docs/platform-feature-contract.md`](docs/platform-feature-contract.md).

The public release roadmap, distribution channels, and version checklist are in
[`docs/release-plan.md`](docs/release-plan.md).
