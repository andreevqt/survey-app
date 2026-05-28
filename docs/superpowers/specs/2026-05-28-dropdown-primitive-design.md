# Custom `Dropdown` primitive — design

**Date:** 2026-05-28
**Scope:** Frontend only. New `Dropdown` primitive matching `design/Polls App.html`'s `.dd-trigger` + `.dd-popover` + `.dd-item` styling. Migrate the 2 existing `<Select>` call sites to use it. Keep the native `<Select>` primitive available for future use.

## Problem

The native `<select>` element renders with OS-specific styling (chevron, item list) that doesn't match the design's custom dropdown look. The design uses a `<div>`-based trigger button + popover list with custom item styling, hover/selected states, animated chevron, and a trailing check on the selected item.

## Goal

Ship a `Dropdown` primitive in `frontend/src/components/primitives/Dropdown/` whose visual appearance matches the design HTML's `Dropdown` component (lines 720–760) and CSS (lines 211–249), and migrate the two existing `<Select>` call sites to use it.

## Non-goals

- **MultiSelect** (design's sibling component) — not needed today.
- **Per-option danger styling** (`.dd-item.is-danger`) — no use case yet.
- **Keyboard navigation** through items with arrow keys + Enter. Mouse + click + Escape-close is enough for v1.
- **Removing the native `<Select>` primitive.** It stays in the codebase in case future forms want a native form-field. After migration, it has no call sites but remains exported.

## Design

### Component API

```ts
import type { ReactNode } from 'react';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface DropdownProps<T extends string = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** ARIA label for the trigger when no visual label nearby. Optional. */
  ariaLabel?: string;
}
```

Uncontrolled mode is intentionally NOT supported — keep state explicit. The component is a controlled `<button>` + popover; the parent always passes `value` + `onChange`.

### Visual + behaviour

**Trigger:**
- Min-height 36px (`min-h-9`), padding `py-1.5 pl-3 pr-2.5`, border `border-gray-300`, rounded `rounded-md`, white bg.
- Hover: `border-gray-400`. Focus/open: `border-indigo-500` + 1px ring `ring-1 ring-indigo-500`.
- When no value selected and `placeholder` set: text color `text-gray-400`.
- Chevron icon on the right, `text-gray-500`, rotates 180° when open. Inline SVG, `transition-transform`.
- `aria-haspopup="listbox"`, `aria-expanded={open}`.
- Disabled: dim + cursor not-allowed; popover never opens.

**Popover:**
- Absolutely positioned, `top: calc(100% + 4px) left-0 min-w-full max-h-[280px] overflow-y-auto`.
- White bg, `border-gray-200`, shadow (Tailwind `shadow-md`), `rounded-lg`, `p-1`, `z-50`.
- `role="listbox"`.

**Item:**
- Flex row `gap-2 px-2.5 py-2 rounded-md text-sm text-gray-700`.
- Hover: `bg-gray-100`.
- Selected: `bg-indigo-50 text-indigo-700 font-medium`.
- Disabled: `text-gray-400 cursor-not-allowed`; hover does nothing.
- `role="option" aria-selected`.
- Optional `icon` rendered before the label (small SVG).
- Trailing check icon (inline SVG, 14×14, `text-indigo-600`) only on the selected item.
- Click → `onChange(option.value)` + close. Click on disabled = no-op.

**Close behaviour:**
- Click outside the dropdown → close.
- Escape key → close.
- Click an item → close.

### File layout

Folder pattern (matches existing primitives):

```
frontend/src/components/primitives/Dropdown/
  Dropdown.tsx              — main composition (trigger + popover wrapper)
  hooks/useDropdown.ts      — open/close + outside-click + Escape listener
  types.ts                  — DropdownProps, DropdownOption
  index.ts                  — barrel
```

No separate item component file — items render inline in `Dropdown.tsx` since they're tiny.

### Migration — `PollForm.tsx` Visibility

The current code:

```tsx
<Field label="Visibility">
  <Select {...register('visibility')}>
    <option value="PRIVATE">Private (link only)</option>
    <option value="PUBLIC">Public</option>
  </Select>
</Field>
```

After migration:

```tsx
<Field label="Visibility">
  <Controller
    control={methods.control}
    name="visibility"
    render={({ field }) => (
      <Dropdown
        value={field.value}
        onChange={field.onChange}
        options={[
          { value: 'PRIVATE', label: 'Private (link only)' },
          { value: 'PUBLIC', label: 'Public' },
        ]}
      />
    )}
  />
</Field>
```

`Controller` from `react-hook-form` is already imported in the project (used elsewhere); if not in `PollForm.tsx`, add the import. The form's `methods` object exposes `control`.

### Migration — `UsersTable.tsx` Role

The current code:

```tsx
<Select
  defaultValue={u.role}
  className="h-8 w-28 text-xs"
  disabled={isMe || vm.isChangingRole}
  onChange={(e) => vm.onChangeRole(u, e.target.value as 'USER' | 'ADMIN')}
>
  <option value="USER">USER</option>
  <option value="ADMIN">ADMIN</option>
</Select>
```

After migration:

```tsx
<Dropdown
  value={u.role}
  disabled={isMe || vm.isChangingRole}
  className="w-28"
  onChange={(v) => vm.onChangeRole(u, v as 'USER' | 'ADMIN')}
  options={[
    { value: 'USER', label: 'USER' },
    { value: 'ADMIN', label: 'ADMIN' },
  ]}
/>
```

Note: the previous `h-8 ... text-xs` overrides are dropped — Dropdown has its own (taller, more uniform) sizing and looks crisper in the table. If the table rows look too tall, a follow-up can tune the trigger padding; not required.

### File map

**Create:**
- `frontend/src/components/primitives/Dropdown/Dropdown.tsx`
- `frontend/src/components/primitives/Dropdown/hooks/useDropdown.ts`
- `frontend/src/components/primitives/Dropdown/types.ts`
- `frontend/src/components/primitives/Dropdown/index.ts`

**Modify:**
- `frontend/src/routes/dashboard/PollForm/PollForm.tsx` — import `Controller` + `Dropdown`, replace the visibility Select.
- `frontend/src/routes/dashboard/UsersTable/UsersTable.tsx` — import `Dropdown`, replace the Role Select.

**Delete:** none. Native `Select` primitive stays.

### Verification

After implementation, on a local dev server:

1. Open the **New poll** modal (`+ New poll` button). Click the Visibility dropdown → popover opens below with two items (Private, Public). Click Public → label updates to Public, popover closes. Submit, reload edit modal → Public selected.
2. Open **All users** tab (admin). Click any user's role dropdown → popover with USER/ADMIN; click the other → role updates in the table immediately (existing `useChangeUserRole` mutation flow).
3. Click outside the open dropdown → it closes.
4. Press Escape with a dropdown open → it closes.
5. Disabled dropdown (yourself in users table) doesn't open on click.
6. `npm run check:ts` clean.

### Risks

- **RHF Controller pattern.** `PollForm.tsx` currently uses `register()` for the Select. Switching to `Controller` is standard but new for this form. Verify the form's zod schema still validates `visibility` correctly.
- **Click-outside listener leak.** The dropdown's `useEffect` for `mousedown` listener must clean up on unmount and on `open` going false. Standard pattern — same as `AvatarMenu.tsx`.
- **`w-full` vs explicit width.** Both call sites need slightly different widths (Visibility wants full-width, Role wants `w-28`). The `className` prop overrides; the default trigger is `w-full` to fit `<Field>`.
