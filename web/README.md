# Digital Pet for the Web

`@ranjeet447/digital-pet` is a framework-neutral Web Component that adds an
animated companion to any website. The default pet is Shiro, a golden retriever,
but the displayed name is customizable.

## Features

- Switchable 2D illustrated and 3D WebGL views
- Golden-retriever coat, feathering, flexible tail, balls, and fetch animation
- Sit, walk, run, jump, down, sleep, roll over, handshake, hi-five, salute,
  namaste, speak, quiet, fetch, feed, treat, and surprise commands
- Optional barking sound with volume controls
- Cursor awareness, drag interaction, autonomous behavior, and corner naps
- Small, normal, large, and extra-large sizes saved in `localStorage`
- Accessible controls, Shadow DOM style isolation, reduced motion, and print handling
- Works with plain HTML, React, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit,
  Astro, and other frameworks that support Custom Elements

## Install

```bash
npm install @ranjeet447/digital-pet
```

Import the package once in browser code:

```js
import "@ranjeet447/digital-pet";
```

Then render the custom element:

```html
<digital-pet
  name="Shiro"
  size="normal"
  renderer="3d"
  controls="true"
  sound="false"
></digital-pet>
```

## Direct Script

Use the hosted ES module without a package manager:

```html
<script
  type="module"
  src="https://ranjeet447.github.io/digital-pet/downloads/digital-pet-v0.2.0.js"
></script>

<digital-pet renderer="3d" controls="true"></digital-pet>
```

Use the versioned URL in production so a later release cannot change behavior
without an intentional update. `digital-pet.js` is also published as a moving
alias for demos and users who explicitly want the latest version.

## Frameworks

### React and Next.js

Load Digital Pet in a client component because it uses browser APIs:

```tsx
"use client";

import { createElement, useEffect } from "react";

export function DigitalPet() {
  useEffect(() => {
    void import("@ranjeet447/digital-pet");
  }, []);

  return createElement("digital-pet", {
    name: "Shiro",
    renderer: "3d",
    controls: "true",
    sound: "false",
  });
}
```

Render this component once in the root layout. `createElement` avoids requiring
custom JSX type declarations.

### Vue

```vue
<script setup>
import "@ranjeet447/digital-pet";
</script>

<template>
  <digital-pet renderer="3d" controls="true" />
</template>
```

If Vue reports an unresolved component warning, configure the compiler:

```js
// vite.config.js
vue({
  template: {
    compilerOptions: {
      isCustomElement: (tag) => tag === "digital-pet",
    },
  },
});
```

### Nuxt

Create `plugins/digital-pet.client.ts`:

```ts
import "@ranjeet447/digital-pet";

export default defineNuxtPlugin(() => {});
```

Add the Vue custom-element configuration in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === "digital-pet",
    },
  },
});
```

### Angular

Import the package in `main.ts`:

```ts
import "@ranjeet447/digital-pet";
```

Allow the Custom Element in the component:

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";

@Component({
  selector: "app-root",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<digital-pet renderer="3d" controls="true"></digital-pet>`,
})
export class AppComponent {}
```

### Svelte

```svelte
<script>
  import { onMount } from "svelte";

  onMount(() => import("@ranjeet447/digital-pet"));
</script>

<digital-pet renderer="3d" controls="true"></digital-pet>
```

### SvelteKit

Use the same component and import it inside `onMount`, or disable SSR for the
small wrapper component that renders `<digital-pet>`.

### Astro

```astro
<digital-pet renderer="3d" controls="true"></digital-pet>

<script>
  import "@ranjeet447/digital-pet";
</script>
```

The Custom Element upgrades in the browser; no framework hydration directive is
required.

## JavaScript API

```js
import { mountDigitalPet } from "@ranjeet447/digital-pet";

const shiro = mountDigitalPet({
  name: "Shiro",
  size: "normal",
  renderer: "3d",
  controls: true,
  cursorInteraction: true,
  sound: false,
  volume: 0.65,
  startCorner: "bottom-right",
});

shiro.command("sit");
shiro.command("fetch");
shiro.command("feed");
shiro.command("treat");
shiro.command("sleep");
shiro.setSize("large");
shiro.setRenderer("2d");
shiro.bringToPointer();
shiro.bringTo(500, 600);
shiro.hide();
shiro.show();
```

Commands:

```text
sit, walk, run, jump, down, sleep, roll-over, handshake, hi-five,
salute, namaste, speak, quiet, fetch, feed, treat, surprise
```

Attributes:

| Attribute | Values | Default |
| --- | --- | --- |
| `name` | any non-empty name | `Shiro` |
| `size` | `small`, `normal`, `large`, `extra-large` | saved value or `normal` |
| `remember-size` | `true`, `false` | `true` |
| `controls` | `true`, `false` | `true` |
| `renderer` | `2d`, `3d`, `auto` | `auto` |
| `sound` | `true`, `false` | `false` |
| `volume` | number from `0` to `1` | `0.65` |
| `cursor-interaction` | `true`, `false` | `true` |
| `start-corner` | `bottom-left`, `bottom-right` | `bottom-right` |
| `z-index` | any valid integer | `2147483000` |

Events:

```js
shiro.addEventListener("digital-pet-command", (event) => {
  console.log(event.detail.command);
});

shiro.addEventListener("digital-pet-size-change", (event) => {
  console.log(event.detail.size);
});

shiro.addEventListener("digital-pet-renderer-change", (event) => {
  console.log(event.detail.renderer);
});

shiro.addEventListener("digital-pet-care", (event) => {
  console.log(event.detail.action, event.detail.hunger);
});

shiro.addEventListener("digital-pet-name-change", (event) => {
  console.log(event.detail.name);
});

shiro.addEventListener("digital-pet-visibility-change", (event) => {
  console.log(event.detail.visible);
});
```

## Development

```bash
npm install
npm run check
npm run build
python3 -m http.server 4173 -d .
```

Open `http://localhost:4173/demo/`.

## Publishing

1. Update the version in `package.json`.
2. Run `npm run check`, `npm run build`, and `npm pack --dry-run`.
3. Authenticate with npm.
4. Run `npm publish --access public`.
