# Design Document: Expense and Budget Visualizer

## Overview

The Expense and Budget Visualizer is a zero-dependency, no-build client-side web app. Users log expense transactions (name, amount, category), view them in a scrollable list, see a running total balance, and visualize category spending in a Chart.js pie chart. All data lives in `localStorage`. There is no backend, no package manager, and no framework — just a single HTML file, one CSS file, and one JavaScript module.

The app must work offline after first load (the only remote dependency is the Chart.js CDN script, which degrades gracefully when unavailable), across all four major desktop browsers, at any viewport width ≥ 320 px.

---

## Architecture

The app follows a **Model-View-Controller (MVC)** pattern implemented entirely inside a single JavaScript file (`js/app.js`).

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                       │
│  ┌─────────────────┐   ┌───────────────────────────┐   │
│  │  css/style.css  │   │  Chart.js (CDN <script>)  │   │
│  └─────────────────┘   └───────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐ │
│  │                    js/app.js                       │ │
│  │                                                    │ │
│  │  ┌──────────┐   ┌──────────┐   ┌───────────────┐  │ │
│  │  │  Model   │◄──│Controller│──►│     View      │  │ │
│  │  │(Storage) │   │          │   │(DOM + Chart)  │  │ │
│  │  └──────────┘   └──────────┘   └───────────────┘  │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Data flow:**

1. User interacts with the DOM (form submit, delete button click).
2. The Controller validates input (Validator) and calls the Model.
3. The Model reads/writes `localStorage` and returns the updated transaction array.
4. The Controller passes the array to the View.
5. The View re-renders the Transaction_List, Balance_Display, and Chart.

All four steps happen synchronously within a single event handler, keeping the update latency well inside the 100–500 ms requirements.

---

## Components and Interfaces

### 1. StorageManager (Model)

Encapsulates all `localStorage` access. Throws typed errors so the Controller can distinguish read failures from write failures.

```js
const StorageManager = {
  STORAGE_KEY: 'ebv_transactions',

  /** @returns {Transaction[]} */
  load(): Transaction[],

  /** @param {Transaction[]} transactions @returns {void} */
  save(transactions): void,
};
```

- `load()` — calls `localStorage.getItem`, JSON-parses, and returns the array. Returns `[]` on parse error; throws `StorageReadError` if `localStorage` itself is unavailable.
- `save(transactions)` — JSON-serialises and calls `localStorage.setItem`. Throws `StorageWriteError` on failure (e.g., quota exceeded).

### 2. Validator

A pure-function module that inspects raw form values and returns an array of field-level errors.

```js
const Validator = {
  /**
   * @param {{ name: string, amount: string, category: string }} raw
   * @returns {{ field: 'name'|'amount'|'category', message: string }[]}
   */
  validate(raw): ValidationError[],
};
```

Validation rules (per Requirement 1.4):
- `name`: trimmed length ≥ 1, overall length ≤ 100.
- `amount`: parseable as a finite number, value between 0.01 and 999,999,999.99 inclusive (checked with `parseFloat` + `Number.isFinite`).
- `category`: one of `['Food', 'Transport', 'Fun']`.

### 3. TransactionController (Controller)

Owns the application state (`Transaction[]`) in memory and orchestrates all mutations.

```js
const TransactionController = {
  /** In-memory copy of the transaction array */
  _transactions: Transaction[],

  /** Called once on DOMContentLoaded */
  init(): void,

  /** Handles Input_Form submit event */
  handleAdd(event: SubmitEvent): void,

  /** Handles delete button click */
  handleDelete(transactionId: string): void,
};
```

`init()` sequence (Requirement 6.3):
1. Call `StorageManager.load()`.
2. On success: store array, call `View.render(transactions)`, then enable Input_Form.
3. On `StorageReadError`: render empty state, enable form, show error banner.

### 4. View

Responsible for all DOM mutation and Chart rendering. Receives the full transaction array on every update (no incremental patching — simplicity over micro-optimisation at this scale).

```js
const View = {
  /**
   * Full re-render of all three UI regions.
   * @param {Transaction[]} transactions
   */
  render(transactions): void,

  /** Show/hide a named error banner. */
  showError(key: string, message: string): void,
  clearError(key: string): void,

  /** Per-field inline validation feedback. */
  showFieldError(field: 'name'|'amount'|'category', message: string): void,
  clearFieldErrors(): void,
};
```

`render()` internally calls three private helpers:
- `_renderList(transactions)` — clears and rebuilds the transaction list DOM.
- `_renderBalance(transactions)` — recomputes the sum and updates the Balance_Display text.
- `_renderChart(transactions)` — aggregates totals by category and calls the Chart.js update API.

### 5. ChartManager

Wraps Chart.js instance lifecycle. Isolated so the rest of the code is unaffected if `window.Chart` is undefined (CDN failure).

