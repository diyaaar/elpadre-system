---
trigger: always_on
---

DECISION LOG SYSTEM

1️⃣ PURPOSE

The decision log is:

- The single source of truth for architectural decisions
- A record of schema evolution
- A reference for AI Guardian validation
- A rollback guide

No architectural change is valid without a log entry.

2️⃣ ENTRY FORMAT (MANDATORY STRUCTURE)

Each entry must follow this exact structure:

```
DECISION ID: DL-YYYY-MM-DD-XX

DATE:
YYYY-MM-DD

DOMAIN:
(todo / finance / storage / integration / auth / system)

CHANGE TYPE:
(schema / logic / integration / module / refactor / rule change)

SUMMARY:
One paragraph describing what changed.

MOTIVATION:
Why this change was necessary.

ARCHITECTURAL IMPACT:
What layer or domain is affected.

SCHEMA IMPACT:
(New table / New column / Index / None)

RISK LEVEL:
(Low / Medium / High)

ROLLBACK STRATEGY:
How to revert safely.

GUARDIAN CONFIDENCE:
Percentage

STATUS:
(Approved / Rejected / Pending)
```

No free-form logging allowed.

3️⃣ DECISION ID RULE

Format:

- DL-2026-01-15-01
- DL-2026-01-15-02

Sequential per day.

Never reuse ID.

4️⃣ WHAT MUST BE LOGGED

Mandatory logging for:

- Any schema change
- Any new table
- Any new domain service
- Any integration scope change
- Any mutation flow modification
- Any module enable logic change

Not required for:

- Styling
- UI text changes
- Minor refactors with no logic impact

5️⃣ SCHEMA CHANGE SPECIAL RULE

If change includes:

- Column rename
- Column removal
- Type change

Then log must include:

```
DATA MIGRATION STRATEGY:
...
```

Guardian must mark as HIGH risk.

6️⃣ ANTI-CHAOS RULE

If two decisions conflict:

- The newest decision must reference the old one
- Old decision must be marked superseded

Example:

```
SUPERSEDES:
DL-2026-01-10-02
```

7️⃣ ROLLBACK DISCIPLINE

Rollback strategy must be real.

Forbidden rollback descriptions:

- "Revert commit"
- "Undo change"

It must specify:

- Which table
- Which migration
- Which field

8️⃣ GUARDIAN ENFORCEMENT RULE

Guardian must reject change if:

- No decision log entry created
- Log format invalid
- Risk level inconsistent with change type
- Schema change logged as Low risk

9️⃣ PERIODIC CONSISTENCY CHECK

Every 10 decisions:

Guardian must:

- Re-evaluate architecture alignment
- Check for drift patterns
- Flag structural complexity growth

🔒 END OF DECISION LOG SYSTEM