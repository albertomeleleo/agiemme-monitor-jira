# Directive Enforcer Agent

This document defines the rules and checks that must be performed before any code modification to ensure alignment with project directives.

## Active Directives References
The following documents contain the specific rules that must be enforced:
- [Brand Identity (Dark)](./brand.md)
- [Brand Identity (Light)](./brand_light.md)

## Version Control & Gitflow Directives
**Status**: ACTIVE
**Trigger**: At the start of any new task request involving code changes.

### Gitflow Protocol
The AI Assistant must enforce strict Gitflow practices to protect the `main`/`master` branch:

1.  **Branch Check**: Before writing any code, check the current branch.
2.  **Create Branch**: If on `main` or if starting a new distinct task, create a new branch following these naming conventions:
    - Feature: `feature/description-of-feature`
    - Bugfix: `bugfix/description-of-fix`
    - Refactor: `refactor/description-of-change`
    - Hotfix: `hotfix/description-of-issue`
3.  **Prohibit Direct Commits**: NEVER commit or effect changes directly on `main` unless explicitly instructed to push a hotfix deployment.
4.  **Clean State**: Ensure the working directory is clean or changes are stashed before switching branches.

## Documentation & History Directives
**Status**: ACTIVE
**Trigger**: At the completion of any task or set of changes.

### 1. Mandatory Changelog
- **Rule**: Every code modification MUST be recorded in a file named `CHANGELOG.md` in the project root.
- **Format**: Keep a standard Changelog format (Date, Type of change, Description).
- **Synchronization**:
  - If a code change is **reverted**, the corresponding `CHANGELOG.md` entry MUST also be removed or marked as reverted.
  - The Changelog must always reflect the *current* state of the codebase.

### 2. Documentation Updates
- **Rule**: At the end of every modification cycle, the AI Assistant MUST update or create:
  1.  **Technical Documentation**: Updates to `README.md`, `docs/technical/` or relevant inline code comments explaining *how* it works.
  2.  **Functional Documentation**: Updates to `USER_MANUAL.html` (or `docs/manual/`) explaining *what* changed for the user.
- **Creation**: If these documents do not exist, they MUST be created.

## Security & Accessibility Directives
**Status**: ACTIVE
**Trigger**: At the completion of any task or set of changes, before final verification.

### 1. Security Checks
- **Rule**: Run security audits to identify vulnerabilities.
- **Action**:
  - Run `npm audit` (or equivalent) to check dependencies.
  - Review code for hardcoded secrets, unsafe inputs, or potential XSS vulnerabilities.
- **Resolution**: High-severity vulnerabilities MUST be fixed before completing the task.

### 2. Accessibility (UAA) Checks
- **Rule**: Ensure the UI is accessible according to UAA (Universal Accessibility) / WCAG standards.
- **Action**:
  - Verify semantic HTML usage (proper headings, buttons, inputs).
  - Ensure correct contrast ratios for text.
  - Check keyboard navigation support.
  - Verify ARIA labels are present where needed.
- **Compliance**: Any new UI component must pass these checks.

## Enforcement Protocol
**Status**: ACTIVE
**Trigger**: Before any `write_to_file`, `replace_file_content`, or `multi_replace_file_content` action.

### 1. Verification Steps
Before applying changes, the AI Assistant must:
1. **Identify Context**: Determine which directives apply to the current task.
2. **Review Directives**: Read the content of the referenced directive files (e.g., `brand.md`).
3. **Check Branch**: Verify that the current branch is NOT `main`. If it is, stop and create a new branch.
4. **Validate Implementation**:
   - Ensure color hex codes match the "Color Palette" in `brand.md`.
   - Verify that UI components (buttons, cards) follow the specified structure (e.g., proper glassmorphism classes).
   - Check that no forbidden patterns are used (e.g., generic Tailwind colors like `bg-blue-500` or `text-gray-600`).
5. **Consistency Check**: Ensure the new code matches the style of existing "Brand Compliant" components.
6. **Documentation Check**: Verify that `CHANGELOG.md` and documentation files are updated before marking the task as complete.
7. **Security & A11y Check**: Confirm `npm audit` passes and UAA/WCAG accessibility standards are met.

### 2. Violation Handling
If a violation is detected:
- **STOP**: Do not execute the code change.
- **REPORT**: Inform the user of the specific directive violation (e.g., "Attempted to use `bg-gray-200` which violates `brand.md` Dark Theme requirement" or "Attempting to edit `main` branch directly").
- **CORRECT**: Propose a compliant alternative (e.g., "Using `glass-panel` and `text-brand-text-sec` instead" or "Creating branch `feature/atomic-refactor`").

## Managing Directives
To add new rules:
1. Create a new markdown file in the `agent/workflows//` directory (e.g., `agent/workflows//security.md`).
2. Add a link to the file in the "Active Directives References" section above.
