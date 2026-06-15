# Digital Pet Platform Feature Contract

This contract defines the behavior shared by the web, macOS, Windows, and Linux
versions. Version 0.3.0 uses one Web Component animation engine inside the three
desktop packages to keep visible features equivalent.

## Platforms

- Web Component for any website or web framework
- macOS desktop app for Apple Silicon and Intel
- Windows x64 portable desktop app
- Linux x64 AppImage

## Commands and Care

Every platform exposes:

1. Sit
2. Walk
3. Run
4. Jump
5. Down
6. Sleep in corner
7. Roll over
8. Handshake
9. Hi-five
10. Salute
11. Namaste
12. Speak
13. Quiet
14. Fetch a ball
15. Feed
16. Give a treat
17. Surprise trick

`Quiet` stops the current action and returns the pet to a calm idle state. Roll
over is a staged body movement, not a flat clockwise image rotation.

## Appearance and Views

- 2D illustrated view
- 3D WebGL view
- Honey-gold coat, soft body coat, long feathering, broad muzzle, dark eyes
- Long ears, chest ruff, feathered legs, and flexible plume tail
- Tail motion that includes side-to-side, circular, and restrained vertical movement
- Front-facing sit, namaste, care, and attention poses
- Happy open mouth during energetic actions
- Multiple colorful balls

## Autonomous Behavior

- Idle breathing and tail movement
- Walking and running across the viewport or desktop overlay
- Looking at and following nearby pointer movement
- Random tricks
- Short autonomous naps
- Persistent user-selected corner nap
- Food requests as hunger increases
- Resuming from sleep when clicked or given another command

## Controls and Preferences

- Click or tap for a random trick
- Drag to reposition
- Menu containing every command
- Extra Small (50%), Small (75%), Normal (100%), Large (125%), and Extra Large (150%)
- Remembered size
- Switch between 2D and 3D
- Optional sounds and volume control
- Bring to pointer
- Hide and show
- Custom pet name on the web API
- Reduced-motion support

## Desktop Behavior

- Transparent, borderless overlay above normal windows
- Pointer input passes through except over the pet and its controls
- Tray or menu-bar controls
- Multi-display overlay sizing
- Visible across workspaces where the operating system supports it
- Persistent renderer, size, sound, name, and visibility preferences

Operating-system cursor movement is not enabled in the shared v0.3.0 desktop
shell. Any future cursor-control feature must require explicit user opt-in and
the relevant accessibility permission.

## Web Constraints

- Limited to the current browser viewport
- Never moves the operating-system pointer
- Shadow DOM style isolation
- Background-tab animation pausing
- Hidden while printing
- Browser-only module loading for SSR frameworks

## Release Checklist

A platform build is complete when:

- All commands and care actions are selectable.
- 2D and 3D switching works.
- Autonomous movement, pointer follow, tricks, food requests, and naps work.
- Balls and fetch work.
- Sounds can be enabled, disabled, and adjusted.
- All five sizes work and persist.
- Drag, click, bring-here, hide, and show work.
- The platform package starts and exposes tray/menu controls.
- Accessibility and reduced-motion behavior are verified.
