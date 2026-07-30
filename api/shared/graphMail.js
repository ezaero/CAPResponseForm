function requireEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

async function getGraphToken(env = process.env, fetchImpl = fetch) {
  const tenantId = requireEnv(env, 'GRAPH_TENANT_ID');
  const clientId = requireEnv(env, 'GRAPH_CLIENT_ID');
  const clientSecret = requireEnv(env, 'GRAPH_CLIENT_SECRET');

  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('scope', 'https://graph.microsoft.com/.default');
  params.set('grant_type', 'client_credentials');

  const response = await fetchImpl(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Graph token request failed with HTTP ${response.status}.`);
  }

  const token = await response.json();
  if (!token.access_token) {
    throw new Error('Graph token response did not include an access token.');
  }
  return token.access_token;
}

function htmlEscape(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function detailRow(label, value) {
  return `<tr><td style='padding: 4px 8px; font-weight: bold;'>${label}:</td><td style='padding: 4px 8px;'>${htmlEscape(value)}</td></tr>`;
}

function piiWarningFooter() {
  return `<div data-capr-warning="CAPR 120-1 PII Warning" style="margin:24px 0 0 0;padding:16px 0 0 0;border-top:1px solid #d1d5db;color:#374151;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:12px;line-height:1.5;">
  <strong>Warning:</strong> The information you are receiving is protected from interception or disclosure. Any person who intentionally intercepts or illegally uses, distributes, reproduces or discloses its contents is subject to the penalties set forth in 18 United States Code Section 2511 and/or related state and federal laws of the United States.
</div>`;
}

function uniqueRecipients(recipients) {
  const seen = new Set();
  return recipients.filter((address) => {
    const key = String(address || '').trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildMailMessage(submission) {
  const parentRows = submission.isUnder18 === 'yes'
    ? `
      ${detailRow('Parent/Guardian', submission.parentName)}
      ${detailRow('Parent Email', submission.parentEmail)}
      ${detailRow('Parent Phone', submission.parentPhone)}`
    : '';

  const primaryRecipients = submission.overrideRecipients || [submission.recruitingEmail];
  const toRecipients = uniqueRecipients([
    ...primaryRecipients,
    ...(submission.copyRecipients || [])
  ]).map((address) => ({
    emailAddress: {
      address
    }
  }));

  return {
    subject: `CAP membership inquiry - ${submission.firstName} ${submission.lastName}`,
    body: {
      contentType: 'HTML',
      content: `
<html>
  <body style='font-family: Arial, sans-serif; color: #222;'>
    <div style='text-align: center; margin-bottom: 20px;'>
      <img src='https://cowg.cap.gov/media/websites/COWG_T_7665FADF8B38C.PNG' alt='COWG Logo' style='max-width: 200px;'/>
    </div>
    <h2 style='color: #003366;'>New CAP Membership Inquiry</h2>
    <p>A potential Civil Air Patrol member submitted the Colorado Wing interest form.</p>
    <table style='margin: 20px auto; border-collapse: collapse;'>
          ${detailRow('Name', `${submission.firstName} ${submission.lastName}`)}
          ${detailRow('Email', submission.email)}
          ${detailRow('Phone', submission.phone)}
          ${detailRow('Membership Type', submission.membershipType)}
          ${detailRow('Under 18', submission.isUnder18)}
          ${parentRows}
          ${detailRow('Squadron', `${submission.squadron.squadronName} (${submission.squadron.code})`)}
          ${detailRow('Location', submission.squadron.city)}
          ${detailRow('Charter', submission.squadron.charterNumber)}
          ${detailRow('Message', submission.message || 'No message provided.')}
    </table>
    <p style='font-size: 0.9em; color: #888; margin-top: 30px;'>This is an automated notification from the COWG IT Team.</p>
    ${piiWarningFooter()}
  </body>
</html>`
    },
    toRecipients,
    replyTo: [
      {
        emailAddress: {
          address: submission.email,
          name: `${submission.firstName} ${submission.lastName}`
        }
      }
    ]
  };
}

async function sendSubmissionMail(submission, env = process.env, fetchImpl = fetch) {
  const sender = requireEnv(env, 'GRAPH_SENDER_USER');
  const token = await getGraphToken(env, fetchImpl);
  const message = buildMailMessage(submission);

  const response = await fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      message,
      saveToSentItems: true
    })
  });

  if (!response.ok) {
    throw new Error(`Graph sendMail failed with HTTP ${response.status}.`);
  }
}

module.exports = {
  buildMailMessage,
  getGraphToken,
  sendSubmissionMail,
  uniqueRecipients
};