```js
const ChartManager = {
  _instance: null,

  /** Creates or updates the pie chart. @param {CategoryTotal[]} data */
  update(data: CategoryTotal[]): void,

  /** Shows placeholder text, destroys chart if it exists. */
  showPlaceholder(): void,

  /** Called on init to detect CDN failure. @returns {boolean} */
  isAvailable(): boolean,
};
```

If `ChartManager.isAvailable()` returns `false`, `View._renderChart` skips Chart.js calls, renders the placeholder, and shows a `showError('chart', …)` banner — satisfying Requirement 7.4.

---

## Data Models

### Transaction

The canonical in-memory and serialised shape of a single expense entry.

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id         - UUID v4 generated at creation time (crypto.randomUUID with Date.now() fallback)
 * @property {string} name       - User-entered expense name, 1–100 characters
 * @property {number} amount     - Positive number, 0.01–999,999,999.99
 * @property {'Food'|'Transport'|'Fun'} category
 * @property {number} createdAt  - Unix timestamp (ms) for ordering
 */
```

### CategoryTotal

Ephemeral aggregation object produced by `View._renderChart`, never persisted.

```js
/**
 * @typedef {Object} CategoryTotal
 * @property {'Food'|'Transport'|'Fun'} category
 * @property {number} total   - Sum of amounts for this category
 * @property {number} percent - Rounded to 1 dp; all percents sum to 100.0
 */
```

### ValidationError

```js
/**
 * @typedef {Object} ValidationError
 * @property {'name'|'amount'|'category'} field
 * @property {string} message
 */
```

### StorageError subtypes

```js
class StorageReadError extends Error {}
class StorageWriteError extends Error {}
```

---

## File Structure

```
project-root/
├── index.html          ← single HTML file (Requirement 7.1)
├── css/
│   └── style.css       ← single CSS file (Requirement 7.1)
└── js/
    └── app.js          ← single JS file (Requirement 7.1)
```

`index.html` loads:
1. `css/style.css` via `<link rel="stylesheet">`.
2. Chart.js from `https://cdn.jsdelivr.net/npm/chart.js` via `<script>` with `onerror` handler that sets a flag.
3. `js/app.js` as a `<script type="module">` (or deferred script) placed at the end of `<body>` so the DOM is ready.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Whitespace-only names are always rejected

*For any* string composed entirely of whitespace characters, submitting it as a transaction name SHALL leave the transaction list unchanged and display a name-field error.

**Validates: Requirements 1.4, 1.5**

---

### Property 2: Out-of-range amounts are always rejected

*For any* numeric value that is zero, negative, non-numeric, or greater than 999,999,999.99, submitting it as a transaction amount SHALL leave the transaction list unchanged and display an amount-field error.

**Validates: Requirements 1.4, 1.6**

---

### Property 3: Valid transaction addition grows the list by exactly one

*For any* transaction list and any valid (non-empty name, valid amount, selected category) transaction, successfully adding it SHALL increase the count of transactions in Storage by exactly one.

**Validates: Requirements 1.3, 2.3**

---

### Property 4: Balance equals sum of all transaction amounts

*For any* set of transactions in Storage, the value shown in Balance_Display SHALL equal the arithmetic sum of all their amounts, formatted to 2 decimal places.

**Validates: Requirements 4.2, 4.3, 4.4**

---

### Property 5: Delete reduces transaction count by exactly one

*For any* non-empty transaction list, deleting any single transaction SHALL reduce the count of transactions in Storage by exactly one, and that transaction SHALL no longer appear in the rendered list.

**Validates: Requirements 3.2, 3.3**

---

### Property 6: Chart percentages sum to 100.0%

*For any* non-empty set of transactions with positive amounts, the sum of all category percentages displayed in the Chart SHALL equal 100.0% (to one decimal place).

**Validates: Requirements 5.2, 5.7**

---

### Property 7: Serialisation round-trip preserves transaction data

*For any* valid transaction array, serialising it to Storage and immediately deserialising it SHALL produce an array that is deeply equal to the original.

**Validates: Requirements 6.1, 6.2**

---

### Property 8: Form resets after every successful submission

*For any* valid transaction submission, after the transaction is persisted, the name field SHALL be empty, the amount field SHALL be empty, and the category dropdown SHALL show its default placeholder.

**Validates: Requirements 1.8**

---

### Property 9: Transaction list renders all stored transactions in insertion order

*For any* non-empty array of transactions, the rendered Transaction_List SHALL contain an entry for every transaction in the array, and the entries SHALL appear in ascending order of their `createdAt` timestamp (newest at the bottom).

**Validates: Requirements 2.1, 2.4**

---

### Property 10: Every rendered transaction entry has a delete control

*For any* non-empty array of transactions, every entry rendered in the Transaction_List SHALL include a visible delete control.

**Validates: Requirements 3.1**

---

## Error Handling

