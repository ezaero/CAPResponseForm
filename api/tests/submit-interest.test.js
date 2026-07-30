const assert = require('node:assert/strict');
const test = require('node:test');

const { createHandler } = require('../submit-interest');

const validBody = {
  firstName: 'Amelia',
  lastName: 'Earhart',
  email: 'amelia@example.com',
  phone: '555-123-4567',
  squadron: 'CO-022',
  membershipType: 'Adult',
  parentName: '',
  parentEmail: '',
  parentPhone: '',
  message: 'Interested in visiting.',
  turnstileToken: 'token'
};

function context() {
  const ctx = {
    errors: [],
    log: {
      error(...args) {
        ctx.errors.push(args);
      }
    },
    error(...args) {
      this.errors.push(args);
    }
  };
  return ctx;
}

function request(overrides = {}) {
  return {
    method: 'POST',
    headers: {},
    body: validBody,
    ...overrides
  };
}

function body(response) {
  return JSON.parse(response.body);
}

test('rejects non-POST requests with status 405', async () => {
  const handler = createHandler({
    verifyTurnstile: async () => true,
    sendSubmissionMail: async () => {}
  });

  const response = await handler(context(), request({ method: 'GET' }));

  assert.equal(response.status, 405);
  assert.equal(response.headers.Allow, 'POST');
  assert.deepEqual(body(response), { message: 'Use POST to submit the form.' });
});

test('rejects invalid submissions before calling Turnstile or mail', async () => {
  let turnstileCalls = 0;
  let mailCalls = 0;
  const handler = createHandler({
    verifyTurnstile: async () => {
      turnstileCalls += 1;
      return true;
    },
    sendSubmissionMail: async () => {
      mailCalls += 1;
    }
  });

  const response = await handler(context(), request({
    body: {
      ...validBody,
      email: '',
      turnstileToken: ''
    }
  }));

  assert.equal(response.status, 400);
  assert.equal(body(response).message, 'Please check the form and try again.');
  assert.deepEqual(body(response).errors, {
    email: 'Email address is required.',
    turnstileToken: 'Turnstile token is required.'
  });
  assert.equal(turnstileCalls, 0);
  assert.equal(mailCalls, 0);
});

test('rejects failed Turnstile verification with status 403', async () => {
  let mailCalls = 0;
  const handler = createHandler({
    verifyTurnstile: async (token, remoteIp) => {
      assert.equal(token, 'token');
      assert.equal(remoteIp, '203.0.113.7');
      return false;
    },
    sendSubmissionMail: async () => {
      mailCalls += 1;
    }
  });

  const response = await handler(context(), request({
    headers: {
      'x-forwarded-for': '203.0.113.7, 198.51.100.4'
    }
  }));

  assert.equal(response.status, 403);
  assert.deepEqual(body(response), {
    message: 'Security check failed. Please refresh the page and try again.'
  });
  assert.equal(mailCalls, 0);
});

test('returns friendly error with status 503 when Turnstile verification throws with sparse context', async () => {
  let mailCalls = 0;
  const handler = createHandler({
    verifyTurnstile: async () => {
      throw new Error('verify unavailable');
    },
    sendSubmissionMail: async () => {
      mailCalls += 1;
    }
  });

  const response = await handler({}, request());

  assert.equal(response.status, 503);
  assert.deepEqual(body(response), {
    message: 'Security check is temporarily unavailable. Please try again.'
  });
  assert.equal(mailCalls, 0);
});

test('sends valid submissions and returns confirmation details', async () => {
  let sentSubmission;
  const handler = createHandler({
    verifyTurnstile: async () => true,
    sendSubmissionMail: async (submission) => {
      sentSubmission = submission;
    }
  });

  const response = await handler(context(), request());

  assert.equal(sentSubmission.firstName, 'Amelia');
  assert.equal(sentSubmission.squadron.code, 'CO-022');
  assert.equal(sentSubmission.recruitingEmail, 'co-022-recruiting@cowg.cap.gov');
  assert.equal(response.status, 200);
  assert.deepEqual(body(response), {
    message: 'Your interest form was submitted.',
    recruitingEmail: 'co-022-recruiting@cowg.cap.gov',
    squadronName: 'Vance Brand Cadet Squadron',
    squadronCode: 'CO-022'
  });
});

test('copies email recipient while preserving squadron recruiting group when copy is enabled', async () => {
  let sentSubmission;
  const handler = createHandler({
    env: {
      EMAIL_COPY_ENABLED: 'true',
      EMAIL_COPY_RECIPIENTS: 'copy-recipient@example.org'
    },
    verifyTurnstile: async () => true,
    sendSubmissionMail: async (submission) => {
      sentSubmission = submission;
    }
  });

  const response = await handler(context(), request());

  assert.equal(response.status, 200);
  assert.equal(sentSubmission.recruitingEmail, 'co-022-recruiting@cowg.cap.gov');
  assert.deepEqual(sentSubmission.copyRecipients, ['copy-recipient@example.org']);
  assert.equal(sentSubmission.emailCopyEnabled, true);
  assert.deepEqual(body(response), {
    message: 'Your interest form was submitted.',
    recruitingEmail: 'co-022-recruiting@cowg.cap.gov',
    squadronName: 'Vance Brand Cadet Squadron',
    squadronCode: 'CO-022'
  });
});

