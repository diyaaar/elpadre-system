---
trigger: always_on
---

ARCHITECTURE OVERVIEW

1️⃣ SYSTEM LAYER MODEL

The system follows a strict layered architecture:

```
Client UI Layer
    ↓
Server Action Layer
    ↓
Service Layer (Business Logic)
    ↓
Data Access Layer
    ↓
Supabase (Postgres + Storage + Auth)
```

RULE

No layer may skip another layer.

FORBIDDEN

- Client → Direct DB
- Client → Service without server boundary
- Service → Client mutation
- Cross-domain mutation

TEST

If any component bypasses Service Layer → violation.

2️⃣ DOMAIN STRUCTURE

Each domain is isolated.

```
/domains
    /todo
    /finance
    /storage
    /auth
    /integrations
```

Each domain contains:

- types
- services
- server actions
- validation
- tests (future)

RULE

Domains may read each other via interface, but may not mutate.

Example (Correct)

Finance payment creates finance transaction only.

Example (Incorrect)

Finance updating Todo progress.

3️⃣ DATA FLOW RULES

All mutation must follow:

```
Client → Server Action → Domain Service → DB
```

All read operations:

```
Server Component → Domain Service → DB
```

Client components never fetch directly from Supabase.

WHY

Prevents:

- Inconsistent mutation logic
- Hidden side effects
- Token leakage
- State drift

4️⃣ MODULE ENABLE SYSTEM FLOW

Before rendering a module:

```
Check user_module_settings
    ↓
If disabled → block route
```

This check happens:

- Server side
- Not client-only

5️⃣ TODO ARCHITECTURE

Core elements:

- Task
- Workspace
- Status (custom workflow)
- Tag
- Recurring Template
- Google Sync Reference

Progress:

- Calculated dynamically
- Not stored

Tree:

- Built in frontend from flat query

Critical Rule

Recursive progress must not trigger DB mutation.

6️⃣ FINANCE ARCHITECTURE

Core elements:

- Transaction
- Category
- Tag
- Obligation
- Obligation Payment

Rules:

- Cash-based
- Integer currency
- One category per transaction
- OR tag filter

Obligation Logic

```
Obligation (total_amount)
    ↓
Partial Payment
    ↓
Creates Transaction
    ↓
Updates remaining_amount
```

Obligation itself does not create transaction.

7️⃣ STORAGE ARCHITECTURE

Single polymorphic table:

```
files
    module_type
    related_id
```

Storage bucket:

- Private
- Signed URL only
- Soft delete only marks DB

8️⃣ INTEGRATION ARCHITECTURE

Google Integration Flow:

```
User Connects Google
    ↓
OAuth callback
    ↓
Store refresh_token
    ↓
Manual Sync per Task
```

No automatic sync.

9️⃣ DEPENDENCY MAP

Allowed dependencies:

- Todo → Storage
- Finance → Storage
- Integrations → Todo
- Integrations → Finance (read-only)

Forbidden:

- Finance → Todo mutation
- Todo → Finance mutation
- Storage → Domain logic

1️⃣0️⃣ FAILURE ISOLATION PRINCIPLE

If one module fails:

It must not crash other modules.

Graceful degradation required.

Example:

If Google sync fails,
→ Task creation must still succeed.

1️⃣1️⃣ SCHEMA CHANGE RULE

Any schema change requires:

- Guardian validation
- Risk analysis
- Decision log entry

No silent schema evolution.

1️⃣2️⃣ ARCHITECTURE STABILITY TEST

Before merging any change:

Check:

- Does it violate domain boundary?
- Does it introduce stored computed value?
- Does it bypass service layer?
- Does it introduce hidden automation?

If yes → reject.

🔒 END OF ARCHITECTURE OVERVIEW