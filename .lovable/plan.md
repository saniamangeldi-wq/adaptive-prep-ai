# Fix: selected role is never saved to user_roles

## Confirmed problem

`user_roles` currently has exactly one policy — a SELECT policy (`auth.uid() = user_id`). There is no INSERT or UPDATE policy at all, so every browser write fails with "new row violates row-level security policy".

Four places in the app still write to it, and all of them silently swallow the error:
- Signup (inserts the chosen role)
- Login (upserts the chosen role)
- The role hook's `addRole`
- School admin approving a teacher

Consequence: `has_role()` returns false for everyone, so tutor, teacher and school-admin gated features (creating assignments, tutor student points, SAT admin tools, school analytics reads) don't work for real users.

Why this isn't a one-line fix: a blanket "users can insert their own role" policy would let anyone grant themselves `school_admin` and take over SAT content management. Roles must be granted by a controlled path.

## Proposed approach

1. **Self-service student role only** — add a `SECURITY DEFINER` function `assign_self_student_role()` that inserts `(auth.uid(), 'student')` and nothing else. Signup and Login call this instead of inserting into `user_roles` directly.

2. **Elevated roles granted by an approver, never self-claimed**
   - School admin approving a teacher: `SECURITY DEFINER` function `grant_teacher_role(_user_id, _school_id)` that first verifies the caller is a `school_admin` of that school (via `is_school_admin`), then inserts the `teacher` row. `SchoolTeachers.tsx` calls this.
   - Tutor role: granted the same way from the existing tutor approval path (function checks the caller owns the tutor relationship), not from the login role picker.
   - `school_admin`: stays service-role/manual only.

3. **Stop the lying UI** — Signup/Login keep writing `profiles.role` (the display/view role, already allowed), but the role-table call becomes awaited and its failure logged properly instead of a fire-and-forget `.then()`. Picking "Tutor" or "School Admin" on the login screen no longer attempts to grant that role; it only selects the view.

4. **`useUserRoles.addRole`** — restrict to `student`; other roles show a message that they're granted by a school admin or tutor invite rather than failing silently.

## Technical notes

- One migration: two/three `SECURITY DEFINER` functions with `SET search_path = public`, `GRANT EXECUTE ... TO authenticated`, plus `GRANT INSERT ON public.user_roles TO service_role`. No permissive INSERT policy is added, so the escalation path stays closed.
- No change to the existing SELECT policy or to `has_role()`.
- Existing users signed up while the writes were broken will get their `student` row on next login via step 1; elevated roles need the approver flow (or a one-off backfill from `profiles.role` for tutors/teachers already in schools — can be included if you want).
