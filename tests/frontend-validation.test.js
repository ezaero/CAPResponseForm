const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');

function loadApp({ document, windowProps = {} } = {}) {
  delete require.cache[require.resolve('../app')];
  global.window = { ...windowProps };
  if (document) {
    global.document = document;
  } else {
    delete global.document;
  }
  require('../app');
  return global.window.CAPResponseForm;
}

afterEach(() => {
  delete require.cache[require.resolve('../app')];
  delete global.document;
  delete global.FormData;
  delete global.fetch;
  delete global.window;
});

function createElement(tagName) {
  return {
    tagName,
    attributes: {},
    children: [],
    dataset: {},
    listeners: {},
    textContent: '',
    value: '',
    hidden: false,
    disabled: false,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    getAttribute(name) {
      return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null;
    },
    hasAttribute(name) {
      return Object.hasOwn(this.attributes, name);
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'id') {
        this.id = String(value);
      }
    },
    querySelector(selector) {
      if (selector === 'button[type="submit"]') {
        return this.submitButton || null;
      }
      return null;
    }
  };
}

function createDocumentMock({ formValues = {}, turnstileToken = 'token' } = {}) {
  const controls = {};
  const errors = {};

  [
    'firstName',
    'lastName',
    'email',
    'phone',
    'squadron',
    'membershipType',
    'parentName',
    'parentEmail',
    'parentPhone'
  ].forEach((name) => {
    controls[name] = createElement('input');
    controls[name].name = name;
    errors[name] = createElement('span');
    errors[name].dataset.errorFor = name;
  });

  const select = createElement('select');
  select.id = 'squadron';
  controls.squadron = select;
  const membershipType = createElement('select');
  membershipType.name = 'membershipType';
  membershipType.value = formValues.membershipType || '';
  controls.membershipType = membershipType;

  const form = createElement('form');
  form.id = 'interest-form';
  form.values = formValues;
  form.submitButton = createElement('button');
  form.reset = () => {
    form.didReset = true;
  };

  const status = createElement('div');
  status.id = 'form-status';
  const parentSection = createElement('section');
  parentSection.id = 'parent-section';
  const turnstileResponse = createElement('input');
  turnstileResponse.name = 'cf-turnstile-response';
  turnstileResponse.value = turnstileToken;
  const turnstileWidget = createElement('div');
  turnstileWidget.className = 'cf-turnstile';

  const document = {
    createdElements: [],
    addEventListener(type, handler) {
      this.listeners = this.listeners || {};
      this.listeners[type] = handler;
    },
    createElement(tagName) {
      const element = createElement(tagName);
      this.createdElements.push(element);
      return element;
    },
    querySelector(selector) {
      if (selector === '#squadron') return select;
      if (selector === '#parent-section') return parentSection;
      if (selector === '#form-status') return status;
      if (selector === '#interest-form') return form;
      if (selector === '.cf-turnstile') return turnstileWidget;
      if (selector === '[name="cf-turnstile-response"]') return turnstileResponse;
      const errorMatch = selector.match(/^\[data-error-for="(.+)"\]$/);
      if (errorMatch) return errors[errorMatch[1]] || null;

      const controlMatch = selector.match(/\[name="([^"]+)"\]/);
      if (controlMatch) return controls[controlMatch[1]] || null;

      const idMatch = selector.match(/#([A-Za-z0-9_-]+)/);
      if (idMatch) return controls[idMatch[1]] || null;

      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-error-for]') return Object.values(errors);
      if (selector === '[name="membershipType"]') return [membershipType];
      return [];
    }
  };

  return {
    controls,
    document,
    errors,
    form,
    parentSection,
    select,
    status,
    turnstileWidget
  };
}

function installFormDataMock() {
  global.FormData = class {
    constructor(form) {
      this.form = form;
    }

    entries() {
      return Object.entries(this.form.values || {});
    }
  };
}

function validAdultFormData(overrides = {}) {
  return {
    firstName: 'Adult',
    lastName: 'Visitor',
    email: 'adult@example.com',
    phone: '555-123-4567',
    squadron: 'CO-022',
    membershipType: 'Adult',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    ...overrides
  };
}

