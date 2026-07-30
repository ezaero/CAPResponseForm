const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { getRecruitingEmail, squadronList } = require('../shared/squadrons');
const { validateSubmission } = require('../shared/validation');

const validSubmission = {
  firstName: 'Amelia',
  lastName: 'Earhart',
  email: 'amelia@example.com',
  phone: '555-123-4567',
  squadron: 'CO-022',
  membershipType: 'Cadet',
  parentName: 'Mary Earhart',
  parentEmail: 'mary@example.com',
  parentPhone: '555-987-6543',
  message: 'Interested in visiting a meeting.',
  turnstileToken: 'token'
};

test('returns recruiting email for CO-022', () => {
  assert.equal(getRecruitingEmail('CO-022'), 'co-022-recruiting@cowg.cap.gov');
});

test('returns recruiting email for CO-805', () => {
  assert.equal(getRecruitingEmail('CO-805'), 'co-805-recruiting@cowg.cap.gov');
});

test('returns null recruiting email for unknown squadron codes', () => {
  assert.equal(getRecruitingEmail('CO-999'), null);
});

test('browser and API squadron directories stay in parity', () => {
  const browserFile = path.join(__dirname, '..', '..', 'squadrons.js');
  const browserSource = fs.readFileSync(browserFile, 'utf8');
  const sandbox = { window: {} };

  vm.createContext(sandbox);
  vm.runInContext(browserSource, sandbox, { filename: browserFile });

  const browserSquadrons = JSON.parse(JSON.stringify(sandbox.window.CAP_SQUADRONS));

  assert.notEqual(browserSquadrons.length, 0);
  assert.deepEqual(browserSquadrons, squadronList);
});

test('complete cadet submissions validate with squadron, recruiting email, and parent requirement flag', () => {
  const result = validateSubmission(validSubmission);

  assert.equal(result.ok, true);
  assert.equal(result.value.isUnder18, 'yes');
  assert.equal(result.value.squadron.code, 'CO-022');
  assert.equal(result.value.recruitingEmail, 'co-022-recruiting@cowg.cap.gov');
});

test('parent fields are required for cadet submissions', () => {
  const result = validateSubmission({
    ...validSubmission,
    parentName: '',
    parentEmail: '',
    parentPhone: ''
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, {
    parentName: 'Parent or guardian name is required.',
    parentEmail: 'Parent or guardian email is required.',
    parentPhone: 'Parent or guardian phone is required.'
  });
});

test('parent fields are not required for non-cadet submissions', () => {
  for (const membershipType of ['Adult', 'Cadet Sponsor', 'Patron', 'Aerospace Education']) {
    const result = validateSubmission({
      ...validSubmission,
      membershipType,
      parentName: '',
      parentEmail: '',
      parentPhone: ''
    });

    assert.equal(result.ok, true, `${membershipType} should not require parent details`);
    assert.equal(result.value.isUnder18, 'no');
    assert.equal(result.value.parentName, '');
    assert.equal(result.value.parentEmail, '');
    assert.equal(result.value.parentPhone, '');
  }
});

test('required core fields are rejected when blank', () => {
  const result = validateSubmission({
    ...validSubmission,
    firstName: '',
    lastName: '',
    phone: ''
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.firstName, 'First name is required.');
  assert.equal(result.errors.lastName, 'Last name is required.');
  assert.equal(result.errors.phone, 'Phone number is required.');
});

test('missing email is rejected with a required error', () => {
  const result = validateSubmission({
    ...validSubmission,
    email: ''
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.email, 'Email address is required.');
});

test('submitted under-18 selection is ignored in favor of membership type', () => {
  const result = validateSubmission({
    ...validSubmission,
    membershipType: 'Adult',
    isUnder18: 'yes',
    parentName: '',
    parentEmail: '',
    parentPhone: ''
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.isUnder18, 'no');
});

test('invalid email is rejected', () => {
  const result = validateSubmission({
    ...validSubmission,
    email: 'not-an-email'
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.email, 'Enter a valid email address.');
});

test('invalid applicant phone number is rejected', () => {
  const result = validateSubmission({
    ...validSubmission,
    phone: 'call me later'
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.phone, 'Enter a valid phone number.');
});

test('common applicant phone formats are accepted', () => {
  for (const phone of ['5551234567', '555-123-4567', '(555) 123-4567', '+1 555 123 4567']) {
    const result = validateSubmission({
      ...validSubmission,
      phone
    });

    assert.equal(result.ok, true, `${phone} should be valid`);
  }
});

test('invalid parent phone number is rejected for cadet submissions', () => {
  const result = validateSubmission({
    ...validSubmission,
    parentPhone: '12345'
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.parentPhone, 'Enter a valid parent or guardian phone number.');
});

test('missing token is rejected', () => {
  const result = validateSubmission({
    ...validSubmission,
    turnstileToken: ''
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.turnstileToken, 'Turnstile token is required.');
});

test('invalid membership type is rejected', () => {
  const result = validateSubmission({
    ...validSubmission,
    membershipType: 'Pilot'
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.membershipType, 'Select a valid membership type.');
});

test('unknown squadron is rejected', () => {
  const result = validateSubmission({
    ...validSubmission,
    squadron: 'CO-999'
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.squadron, 'Select a valid squadron.');
});
