# Digital Pet Release Plan

## Product direction

Digital Pet is one product delivered across multiple platforms. Every
platform must preserve the same visible personality, commands, controls, ball
behavior, sizing, and accessibility expectations defined in
[`platform-feature-contract.md`](platform-feature-contract.md).

The default pet is named Shiro after Ranjeet's real golden retriever. The product
itself is named Digital Pet. Website owners can change the displayed pet name,
while Shiro's origin story remains part of the project.

## Version 0.1.0: macOS and web

The first public release contains:

- Native macOS always-on-top desktop pet
- Framework-neutral JavaScript Web Component
- npm-compatible `@ranjeet447/digital-pet` package
- Standalone ES module for direct website or CDN usage
- GitHub Pages product website and interactive demo
- Four persistent display sizes
- All 14 commands
- Autonomous walking, running, pointer following, tricks, and naps
- Persistent corner nap
- Multiple balls and fetch behavior
- Shiro-inspired golden retriever appearance
- Public TypeScript API and declarations

### Distribution channels

1. **GitHub repository**
   - Source code, documentation, issues, and roadmap
   - Repository: `ranjeet447/digital-pet`
2. **GitHub Pages**
   - Product landing page, live web demo, installation examples, and SEO metadata
   - Target: `https://ranjeet447.github.io/digital-pet/`
3. **GitHub Release**
   - Tag: `v0.1.0`
   - `Digital-Pet-macOS-v0.1.0.zip`
   - `ranjeet447-digital-pet-0.1.0.tgz`
4. **npm**
   - Package: `@ranjeet447/digital-pet`
   - Publish after npm ownership and the `NPM_TOKEN` GitHub secret are configured

### Version 0.1.0 release checklist

- [x] macOS debug and release builds pass
- [x] macOS bundle is ad-hoc signed and launch-tested
- [x] Web TypeScript build passes
- [x] npm archive dry run passes
- [x] Desktop and mobile website layouts are browser-tested
- [x] Web console has no errors or warnings
- [x] SEO title, description, canonical URL, Open Graph, Twitter, and JSON-LD exist
- [x] Real Shiro photos are optimized for the website
- [x] GitHub Pages deployment workflow exists
- [x] Tag-driven GitHub Release workflow exists
- [x] Pages site includes web, macOS, Windows, and Linux download options
- [x] Pages site embeds the live interactive web demo
- [ ] GitHub CLI authentication is valid
- [ ] Initial source commit is pushed to `main`
- [ ] GitHub Pages is enabled with GitHub Actions as its source
- [ ] `v0.1.0` tag is pushed
- [ ] GitHub Release assets are verified
- [ ] npm package name ownership is confirmed
- [ ] npm package is published

## Version 0.2.0: Windows and Linux

The second release adds:

- Windows always-on-top desktop application
- Linux always-on-top desktop application
- System tray or equivalent menu controls
- Start-at-login support where available
- Persistent size and behavior settings
- The same 14 commands and animations as macOS and web
- Equivalent cursor interaction with explicit opt-in for cursor movement
- Installers or portable archives for supported architectures

Windows and Linux are not considered complete until they pass the parity
checklist in `platform-feature-contract.md`.

## Later synchronized releases

After Windows and Linux are available, product features should ship across all
supported platforms together whenever the platform permits them.

Planned features include:

- Optional bark, panting, sleep, collar, and ball sounds
- Volume and mute controls
- Rename Shiro and persist a custom pet name
- Additional coats, collars, and ball collections
- More natural multi-stage animations
- Feeding, mood, energy, and affection systems
- Scheduled quiet hours and focus mode
- Additional pointer and window interactions
- Importable community animation and appearance packs
- Automatic update support for desktop applications

## Versioning policy

- Patch releases fix defects without changing commands or public APIs.
- Minor releases add backward-compatible behavior, platforms, or customization.
- Major releases may change package APIs, storage formats, or plugin contracts.
- Desktop and web packages use the same product version when released together.

## Release automation

- A push to `main` deploys the product website through GitHub Pages.
- A `v*` tag builds the macOS application and web npm archive.
- The release workflow creates a GitHub Release and attaches both artifacts.
- npm publication remains manual until a trusted `NPM_TOKEN` secret is added.

## SEO and discovery

The public website targets searches around:

- digital pet for desktop
- digital pet for website
- JavaScript website pet
- golden retriever desktop pet
- React, Vue, and Angular digital pet
- macOS desktop companion

Every public release should update:

- Page title and description
- Open Graph and Twitter preview
- JSON-LD software metadata
- README installation examples
- GitHub release notes
- Screenshots and real Shiro photography