test('groups squadrons by group name', () => {
  const { groupSquadrons } = loadApp();
  const grouped = groupSquadrons([
    { code: 'CO-022', groupName: 'Group 1 - Northern Colorado' },
    { code: 'CO-072', groupName: 'Group 1 - Northern Colorado' },
    { code: 'CO-015', groupName: 'Group 2 - Western Slope' }
  ]);
  assert.deepEqual(Object.keys(grouped), ['Group 1 - Northern Colorado', 'Group 2 - Western Slope']);
  assert.deepEqual(grouped['Group 1 - Northern Colorado'].map((squadron) => squadron.code), ['CO-022', 'CO-072']);
});

test('requires core fields', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData({});
  assert.match(errors.firstName, /required/i);
  assert.match(errors.lastName, /required/i);
  assert.match(errors.email, /required/i);
  assert.match(errors.phone, /required/i);
  assert.match(errors.squadron, /select/i);
  assert.match(errors.membershipType, /select/i);
  assert.equal(errors.isUnder18, undefined);
});

test('rejects invalid applicant email', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData(validAdultFormData({ email: 'not-an-email' }));
  assert.match(errors.email, /valid email/i);
});

test('rejects invalid applicant phone', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData(validAdultFormData({ phone: 'call me later' }));
  assert.match(errors.phone, /valid phone/i);
});

test('accepts common applicant phone formats', () => {
  const { validateFormData } = loadApp();

  for (const phone of ['5551234567', '555-123-4567', '(555) 123-4567', '+1 555 123 4567']) {
    const errors = validateFormData(validAdultFormData({ phone }));
    assert.equal(errors.phone, undefined, `${phone} should be valid`);
  }
});

test('rejects invalid membership type', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData(validAdultFormData({ membershipType: 'Friend' }));
  assert.match(errors.membershipType, /select/i);
});

test('trims whitespace before validation', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData(validAdultFormData({
    firstName: '  Adult  ',
    lastName: '  Visitor  ',
    email: '  adult@example.com  ',
    phone: '  555-123-4567  ',
    squadron: '  CO-022  ',
    membershipType: '  Adult  '
  }));
  assert.deepEqual(errors, {});
});

test('requires parent fields for cadet visitors', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData({
    firstName: 'Cadet',
    lastName: 'Visitor',
    email: 'cadet@example.com',
    phone: '555-123-4567',
    squadron: 'CO-022',
    membershipType: 'Cadet',
    parentName: '',
    parentEmail: '',
    parentPhone: ''
  });
  assert.match(errors.parentName, /required/i);
  assert.match(errors.parentEmail, /required/i);
  assert.match(errors.parentPhone, /required/i);
});

test('rejects invalid parent email for cadet visitors', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData({
    ...validAdultFormData({
      firstName: 'Cadet',
      email: 'cadet@example.com',
      membershipType: 'Cadet',
      parentName: 'Parent Visitor',
      parentEmail: 'not-an-email',
      parentPhone: '555-987-6543'
    })
  });
  assert.match(errors.parentEmail, /valid parent/i);
});

test('rejects invalid parent phone for cadet visitors', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData({
    ...validAdultFormData({
      firstName: 'Cadet',
      email: 'cadet@example.com',
      membershipType: 'Cadet',
      parentName: 'Parent Visitor',
      parentEmail: 'parent@example.com',
      parentPhone: '12345'
    })
  });
  assert.match(errors.parentPhone, /valid parent/i);
});

test('accepts adult visitor without parent fields', () => {
  const { validateFormData } = loadApp();
  const errors = validateFormData(validAdultFormData());
  assert.deepEqual(errors, {});
});

test('shows parent fields only for cadet membership type', () => {
  const mock = createDocumentMock({ formValues: validAdultFormData() });
  const { initialize } = loadApp({ document: mock.document });

  initialize();
  assert.equal(mock.parentSection.hidden, true);

  mock.controls.membershipType.value = 'Cadet';
  mock.controls.membershipType.listeners.change();
  assert.equal(mock.parentSection.hidden, false);

  mock.controls.membershipType.value = 'Adult';
  mock.controls.membershipType.listeners.change();
  assert.equal(mock.parentSection.hidden, true);
});

