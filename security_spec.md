# Security Specification - ImobiQualif AI

## Data Invariants
1. A Lead document must have a `score` between 0 and 100.
2. A Lead document must have a `status` from the allowed list: 'new', 'qualified', 'contacted', 'closed', 'rejected'.
3. `createdAt` must be fixed at creation time to `request.time`.
4. `updatedAt` must be set to `request.time` on every update.
5. Only authenticated users can create leads (via the chat interface).
6. Only authenticated users with "agent" role (or just authenticated in this simple demo) can read/list all leads. 
   - *Correction*: For this demo, let's assume the user who starts the chat owns the lead. But the prompt says "qualifica leads ... aciona a equipe de vendas". So there's a "team" side.
   - Let's make it so:
     - Anyone can CREATE a lead (anonymous or guest).
     - ONLY authenticated agents can READ/LIST leads.
     - For simplicity of this applet, I'll use the user's email if they sign in, or allow anonymous if needed. 
     - Actually, let's require sign-in for the "Agent Dashboard" but maybe allow guest chat?
     - The prompt says "Qualifica leads ... inclui no crm".
     - Let's assume there is an `ownerId` for leads if they are created by a user, or no owner if general.
     - But usually CRM leads are managed by agents.

## The Dirty Dozen Payloads
1. **Identity Spoofing**: Attempt to set `ownerId` to another user's UID.
2. **Score Overload**: Set `score` to 999.
3. **Invalid Status**: Set `status` to 'fake_status'.
4. **Time Travel**: Manually set `createdAt` to a year ago.
5. **Ghost Fields**: Add `isAdmin: true` to the Lead document.
6. **Unauthorized Read**: Guest trying to list all leads in `/leads`.
7. **Privilege Escalation**: Lead trying to update their own `score`.
8. **Relational Break**: Creating a lead without the required qualification object.
9. **Update Gap**: Updating `updatedAt` to a future date.
10. **ID Poisoning**: Using a 2KB string as Lead ID.
11. **PII Leak**: Listing users collection (if it existed) without ownership.
12. **Mass Update**: Trying to change `createdAt` on an existing lead.

## Test Runner (Logic Check)
- `create` fails if `score` is not integer or > 100.
- `update` fails if `createdAt` is changed.
- `list` fails for unauthenticated users.
