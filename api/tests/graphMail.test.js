const assert = require('node:assert/strict');
const test = require('node:test');

const { buildMailMessage } = require('../shared/graphMail');

const submission = {
  firstName: 'Amelia',
  lastName: 'Earhart',
  email: 'amelia@example.com',
  phone: '555-123-4567',
  squadron: {
    code: 'CO-022',
    squadronName: 'Vance Brand Cadet Squadron',
    city: 'Longmont',
    charterNumber: 'RMR-CO-022'
  },
  membershipType: 'Adult',
  isUnder18: 'no',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  message: 'Interested in visiting.',
  recruitingEmail: 'co-022-recruiting@cowg.cap.gov'
};

test('builds mail message to squadron and copy recipients', () => {
  const message = buildMailMessage({
    ...submission,
    copyRecipients: ['copy-recipient@example.org']
  });

  assert.deepEqual(message.toRecipients, [
    { emailAddress: { address: 'co-022-recruiting@cowg.cap.gov' } },
    { emailAddress: { address: 'copy-recipient@example.org' } }
  ]);
});

test('builds mail message only to squadron when copy recipients are absent', () => {
  const message = buildMailMessage(submission);

  assert.deepEqual(message.toRecipients, [
    { emailAddress: { address: 'co-022-recruiting@cowg.cap.gov' } }
  ]);
});

test('builds mail message from override recipients and de-duplicates copy recipients', () => {
  const message = buildMailMessage({
    ...submission,
    recruitingEmail: 'test-recipient@example.org',
    overrideRecipients: ['test-recipient@example.org'],
    copyRecipients: ['test-recipient@example.org', 'copy-recipient@example.org']
  });

  assert.deepEqual(message.toRecipients, [
    { emailAddress: { address: 'test-recipient@example.org' } },
    { emailAddress: { address: 'copy-recipient@example.org' } }
  ]);
});

test('builds inquiry email with Colorado Wing welcome notification styling', () => {
  const message = buildMailMessage(submission);
  const content = message.body.content;

  assert.equal(message.body.contentType, 'HTML');
  assert.match(content, /<html>/);
  assert.match(content, /font-family: Arial, sans-serif; color: #222;/);
  assert.match(content, /COWG_T_7665FADF8B38C\.PNG/);
  assert.match(content, /<h2 style='color: #003366;'>New CAP Membership Inquiry<\/h2>/);
  assert.match(content, /A potential Civil Air Patrol member submitted the Colorado Wing interest form\./);
  assert.match(content, /<table style='margin: 20px auto; border-collapse: collapse;'>/);
  assert.match(content, /<td style='padding: 4px 8px; font-weight: bold;'>Name:<\/td><td style='padding: 4px 8px;'>Amelia Earhart<\/td>/);
  assert.match(content, /<td style='padding: 4px 8px; font-weight: bold;'>Squadron:<\/td><td style='padding: 4px 8px;'>Vance Brand Cadet Squadron \(CO-022\)<\/td>/);
  assert.match(content, /This is an automated notification from the COWG IT Team\./);
  assert.match(content, /data-capr-warning="CAPR 120-1 PII Warning"/);
  assert.match(content, /The information you are receiving is protected from interception or disclosure\./);
  assert.match(content, /18 United States Code Section 2511/);
});
