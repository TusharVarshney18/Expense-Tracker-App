# User report review runbook

Expense Counter accepts user reports, but currently has no in-app moderation
queue or automatic review. The publisher must assign a person to check reports
regularly and act on them.

## Review reports

1. Sign in to the Supabase Dashboard using an account with database admin access.
2. In SQL Editor, inspect recent reports without exporting them unnecessarily:

   ```sql
   select r.id, r.created_at, r.reporter_id, r.reported_user_id,
          r.conversation_id, r.reason
   from public.reports as r
   order by r.created_at desc
   limit 100;
   ```

3. Use the conversation ID and relevant message context to assess the report.
   Treat report contents and account identifiers as confidential.
4. Record the review outcome outside the user-facing app. Contact affected
   users only when appropriate. The current app does not provide moderator
   account suspension or report-resolution actions; use a documented operator
   process for any account-level action.
5. Check the queue again on a regular schedule and after receiving an urgent
   report by email.

Never grant ordinary app users access to the reports table. Its RLS intentionally
allows a user to submit their own report but not read reports.
