# Implementation Plan: Expense and Budget Visualizer

## Overview

Implement a zero-dependency, no-build client-side expense tracker using vanilla ES6+ JavaScript in an MVC pattern. The implementation progresses from scaffolding the file structure, through the core data and validation layer, to the full UI and Chart.js integration, finishing with property-based tests that verify each correctness property defined in the design.

## Tasks

- [ ] 1. Scaffold file structure and HTML skeleton
  - Create `index.html` at the project root with the full document structure: `<head>` with viewport meta, link to `css/style.css`, CDN `<script>` tag for Chart.js (`https://cdn.jsdelivr.net/npm/chart.js`) with an `onerror` handler that sets `window.__chartFailed = true`, and a deferred `<script src="js/app.js">` at the end of `<body>`
  - Add all required semantic HTML landmarks: a header containing the Balance_Display element (`<div id="balance-display">`), a main section containing the Input_Form (`<form id="transaction-form">`), the Transaction_List (`<ul id="transaction-list">`), and the chart canvas (`<canvas id="spending-chart">`)
  - Add the Input_Form fields: `<input type="text" id="name-input" maxlength="100">`, `<input type="number" id="amount-input">`, `<select id="category-select">` with options Food / Transport / Fun plus a default disabled placeholder, and a submit button
  - Add inline error containers (`<span class="field-error">`) beneath each form field and a dismissible global error banner (`<div id="error-banner" hidden>`)
  - Create `css/style.css` with an empty file (content added in task 3)
  - Create `js/app.js` with an empty file (content added in subsequent tasks)
  - _Requirements: 7.1, 7.2, 7.3, 8.1_

- [ ] 2. Implement data models, StorageManager, and error types
  - [ ] 2.1 Define error classes and Transaction type in `js/app.js`
    - Declare `class StorageReadError extends Error {}` and `class StorageWriteError extends Error {}`
    - Add JSDoc `@typedef` blocks for `Transaction`, `CategoryTotal`, and `ValidationError` as specified in the design
    - _Requirements: 6.4, 6.5, 6.6_

  - [ ] 2.2 Implement `StorageManager.load()` and `StorageManager.save()`
    - `STORAGE_KEY = 'ebv_transactions'`
    - `load()`: wrap `localStorage.getItem` in try/catch; throw `StorageReadError` if `localStorage` itself throws; return `[]` on JSON parse error; otherwise return parsed array
    - `save(transactions)`: wrap `localStorage.setItem` in try/catch; throw `StorageWriteError` on any failure
    - _Requirements: 6.1, 6.2, 6.4, 6.5_
    
- [ ] 3. Implement Validator
  - [ ] 3.1 Implement `Validator.validate(raw)` with all boundary rules
    - Name rule: trimmed length ≥ 1, overall length ≤ 100; return `{ field: 'name', message: '...' }` on failure
    - Amount rule: `parseFloat` + `Number.isFinite`; value must be between 0.01 and 999,999,999.99 inclusive; return `{ field: 'amount', message: '...' }` on failure
    - Category rule: value must be one of `['Food', 'Transport', 'Fun']`; return `{ field: 'category', message: '...' }` on failure
    - Return all errors found in a single pass (not just the first)
    - _Requirements: 1.4, 1.5, 1.6, 1.7_

- [ ] 4. Implement ChartManager and balance computation utilities
  - [ ] 4.1 Implement `ChartManager` (Chart.js wrapper)
    - `isAvailable()`: return `typeof window.Chart !== 'undefined' && !window.__chartFailed`
    - `update(data)`: if `_instance` is null, create a new `Chart` on `#spending-chart` canvas with `type: 'pie'`; otherwise call `_instance.data = ...` and `_instance.update()`; data comes from `CategoryTotal[]`
    - `showPlaceholder()`: destroy `_instance` if it exists; show a placeholder text node inside the chart container
    - _Requirements: 5.1, 5.2, 5.6, 7.4_

  - [ ] 4.2 Implement `computeBalance(transactions)` pure helper
    - Sum all `transaction.amount` values; return 0 when array is empty
    - Format to 2 decimal places using `toFixed(2)` for display
    - _Requirements: 4.2, 4.5_

  - [ ] 4.3 Implement `computeCategoryTotals(transactions)` pure helper
    - Filter to transactions with `amount > 0` (Requirement 5.7)
    - Group by category, sum amounts
    - Compute percentages; distribute rounding remainder to the largest category to guarantee sum = 100.0% (Requirement 5.2)
    - Return `CategoryTotal[]`
    - _Requirements: 5.1, 5.2, 5.7_

- [ ] 5. Checkpoint — core logic verified
  - Ensure all tests written so far pass (Properties 7, 1, 2, 4, 6 and any unit tests)
  - Ask the user if any questions arise before proceeding to the View layer.

