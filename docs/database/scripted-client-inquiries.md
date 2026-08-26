# Scripted client inquiries

Issue #38 adds controlled client communication to assigned lab tickets. An instructor authors one response for each inquiry purpose in a custom scenario, selects a per-ticket limit from one to three, and previews the complete script before saving. The limit is copied onto each assigned ticket while the response snapshot is stored in the private `assigned_ticket_scripts` table, so later scenario edits cannot change an active lab and students cannot download the answer set.

Students must write a free-text question before selecting its purpose. Submission uses `submit_my_client_inquiry`; the database verifies ticket ownership, enforces the limit under a ticket-row lock, and returns only the response for the chosen purpose. A client-generated request UUID makes a network retry idempotent rather than consuming another inquiry.

Inquiry history is private to the assigned student and instructors. It preserves the question, purpose, scripted response, student, sequence number, and timestamp, and is shown during instructor verification. Response quality supports exact, ambiguous, mistaken, and no-useful-information scripts, but that instructor-authored label remains private so students must judge the answer themselves. No external AI service is involved.
