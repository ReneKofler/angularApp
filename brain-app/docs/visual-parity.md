# Visual parity checklist

Reference: <https://brainappweb.vercel.app/>

## Captured public reference

- Desktop login at 1440 x 1000: centered slate card on a dark navy page.
- Compact labels and controls, subtle border/shadow, blue primary action.
- Invitation-only helper text below the action.

The authenticated reference was not accessible without a designated test account. Private content must not be captured with a personal account. Add privacy-safe authenticated desktop and mobile references when a test account is available.

## Coverage

- [x] Shared light, dark, and system color tokens
- [x] Theme applied before Angular bootstrap to prevent a flash
- [x] Slate/blue login surface aligned to the public reference
- [x] Visible keyboard focus and reduced-motion handling
- [x] Dashboard and settings consume shared theme tokens
- [ ] Compare authenticated navigation and dashboard with a test-account reference
- [ ] Compare dialogs and state variants as feature routes are completed
- [ ] Add 375 px, 768 px, and 1440 px snapshots under DEMO-68