test('overrides squadron recruiting recipient when email override is enabled', async () => {
  let sentSubmission;
  const handler = createHandler({
    env: {
      EMAIL_OVERRIDE_ENABLED: 'true',
      EMAIL_OVERRIDE_RECIPIENTS: 'test-recipient@example.org',
      EMAIL_COPY_ENABLED: 'false'
    },
    verifyTurnstile: async () => true,
    sendSubmissionMail: async (submission) => {
      sentSubmission = submission;
    }
  });

  const response = await handler(context(), request());

  assert.equal(response.status, 200);
  assert.equal(sentSubmission.recruitingEmail, 'test-recipient@example.org');
  assert.deepEqual(sentSubmission.overrideRecipients, ['test-recipient@example.org']);
  assert.equal(sentSubmission.originalRecruitingEmail, 'co-022-recruiting@cowg.cap.gov');
  assert.equal(sentSubmission.emailOverrideEnabled, true);
  assert.deepEqual(body(response), {
    message: 'Your interest form was submitted.',
    recruitingEmail: 'test-recipient@example.org',
    squadronName: 'Vance Brand Cadet Squadron',
    squadronCode: 'CO-022'
  });
});

test('supports email override and copy recipients at the same time', async () => {
  let sentSubmission;
  const handler = createHandler({
    env: {
      EMAIL_OVERRIDE_ENABLED: 'true',
      EMAIL_OVERRIDE_RECIPIENTS: 'test-routing@example.org',
      EMAIL_COPY_ENABLED: 'true',
      EMAIL_COPY_RECIPIENTS: 'copy-recipient@example.org'
    },
    verifyTurnstile: async () => true,
    sendSubmissionMail: async (submission) => {
      sentSubmission = submission;
    }
  });

  const response = await handler(context(), request());

  assert.equal(response.status, 200);
  assert.equal(sentSubmission.recruitingEmail, 'test-routing@example.org');
  assert.deepEqual(sentSubmission.overrideRecipients, ['test-routing@example.org']);
  assert.deepEqual(sentSubmission.copyRecipients, ['copy-recipient@example.org']);
  assert.equal(sentSubmission.originalRecruitingEmail, 'co-022-recruiting@cowg.cap.gov');
});

test('does not copy recipient when copy is disabled', async () => {
  let sentSubmission;
  const handler = createHandler({
    env: {
      EMAIL_COPY_ENABLED: 'false',
      EMAIL_COPY_RECIPIENTS: 'copy-recipient@example.org'
    },
    verifyTurnstile: async () => true,
    sendSubmissionMail: async (submission) => {
      sentSubmission = submission;
    }
  });

  const response = await handler(context(), request());

  assert.equal(response.status, 200);
  assert.equal(sentSubmission.recruitingEmail, 'co-022-recruiting@cowg.cap.gov');
  assert.equal(sentSubmission.copyRecipients, undefined);
  assert.equal(sentSubmission.emailCopyEnabled, undefined);
});

test('returns friendly error when email override is enabled without a recipient', async () => {
  let mailCalls = 0;
  const handler = createHandler({
    env: {
      EMAIL_OVERRIDE_ENABLED: 'true',
      EMAIL_OVERRIDE_RECIPIENTS: '',
      EMAIL_COPY_ENABLED: 'false'
    },
    verifyTurnstile: async () => true,
    sendSubmissionMail: async () => {
      mailCalls += 1;
    }
  });

  const response = await handler({}, request());

  assert.equal(response.status, 500);
  assert.deepEqual(body(response), {
    message: 'Email routing is temporarily unavailable. Please try again later.'
  });
  assert.equal(mailCalls, 0);
});

test('returns friendly error when email copy is enabled without a recipient', async () => {
  let mailCalls = 0;
  const handler = createHandler({
    env: {
      EMAIL_COPY_ENABLED: 'true',
      EMAIL_COPY_RECIPIENTS: ''
    },
    verifyTurnstile: async () => true,
    sendSubmissionMail: async () => {
      mailCalls += 1;
    }
  });

  const response = await handler({}, request());

  assert.equal(response.status, 500);
  assert.deepEqual(body(response), {
    message: 'Email routing is temporarily unavailable. Please try again later.'
  });
  assert.equal(mailCalls, 0);
});

test('returns friendly error with status 502 when mail sending fails', async () => {
  const handler = createHandler({
    verifyTurnstile: async () => true,
    sendSubmissionMail: async () => {
      throw new Error('send failed');
    }
  });

  const response = await handler({}, request());

  assert.equal(response.status, 502);
  assert.deepEqual(body(response), {
    message: 'We could not send your request. Please try again or contact the squadron directly.'
  });
});
