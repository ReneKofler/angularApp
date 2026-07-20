# Continuation Workflow

When the user says **"continue"**, treat it as a request to complete the following workflow:

1. Check the connected YouTrack board for new, open tickets that are ready for development.
2. Select the next actionable ticket, first confirming that it does not already have an active branch or merge/pull request.
3. Read the full ticket and use its ID and acceptance criteria as the scope of work.
4. Create a dedicated branch named `feature/<ticket-id>-<short-description>` from the repository's current default branch.
5. Implement the ticket, add or update tests as appropriate, and run the relevant validation commands.
6. Commit the completed changes with a message beginning with the ticket ID.
7. Push the branch to `origin`.
8. Create a merge request (called a pull request on GitHub) that:
   - includes the ticket ID in the title;
   - summarizes the implementation and validation;
   - links or references the YouTrack ticket;
   - is opened as a draft if the work is incomplete or validation is failing.

Do not broaden the scope beyond the selected ticket. Preserve unrelated local changes. If no actionable ticket exists, or access to YouTrack or the Git host is unavailable, report the specific blocker instead of inventing work.
