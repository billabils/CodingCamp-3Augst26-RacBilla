# Requirements Document

## Introduction

The Expense and Budget Visualizer is a client-side web application built with HTML, CSS, and Vanilla JavaScript. It allows users to track personal expenses by logging transactions with a name, amount, and category. All data is persisted in the browser's Local Storage. The app displays a running total balance, a scrollable transaction list with delete capability, and a pie chart that visualizes spending by category — all updating in real time without any page reload or backend server.

The app must run in Chrome, Firefox, Edge, and Safari as either a standalone HTML page or a browser extension.

---

## Glossary

- **App**: The Expense and Budget Visualizer web application.
- **Transaction**: A single expense entry consisting of a name, a numeric amount, and a category.
- **Transaction_List**: The scrollable UI component that renders all stored transactions.
- **Input_Form**: The HTML form through which the user enters and submits a new transaction.
- **Balance_Display**: The UI element at the top of the page that shows the computed total balance.
- **Chart**: The pie chart component (rendered via Chart.js or equivalent) that shows spending distribution by category.
- **Storage**: The browser's Local Storage API used to persist transactions across page sessions.
- **Category**: One of the three predefined spending groups — Food, Transport, or Fun.
- **Validator**: The client-side logic that checks Input_Form fields before a transaction is created.

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to fill in a form with a transaction name, amount, and category so that I can log a new expense quickly.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for the transaction name (maximum 100 characters), a numeric field for the amount, and a dropdown selector for the category.
2. THE Input_Form SHALL present exactly three category options: Food, Transport, and Fun.
3. WHEN the user submits the Input_Form with all fields populated, a category explicitly chosen from the dropdown (not merely a placeholder or default pre-selection), and a valid amount between 0.01 and 999,999,999.99 inclusive, THE App SHALL create a new Transaction and persist it to Storage within 2 seconds.
4. WHEN the user submits the Input_Form, THE Validator SHALL verify that the name field contains at least 1 non-whitespace character, the amount field contains a number between 0.01 and 999,999,999.99 inclusive, and a category has been explicitly selected.
5. IF the Validator detects that the name field is empty or contains only whitespace, THEN THE Input_Form SHALL display an inline error message on the name field and SHALL NOT create a Transaction.
6. IF the Validator detects that the amount field is empty, zero, negative, non-numeric, or exceeds 999,999,999.99, THEN THE Input_Form SHALL display an inline error message on the amount field and SHALL NOT create a Transaction.
7. IF the Validator detects that no category has been selected, THEN THE Input_Form SHALL display an inline error message on the category field and SHALL NOT create a Transaction.
8. WHEN a Transaction is successfully created, THE Input_Form SHALL reset the name field to empty, the amount field to empty, and the category dropdown to its default unselected placeholder state.

---

### Requirement 2: Transaction List Display

**User Story:** As a user, I want to see all my logged transactions in a scrollable list so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL render every Transaction stored in Storage, showing the transaction name (up to 100 characters), the amount formatted to 2 decimal places with a currency symbol, and the category for each entry.
2. WHEN the number of transactions exceeds the visible area of the Transaction_List container, THE Transaction_List SHALL be scrollable vertically within its container without causing horizontal or vertical overflow of the page layout.
3. WHEN the user adds a new Transaction, THE Transaction_List SHALL update to include the new entry within 1 second without requiring a page reload.
4. THE Transaction_List SHALL display transactions in the order they were added, with the most recently added transaction appearing at the bottom of the list.
5. IF Storage contains no transactions, THEN THE Transaction_List SHALL display a message indicating that no transactions have been logged yet.
6. WHEN any Transaction is added to Storage, THE Transaction_List SHALL hide the empty-state message immediately.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list so that I can correct mistakes or remove entries I no longer need.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a visible delete control (button or icon) for each Transaction entry.
2. WHEN the user activates the delete control for a Transaction, THE App SHALL remove that Transaction from Storage within 500 milliseconds.
3. WHEN a Transaction is removed from Storage, THE Transaction_List SHALL remove the corresponding entry from the rendered list within 500 milliseconds without requiring a page reload.
4. WHEN a Transaction is removed from Storage, THE Balance_Display SHALL update to reflect the new total within 500 milliseconds.
5. WHEN a Transaction is removed from Storage, THE Chart SHALL update to reflect the revised category distribution within 500 milliseconds.
6. IF a Storage removal operation fails, THEN THE App SHALL display an error message and SHALL NOT remove the Transaction entry from the Transaction_List, Balance_Display, or Chart; no error message is displayed when the Storage removal succeeds, even if unrelated operations subsequently fail.

---

### Requirement 4: Total Balance Display

**User Story:** As a user, I want to see my total balance at the top of the page so that I know how much I have spent in aggregate.

#### Acceptance Criteria

