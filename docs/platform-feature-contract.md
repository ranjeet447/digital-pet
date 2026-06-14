# Shiro Platform Feature Contract

This document defines the behavior that every Shiro implementation must provide.
The macOS, web, Windows, and Linux versions may use different platform APIs, but
their visible features and commands must remain equivalent.

## Supported platforms

- macOS native desktop app
- Web Component for any website
- Windows native desktop app
- Linux native desktop app

## Required commands

Every platform must expose these commands individually:

1. Sit
2. Walk
3. Run
4. Jump
5. Down
6. Sleep
7. Roll over
8. Handshake
9. Hi-five
10. Salute
11. Namaste
12. Speak
13. Quiet
14. Fetch

`Quiet` stops the current command and returns Shiro to a calm idle state.

Roll over must animate Shiro moving down, onto his shoulder and back with his
paws raised, then recovering on the opposite side. It must not rotate the entire
character image as a flat clockwise or counterclockwise sprite.

## Required autonomous behavior

- Idle breathing and tail movement
- Walking and running along the available screen or viewport
- Looking at and following nearby pointer movement
- Random tricks
- Short autonomous naps
- A user-selected persistent nap in the nearest corner
- Resuming from a persistent nap when clicked or given another command

## Ball behavior

- Shiro owns a visible collection of balls in multiple colors.
- Fetch selects a ball, animates its throw, and makes Shiro retrieve it.
- Shiro shows extra excitement and faster tail movement around balls.

## Appearance

Every implementation must depict adult Shiro as:

- A deep honey-gold golden retriever
- Broad dark nose and friendly dark eyes
- Long feathered ears
- Full chest ruff
- Feathering on the legs
- Large plume tail
- Happy open-mouth expression during energetic actions
- Red collar with a gold tag

## Interaction and controls

- Click or tap Shiro to perform a random trick.
- Drag Shiro to reposition him.
- Provide a menu containing every command.
- Provide Small (75%), Normal (100%), Large (125%), and Extra Large (150%).
- Remember the selected size between sessions.
- Provide a way to bring Shiro to the current pointer position.
- Provide a way to hide and show Shiro.
- Respect reduced-motion preferences where the platform exposes them.

## Desktop-only behavior

- Shiro stays above normal application windows.
- Shiro can appear across workspaces or virtual desktops where supported.
- Optional cursor mischief may gently move the pointer after explicit opt-in.
- Cursor control must never be enabled silently.

## Web-only constraints

- Shiro is limited to the current browser viewport.
- The web version must not attempt to move the operating-system pointer.
- Styles must be isolated from the host website.
- It must pause expensive animation work in background tabs.
- It must hide when printing.

## Release parity checklist

A platform release is not feature-complete until:

- All 14 commands are selectable and visually distinct.
- Autonomous walk, run, pointer follow, random trick, and nap behavior works.
- Persistent corner nap works.
- Ball collection and fetch work.
- All four sizes work and persist.
- Drag, random-trick click, bring-here, hide, and show work.
- The Shiro appearance requirements are represented.
- Accessibility and reduced-motion behavior are verified.
