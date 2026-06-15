# Digital Pet v0.2.0

Digital Pet v0.2.0 brings Shiro to the web, macOS, Windows, and Linux with one
shared animation and behavior engine.

## Highlights

- New cross-platform desktop app for macOS, Windows, and Linux
- 2D illustrated and 3D WebGL views with live switching
- Softer golden-retriever coat and long, body-following feathering
- Flexible tail with side-to-side and circular motion
- Front-facing sit and namaste poses
- Feed, give a treat, surprise trick, hunger, and food requests
- Optional barking sound and volume controls
- Expanded package support for React, Next.js, Vue, Nuxt, Angular, Svelte,
  SvelteKit, Astro, plain HTML, and JavaScript
- Updated GitHub Pages demo, documentation, SEO, and downloads

## Desktop Downloads

- macOS Apple Silicon zip
- macOS Intel zip
- Windows x64 portable executable
- Linux x64 AppImage

The desktop app stays above normal windows, passes pointer input through outside
the pet, and provides tray or menu-bar controls for commands, care, size, view,
sound, visibility, and bringing Shiro to the pointer.

## Web API Additions

- `renderer="2d|3d|auto"`
- `sound="true|false"`
- `volume="0..1"`
- `setRenderer("2d" | "3d")`
- `bringTo(x, y)`
- `feed`, `treat`, and `surprise` commands
- renderer, care, and visibility events

## Notes

The original Swift/AppKit macOS implementation remains in the source tree as a
prototype. Release desktop packages now use the shared cross-platform host to
keep all supported operating systems at feature parity.
