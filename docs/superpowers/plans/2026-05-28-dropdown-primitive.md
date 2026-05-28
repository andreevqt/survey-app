# Dropdown primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a custom `Dropdown` primitive matching the design HTML's `.dd-trigger`/`.dd-popover`/`.dd-item` styling and migrate the two existing `<Select>` call sites (PollForm visibility, UsersTable role) to use it.

**Architecture:** New folder under `frontend/src/components/primitives/Dropdown/` with `Dropdown.tsx` + `hooks/useDropdown.ts` + `types.ts` + `index.ts`. Controlled-only API (`value` + `onChange`). Click-outside + Escape close via `useEffect`. PollForm migrates via `react-hook-form` `Controller`; UsersTable migrates inline since it's already controlled-with-state.

**Tech Stack:** React 19, TypeScript, react-hook-form, react-router-dom, Tailwind, sonner. No new deps.

**Spec:** [docs/superpowers/specs/2026-05-28-dropdown-primitive-design.md](../specs/2026-05-28-dropdown-primitive-design.md)

---

## File map

**Create:**
- `frontend/src/components/primitives/Dropdown/types.ts`
- `frontend/src/components/primitives/Dropdown/hooks/useDropdown.ts`
- `frontend/src/components/primitives/Dropdown/Dropdown.tsx`
- `frontend/src/components/primitives/Dropdown/index.ts`

**Modify:**
- `frontend/src/routes/dashboard/PollForm/PollForm.tsx` — import `Controller` from `react-hook-form` and `Dropdown`; replace the Visibility `<Select>` block.
- `frontend/src/routes/dashboard/UsersTable/UsersTable.tsx` — import `Dropdown`; replace the Role `<Select>` block.

---

## Task 1: Build `Dropdown` primitive

**Files:**
- Create: `frontend/src/components/primitives/Dropdown/types.ts`
- Create: `frontend/src/components/primitives/Dropdown/hooks/useDropdown.ts`
- Create: `frontend/src/components/primitives/Dropdown/Dropdown.tsx`
- Create: `frontend/src/components/primitives/Dropdown/index.ts`

- [ ] **Step 1: Create `types.ts`**

Write `frontend/src/components/primitives/Dropdown/types.ts`:

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
  ariaLabel?: string;
}
```

- [ ] **Step 2: Create `hooks/useDropdown.ts`**

Write `frontend/src/components/primitives/Dropdown/hooks/useDropdown.ts`:

```ts
import { useEffect, useRef, useState } from 'react';

export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}
```

- [ ] **Step 3: Create `Dropdown.tsx`**

Write `frontend/src/components/primitives/Dropdown/Dropdown.tsx`:

```tsx
import { useDropdown } from './hooks/useDropdown';
import type { DropdownProps } from './types';

const chevronIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const checkIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" width="14" height="14" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function Dropdown<T extends string = string>({
  value,
  options,
  onChange,
  placeholder,
  disabled,
  className,
  ariaLabel,
}: DropdownProps<T>) {
  const { open, setOpen, ref } = useDropdown();
  const selected = options.find((o) => o.value === value);
  const showPlaceholder = !selected && !!placeholder;

  return (
    <div ref={ref} className={`relative inline-block w-full ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full min-h-9 inline-flex items-center justify-between gap-2 pl-3 pr-2.5 py-1.5 rounded-md border bg-white text-sm transition-colors outline-none ${
          disabled
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : open
            ? 'border-indigo-500 ring-1 ring-indigo-500'
            : 'border-gray-300 hover:border-gray-400'
        } ${showPlaceholder ? 'text-gray-400' : 'text-gray-700'}`}
      >
        <span className="truncate inline-flex items-center gap-1.5">
          {selected?.icon}
          <span>{selected?.label ?? placeholder ?? ''}</span>
        </span>
        <span className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}>
          {chevronIcon}
        </span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute left-0 top-[calc(100%+4px)] min-w-full max-h-[280px] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-md p-1 z-50"
        >
          {options.map((o) => {
            const isSel = o.value === value;
            const itemClass = o.disabled
              ? 'text-gray-400 cursor-not-allowed'
              : isSel
              ? 'bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100'
              : 'text-gray-700 hover:bg-gray-100';
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={isSel}
                onClick={() => {
                  if (o.disabled) return;
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md text-sm select-none whitespace-nowrap ${itemClass}`}
              >
                <span className="inline-flex items-center gap-2">
                  {o.icon}
                  <span>{o.label}</span>
                </span>
                {isSel && <span className="text-indigo-600">{checkIcon}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create `index.ts`**

Write `frontend/src/components/primitives/Dropdown/index.ts`:

```ts
export { Dropdown } from './Dropdown';
export type { DropdownProps, DropdownOption } from './types';
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/components/primitives/Dropdown/ && \
git commit -m "$(cat <<'EOF'
feat(frontend): add custom Dropdown primitive

Controlled <div>-based dropdown matching design/Polls App.html's
.dd-trigger/.dd-popover/.dd-item styling. Trigger has hover and
focus/open states with the design's 1px indigo-500 ring; chevron
rotates 180° on open; selected item has indigo background and a
trailing check icon. Click-outside and Escape close. Click on a
disabled option is a no-op.

Spec: docs/superpowers/specs/2026-05-28-dropdown-primitive-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Migrate `PollForm` Visibility + `UsersTable` Role

**Files:**
- Modify: `frontend/src/routes/dashboard/PollForm/PollForm.tsx`
- Modify: `frontend/src/routes/dashboard/UsersTable/UsersTable.tsx`

- [ ] **Step 1: Update `PollForm.tsx`**

Read `frontend/src/routes/dashboard/PollForm/PollForm.tsx` first.

Edit the `react-hook-form` import line at the top. Find:

```tsx
import { FormProvider } from 'react-hook-form';
```

Replace with:

```tsx
import { FormProvider, Controller } from 'react-hook-form';
```

Remove the `Select` import (no longer used in this file) — find:

```tsx
import { Select } from '../../../components/primitives/Select';
```

Replace with:

```tsx
import { Dropdown } from '../../../components/primitives/Dropdown';
```

Find this block in the form body:

```tsx
                <Field label="Visibility">
                  <Select {...register('visibility')}>
                    <option value="PRIVATE">Private (link only)</option>
                    <option value="PUBLIC">Public</option>
                  </Select>
                </Field>
```

Replace with:

```tsx
                <Field label="Visibility">
                  <Controller
                    control={vm.methods.control}
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

(Use `vm.methods.control` since the component already destructures `vm.methods` for `register`. If the existing local destructuring is `const { register, formState: { errors } } = vm.methods;`, the `vm.methods.control` path still works without modifying that line.)

- [ ] **Step 2: Update `UsersTable.tsx`**

Read `frontend/src/routes/dashboard/UsersTable/UsersTable.tsx` first.

Find the Select import:

```tsx
import { Select } from '../../../components/primitives/Select';
```

Replace with:

```tsx
import { Dropdown } from '../../../components/primitives/Dropdown';
```

Find the per-row Select block (in the Actions cell, around line 60–69):

```tsx
                <td className="px-4 py-3">
                  <Select
                    defaultValue={u.role}
                    className="h-8 w-28 text-xs"
                    disabled={isMe || vm.isChangingRole}
                    onChange={(e) => vm.onChangeRole(u, e.target.value as 'USER' | 'ADMIN')}
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </Select>
                </td>
```

Replace with:

```tsx
                <td className="px-4 py-3">
                  <Dropdown
                    value={u.role}
                    className="w-28"
                    disabled={isMe || vm.isChangingRole}
                    onChange={(v) => vm.onChangeRole(u, v as 'USER' | 'ADMIN')}
                    options={[
                      { value: 'USER', label: 'USER' },
                      { value: 'ADMIN', label: 'ADMIN' },
                    ]}
                  />
                </td>
```

Diffs: dropped `defaultValue` (now controlled `value`), dropped `h-8 ... text-xs` (Dropdown sets its own height), kept `w-28` and `disabled`.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/andreevxdr/sources/survey-app/frontend && npm run check:ts
```

Expected: clean.

- [ ] **Step 4: Sanity-grep for stray Select imports**

```bash
grep -rn "from.*primitives/Select" /Users/andreevxdr/sources/survey-app/frontend/src
```

Expected: no matches (both call sites migrated; native Select stays exported but is unused). If any other file still imports Select, leave it alone — out of scope.

- [ ] **Step 5: Commit**

```bash
cd /Users/andreevxdr/sources/survey-app && \
git add frontend/src/routes/dashboard/PollForm/PollForm.tsx \
        frontend/src/routes/dashboard/UsersTable/UsersTable.tsx && \
git commit -m "$(cat <<'EOF'
feat(frontend): migrate Select call sites to Dropdown primitive

PollForm Visibility now uses react-hook-form Controller wrapping the
new Dropdown (with Private/Public options). UsersTable Role uses
Dropdown directly with USER/ADMIN options. The native Select
primitive is no longer imported anywhere but stays exported for any
future native-form use case.

Spec: docs/superpowers/specs/2026-05-28-dropdown-primitive-design.md

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Self-review notes

- **Spec coverage:** Dropdown component → Task 1. PollForm migration → Task 2 Step 1. UsersTable migration → Task 2 Step 2. Spec call-out "Select stays exported" → preserved (no deletion).
- **Placeholder scan:** No "TBD", "add appropriate error handling", or "similar to Task N". All code blocks are complete.
- **Type consistency:** `DropdownProps<T extends string>` allows the caller to constrain T (e.g. `'USER' | 'ADMIN'` from a cast). The migration code casts at the `onChange` boundary, same pattern as the deleted Select usage.
- **`useDropdown` hook return:** `{ open, setOpen, ref }` — consumed by `Dropdown.tsx` directly.
- **Controller pattern:** RHF's `Controller` is the standard way to integrate non-input components. The existing form uses `register()` for inputs; only Visibility moves to Controller. Zod schema validation runs on `field.onChange`-triggered updates the same as before.