- [ ] 6. Implement View (DOM rendering)
  - [ ] 6.1 Implement `View._renderBalance(transactions)`
    - Read Balance_Display element by id; set its `textContent` to `computeBalance(transactions)` prefixed with a currency symbol (e.g., `$`)
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ] 6.2 Implement `View._renderList(transactions)`
    - Clear `#transaction-list`; if empty render the "no transactions" message (Requirement 2.5)
    - For each transaction (sorted ascending by `createdAt`) append an `<li>` containing: name, amount formatted to 2 dp with currency symbol, category, and a `<button class="delete-btn" data-id="...">` delete control with an `aria-label`
    - _Requirements: 2.1, 2.4, 2.5, 3.1_

  - [ ] 6.5 Implement `View._renderChart(transactions)`
    - If `ChartManager.isAvailable()` is false, call `ChartManager.showPlaceholder()` and show the chart error banner; return
    - If `transactions` is empty, call `ChartManager.showPlaceholder()` and show the "no spending data" placeholder (Requirement 5.6); return
    - Otherwise compute `computeCategoryTotals(transactions)` and call `ChartManager.update(data)`
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 7.4_

  - [ ] 6.6 Implement `View.render(transactions)`, `View.showError`, `View.clearError`, `View.showFieldError`, `View.clearFieldErrors`
    - `render()` calls `_renderBalance`, `_renderList`, `_renderChart` in sequence
    - `showError(key, message)`: set `#error-banner` text and remove `hidden`; store key for targeted clearing
    - `clearError(key)`: clear the matching banner; restore `hidden` if no other errors remain
    - `showFieldError(field, message)`: set the relevant `.field-error` span text and add an error class to the input
    - `clearFieldErrors()`: clear all `.field-error` spans and remove error classes
    - _Requirements: 1.5, 1.6, 1.7, 3.6, 4.6, 6.4, 6.5, 6.6, 7.4_

- [ ] 7. Implement TransactionController
  - [ ] 7.1 Implement `TransactionController.init()`
    - Call `StorageManager.load()`; on success store array in `_transactions`, call `View.render(_transactions)`, enable `#transaction-form`
    - On `StorageReadError`: set `_transactions = []`, call `View.render([])`, show error banner, enable form
    - Attach submit listener on `#transaction-form` → `handleAdd`; attach delegated click listener on `#transaction-list` → `handleDelete`
    - Call `init()` inside `DOMContentLoaded` listener
    - _Requirements: 6.3, 6.4_

  - [ ] 7.2 Implement `TransactionController.handleAdd(event)`
    - `event.preventDefault()`; call `View.clearFieldErrors()`
    - Read raw form values; call `Validator.validate(raw)`
    - If errors: call `View.showFieldError` for each error; return (do NOT create transaction)
    - Build `Transaction` object: `id = crypto.randomUUID?.() ?? \`${Date.now()}-${Math.random()}\``, `createdAt = Date.now()`
    - Call `StorageManager.save([..._transactions, newTx])`; on `StorageWriteError` show error banner, retain form values (Requirement 6.5), return
    - On success: push to `_transactions`, call `View.render(_transactions)`, reset form fields and category to placeholder
    - _Requirements: 1.3, 1.5, 1.6, 1.7, 1.8, 6.1, 6.5_

  - [ ] 7.3 Implement `TransactionController.handleDelete(transactionId)`
    - Filter `_transactions` to produce `updated`; call `StorageManager.save(updated)`
    - On `StorageWriteError`: show error banner; do NOT mutate `_transactions` or call `View.render` (Requirements 3.6, 6.6)
    - On success: set `_transactions = updated`; call `View.render(_transactions)`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 6.2, 6.6_
- [ ] 8. Checkpoint — controller and full MVC wired
  - Ensure all tests pass (Properties 3, 5, 8 plus earlier properties)
  - Ask the user if any questions arise before the CSS and compatibility pass.

- [ ] 9. Implement CSS layout and browser compatibility
  - [ ] 9.1 Write `css/style.css` with full responsive layout
    - Mobile-first layout using flexbox or CSS Grid; min supported width 320 px
    - Transaction_List container: `overflow-y: auto` with a fixed `max-height` so it scrolls without causing page overflow (Requirement 2.2)
    - Balance_Display always visible at the top (Requirement 4.1)
    - Inline `.field-error` styles (red text) and error input border highlight
    - Error banner styling (dismissible, non-blocking)
    - Chart canvas container sizing; placeholder text centering
    - No browser-specific CSS properties without a standard fallback (Requirement 8.2)
    - Sufficient colour contrast (WCAG 2.1 AA minimum)
    - _Requirements: 2.2, 4.1, 8.1, 8.2_

  - [ ] 9.2 Add `crypto.randomUUID` fallback and any missing ES6 compatibility guards
    - Confirm the `crypto.randomUUID?.() ?? \`${Date.now()}-${Math.random()}\`` fallback is in place in `handleAdd`
    - Verify no APIs are used that are absent in the four target browsers without a defined fallback (Requirement 8.2)
    - Add CSP-check guard for browser extension context: detect blocked features and call `View.showError` identifying the unavailable feature (Requirement 8.4)
    - _Requirements: 8.2, 8.3, 8.4_

- [ ] 10. Final checkpoint — full integration verified
  - Ensure all property-based tests and unit tests pass
  - Manually open `index.html` in a browser: verify balance shows `$0.00`, form validates inline, adding a transaction updates list/balance/chart, deleting a transaction updates all three, page reload persists data
  - Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 5, 8, 10) ensure incremental validation before proceeding
- Property tests use [fast-check](https://github.com/dubzzz/fast-check); load it via CDN or install it in a separate test runner environment (it is never bundled into the production `js/app.js`)
- The production app has no npm, no build step, and no test runner embedded — property tests run in an isolated harness (Vitest or Jest with jsdom) that imports the pure functions from `app.js`
- All ten correctness properties from the design are covered by sub-tasks 2.3, 3.2, 3.3, 4.4, 4.5, 6.3, 6.4, 7.4, 7.5, 7.6

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1", "4.1", "4.2", "4.3"] },
    { "id": 2, "tasks": ["2.3", "3.2", "3.3", "4.4", "4.5"] },
    { "id": 3, "tasks": ["6.1", "6.2", "6.5", "6.6", "7.1"] },
    { "id": 4, "tasks": ["6.3", "6.4", "7.2", "7.3"] },
    { "id": 5, "tasks": ["7.4", "7.5", "7.6"] },
    { "id": 6, "tasks": ["9.1", "9.2"] }
  ]
}
```
