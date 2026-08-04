# Configuration

## Overview

Learn how to use various configuration options available in `ConfigInterface`.

## Definition

See the definition of the object that you must pass to the `config` prop to modify the component configuration:

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

  This field contains configuration responsible for rendering specific parts of the AsyncAPI component.
  The `schemas` and `messageExamples` fields are set to `false` by default. The default for all other fields is `true`.

  Setting `search` to `false` hides the search panel. Setting a tab (`operations`, `messages`, `schemas`) to `false` removes it from both the tab bar and the side navigation panel.

- **sidebar?: Partial\<SideBarConfig\>**

  This field contains configuration responsible for the behaviour of the sidebar.

  `useChannelAddressAsIdentifier`: when `true`, operation items in the sidebar display the channel address instead of the operation key. This field is set to `false` by default.

- **expand?: Partial\<ExpandConfig\>**

  This field contains configuration responsible for collapsing and expanding component sections.
  `messageExamples` field is set to `false` by default.
  `schemas` controls whether nested schema tree nodes (object properties, array items, etc.) start expanded or collapsed, and is set to `false` by default. The top-most level of each schema is always visible regardless of this setting.

- **theme?: Partial\<ThemeConfig\>**

  This field contains configuration responsible for the visual appearance of the component. All color values must be hex strings (e.g. `"#0EA5E9"`).

  - **colors?: ThemeColors** — Brand color scales, applied regardless of which mode is active (they typically don't change between light and dark).
    - **primary / secondary / neutral** — Color scales used for accents, interactive elements, and surface tones. Each scale accepts shades `50`, `100`, `200`, `300`, `500`, `600`, and `700`. Only the shades you provide are overridden; the rest fall back to the defaults defined in the component's CSS. When `dark` is the active mode, the neutral scale is inverted by default before your overrides are applied.

  - **light? / dark?: ThemeModeColors** — Semantic surface and text colors for that mode. Provide `light` and/or `dark`; whichever you provide is applied, and `dark` wins if you provide both. If neither is provided, the component's built-in light defaults are used untouched.
    - `background` — Main page/component background.
    - `surface` — Card, panel, and elevated surface backgrounds.
    - `border` — Dividers, input borders, and separators.
    - `textPrimary` — Primary body text.
    - `textSecondary` — Supporting and secondary text.
    - `textMuted` — Placeholders, disabled labels, and faint text.

<!-- - **requestLabel?: string**

  This field contains configuration responsible for customising the label for request operations.
  This field is set to `Request` by default.

- **replyLabel?: string**

  This field contains configuration responsible for customising the label for reply operations.
  This field is set to `Reply` by default. -->

## Examples

See exemplary component configuration in TypeScript and JavaScript.

### TypeScript

```tsx
import AsyncAPI, { ConfigInterface } from "aui";
import doc from "./asyncapi.json";

const config: ConfigInterface = {
  show: {
    operations: true,
    messages: true,
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
  },
};

export default function App() {
  return <AsyncAPI asyncapi={doc} config={config} />;
}
```

### JavaScript

```jsx
import AsyncAPI from "aui";
import doc from "./example1.json";

const config = {
  show: {
    operations: true,
    messages: true,
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

In the above examples, after merging with the default configuration, the resulting configuration looks as follows:

```js
{
  show: {
    sidebar:         true,
    info:            true,
    servers:         true,
    operations:      true,
    messages:        true,
    messageExamples: true, 
    schemas:         false,
  },
  sidebar: {
    useChannelAddressAsIdentifier: true,
  },
  expand: {
    schemas: false,
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
  },
  // requestLabel: "Request",
  // replyLabel:   "Reply",
}
```
