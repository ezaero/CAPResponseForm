const { getSquadronByCode, getRecruitingEmail } = require('./squadrons');

const MEMBERSHIP_TYPES = new Set([
  'Cadet',
  'Adult',
  'Cadet Sponsor',
  'Patron',
  'Aerospace Education'
]);

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  if (!/^\+?[\d\s().-]+$/.test(value)) {
    return false;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

function validateSubmission(body) {
  const input = body && typeof body === 'object' ? body : {};
  const errors = {};

  const submission = {
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    email: clean(input.email),
    phone: clean(input.phone),
    squadronCode: clean(input.squadron),
    membershipType: clean(input.membershipType),
    parentName: clean(input.parentName),
    parentEmail: clean(input.parentEmail),
    parentPhone: clean(input.parentPhone),
    message: clean(input.message),
    turnstileToken: clean(input.turnstileToken)
  };
  submission.isUnder18 = submission.membershipType === 'Cadet' ? 'yes' : 'no';

  if (!submission.firstName) errors.firstName = 'First name is required.';
  if (!submission.lastName) errors.lastName = 'Last name is required.';
  if (!submission.email) errors.email = 'Email address is required.';
  if (submission.email && !isEmail(submission.email)) errors.email = 'Enter a valid email address.';
  if (!submission.phone) errors.phone = 'Phone number is required.';
  if (submission.phone && !isPhone(submission.phone)) errors.phone = 'Enter a valid phone number.';
  if (!MEMBERSHIP_TYPES.has(submission.membershipType)) errors.membershipType = 'Select a valid membership type.';
  if (!submission.turnstileToken) errors.turnstileToken = 'Turnstile token is required.';

  const squadron = getSquadronByCode(submission.squadronCode);
  const recruitingEmail = getRecruitingEmail(submission.squadronCode);
  if (!squadron || !recruitingEmail) {
    errors.squadron = 'Select a valid squadron.';
  }

  if (submission.membershipType === 'Cadet') {
    if (!submission.parentName) errors.parentName = 'Parent or guardian name is required.';
    if (!submission.parentEmail) errors.parentEmail = 'Parent or guardian email is required.';
    if (submission.parentEmail && !isEmail(submission.parentEmail)) errors.parentEmail = 'Enter a valid parent or guardian email.';
    if (!submission.parentPhone) errors.parentPhone = 'Parent or guardian phone is required.';
    if (submission.parentPhone && !isPhone(submission.parentPhone)) errors.parentPhone = 'Enter a valid parent or guardian phone number.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      ...submission,
      squadron,
      recruitingEmail
    }
  };
}

module.exports = {
  MEMBERSHIP_TYPES,
  isEmail,
  isPhone,
  validateSubmission
};