| Scenario | Detection | Response |
|---|---|---|
| `localStorage` unavailable on load | `StorageReadError` thrown by `StorageManager.load()` | Show error banner; render empty state; enable form |
| `localStorage.setItem` quota / security error | `StorageWriteError` thrown by `StorageManager.save()` on add | Show error banner; retain form values; do NOT add to list/balance/chart |
| `localStorage.setItem` failure on delete | `StorageWriteError` thrown by `StorageManager.save()` on delete | Show error banner; do NOT remove from list/balance/chart (Req 3.6, 6.6) |
| Balance update with stale data | Detected when `StorageManager.load()` throws mid-session | Balance_Display retains last known value; shows "may be out of date" indicator (Req 4.6) |
| Chart.js CDN fails to load | `window.Chart === undefined` at `DOMContentLoaded` | Show "chart unavailable" banner; Transaction_List and Balance_Display remain functional (Req 7.4) |
| Inline validation failure | `Validator.validate()` returns non-empty error array | Per-field inline error messages; form NOT submitted; no transaction created (Req 1.5–1.7) |
| Browser extension CSP blocks feature | Feature detection returns false | Show message identifying the unavailable feature (Req 8.4) |

All error banners are dismissible and do not block the user from reading the transaction list or balance.

---

## Testing Strategy

### Unit Tests

Use a lightweight test runner (e.g., Vitest or Jest configured for browser-like globals). Focus on:

- **Validator**: all boundary conditions for name (empty, whitespace-only, 100 chars, 101 chars), amount (0, 0.01, 999999999.99, 1000000000, NaN, negative, non-numeric string), category (valid values, empty string, undefined).
- **StorageManager**: mock `localStorage`; verify `load()` returns `[]` on JSON parse error, throws `StorageReadError` when `getItem` throws, and `save()` throws `StorageWriteError` when `setItem` throws.
- **Balance calculation**: example-based tests with known sets of transactions and expected sums.
- **Percentage calculation**: examples with 1 category (100%), 2 categories (50/50, 1/3 and 2/3), 3 categories (ensure rounding sums to 100.0%).

### Property-Based Tests

Use [fast-check](https://github.com/dubzzz/fast-check) (loaded via CDN or bundled for test runs only). Each property test runs a minimum of **100 iterations**.

Each test is tagged with a comment in the format:  
`// Feature: expense-budget-visualizer, Property {N}: {property_text}`

| Property | Test Description | Generator Strategy |
|---|---|---|
| **P1** Whitespace-only names rejected | `fc.string()` filtered to all-whitespace; assert no transaction created and error shown | `fc.stringOf(fc.constantFrom(' ', '\t', '\n'))` |
| **P2** Out-of-range amounts rejected | `fc.oneof(fc.constant(0), fc.float({max: -0.001}), fc.float({min: 1e9}), fc.string())` | Arbitrary invalid amounts |
| **P3** Valid add grows list by 1 | Generate random valid transaction; assert `transactions.length` increases by 1 | `fc.record({name: fc.string({minLength:1,maxLength:100}).filter(s=>s.trim().length>0), amount: fc.float({min:0.01,max:999999999.99}), category: fc.constantFrom('Food','Transport','Fun')})` |
| **P4** Balance equals sum | Generate array of valid transactions; assert `computeBalance(txns) === txns.reduce((s,t)=>s+t.amount, 0)` | `fc.array(validTransactionArb)` |
| **P5** Delete reduces count by 1 | Generate non-empty array; pick random index to delete; assert length shrinks by 1 and id absent | `fc.array(validTransactionArb, {minLength:1})` + `fc.integer` index |
| **P6** Percentages sum to 100.0% | Generate random transactions; compute category totals; assert `sum(percents) === 100.0` | `fc.array(validTransactionArb, {minLength:1})` |
| **P7** Serialisation round-trip | Generate array; `save()` then `load()`; assert deep equality | `fc.array(validTransactionArb)` |
| **P8** Form resets after success | Generate valid transaction; simulate add; inspect form field values | `fc.record(validTransactionArb)` |
| **P9** List renders all transactions in order | Generate random array; render; assert every id present and order matches ascending `createdAt` | `fc.array(validTransactionArb, {minLength:1})` |
| **P10** Every entry has a delete control | Generate non-empty array; render; assert each item has a delete button | `fc.array(validTransactionArb, {minLength:1})` |

### Integration / Smoke Tests

- Load `index.html` in a headless browser (e.g., Playwright) and verify:
  - Balance_Display shows `0.00` on fresh load with empty `localStorage`.
  - Adding a transaction updates list, balance, and chart within the specified timeouts.
  - Deleting a transaction updates list, balance, and chart within 500 ms.
  - Reloading the page persists transactions from the previous session.
  - Simulating a broken CDN (`page.route` to block Chart.js) shows the error banner while list and balance remain functional.
  - Simulating `localStorage` unavailability shows the appropriate error and renders an empty-state app.

### Accessibility

- All interactive elements reachable by keyboard (Tab, Enter/Space).
- ARIA labels on icon-only delete buttons.
- Sufficient colour contrast ratios (WCAG 2.1 AA minimum).
- Full validation requires manual testing with assistive technologies and expert accessibility review.
