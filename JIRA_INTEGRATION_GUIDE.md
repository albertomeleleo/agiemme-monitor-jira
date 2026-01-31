# Jira Integration Guide (Agent Context)

This document provides a detailed technical overview of the Jira integration within the Release Analyzer application. It is structured to provide an AI agent with all necessary context to replicate, maintain, or improve this integration in another system.

## 1. Integration Methodology

### 1.1 Authentication
-   **Security**: Authentication is handled via **Basic Auth**.
-   **Token Header**: `Authorization: Basic <base64(email:apiToken)>`
-   **Required Headers**:
    -   `Accept: application/json`
    -   `Content-Type: application/json`
-   **Configuration**: The API Token and Email are stored securely. In this app, `electron-store` is used for persistence.

### 1.2 Base URL Handling
-   The user inputs a host (e.g., `company.atlassian.net`).
-   The service ensures the protocol is present (`https://`) and removes any trailing slashes before constructing endpoints.

---

## 2. API Specifications (Cloud v3)

The application currently uses **Jira Cloud REST API v3**.

### 2.1 Fetching Projects
-   **Endpoint**: `GET /rest/api/3/project`
-   **Purpose**: Retrieves a list of all visible projects for the user.
-   **Agent Prompt**: "Fetch the list of projects to populate a dropdown selector."

### 2.2 Fetching Versions (Releases)
-   **Endpoint**: `GET /rest/api/3/project/{projectKey}/versions`
-   **Purpose**: Retrieves release versions for a specific project.
-   **Logic**:
    -   Sorts versions by `releaseDate` (descending) to show the latest releases first.
    -   Used to filter issues by `fixVersion`.

### 2.3 Fetching Issues (JQL Search)
-   **Endpoint**: `POST /rest/api/3/search/jql`
    -   *Note*: The standard `/rest/api/3/search` (GET) can run into URL length limits with complex JQL. The `POST` method is preferred for stability.
-   **Payload**:
    ```json
    {
      "jql": "project = \"PROJ\" AND fixVersion = 12345",
      "maxResults": 1000,
      "fields": ["summary", "status", "issuetype", "created", "priority", "resolutiondate"],
      "expand": ["changelog"]
    }
    ```
-   **Key Fields for SLA**:
    -   `created`: Timestamp when issue was reported.
    -   `resolutiondate`: Timestamp when issue was resolved.
    -   `changelog`: Critical for calculating time spent in specific statuses (e.g., deducting "Pause" time).

---

## 3. SLA Calculation Logic (The "Secret Sauce")

To replicate the SLA Dashboard, an agent must implement the following logic on the raw issue data:

1.  **Reaction Time**:
    -   *Definition*: Time from `created` to the **first** transition out of "Open"/"New".
    -   *Algorithm*: Iterate through `changelog.histories`. Find the earliest item where `items[].field == 'status'`. Calc `transitionDate - createdDate`.

2.  **Resolution Time (Net)**:
    -   *Definition*: Total duration from `created` to `resolutiondate`, **minus** any time spent in "Pause" statuses (e.g., "Waiting for Customer", "Blocked").
    -   *Algorithm*:
        1.  Sort all status transitions chronologically.
        2.  Identify intervals where status was a "Pause Status".
        3.  Sum these intervals.
        4.  `ResolutionTime = (ResolutionDate - CreatedDate) - TotalPauseTime`.

3.  **Business Hours (Optional but Recommended)**:
    -   The current implementation may be simplified. A robust version should only count minutes during business hours (e.g., Mon-Fri, 09:00-18:00).

---

## 4. Improvements & Roadmap

Use this section to guide an AI agent in upgrading the integration.

### 4.1 Pagination (High Priority)
-   **Current State**: The `getReleaseIssues` method hardcodes `maxResults: 1000`. If a release has >1000 issues, data is truncated.
-   **Fix**: Implement recursive fetching using `startAt`.
    ```typescript
    // Pseudo-code for Agent
    let allIssues = [];
    let startAt = 0;
    do {
        const res = await api.search({ jql, startAt, maxResults: 100 });
        allIssues.push(...res.issues);
        startAt += res.issues.length;
    } while (startAt < res.total);
    ```

### 4.2 Rate Limiting (Reliability)
-   **Current State**: No explicit handling of `429 Too Many Requests`.
-   **Fix**: Implement a retry mechanism with exponential backoff on `429` responses. Use the `Retry-After` header if available.

### 4.3 Type Safety
-   **Current State**: Uses manual interfaces (`JiraIssue`).
-   **Fix**: Use a generated client library or the official `jira.js` package for full type coverage of the complex Atlassian schema.

### 4.4 OAuth 2.0 (Security)
-   **Current State**: Basic Auth (API Token).
-   **Fix**: For a public-facing app, move to **OAuth 2.0** (3LO) to avoid handling user API tokens directly.
