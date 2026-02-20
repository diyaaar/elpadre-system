---
trigger: always_on
---

DATABASE SCHEMA RULES

1️⃣ GLOBAL DATABASE PRINCIPLES

RULE 1 — All domain tables must include:

- id (UUID, primary key)
- user_id (UUID, not null)
- created_at (timestamptz, default now())
- updated_at (timestamptz, nullable)
- deleted_at (timestamptz, nullable)

Except for system tables (like auth).

WHY

Ensures:

- Multi-user safety
- Soft delete capability
- Auditable mutation
- Consistent RLS

TEST

If a domain table lacks user_id,
→ violation.

RULE 2 — All monetary values must be:

INTEGER (stored as smallest currency unit)

Never:

- float
- double precision

WHY

Prevents:

- Floating-point errors
- Rounding drift
- Financial inconsistency

TEST

Search for numeric(10,2) or float usage.
If found → violation.

RULE 3 — No stored computed values

Forbidden fields:

- balance
- stored_progress
- aggregated_total

WHY

Computed values cause:

- Drift
- Sync bugs
- Hidden corruption

TEST

If any field duplicates a calculable value,
→ violation.

2️⃣ TODO SCHEMA RULES

Core Tables:

- workspaces
- tasks
- task_tags
- todo_tags
- recurring_templates (todo)

TASK TABLE RULES

Required fields:

- title (text)
- description (text nullable)
- workspace_id (uuid)
- parent_task_id (uuid nullable)
- status_id (uuid)
- start_at (timestamptz nullable)
- due_at (timestamptz nullable)
- is_all_day (boolean default false)
- order_index (integer)
- google_event_id (text nullable)

PROGRESS RULE

No progress column allowed.

Progress is always calculated dynamically.

HIERARCHY RULE

Use adjacency list:

- parent_task_id

Never:

- nested set
- path string
- materialized tree

3️⃣ FINANCE SCHEMA RULES

Core Tables:

- transactions
- categories
- finance_tags
- transaction_tags
- obligations
- obligation_payments

TRANSACTIONS RULES

Required:

- type (income / expense)
- amount (integer)
- currency (text default 'TRY')
- category_id (uuid)
- transaction_date (date)
- note (text nullable)

CATEGORY RULE

One category per transaction.

Never:

- many-to-many categories

OBLIGATION RULES

Required:

- type (payable / receivable)
- total_amount (integer)
- remaining_amount (integer)
- due_date (date)
- reminder_days_before (integer)
- status (open / closed)

CRITICAL RULE

Creating obligation must NOT create transaction.

Only obligation_payment may create transaction.

4️⃣ STORAGE SCHEMA RULES

Single table:

```
files
    module_type (text)
    related_id (uuid)
    file_path (text)
    mime_type (text)
    file_size (integer)
```

STORAGE RULES

- Soft delete only
- Never cascade hard delete
- No public URL field

5️⃣ INTEGRATION SCHEMA RULES

Table:

```
user_integrations
    provider (text)
    access_token (text)
    refresh_token (text)
    expires_at (timestamptz)
```

RULE

Tokens must never be exposed in client responses.

6️⃣ INDEXING RULES

Mandatory indexes:

- user_id (all domain tables)
- workspace_id (tasks)
- parent_task_id (tasks)
- transaction_date (transactions)
- due_date (obligations)
- category_id (transactions)

WHY

Prevents performance degradation.

7️⃣ RLS RULES

Every table must enforce:

```
user_id = auth.uid()
```

No table may be publicly readable.

TEST

If SELECT without RLS passes,
→ violation.

8️⃣ MIGRATION RULES

Every schema change must:

- Be logged in decision_log
- Include rollback plan
- Include risk analysis
- Be reviewed by Guardian

FORBIDDEN

- Direct production schema edit
- Silent column rename
- Implicit data transformation

9️⃣ SCHEMA DRIFT TEST

Before approving schema change:

Check:

- Does it introduce stored computed value?
- Does it introduce cross-domain FK?
- Does it weaken RLS?
- Does it require historical data mutation?

If yes → reject or redesign.

🔒 END OF DATABASE RULES