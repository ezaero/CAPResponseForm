const { sendSubmissionMail } = require('../shared/graphMail');
const { applyEmailRouting } = require('../shared/emailCopy');
const { json } = require('../shared/response');
const { verifyTurnstile } = require('../shared/turnstile');
const { validateSubmission } = require('../shared/validation');

function clientIp(req) {
  return req.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers?.['client-ip']
    || '';
}

function logError(context, ...args) {
  if (typeof context?.log?.error === 'function') {
    context.log.error(...args);
    return;
  }

  if (typeof context?.error === 'function') {
    context.error(...args);
  }
}

function createHandler(dependencies = {}) {
  const verify = dependencies.verifyTurnstile || verifyTurnstile;
  const sendMail = dependencies.sendSubmissionMail || sendSubmissionMail;
  const env = dependencies.env || process.env;

  return async function submitInterest(context, req) {
    if (req.method && req.method.toUpperCase() !== 'POST') {
      return json(405, { message: 'Use POST to submit the form.' }, { Allow: 'POST' });
    }

    const validation = validateSubmission(req.body);
    if (!validation.ok) {
      return json(400, {
        message: 'Please check the form and try again.',
        errors: validation.errors
      });
    }

    let submission = validation.value;

    try {
      const turnstileOk = await verify(submission.turnstileToken, clientIp(req));
      if (!turnstileOk) {
        return json(403, { message: 'Security check failed. Please refresh the page and try again.' });
      }
    } catch (error) {
      logError(context, 'Turnstile verification error', error);
      return json(503, { message: 'Security check is temporarily unavailable. Please try again.' });
    }

    try {
      submission = applyEmailRouting(submission, env);
    } catch (error) {
      logError(context, 'Email routing error', error);
      return json(500, { message: 'Email routing is temporarily unavailable. Please try again later.' });
    }

    try {
      await sendMail(submission);
    } catch (error) {
      logError(context, 'Graph sendMail error', error);
      return json(502, { message: 'We could not send your request. Please try again or contact the squadron directly.' });
    }

    return json(200, {
      message: 'Your interest form was submitted.',
      recruitingEmail: submission.recruitingEmail,
      squadronName: submission.squadron.squadronName,
      squadronCode: submission.squadron.code
    });
  };
}

module.exports = createHandler();
module.exports.createHandler = createHandler;
