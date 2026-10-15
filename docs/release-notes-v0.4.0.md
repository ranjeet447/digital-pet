# Digital Pet v0.4.0

Digital Pet v0.4.0 introduces 6 canine dog breeds with authentic fur patterns and anatomical silhouettes, smooth trick kinematics with raised front paws, responsive autonomous activity level controls, and high-DPI dynamic buffer scaling.

## What's New in v0.4.0

### 🐕 6 Distinct Dog Breeds
- **Golden Retriever**: The classic warm honey coat, feathered drop ears, and plumed tail.
- **Black Labrador**: Sleek ebony coat with specular highlights and athletic retriever build.
- **Chocolate Labrador**: Rich cocoa brown coat with warm amber eye highlights.
- **Siberian Husky**: Piercing ice-blue eyes, wolf-grey mantle, white facial blaze, spectacles, and firm prick ears.
- **German Shepherd**: Charcoal saddle, black muzzle mask, tan eyebrow spots, and erect alert ears.
- **Shiba Inu**: Compact curled tail, white urajiro cheeks and chest, fox-red coat, and triangular prick ears.

### 🐾 Fluid Kinematics & Visible Paw Tricks
- **Visible Raised Paws**: Symmetrical front paw rotations in 3D beauty view (`handshake`, `hi-five`, `salute`, `namaste`) ensure paws are prominently elevated and clearly visible from any camera angle.
- **Cosine S-Curve Trick Envelopes**: Continuous organic lift and lower curves eliminate jerky instantaneous posing.
- **Three.js `crossFadeFrom` Blending**: Seamless 0.32s transitions between walking, running, sitting, wagging, and idle states.
- **Direction Deadband Hysteresis**: Eliminates left/right zero-crossing body flutter when following cursors or moving along coordinates.
- **Stabilized Ear Kinematics**: Anatomic resting quaternions prevent rotational divergence or helicopter flipping across all erect and floppy ear breeds.

### ⏱️ Instantaneous Activity & Pacing Controls
- **Manual Mode (Still)**: Instantly halts autonomous wandering and pathfinding, stops velocities, and leaves the pet ready for direct user commands.
- **Playful Mode**: Immediately wakes the pet, wags its tail, barks happily, and initiates lively autonomous play and tricks every 2.5–5 seconds.
- **Calm Mode**: Smoothly transitions into peaceful sitting or resting with spacious 20–45 second intervals.
- **Normal Mode**: Balanced 8–18 second stroll and trick cycle.
- **Barking Controls**: Toggle between `Rare (Commands)`, `Normal`, and `Silent` modes.

### 🖥️ High-DPI Scaling & Desktop Feature Parity
- **Pin-Sharp 150% Scaling**: Dynamic WebGL buffer allocation matches actual display dimensions on Retina and high-DPI displays without pixel stretching.
- **Desktop Electron App Tray**: Full Breed and Activity Pace submenus added to macOS, Windows, and Linux system tray with cross-session local storage persistence.

## Release Artifacts

- **Web ES Module**: `downloads/digital-pet-v0.4.0.js`
- **npm Package Archive**: `downloads/digital-pet-0.4.0.tgz`
- **macOS Apple Silicon**: `Digital-Pet-mac-v0.4.0-arm64.zip`
- **macOS Intel**: `Digital-Pet-mac-v0.4.0-x64.zip`
- **Windows Portable**: `Digital-Pet-win-v0.4.0-x64.exe`
- **Linux AppImage**: `Digital-Pet-linux-v0.4.0-x64.AppImage`