test('initialize renders Turnstile from public config and does not duplicate squadron groups', () => {
  const mock = createDocumentMock();
  const renderCalls = [];
  const { initialize } = loadApp({
    document: mock.document,
    windowProps: {
      CAP_RESPONSE_FORM_CONFIG: { turnstileSiteKey: 'configured-site-key' },
      CAP_SQUADRONS: [
        { code: 'CO-022', squadronName: 'Vance Brand Cadet Squadron', city: 'Longmont', groupName: 'Group 1' },
        { code: 'CO-072', squadronName: 'Boulder Composite Squadron', city: 'Boulder', groupName: 'Group 1' }
      ],
      turnstile: {
        render: (element, options) => {
          renderCalls.push({ element, options });
          return 'widget-123';
        }
      }
    }
  });

  initialize();
  initialize();

  assert.equal(renderCalls.length, 1);
  assert.equal(renderCalls[0].element, mock.turnstileWidget);
  assert.deepEqual(renderCalls[0].options, {
    sitekey: 'configured-site-key',
    size: 'compact'
  });
  assert.equal(mock.turnstileWidget.getAttribute('data-sitekey'), null);
  assert.equal(mock.select.children.length, 1);
  assert.equal(mock.select.children[0].children.length, 2);
});

test('submit resets rendered Turnstile widget id after non-OK API response', async () => {
  installFormDataMock();
  const mock = createDocumentMock({ formValues: validAdultFormData() });
  const resetCalls = [];
  const { initialize } = loadApp({
    document: mock.document,
    windowProps: {
      CAP_RESPONSE_FORM_CONFIG: { turnstileSiteKey: 'configured-site-key' },
      turnstile: {
        render: () => 'widget-456',
        reset: (widgetId) => resetCalls.push(widgetId)
      }
    }
  });
  global.fetch = async () => ({
    ok: false,
    json: async () => ({ message: 'Invalid token' })
  });

  initialize();
  await mock.form.listeners.submit({
    preventDefault() {},
    currentTarget: mock.form
  });

  assert.deepEqual(resetCalls, ['widget-456']);
});

test('submit marks invalid fields as accessible and clears them after valid submit', async () => {
  installFormDataMock();
  const mock = createDocumentMock({ formValues: {} });
  const { initialize } = loadApp({ document: mock.document });
  initialize();

  await mock.form.listeners.submit({
    preventDefault() {},
    currentTarget: mock.form
  });

  assert.equal(mock.controls.firstName.getAttribute('aria-invalid'), 'true');
  assert.equal(mock.errors.firstName.id, 'firstName-error');
  assert.equal(mock.controls.firstName.getAttribute('aria-describedby'), 'firstName-error');

  mock.form.values = validAdultFormData();
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      squadronName: 'Vance Brand Cadet Squadron',
      recruitingEmail: 'co-022-recruiting@cowg.cap.gov'
    })
  });

  await mock.form.listeners.submit({
    preventDefault() {},
    currentTarget: mock.form
  });

  assert.equal(mock.controls.firstName.hasAttribute('aria-invalid'), false);
  assert.equal(mock.controls.firstName.hasAttribute('aria-describedby'), false);
  assert.equal(mock.status.textContent, 'Your request was sent to the Vance Brand Cadet Squadron.');
});

test('submit resets Turnstile after non-OK API response', async () => {
  installFormDataMock();
  const mock = createDocumentMock({ formValues: validAdultFormData() });
  let resetCount = 0;
  const { initialize } = loadApp({
    document: mock.document,
    windowProps: { turnstile: { reset: () => resetCount += 1 } }
  });
  global.fetch = async () => ({
    ok: false,
    json: async () => ({ message: 'Invalid token' })
  });

  initialize();
  await mock.form.listeners.submit({
    preventDefault() {},
    currentTarget: mock.form
  });

  assert.equal(resetCount, 1);
});

test('submit resets Turnstile after fetch error', async () => {
  installFormDataMock();
  const mock = createDocumentMock({ formValues: validAdultFormData() });
  let resetCount = 0;
  const { initialize } = loadApp({
    document: mock.document,
    windowProps: { turnstile: { reset: () => resetCount += 1 } }
  });
  global.fetch = async () => {
    throw new Error('network unavailable');
  };

  initialize();
  await mock.form.listeners.submit({
    preventDefault() {},
    currentTarget: mock.form
  });

  assert.equal(resetCount, 1);
});
