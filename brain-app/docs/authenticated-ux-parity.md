# Authenticated UX inventory and parity checklist

This document is the implementation reference for YouTrack ticket `DEMO-45`.
It records a read-only review of BrainAppWeb `v3.12.0` performed on
2026-07-24 at desktop (1440 × 1000) and mobile (390 × 844) viewports. The
review used the configured test account, but no credentials, row values,
screenshots, or other private account data are stored here.

## Global behavior

- Unauthenticated visits redirect to `/login`.
- Login is a single centered card with e-mail and password fields, a primary
  `Anmelden` action, and invitation-only help text.
- Successful login opens `/dashboard`; logout returns to `/login`.
- The authenticated header contains the BrainApp brand, account identity on
  wider screens, release notes, profile, dashboard settings, and logout.
- Profile is a separate `/profile` screen. It supports display-name updates
  and password changes with password confirmation.
- Release notes open in an overlay. Dashboard settings open a reorder/visibility
  overlay with a `Fertig` action.
- All reviewed screens request `user_settings`; screen-specific tables are
  listed below. Browser code must remain limited to the Supabase URL and anon
  key, with row ownership enforced by RLS.
- Light and dark colors follow `prefers-color-scheme`. Observed body colors were
  white/near-black in light mode and near-black/off-white in dark mode.
- Dashboard cards use four columns at 1440 px and two columns at 390 px. The
  mobile header hides secondary identity/version text while retaining the
  primary navigation actions.

## Safe visual references

These wireframes replace screenshots deliberately: they preserve layout
evidence without capturing private test-account data.

Desktop dashboard:

```text
┌ BrainApp ─ account ─ version ─ profile ─ settings ─ logout ┐
│                                                            │
│  ┌ module ┐  ┌ module ┐  ┌ module ┐  ┌ module ┐           │
│  │ icon   │  │ icon   │  │ icon   │  │ icon   │           │
│  │ title  │  │ title  │  │ title  │  │ title  │           │
│  │ hint   │  │ hint   │  │ hint   │  │ hint   │           │
│  └────────┘  └────────┘  └────────┘  └────────┘           │
│  ... four-column card grid ...                             │
└────────────────────────────────────────────────────────────┘
```

Mobile dashboard:

```text
┌ BrainApp ─ actions ─ logout ┐
│ ┌ module ┐  ┌ module ┐      │
│ │ icon   │  │ icon   │      │
│ │ title  │  │ title  │      │
│ └────────┘  └────────┘      │
│ ... two-column card grid ... │
└──────────────────────────────┘
```

Standard module:

```text
┌ back ─ module title ─ module actions ┐
│ filters / date navigation / tabs     │
├──────────────────────────────────────┤
│ loading | empty message | item cards │
│ item actions: view, edit, delete     │
└──────────────────────────────────────┘
```

Dialog:

```text
┌ title ─ close ┐
│ labelled fields, validation, help    │
│ error feedback near affected field   │
│             cancel  primary action   │
└──────────────────────────────────────┘
```

On mobile, dialogs must fit the viewport, scroll internally when necessary,
and keep primary actions reachable. Dense tables and charts must become cards,
scroll horizontally, or reduce detail without hiding the underlying data.

## Route and data inventory

`user_settings` is common to every authenticated module and is omitted from
the data column where it is the only request.

| Dashboard module    | Observed route                                        | Primary UI                                                             | Screen-specific Supabase tables                                                                     |
| ------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dashboard           | `/dashboard`                                          | Module card grid, release notes, profile/settings/logout actions       | `user_settings`                                                                                     |
| Profile             | `/profile`                                            | E-mail display, display-name form, password-change form                | Auth profile metadata                                                                               |
| Sport Tracking      | `/apps/sport`                                         | Search, recent workouts, workout entry/editing                         | `workouts`, `custom_sport_types`                                                                    |
| Habit Tracking      | `/apps/habits`                                        | Daily checks, habits, streak-related workout/plan links                | `habits`, `habit_checks`, `training_plans`, `workouts_library`                                      |
| Body Measurements   | `/apps/body`                                          | History, phases, recent measurements, goals/milestones                 | `body_measurements`, `body_goals`, `body_goal_history`, `body_milestones`                           |
| Notes               | `/apps/notes`                                         | Inbox/list selection, search, quick content entry                      | `notes`, `note_lists`                                                                               |
| Units               | `/apps/units`                                         | Category/from/to selectors, source value and result                    | None                                                                                                |
| Calendar            | `/apps/calendar`                                      | Month navigation, activity legend and dated activity summary           | `workouts`, `habits`, `habit_checks`, `body_measurements`, `challenges`, `challenge_checks`         |
| Rankings            | `/apps/rankings`                                      | Category-driven ranking views and configuration                        | `ranking_categories`, `rankings`; nutrition tables are also requested                               |
| Journal             | No navigation observed; card remained on `/dashboard` | Dashboard card only in this review                                     | Unknown                                                                                             |
| Grocery Lists       | `/apps/groceries`                                     | List creation, list/item completion and sharing                        | `grocery_lists`, `grocery_list_shares`                                                              |
| Recipes             | `/apps/recipes`                                       | Search, recipe cards/details, favorites and meal use                   | `recipes`; grocery and nutrition tables are also requested                                          |
| CrossFit            | `/apps/crossfit`                                      | Workout-library search and recent results                              | `workouts`, `workouts_library`, `exercises`, `equipment`                                            |
| Exercises           | `/apps/exercises`                                     | Exercise/equipment management and capability metadata                  | `exercises`, `equipment`                                                                            |
| Nutrition           | `/apps/diet`                                          | Day navigation, meals/macros, settings and body-phase context          | `diet_meals`, `diet_settings`, `diet_settings_history`, body tables                                 |
| GYM                 | `/apps/gym`                                           | Training sessions, plans, exercises and equipment                      | `workouts`, `training_plans`, `exercises`, `equipment`                                              |
| Games               | `/apps/games`                                         | Spionagecode, Mein Koffer, Simon sagt, Favorit and Tier List launchers | None observed                                                                                       |
| Flag Football       | `/apps/flag-football`                                 | Formations, routes, plays and playbook editing                         | `flag_football_formations`, `flag_football_routes`, `flag_football_plays`, `flag_football_playbook` |
| Stretching          | `/apps/stretching`                                    | Routine and exercise tabs, guided routine content                      | `stretching_routines`                                                                               |
| Linedance           | `/apps/linedance`                                     | Dance catalogue and step content                                       | `linedance_dances`                                                                                  |
| Timer               | `/apps/timer`                                         | For Time, AMRAP and EMOM/Tabata modes, countdown/time-cap inputs       | None                                                                                                |
| Flashcards          | `/apps/merkkarten`                                    | Category creation/list and card study                                  | `flashcard_categories`, `flashcards`                                                                |
| Greasing the Groove | `/apps/greasing-the-groove`                           | Month/day navigation and daily repetition tracking                     | `greasing_the_groove_days`, `exercises`                                                             |

