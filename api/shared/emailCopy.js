function isEnabled(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function isCopyEnabled(env = process.env) {
  return isEnabled(env.EMAIL_COPY_ENABLED);
}

function isOverrideEnabled(env = process.env) {
  return isEnabled(env.EMAIL_OVERRIDE_ENABLED);
}

function parseRecipients(value) {
  return String(value || '')
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function parseCopyRecipients(value) {
  return parseRecipients(value);
}

function parseOverrideRecipients(env = process.env) {
  return parseRecipients(env.EMAIL_OVERRIDE_RECIPIENTS || env.EMAIL_OVERRIDE_RECIPIENT);
}

function applyEmailOverride(submission, env = process.env) {
  if (!isOverrideEnabled(env)) {
    return submission;
  }

  const overrideRecipients = parseOverrideRecipients(env);
  if (overrideRecipients.length === 0) {
    throw new Error('EMAIL_OVERRIDE_RECIPIENTS is required when EMAIL_OVERRIDE_ENABLED is true.');
  }

  return {
    ...submission,
    originalRecruitingEmail: submission.recruitingEmail,
    recruitingEmail: overrideRecipients[0],
    overrideRecipients,
    emailOverrideEnabled: true
  };
}

function applyEmailCopy(submission, env = process.env) {
  if (!isCopyEnabled(env)) {
    return submission;
  }

  const copyRecipients = parseCopyRecipients(env.EMAIL_COPY_RECIPIENTS);
  if (copyRecipients.length === 0) {
    throw new Error('EMAIL_COPY_RECIPIENTS is required when EMAIL_COPY_ENABLED is true.');
  }

  return {
    ...submission,
    copyRecipients,
    emailCopyEnabled: true
  };
}

function applyEmailRouting(submission, env = process.env) {
  return applyEmailCopy(applyEmailOverride(submission, env), env);
}

module.exports = {
  applyEmailCopy,
  applyEmailOverride,
  applyEmailRouting,
  isCopyEnabled,
  isOverrideEnabled,
  parseCopyRecipients,
  parseOverrideRecipients,
  parseRecipients
};
