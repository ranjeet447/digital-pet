# Digital Pet

Digital Pet is an open-source companion for websites, macOS, Windows, and Linux.
The default pet is Shiro, based on the real golden retriever
[Shiro](https://shiro.shravaniurankar.in/). Read
[Shiro's stories](https://www.shirofinds.com/stories), or rename the pet for
your own website.

Shiro stays above normal app windows, walks and runs around the screen, follows
the pointer, performs tricks, plays with balls, asks for food, accepts treats,
barks when sounds are enabled, and takes naps in a corner.

## Version 0.3.0

- Cleaner 3D golden retriever model with a textured warm coat
- Golden retriever anatomy with a broad muzzle, feathered ears, chest ruff, large
  paws, plumed tail, and Shiro's red collar
- Interactive floppy ear secondary spring-damping physics
- More autonomous play: fetch, barking, surprise tricks, food requests, quiet
  watching, movement, and corner naps
- Five persistent sizes including a new "Extra Small 50%" option
- Web and Desktop client bundle builds updated

## Install on a Website

```bash
npm install @ranjeet447/digital-pet
```

```js
import "@ranjeet447/digital-pet";
```

```html
<digital-pet
  name="Shiro"
  renderer="3d"
  size="normal"
  controls="true"
></digital-pet>
```

Plain HTML, React, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit, and Astro
instructions are in [`web/README.md`](web/README.md).

## Desktop Downloads

The `v0.3.0` GitHub Release contains:

- macOS Apple Silicon zip
- macOS Intel zip
- Windows x64 portable executable
- Linux x64 AppImage
- npm-compatible web archive

Desktop platforms use the same Web Component and animation engine, so commands,
2D/3D views, care actions, sounds, sizes, and future behavior stay synchronized.

## Run the Desktop App from Source

Requirements: Node.js 22 or newer.

```bash
cd desktop
npm install
npm start
```

Build the package for the current platform:

```bash
npm run dist
```

Platform-specific commands:

```bash
npm run dist:mac
npm run dist:win
npm run dist:linux
```

Windows and Linux packages should be built on their matching operating systems.
The release workflow does this automatically with native GitHub-hosted runners.

## Desktop Controls

- Click Shiro for a random trick.
- Drag Shiro to reposition him.
- Use the tray or menu-bar paw icon for every command.
- Choose **Take a Nap in Corner** while working.
- Switch between **2D Illustrated** and **3D Model**.
- Change size from 75% to 150%.
- Enable or disable sounds.
- Feed Shiro, give him a treat, or request a surprise trick.
- Hide Shiro and show him again from the tray.

The desktop overlay passes pointer input through to other applications except
when the pointer is over Shiro or his controls.

## Legacy Native macOS Prototype

The original Swift/AppKit prototype remains under `Sources/ShiroPet` for
reference. Version 0.3.0 desktop releases use the shared cross-platform shell so
macOS, Windows, Linux, and web features remain identical.

## Project Documents

- [`docs/platform-feature-contract.md`](docs/platform-feature-contract.md)
- [`docs/release-plan.md`](docs/release-plan.md)
- [`docs/release-notes-v0.3.0.md`](docs/release-notes-v0.3.0.md)

## License

MIT. The included bark recording is documented in
[`web/assets/README.md`](web/assets/README.md).
