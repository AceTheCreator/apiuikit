# Configuration

## Overview

Learn how to use the various configuration options available in `ConfigInterface`.

## Definition

See the definition of the object that you must pass to the `config` prop to modify the component:

```ts
interface ConfigInterface {
  show?: {
    sidebar?: boolean;
    info?: boolean;
    servers?: boolean;
    search?: boolean;
    operations?: boolean;
    messages?: boolean;
    messageExamples?: boolean;
    schemas?: boolean;
  };
  expand?: {
    messageExamples?: boolean;
    schemas?: boolean;
  };
  sidebar?: {
    useChannelAddressAsIdentifier?: boolean;
  };
  theme?: {
    colors?: ThemeColors;
    light?: ThemeModeColors;
    dark?: ThemeModeColors;
    depthColors?: string[];
  };
  requestLabel?: string;
  replyLabel?: string;
}

// Brand color scales — shared across light and dark.
interface ThemeColors {
  primary?: {
    50?: string; 100?: string; 200?: string;
    300?: string; 500?: string; 600?: string; 700?: string;
  };
  secondary?: {
    50?: string; 100?: string; 200?: string;
    300?: string; 500?: string; 600?: string; 700?: string;
  };
  neutral?: {
    50?: string; 100?: string; 200?: string;
    300?: string; 500?: string; 600?: string; 700?: string;
  };
}

// Semantic surface/text colors for a single mode.
interface ThemeModeColors {
  background?: string;
  surface?: string;
  border?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
}
```

- **show?: Partial\<ShowConfig\>**

  Controls which sections and tabs are rendered. Setting a tab (`operations`, `messages`, `schemas`) to `false` removes it from both the tab bar and the side navigation.

  `search` controls whether the search panel is shown. `schemas` and `messageExamples` default to `false`. All other fields default to `true`.

- **sidebar?: Partial\<SideBarConfig\>**

  Controls the behaviour of the side navigation panel.

  `useChannelAddressAsIdentifier`: when `true`, operation items in the sidebar display the channel address instead of the operation key. Defaults to `false`.

- **expand?: Partial\<ExpandConfig\>**

  Controls default expanded/collapsed state of collapsible sections. `messageExamples` defaults to `false`. `schemas` controls whether nested schema tree nodes (object properties, array items, etc.) start expanded, and defaults to `false`. The top-most level of each schema is always visible regardless of this setting.

- **theme?: Partial\<ThemeConfig\>**

  Customises the visual appearance of the component. All color values must be hex strings (e.g. `"#0EA5E9"`).

  - **colors?: ThemeColors** — Brand color scales, applied regardless of which mode is active (they typically don't change between light and dark).
    - **primary / secondary / neutral** — Color scales used for accents, interactive elements, and surface tones. Each scale accepts shades `50`, `100`, `200`, `300`, `500`, `600`, and `700`. You can override as few or as many shades as needed. When `dark` is the active mode, the neutral scale is inverted by default before your overrides are applied.

  - **light? / dark?: ThemeModeColors** — Semantic surface and text colors for that mode. Provide `light` and/or `dark`; whichever you provide is applied, and `dark` wins if you provide both. If neither is provided, the component's built-in light defaults are used untouched.
    - `background` — Page/component background.
    - `surface` — Card and panel backgrounds.
    - `border` — Dividers and input borders.
    - `textPrimary` — Primary body text.
    - `textSecondary` — Supporting text.
    - `textMuted` — Placeholders, disabled labels, faint text.

  - **depthColors?: string[]** — Colors for the schema tree's depth-indicator lines (the vertical lines on the left of nested schema properties), and their matching label/toggle text. Accepts any number of hex colors — they're cycled by nesting depth, so a tree nested deeper than the array you provide just repeats the palette from the start. Defaults to a built-in 6-color palette if omitted or empty.

- **requestLabel?: string**

  Customises the label for request operations.
  Defaults to `"Request"`.

- **replyLabel?: string**

  Customises the label for reply operations.
  Defaults to `"Reply"`.

## Examples

### TypeScript

```tsx
import AsyncAPI, { ConfigInterface } from "@your-org/aui";
import doc from "./asyncapi.json";

const config: ConfigInterface = {
  show: {
    schemas: false,
    messageExamples: true,
  },
  sidebar: {
    useChannelAddressAsIdentifier: true,
  },
  theme: {
    colors: {
      primary: {
        50:  "#F0F9FF",
        100: "#E0F2FE",
        200: "#BAE6FD",
        300: "#7DD3FC",
        500: "#0EA5E9",
        600: "#0284C7",
        700: "#0369A1",
      },
    },
    dark: {
      background:    "#0f172a",
      surface:       "#1e293b",
      border:        "#334155",
      textPrimary:   "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted:     "#94a3b8",
    },
    depthColors: [
      "#0EA5E9", "#22C55E", "#F59E0B",
      "#EC4899", "#8B5CF6", "#14B8A6",
    ],
  },
  requestLabel: "Request",
  replyLabel:   "Reply",
};

export default function App() {
  return <AsyncAPI asyncapi={doc} config={config} />;
}
```

### JavaScript

```jsx
import AsyncAPI from "@your-org/aui";
import doc from "./asyncapi.json";

const config = {
  show: {
    schemas: false,
    messageExamples: true,
  },
  sidebar: {
    useChannelAddressAsIdentifier: true,
  },
  theme: {
    dark: {
      background:    "#0f172a",
      surface:       "#1e293b",
      border:        "#334155",
      textPrimary:   "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted:     "#94a3b8",
    },
  },
};

export default function App() {
  return <AsyncAPI asyncapi={doc} config={config} />;
}
```

After merging with the default configuration, the resulting config looks as follows:

```js
{
  show: {
    sidebar:         true,
    info:            true,
    servers:         true,
    operations:      true,
    messages:        true,
    messageExamples: true,   // overridden from false
    schemas:         false,
  },
  sidebar: {
    useChannelAddressAsIdentifier: true,  // overridden from false
  },
  expand: {
    schemas: false,
  },
  theme: {
    dark: {
      background:    "#0f172a",
      surface:       "#1e293b",
      border:        "#334155",
      textPrimary:   "#f8fafc",
      textSecondary: "#cbd5e1",
      textMuted:     "#94a3b8",
    },
  },
  requestLabel: "Request",
  replyLabel:   "Reply",
}
```
