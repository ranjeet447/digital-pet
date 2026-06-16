# Digital Pet v0.3.0

Digital Pet v0.3.0 introduces a cleaner 3D golden retriever model, dynamic ear animations, richer autonomous behavior, and a new "extra-small" size option.

## Highlights

- **Cleaner 3D Golden Retriever Model**:
  - Removed the experimental strand-fur layer from the active 3D renderer because it looked noisy at desktop-widget scale.
  - Multi-toned base coat texture keeps Shiro warm and retriever-like without needle-shaped hair artifacts.
  - Reshaped golden retriever anatomy with a broad head and muzzle, jowls, expressive eyes, feathered low-set ears, deep chest, large paws, and plumed tail.
  - Shiro details including his red collar and gold tag.
- **Dynamic Floppy Ears**:
  - Secondary spring-damping physical simulations for natural ear bouncing and head tilt lag.
- **Richer Autonomous Behavior**:
  - Shiro can now independently fetch a ball, bark, perform a surprise trick, ask for food, watch quietly, move around, or nap in a corner.
  - Food requests now trigger before hunger reaches the maximum, so the pet feels more alive during longer sessions.
- **Extra Small Size Option**:
  - Added a new `"extra-small"` size option (mapped to **50% scale**) for compact desktop and web layouts.
  - Restyled control panels to support five selectable sizes.
- **Optimized Performance**:
  - The active 3D renderer avoids the heavy explicit strand-fur layer for faster startup and cleaner visuals.
  - 2D and 3D modes continue to share the same commands, care actions, sounds, and autonomous behavior.

## Desktop Downloads

- macOS Apple Silicon zip
- macOS Intel zip
- Windows x64 portable executable
- Linux x64 AppImage

The desktop app inherits the cleaner 3D model, autonomous behavior updates, floppy ear physics, and the new 50% scale option.
