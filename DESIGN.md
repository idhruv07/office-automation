# Design System: Google Stitch

This design system is inspired by Google's "Stitch" and Material You concepts, focusing on clean lines, high contrast, and a premium feel.

## 🎨 Color Palette

| Token | Hex | RGB / HSL | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `#2563eb` | `221, 83%, 53%` | Primary buttons, Active states |
| **Secondary** | `#4f46e5` | `239, 84%, 67%` | Accents, Highlights |
| **Background** | `#f8fafc` | `210, 40%, 98%` | Page background |
| **Surface** | `#ffffff` | `0, 0%, 100%` | Cards, Modals, Forms |
| **Text Primary** | `#0f172a` | `222, 47%, 11%` | Headers, Body text |
| **Text Secondary**| `#64748b` | `215, 16%, 47%` | Captions, Secondary info |

## Typography

- **Font Family**: 'Inter', system-ui, -apple-system, sans-serif.
- **Sizes**:
  - `h1`: 2.25rem (36px), Bold
  - `h2`: 1.5rem (24px), SemiBold
  - `h3`: 1.25rem (20px), Medium
  - `body`: 1rem (16px), Regular
  - `small`: 0.875rem (14px), Regular

## 📐 Spacing & Layout

- **Base Unit**: `4px`
- **Container**: `1280px` max-width, centered.
- **Border Radius**: `12px` (Large), `8px` (Medium), `4px` (Small).
- **Shadows**:
  - `sm`: 0 1px 2px 0 rgb(0 0 0 / 0.05)
  - `md`: 0 4px 6px -1px rgb(0 0 0 / 0.1)
  - `lg`: 0 10px 15px -3px rgb(0 0 0 / 0.1)

## ✨ Premium Effects

- **Glassmorphism**: 
  - `background: rgba(255, 255, 255, 0.7)`
  - `backdrop-filter: blur(10px)`
- **Gradients**:
  - `linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)`
- **Animations**:
  - `transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
  - `hover: scale(1.02)`

## 🧩 Components

### Buttons
- **Primary**: Gradient background, white text, bold, elevated shadow.
- **Secondary**: Light gray background, primary text, subtle border.

### Cards
- White surface, `12px` radius, `lg` shadow on hover.

### Inputs
- Bordered (`#e2e8f0`), focus state has primary colored border with `2px` ring.
