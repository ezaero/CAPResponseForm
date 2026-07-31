# CAP Response Form

A small Azure Static Web Apps site for collecting Civil Air Patrol membership inquiries and routing them to the appropriate squadron recruiting address.

The site presents a public interest form, validates the submission, verifies Cloudflare Turnstile, and sends the inquiry through Microsoft Graph from an Azure Functions API.

## Features

- Public membership inquiry form for prospective CAP members
- Squadron selector with recruiting email routing
- Membership-type-specific parent or guardian fields for cadet inquiries
- Client-side and server-side validation for required fields, email addresses, and phone numbers
- Cloudflare Turnstile bot protection
- Microsoft Graph `sendMail` delivery
- Optional email copy and test override routing through environment settings
- Azure Static Web Apps deployment workflow

## Project Structure

```text
.
├── api/                    Azure Functions API
│   ├── shared/             Shared validation, routing, Turnstile, and Graph mail helpers
│   ├── submit-interest/    Form submission function
│   └── tests/              API tests
├── tests/                  Frontend tests
├── app.js                  Browser form logic
├── config.js               Public browser configuration
├── index.html              Static page
├── squadrons.js            Browser squadron directory
└── package.json            Test scripts
```

## Prerequisites

- Node.js 20 or newer
- Azure Static Web Apps
- Cloudflare Turnstile site and secret keys
- Microsoft Entra app registration with Microsoft Graph `Mail.Send` permission
- A sender mailbox approved for the application

## Local Configuration

Copy the example settings file before running the API locally:

```bash
cp api/local.settings.json.example api/local.settings.json
```

Set these values in `api/local.settings.json` for local development, or as Azure Static Web Apps application settings in production:

| Setting | Purpose |
| --- | --- |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key used by the API |
| `GRAPH_TENANT_ID` | Microsoft Entra tenant ID |
| `GRAPH_CLIENT_ID` | Microsoft Entra application client ID |
| `GRAPH_CLIENT_SECRET` | Microsoft Entra application client secret |
| `GRAPH_SENDER_USER` | Mailbox or user principal name used to send Graph mail |
| `EMAIL_COPY_ENABLED` | Optional flag to copy additional recipients |
| `EMAIL_COPY_RECIPIENTS` | Optional comma-separated copy recipients |
| `EMAIL_OVERRIDE_ENABLED` | Optional flag to route all mail to test recipients |
| `EMAIL_OVERRIDE_RECIPIENTS` | Optional comma-separated test recipients |

The browser Turnstile site key is configured in `config.js`. Site keys are public; secret keys must only be stored in local settings, Azure application settings, or GitHub secrets.

## Development

Install dependencies:

```bash
npm install
cd api
npm install
```

Run tests from the repository root:

```bash
npm test
```

Run only frontend or API tests:

```bash
npm run test:frontend
npm run test:api
```

## Deployment

The repository includes a GitHub Actions workflow for Azure Static Web Apps. Pushes to `main` run the test suite and deploy the static site and API when the workflow succeeds.

Required deployment values should be stored as Azure Static Web Apps application settings or GitHub environment secrets, not in source control.

## Submission Reporting

The API logs one structured telemetry record after a form submission passes validation, passes Turnstile, and email delivery is accepted by Microsoft Graph. The log excludes applicant names, email addresses, phone numbers, and message text.

The structured payload is logged with this event name:

```text
CAPResponseForm.SubmissionAccepted
```

Production deployments should configure an Application Insights resource and set `APPLICATIONINSIGHTS_CONNECTION_STRING` on the Static Web App API settings so Azure Functions logs are queryable in Azure Monitor.

Use this KQL query in Application Insights Logs to report submissions by squadron:

```kusto
traces
| where timestamp >= ago(90d)
| extend payload = parse_json(message)
| where payload.eventName == "CAPResponseForm.SubmissionAccepted"
| summarize Submissions = count()
    by SquadronCode = tostring(payload.squadronCode),
       SquadronName = tostring(payload.squadronName)
| order by Submissions desc, SquadronCode asc
```

For a month-by-month commander's call trend:

```kusto
traces
| where timestamp >= startofmonth(ago(180d))
| extend payload = parse_json(message)
| where payload.eventName == "CAPResponseForm.SubmissionAccepted"
| summarize Submissions = count()
    by Month = startofmonth(timestamp),
       SquadronCode = tostring(payload.squadronCode),
       SquadronName = tostring(payload.squadronName)
| order by Month asc, SquadronCode asc
```

## Mail.Send Scoping

Microsoft Graph `Mail.Send` application permission is tenant-wide by default: without additional Exchange Online controls, an app with this permission may be able to send as any mailbox in the tenant.

Production deployments should restrict the app to the configured sender mailbox with an Exchange Online application access policy:

```powershell
Connect-ExchangeOnline -UserPrincipalName admin@example.org

$appId = "<graph-client-id>"
$senderMailbox = "sender@example.org"
$scopeAddress = "capresponseform-mailsend-scope@example.org"

New-DistributionGroup `
  -Name "CAPResponseForm Mail.Send Scope" `
  -Alias "CAPResponseForm-MailSend-Scope" `
  -Type Security `
  -PrimarySmtpAddress $scopeAddress

Add-DistributionGroupMember `
  -Identity $scopeAddress `
  -Member $senderMailbox `
  -BypassSecurityGroupManagerCheck

New-ApplicationAccessPolicy `
  -AppId $appId `
  -PolicyScopeGroupId $scopeAddress `
  -AccessRight RestrictAccess `
  -Description "Restrict CAPResponseForm Mail.Send to the configured sender mailbox."
```

Verify the effective scope with `Test-ApplicationAccessPolicy`:

```powershell
Test-ApplicationAccessPolicy -AppId $appId -Identity $senderMailbox
Test-ApplicationAccessPolicy -AppId $appId -Identity someone-else@example.org
```

Expected results:

- The configured sender mailbox returns `Granted`.
- A mailbox outside the scope group returns `Denied`.

## Security Notes

- Do not commit `api/local.settings.json`.
- Do not commit Graph client secrets, Turnstile secret keys, deployment tokens, or mailbox credentials.
- Restrict the Microsoft Graph mail application to the smallest practical mailbox scope with an Exchange Online application access policy.
- Use email override settings for testing in non-production environments.
- Review public examples and tests before adding real personal addresses or tenant-specific values.

## License

No license has been selected for this repository yet.
