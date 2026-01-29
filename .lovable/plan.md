

# Gold Accent Visibility Fix

## Problem Diagnosis
The gold accent patterns ARE being rendered, but they're nearly invisible because:
- SVG container opacity is too low (10-20% via Tailwind classes like `opacity-15`)
- Stroke widths are too thin (1-2px on full viewport SVGs)
- Gradient `stopOpacity` values fade to 0 too quickly
- Relying on strokes rather than filled shapes

## Solution

### 1. Increase Base Opacity on All Variants
Update `GoldAccentOverlay.tsx` to use stronger visibility:

| Current | Target |
|---------|--------|
| `opacity-10` | `opacity-40` to `opacity-60` |
| `opacity-15` | `opacity-50` |
| `opacity-20` | `opacity-60` |

### 2. Thicken Strokes and Add Fill Elements
- Increase `strokeWidth` from 1-2 to 3-6 for waves/aurora paths
- Add filled gradient shapes behind the stroke elements
- Increase blur radii on glow orbs from `blur-3xl` to `blur-2xl` (less blur = more visible)

### 3. Strengthen Gradient Stop Opacities
Change gradient definitions from subtle to prominent:

```text
Current:  stopOpacity="0.3" -> "0.6" -> "0"
Target:   stopOpacity="0.7" -> "0.5" -> "0.1"
```

### 4. Variant-Specific Enhancements

| Variant | Current Issue | Fix |
|---------|--------------|-----|
| **waves** | Thin 2px strokes at 20% opacity | 4-6px strokes, add filled wave shapes, 50% opacity |
| **triangles** | 15% opacity, small polygons | 40% opacity, larger corner triangles with solid fill |
| **diamonds** | 12% opacity, tiny shapes | 50% opacity, larger diamonds with radial glow fills |
| **circles** | 15% opacity circles | 45% opacity, add soft filled circles with stronger gradients |
| **mesh** | 10% opacity thin lines | 35% opacity, thicker grid lines, add glow behind intersections |
| **aurora** | Faint 40px strokes | 80px strokes with stronger gradient, 55% opacity |

### 5. Add Animated Glow Layers (Optional Enhancement)
For extra polish, add CSS keyframe animations for subtle gold pulse on glow orbs.

## Files to Modify

```text
src/components/landing/GoldAccentOverlay.tsx
```

## Technical Details

The fix involves rewriting each variant's SVG structure in `GoldAccentOverlay.tsx`:

1. **Container opacity**: Change Tailwind classes from `opacity-10`/`opacity-15`/`opacity-20` to `opacity-40`/`opacity-50`/`opacity-60`

2. **SVG gradient definitions**: Update `<stop>` elements to have higher `stopOpacity` values that don't fade to zero

3. **Stroke elements**: Increase `strokeWidth` attributes and add matching filled paths beneath for depth

4. **Blur glows**: Use stronger glow intensities (`opacity-25` instead of `opacity-10`) and less blur for sharper gold presence

## Expected Result
Each landing page section will display clearly visible, distinct gold accent patterns:
- Hero: Curved sweeps with prominent orbs
- Replaces: Flowing horizontal waves
- How It Works: Bold corner triangles  
- Use Cases: Scattered diamonds with glow halos
- AI Features: Floating bubble circles
- Pricing: Interconnected mesh grid
- FAQ: Flowing aurora bands

