# Expense Counter brand assets

`icon-concept.svg` is the vector source of truth for the app mark:

- Ink background `#0B0D12`
- Single accent emerald `#3DDC97 → #25B97B`
- Rupee glyph in ink `#04251A`
- Rounded tile at 156 / 528 radius ratio

## Exporting the PNGs

Use any SVG renderer (Figma, Inkscape, or `npx @resvg/resvg-js-cli`). Keep the ink background for store icons; keep the background transparent for Android foreground and notification icons.

| File | Size | Notes |
| --- | --- | --- |
| `icon.png` | 1024 × 1024 | Full icon with ink background, no transparency. |
| `play-store-icon.png` | 512 × 512 | Same artwork, flattened, no transparency. |
| `favicon.png` | 48 × 48 | Web favicon. |
| `splash-icon.png` | 512 × 512 | Transparent background, accent mark only. The splash background is ink. |
| `adaptive-icon-foreground.png` | 1024 × 1024 | Transparent, mark inside the central 66% safe zone. |
| `adaptive-icon-background.png` | 1024 × 1024 | Solid `#0B0D12`. |
| `adaptive-icon-monochrome.png` | 1024 × 1024 | White silhouette on transparent for Android themed icons. |
| `notification-icon.png` | 96 × 96 | White silhouette on transparent. |

`scripts/generate-design-assets.ps1` regenerates all of the above on Windows using `System.Drawing`. Run it with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-design-assets.ps1
```

After replacing icons, rebuild the dev client once so Android picks up the launcher and notification icons.
