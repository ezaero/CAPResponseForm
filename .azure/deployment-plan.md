# CAP Response Form Azure Deployment Plan

Status: Planning

## Goal

Prepare the repository for Azure Static Web Apps deployment from GitHub Actions whenever the `main` branch is updated.

## Current Decision

- Hosting target: Azure Static Web Apps
- Source repository: `https://github.com/ezaero/CAPResponseForm.git`
- Branch: `main`
- Frontend location: repository root
- API location: `api`
- Build output: repository root, because v1 uses plain static HTML/CSS/JavaScript with no frontend build step
- Deployment credential: GitHub repository secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`

## Planned Artifacts

- `.github/workflows/azure-static-web-apps.yml`

## Required External Setup

Create or connect an Azure Static Web Apps resource and add its deployment token to the GitHub repository as `AZURE_STATIC_WEB_APPS_API_TOKEN`.

## Verification

- Validate workflow YAML syntax locally.
- Confirm git remote points to `https://github.com/ezaero/CAPResponseForm.git`.
- Commit the workflow and deployment plan.
- Push `main` to GitHub if credentials are available.