1. THE Balance_Display SHALL be visible at the top of the page at all times.
2. THE Balance_Display SHALL show the sum of the amounts of all Transactions currently in Storage, formatted to 2 decimal places.
3. WHEN a new Transaction is added to Storage, THE Balance_Display SHALL update to the new sum within 100 milliseconds of the Storage write completing.
4. WHEN a Transaction is removed from Storage, THE Balance_Display SHALL update to the new sum within 100 milliseconds of the Storage write completing.
5. WHEN no Transactions exist in Storage, THE Balance_Display SHALL show a balance of 0.00.
6. IF Storage read fails during a balance update, THEN THE Balance_Display SHALL retain and display exactly its last known balance value and SHALL display an indicator that the balance may be out of date.

---

### Requirement 5: Category Pie Chart

**User Story:** As a user, I want to see a pie chart of my spending broken down by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart that segments spending by Category, with one segment per Category that has at least one Transaction, where each segment's arc size is proportional to that Category's share of total spending.
2. THE Chart SHALL label each segment with the corresponding Category name and its percentage of total spending, rounded to one decimal place, such that all displayed percentages sum to 100.0%.
3. WHEN a new Transaction is added to Storage, THE Chart SHALL re-render to reflect the updated category totals without requiring a page reload.
4. WHEN a Transaction is removed from Storage, THE Chart SHALL re-render to reflect the updated category totals without requiring a page reload.
5. WHEN only one Category has Transactions, THE Chart SHALL render a single segment occupying 100% of the chart area for that Category.
6. WHEN no Transactions exist in Storage, THE Chart SHALL display a placeholder message indicating that no spending data is available and SHALL NOT render any chart segments.
7. THE Chart SHALL only include Transactions with an amount greater than zero when computing category totals and percentages.

---

### Requirement 6: Data Persistence

**User Story:** As a user, I want my transactions to be saved between browser sessions so that I do not have to re-enter data every time I open the app.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL write the Transaction data to Storage and SHALL confirm success to the user only when Storage explicitly reports a successful write (i.e., the setItem call completes without throwing); IF the write throws an error or the write status is ambiguous, THE App SHALL NOT confirm success.
2. WHEN a Transaction is deleted, THE App SHALL remove the Transaction data from Storage and SHALL update the Transaction_List, Balance_Display, and Chart to remove that Transaction only after Storage has successfully confirmed the removal.
3. WHEN the App loads in the browser, THE App SHALL read all Transactions from Storage and render them in the Transaction_List, Balance_Display, and Chart before enabling the Input_Form for user interaction, where "enabling" is determined by the successful completion of the Storage read process, not by the rendered state of any UI component.
4. IF Storage is unavailable or returns a read error on load, THEN THE App SHALL display an error message informing the user that data could not be loaded, SHALL render the app in an empty initial state (zero transactions), and SHALL enable the Input_Form so the user can continue adding transactions.
5. IF a Storage write operation fails during Transaction creation, THEN THE App SHALL display an error message, SHALL retain the user's input in the Input_Form fields, and SHALL NOT add the Transaction to the Transaction_List or Balance_Display.
6. IF a Storage write operation fails during Transaction deletion, THEN THE App SHALL display an error message and SHALL NOT remove the Transaction from the Transaction_List, Balance_Display, or Chart.

---

### Requirement 7: File and Code Structure

**User Story:** As a developer, I want the project to follow a clean single-file-per-type structure so that the codebase is easy to maintain and extend.

#### Acceptance Criteria

1. THE App SHALL be structured with exactly one HTML file at the project root, exactly one CSS file inside a `css/` directory, and exactly one JavaScript file inside a `js/` directory.
2. THE App SHALL load Chart.js (or an equivalent chart library) via a CDN `<script>` tag in the HTML file and SHALL NOT include any chart library files in the local project directory.
3. WHEN the user opens the HTML file in a browser that supports ECMAScript 2015 (ES6) or later, THE App SHALL launch and be fully operational without any additional steps.
4. IF the CDN chart library fails to load, THEN THE App SHALL display a visible error message indicating that the chart is unavailable and SHALL continue to render the Transaction_List and Balance_Display using locally available data.

---

### Requirement 8: Browser Compatibility

**User Story:** As a user, I want the app to work in all major browsers so that I can use it regardless of my preferred browser.

#### Acceptance Criteria

1. THE App SHALL render correctly and be fully functional in the current stable release of Chrome, Firefox, Edge, and Safari on desktop, where "renders correctly" means all interactive elements respond to input and all content is visible without horizontal scrolling at viewport widths of 320px and above.
2. THE App SHALL NOT use any browser-specific API that is unavailable in any of the four supported browsers without a fallback defined as either a polyfill included in the application or a graceful degradation that preserves core read/write functionality.
3. WHEN a fallback is invoked due to an unsupported API, THE App SHALL continue ALL operations (not only core read/write) without data loss or user-blocking errors across the entire application.
4. WHERE the App is loaded as a browser extension, THE App SHALL operate identically to its standalone HTML page behavior; IF a feature is unavailable due to the extension host's Content Security Policy, THEN THE App SHALL display a message identifying that feature as unavailable.
5. THE App SHALL ensure that all core operations (Transaction creation, deletion, persistence, and display) are fully working in standalone HTML page mode as the baseline requirement before extension-mode parity can be claimed.