Table names above are based on read-only network observations during initial
screen loading. Child records loaded only after opening a detail view may use
additional tables.

## Screen parity checklist

Use this checklist for each implemented module and repeat it at both target
viewports and in both color schemes.

- [ ] Route is guarded and direct unauthenticated navigation returns to login.
- [ ] Header/back navigation, title, actions, tabs and date navigation match.
- [ ] Initial loading has a stable skeleton or progress state.
- [ ] Empty state explains what is missing and offers the relevant create action.
- [ ] Read failure shows a recoverable error without discarding existing UI.
- [ ] Create/edit forms preserve field types, units, defaults and conditional fields.
- [ ] Required, format, range and cross-field validation is shown before mutation.
- [ ] Save disables duplicate submission and reports success/failure.
- [ ] Search, filtering, sorting, ordering and pagination preserve the observed rules.
- [ ] Delete/unshare/reset actions require confirmation and explain consequences.
- [ ] Cancel/close does not persist draft changes.
- [ ] Keyboard focus enters dialogs, remains trapped, and returns to the trigger.
- [ ] Mobile controls remain reachable with no unintended horizontal page overflow.
- [ ] Dark mode retains readable contrast for text, controls, charts and state colors.
- [ ] Broken/optional media has a safe fallback and external links are validated.
- [ ] Data is scoped to the authenticated user; shared data exposes only allowed rows.
- [ ] Loading, error logs, fixtures and visual artifacts contain no private data.

## Key user journeys

1. Authenticate, reach the dashboard, open a module, navigate back, and log out.
2. Open profile, change display name, validate mismatched passwords, and cancel
   without changing the account.
3. Create, edit, filter/search and delete the module's primary record.
4. Navigate dates for workouts, habits, measurements, nutrition, journal and
   Greasing the Groove without losing unsaved work.
5. Exercise cross-module links: workout to habit/plan, recipe to nutrition or
   groceries, and body phase to nutrition.
6. Share and unshare a grocery list while verifying owner and recipient views.
7. Reorder/hide dashboard modules and verify the setting persists after reload.
8. Start, pause/resume, complete and interrupt guided/timed experiences.

## Destructive and sensitive operations

The following must never be exercised against the original account merely to
test parity. Verify them with disposable fixtures in the rebuild:

- Account password change and logout of other sessions, if exposed.
- Deleting lists, categories, routines, plans, workouts or records with children.
- Removing grocery shares or modifying data owned by another user.
- Reordering operations that rewrite multiple persisted positions.
- Timer/wake-lock/audio behavior that could continue after leaving a route.
- Any schema change, bulk cleanup, storage deletion or service-role operation.

Confirmations should name the affected record, state whether child/shared data
is affected, and keep the destructive action visually distinct from cancel.

## Observed unknowns and follow-ups

- The Journal card did not navigate during the automated review; its intended
  route, UI and `journal_entries` request still need manual confirmation.
- Initial-load requests do not prove the complete table map for nested detail
  dialogs, child collections, RPCs or storage buckets.
- Error states were not forced against the production service.
- Destructive confirmations and post-delete behavior were not executed.
- Invitation, password-reset, expired-session and multi-session flows were not
  exercised.
- Exact breakpoints between the observed 1440 px four-column and 390 px
  two-column dashboard layouts remain implementation-defined.
- Browser back behavior with dirty forms, timer wake lock/audio interruption,
  offline/PWA update prompts and accessibility announcements need fixture-based
  verification.
