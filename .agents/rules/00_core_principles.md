---
trigger: always_on
---

CORE SYSTEM PRINCIPLES

1️⃣ SYSTEM PHILOSOPHY

RULE
The system is:
- Cash-based (no accrual logic)
- Deterministic
- Server-first hybrid
- Modular
- Controlled by architecture, not by code generators
- AI tools are execution engines, not architects.

WHY
Uncontrolled AI generation leads to:
- Architecture drift
- Hidden coupling
- Inconsistent mutation patterns
- Silent logic corruption
The system must remain predictable.

EXAMPLE (Correct)
Finance transaction recorded only when payment happens.
Obligation does NOT create automatic expense.
All mutations go through server actions.

EXAMPLE (Incorrect)
- Auto-distributing a 600 TL expense across two months.
- Writing directly to database from client.
- Introducing new patterns without Guardian validation.

TEST
If a feature introduces:
- automatic redistribution logic
- background mutation without explicit rule
- client-side financial mutation
→ It violates system philosophy.

2️⃣ DOMAIN BOUNDARIES

RULE
Domains are isolated:
- Todo
- Finance
- Storage
- Auth
- Integrations
No domain directly mutates another domain’s data.

WHY
Coupling domains creates:
- Disable/enable module instability
- Migration chaos
- Dependency explosions

EXAMPLE (Correct)
Finance payments create transactions within Finance domain.

EXAMPLE (Incorrect)
Finance updating Todo status automatically.

TEST
If disabling Finance breaks Todo,
→ boundary violated.

3️⃣ DATA OWNERSHIP & MUTATION RULES

RULE
All data mutation flow must be:
Client → Server Action → Service Layer → Database

Never:
Client → Direct DB write

WHY
Ensures:
- Security
- Determinism
- Auditability
- Controlled side effects

EXAMPLE (Correct)
addObligationPayment():
- updates remaining_amount
- creates transaction
- logs mutation

EXAMPLE (Incorrect)
Frontend calling Supabase insert directly.

TEST
Search for DB writes in client components.
If found → violation.

4️⃣ FINANCE PRINCIPLES

RULE
Finance is:
- Cash-based
- Integer currency (kuruş)
- Single category per transaction
- OR-based tag filtering
- No automatic accrual distribution

WHY
Prevents:
- Double counting
- Floating-point errors
- Accounting drift
- Dashboard inconsistency

EXAMPLE (Correct)
200 TL paid on Jan 20 → January expense.

EXAMPLE (Incorrect)
600 TL obligation split automatically across Jan/Feb.

TEST
If a transaction amount is not stored as integer,
→ violation.

5️⃣ TODO PRINCIPLES

RULE
- Unlimited hierarchy
- Recursive progress calculated dynamically
- No stored progress
- Custom workflow per workspace
- Manual Google sync only

WHY
Stored progress causes:
- Drift
- Sync inconsistency
- Hidden bugs

TEST
If progress is persisted in DB,
→ violation.

6️⃣ STORAGE PRINCIPLES

RULE
- Single polymorphic storage table
- Soft delete
- Private bucket only
- Signed URL access only

TEST
If public URL is used,
→ violation.

7️⃣ INTEGRATION RULES

RULE
- Google used only for Calendar
- Integration separate from Auth
- Tokens stored server-side only

TEST
If Google login replaces system identity,
→ violation.

8️⃣ MODULE CONTROL RULES

RULE
- Boolean module flags
- Disabling module hides access but keeps data
- No hard coupling between modules

TEST
If disabling Finance breaks dashboard rendering,
→ violation.

9️⃣ AI CONTROL RULES

RULE
AI must never:
- Redesign architecture without approval
- Introduce new patterns silently
- Merge domains
- Add background automation without explicit rule

AI must always:
- Explain architectural impact
- List risks
- Provide diff summary

TEST
If AI proposes structural change without risk analysis,
→ invalid output.


1️⃣0️⃣ ANTI-PATTERNS (Strictly Forbidden)

- Accrual auto-distribution
- Client-side DB mutation
- Stored balance field
- Float money storage
- Implicit cross-domain mutation
- Auto-sync without manual trigger
- Silent schema change

🔒 END OF CORE