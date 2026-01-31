# Brand Identity & Design System Directives

**Status**: ACTIVE
**Source of Truth**: `src/renderer/src/design-system`

## 1. Core Principles
- **Premium Tech**: The UI must look modern, high-tech, and polished.
- **Glassmorphism**: Use translucent backgrounds with blur for cards and panels.
- **Neon Accents**: Use cyan glows for active states and primary actions.
- **Dark Theme**: The base background is deep/dark.

## 2. Color Palette
| Token | Tailwind Class | Description |
| :--- | :--- | :--- |
| **Primary/Accent** | `text-brand-cyan`, `bg-brand-cyan` | Neon Cyan (approx `#00F2FF`). Used for primary buttons, active states, and glows. |
| **Background Deep** | `bg-brand-deep` | Deepest background color. |
| **Card Background** | `bg-brand-card/60` | Translucent background for cards (Glassmorphism). |
| **Text Secondary** | `text-brand-text-sec` | Muted text for descriptions/body (`gray-400` equivalent). |
| **Danger** | `text-red-600`, `bg-red-600` | Destructive actions. |

## 3. UI Components (Design System)
Refrain from creating custom UI elements. Use the extracted library `@design-system`.

### Buttons (`Button.tsx`)
- **Primary**: `variant="primary"` (Cyan background, dark text, neon glow).
- **Secondary**: `variant="secondary"` (Deep background, Cyan border/text).
- **Ghost**: `variant="ghost"` (Transparent, subtle hover).
- **Icon**: `variant="icon"` (For isolated icons).

### Cards (`Card.tsx`)
- **Glass**: `variant="glass"` (Default). `backdrop-blur-md`, `border-white/10`.
- **Solid**: `variant="solid"`. Opaque background.
- **Hoverable**: Add `hoverable={true}` for interactive cards (scale/glow effect).

### Typography (`Typography.tsx`)
- **Headers**: `variant="h1"`, `variant="h2"`, `variant="h3"`. Bold, tracking-tight.
- **Body**: `variant="body"`. Relaxed line height, secondary color.
- **Special**: `neon={true}` (adds cyan drop-shadow), `gradient={true}`.

### Inputs (`Input.tsx`)
- Use `Input` and `Select` atoms. They are styled with glassmorphism and handle focus states (Cyan ring).

## 4. Implementation Rules
1. **Always** import from `@design-system`: `import { Button } from '@design-system'`.
2. **Never** hardcode hex colors or generic Tailwind colors (`blue-500`, `purple-600`) unless for specific semantic meaning (e.g. status badge).
3. **Never** assume light mode support. Design for Dark Mode first.
4. **Spacing**: Use standard Tailwind spacing (p-4, p-6, gap-4).

## 5. Violation Examples (DO NOT DO)
- `<button className="bg-blue-500 text-white">Save</button>` -> **VIOLATION**: Use `<Button variant="primary">Save</Button>`
- `<div className="bg-gray-800 rounded p-4">...</div>` -> **VIOLATION**: Use `<Card>...</Card>`
- `<h1 className="text-2xl font-bold">Title</h1>` -> **VIOLATION**: Use `<Typography variant="h1">Title</Typography>`
