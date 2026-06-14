# Digital Pet for the Web

A dependency-free Web Component that adds an animated, interactive pet to any
website. The default pet is Shiro, a golden retriever, and the displayed name is
customizable.

## Features

- Walk, run, jump, down, sleep, roll over, handshake, hi-five, salute, namaste,
  speak, quiet, and fetch commands
- Cursor awareness and drag interaction
- Persistent corner nap
- Colorful ball collection and fetch animation
- Small, normal, large, and extra-large sizes saved in `localStorage`
- Built-in accessible control panel
- Shadow DOM style isolation
- Reduced-motion, background-tab, mobile pointer, and print handling
- No runtime dependencies

## Install

```bash
npm install @ranjeet447/digital-pet
```

Import it once and add the custom element:

```js
import "@ranjeet447/digital-pet";
```

```html
<digital-pet name="Shiro" size="normal" controls="true"></digital-pet>
```

## Direct script or CDN usage

After hosting `dist/index.js`:

```html
<script type="module" src="/widgets/digital-pet.js"></script>
<digital-pet></digital-pet>
```

The same ESM file can be served through an npm CDN after publication.

## JavaScript API

```js
import { mountDigitalPet } from "@ranjeet447/digital-pet";

const shiro = mountDigitalPet({
  name: "Shiro",
  size: "normal",
  controls: true,
  cursorInteraction: true,
  startCorner: "bottom-right",
});

shiro.command("sit");
shiro.command("fetch");
shiro.command("sleep");
shiro.setSize("large");
shiro.bringToPointer();
shiro.hide();
shiro.show();
```

Commands:

```text
sit, walk, run, jump, down, sleep, roll-over, handshake, hi-five,
salute, namaste, speak, quiet, fetch
```

Attributes:

| Attribute | Values | Default |
| --- | --- | --- |
| `name` | any non-empty name | `Shiro` |
| `size` | `small`, `normal`, `large`, `extra-large` | saved value or `normal` |
| `remember-size` | `true`, `false` | `true` |
| `controls` | `true`, `false` | `true` |
| `cursor-interaction` | `true`, `false` | `true` |
| `start-corner` | `bottom-left`, `bottom-right` | `bottom-right` |
| `z-index` | any valid integer | `2147483000` |

By default, a visitor's saved size takes precedence over the initial `size`
attribute. Set `remember-size="false"` when the website must enforce a fixed size.

Events:

```js
shiro.addEventListener("digital-pet-command", (event) => {
  console.log(event.detail.command);
});

shiro.addEventListener("digital-pet-size-change", (event) => {
  console.log(event.detail.size);
});
```

## React and Next.js

Load the package from a client component because Custom Elements and Canvas use
browser APIs:

```tsx
"use client";

import { createElement, useEffect } from "react";

export function DigitalPet() {
  useEffect(() => {
    void import("@ranjeet447/digital-pet");
  }, []);

  return createElement("digital-pet", {
    size: "normal",
    controls: "true",
    "cursor-interaction": "true",
  });
}
```

Render that client component once in the root layout.

## Development

```bash
npm install
npm run build
python3 -m http.server 4173 -d .
```

Open `http://localhost:4173/demo/`.

## Publishing

1. Update the package name, repository, author, and version in `package.json`.
2. Run `npm run check` and `npm run build`.
3. Inspect the package with `npm pack --dry-run`.
4. Authenticate with npm and run `npm publish`.
