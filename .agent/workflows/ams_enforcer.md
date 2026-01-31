---
description: Enforce AMS Directives and Gitflow Protocol
---

# AMS Enforcer Workflow

This workflow ensures that the project follows the Agile Management System (AMS) directives, including strict Gitflow and Brand Identity rules. Use `.agent/workflows/de_agm` as the source of truth.

1.  **Check AMS Structure**
    - Check if the directory `.agent/workflows/de_agm` exists.
    - Check if the file `.agent/workflows/de_agm/DirectiveEnforcer.md` exists.

2.  **Initialize or Load**
    - **IF** `DirectiveEnforcer.md` is MISSING:
        - Ask the user: "Structure mismatch. Do you want to initialize the Directive Enforcer for this project?"
        - **IF YES**:
            - Create directory `.agent/workflows/de_agm`
            - Create `.agent/workflows/de_agm/DirectiveEnforcer.md` with the standard template (Gitflow + Brand checks).
            - Create `.agent/workflows/de_agm/brand.md` with a placeholder or copy from a known source if available.
            - Notify: "AMS Initialized. Please review `.agent/workflows/de_agm/brand.md` to customize your brand identity."
            - Halt workflow to let user review.
    - **IF** `.agent/workflows/de_agm/DirectiveEnforcer.md` EXISTS:
        - View the file `.agent/workflows/de_agm/DirectiveEnforcer.md` to load the active directives into context.

3.  **Enforce Gitflow**
    - // turbo
    - Run `git branch --show-current` to check the current branch.
    - **IF** branch is `main` or `master`:
        - **STOP** and Warn: "VIOLATION: You are currently on the 'main' branch. AMS Directives require working on a feature/bugfix branch."
        - Ask user for a valid branch name (e.g., `feature/description` or `bugfix/issue-id`).
        - Once provided, run `git checkout -b <new-branch-name>`.
    - **IF** branch is NOT `main`:
        - Proceed.

4.  **Ready State**
    - Notify: "AMS Directives Loaded. Gitflow Secure. Ready for tasks."