# Digital Pet v0.3.0

Digital Pet v0.3.0 introduces visual and physics realism upgrades for Shiro's 3D procedural coat, dynamic ear animations, and a new "extra-small" size option.

## Highlights

- **Procedural 3D Fur Realism**:
  - Ultra-dense coat (~25,000+ individual strands) covering the entire body, head, collar, legs, and tail.
  - Multi-toned base fur texture replacing the solid underlying plastic skin.
  - Reshaped golden retriever anatomy with a broad head and muzzle, jowls, expressive eyes, feathered low-set ears, deep chest, large paws, and plumed tail.
  - Shiro details including his red collar and gold tag.
  - Lightweight stacked shell layers for a soft silhouette without hiding the retriever anatomy.
- **GPU-Bound Sway Physics**:
  - Vertex shader integration via `onBeforeCompile` to compute hair sways on the GPU.
  - Roots remain anchored while hair tips react dynamically to gait, speed, and time.
- **Dynamic Floppy Ears**:
  - Secondary spring-damping physical simulations for natural ear bouncing and head tilt lag.
- **Extra Small Size Option**:
  - Added a new `"extra-small"` size option (mapped to **50% scale**) for compact desktop and web layouts.
  - Restyled control panels to support five selectable sizes.
- **Optimized Performance**:
  - Hair geometry batched by coat region and material to limit draw calls.
  - Allocation-light strand curve generation for faster startup.

## Desktop Downloads

- macOS Apple Silicon zip
- macOS Intel zip
- Windows x64 portable executable
- Linux x64 AppImage

The desktop app inherits the realism upgrades, floppy ear physics, and the new 50% scale option.
