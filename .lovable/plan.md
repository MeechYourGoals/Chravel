

## Fix Calendar Icon Rendering

### Root Cause

The CSS selectors target children of a *child* SVG (`.gold-gradient-icon svg path`, `.gold-gradient-icon svg line`, etc.), but Lucide renders the `<svg>` as the element *itself* (with class `lucide`). So the internal `rect`, `line`, and `path` elements inside the Calendar icon never match and fall back to `currentColor` — which renders as a flat square-ish shape without the gradient on the internal grid lines.

The Users icon works because its simple paths inherit `stroke` from the parent SVG. Calendar has separate `rect` + `line` child elements that need explicit targeting.

### Fix — `src/index.css` (lines 675-683)

Replace the current selectors with ones that also target children of `.gold-gradient-icon.lucide`:

```css
.gold-gradient-icon svg,
.gold-gradient-icon.lucide {
  stroke: url(#gold-metallic-gradient) !important;
}
.gold-gradient-icon svg path,
.gold-gradient-icon svg line,
.gold-gradient-icon svg circle,
.gold-gradient-icon svg polyline,
.gold-gradient-icon svg rect,
.gold-gradient-icon.lucide path,
.gold-gradient-icon.lucide line,
.gold-gradient-icon.lucide circle,
.gold-gradient-icon.lucide polyline,
.gold-gradient-icon.lucide rect {
  stroke: url(#gold-metallic-gradient) !important;
}
```

This ensures all internal SVG elements (rect for the calendar body, lines for the grid) get the metallic gradient stroke, whether the icon is a Lucide SVG (`.gold-gradient-icon.lucide`) or wrapped in a container (`.gold-gradient-icon svg`).

### Files: 1
- `src/index.css` — Fix CSS selectors (~lines 675-683)

