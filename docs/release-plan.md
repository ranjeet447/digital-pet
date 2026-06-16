# Digital Pet Release Plan

## Product Direction

Digital Pet is one product for websites and desktop computers. The included pet
is Shiro, inspired by Ranjeet's real golden retriever. The product name remains
Digital Pet, and website owners can change the displayed pet name.

All platforms follow
[`platform-feature-contract.md`](platform-feature-contract.md).

## Version 0.3.0

Version 0.3.0 introduces a cleaner 3D golden retriever model, richer autonomous behavior, floppy ear secondary motion, and a new extra-small size.

### Web

- npm-compatible `@ranjeet447/digital-pet` package
- Standalone browser ES module
- Plain HTML and JavaScript support
- React, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit, and Astro instructions
- GitHub Pages product site and interactive demo

### Desktop

- Shared Electron desktop shell
- macOS Apple Silicon zip
- macOS Intel zip
- Windows x64 portable executable
- Linux x64 AppImage
- Transparent always-on-top overlay
- Tray or menu-bar controls
- Shared persistent settings

### Shared Features

- 2D illustrated and 3D WebGL views
- Cleaner textured 3D golden-retriever model and flexible tail
- All trained commands
- Feed, treat, surprise, food requests, and hunger behavior
- Optional bark sound and volume control
- Five sizes
- Balls and fetch
- Autonomous movement, pointer response, fetch, barking, surprise tricks, food requests, and naps

## Distribution

1. **GitHub repository**
   - Source, documentation, roadmap, issues, and workflows
   - `https://github.com/ranjeet447/digital-pet`
2. **GitHub Pages**
   - Live demo, framework examples, SEO, and web downloads
   - `https://ranjeet447.github.io/digital-pet/`
3. **GitHub Release `v0.3.0`**
   - `Digital-Pet-mac-v0.3.0-arm64.zip`
   - `Digital-Pet-mac-v0.3.0-x64.zip`
   - `Digital-Pet-win-v0.3.0-x64.exe`
   - `Digital-Pet-linux-v0.3.0-x64.AppImage`
   - `ranjeet447-digital-pet-0.3.0.tgz`
   - `Digital-Pet-Web-v0.3.0.js`
4. **npm**
   - Package: `@ranjeet447/digital-pet`
   - Publish after npm ownership and authentication are configured

## v0.3.0 Checklist

- [x] Shared web and desktop architecture implemented
- [x] Web TypeScript check passes
- [x] Web production bundle builds
- [x] 2D and 3D switching works in the demo
- [x] Framework instructions added
- [x] Desktop packaging matrix added for macOS, Windows, and Linux
- [x] GitHub Pages download links updated
- [x] Release notes and feature contract updated
- [x] macOS Apple Silicon and Intel packages build locally
- [ ] GitHub Actions Windows package passes
- [ ] GitHub Actions Linux package passes
- [ ] GitHub Actions macOS Intel package passes
- [ ] GitHub Actions macOS Apple Silicon package passes
- [ ] GitHub Pages deployment passes
- [ ] GitHub Release assets are verified
- [ ] npm package is published

## Release Automation

- Pushes to `main` build and deploy GitHub Pages.
- A `v*` tag builds desktop packages on native GitHub-hosted runners.
- The same tag builds the npm archive.
- GitHub Pages publishes immutable versioned browser scripts and a moving latest alias.
- The release job combines all artifacts into one GitHub Release.
- npm publication remains manual until a trusted token is configured.

## Later Releases

Future features should update the shared Web Component first so web and all
desktop platforms receive them together:

- More sounds and context-specific bark recordings
- Additional coats, collars, and ball collections
- Mood, energy, affection, and richer feeding systems
- Focus mode and scheduled quiet hours
- Signed and notarized macOS packages
- Signed Windows installer
- Automatic desktop updates
- Additional CPU architectures

## Versioning

- Patch releases fix defects without breaking APIs.
- Minor releases add backward-compatible behavior or platforms.
- Major releases may change public APIs or saved settings.
- Web and desktop packages share the same product version.

## Discovery

The website targets searches for digital pets for websites and desktops,
JavaScript website pets, framework-specific pets, golden retriever companions,
and macOS, Windows, and Linux desktop pets.
