(function () {
  let turnstileWidgetId = null;
  let turnstileRenderedElement = null;

  const membershipTypes = new Set([
    'Cadet',
    'Adult',
    'Cadet Sponsor',
    'Patron',
    'Aerospace Education'
  ]);

  function clean(value) {
    return typeof value === 'string' ? value.trim() : value;
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

  function groupSquadrons(squadrons) {
    return squadrons.reduce((groups, squadron) => {
      if (!groups[squadron.groupName]) {
        groups[squadron.groupName] = [];
      }
      groups[squadron.groupName].push(squadron);
      return groups;
    }, {});
  }

  function validateFormData(data) {
    const errors = {};
    const input = data || {};
    const firstName = clean(input.firstName);
    const lastName = clean(input.lastName);
    const email = clean(input.email);
    const phone = clean(input.phone);
    const squadron = clean(input.squadron);
    const membershipType = clean(input.membershipType);
    const parentName = clean(input.parentName);
    const parentEmail = clean(input.parentEmail);
    const parentPhone = clean(input.parentPhone);

    if (!firstName) errors.firstName = 'First name is required.';
    if (!lastName) errors.lastName = 'Last name is required.';
    if (!email) errors.email = 'Email address is required.';
    if (email && !isEmail(email)) errors.email = 'Enter a valid email address.';
    if (!phone) errors.phone = 'Phone number is required.';
    if (phone && !isPhone(phone)) errors.phone = 'Enter a valid phone number.';
    if (!squadron) errors.squadron = 'Select a squadron.';
    if (!membershipTypes.has(membershipType)) errors.membershipType = 'Select a membership type.';

    if (membershipType === 'Cadet') {
      if (!parentName) errors.parentName = 'Parent or guardian name is required.';
      if (!parentEmail) errors.parentEmail = 'Parent or guardian email is required.';
      if (parentEmail && !isEmail(parentEmail)) errors.parentEmail = 'Enter a valid parent or guardian email.';
      if (!parentPhone) errors.parentPhone = 'Parent or guardian phone is required.';
      if (parentPhone && !isPhone(parentPhone)) errors.parentPhone = 'Enter a valid parent or guardian phone number.';
    }

    return errors;
  }

  function formToObject(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function getErrorId(name) {
    return `${name.replace(/[^A-Za-z0-9_-]/g, '-')}-error`;
  }

  function getFieldControls(name) {
    const controls = document.querySelectorAll ? Array.from(document.querySelectorAll(`[name="${name}"]`)) : [];
    const control = document.querySelector(`[name="${name}"], #${name}`);
    if (control && !controls.includes(control)) {
      controls.push(control);
    }
    return controls;
  }

  function addDescribedBy(control, errorId) {
    const existing = control.getAttribute('aria-describedby') || '';
    const ids = existing.split(/\s+/).filter(Boolean);
    if (!ids.includes(errorId)) {
      ids.push(errorId);
    }
    control.setAttribute('aria-describedby', ids.join(' '));
  }

  function removeDescribedBy(control, errorId) {
    const ids = (control.getAttribute('aria-describedby') || '')
      .split(/\s+/)
      .filter((id) => id && id !== errorId);
    if (ids.length > 0) {
      control.setAttribute('aria-describedby', ids.join(' '));
    } else {
      control.removeAttribute('aria-describedby');
    }
  }

  function updateFieldAccessibility(name, errorElement, message) {
    const controls = getFieldControls(name);
    if (controls.length === 0) return;

    const errorId = errorElement.id || getErrorId(name);
    if (!errorElement.id) {
      errorElement.id = errorId;
    }

    controls.forEach((control) => {
      if (message) {
        control.setAttribute('aria-invalid', 'true');
        addDescribedBy(control, errorId);
      } else {
        control.removeAttribute('aria-invalid');
        removeDescribedBy(control, errorId);
      }
    });
  }

  function setError(name, message) {
    const element = document.querySelector(`[data-error-for="${name}"]`);
    if (element) {
      if (!element.id) {
        element.id = getErrorId(name);
      }
      element.textContent = message || '';
      updateFieldAccessibility(name, element, message);
    }
  }

  function renderErrors(errors) {
    document.querySelectorAll('[data-error-for]').forEach((element) => {
      const name = element.dataset.errorFor || element.getAttribute('data-error-for');
      element.textContent = '';
      if (name) {
        setError(name, errors[name] || '');
      }
    });
  }

  function setStatus(message, type) {
    const status = document.querySelector('#form-status');
    if (!status) return;
    status.textContent = message || '';
    status.dataset.type = type || '';
  }

  function populateSquadrons() {
    const select = document.querySelector('#squadron');
    if (!select || !window.CAP_SQUADRONS) return;

    Array.from(select.querySelectorAll ? select.querySelectorAll('optgroup[data-cap-squadron-group]') : select.children)
      .filter((element) => !element.dataset || element.dataset.capSquadronGroup)
      .forEach((element) => element.remove());

    const groups = groupSquadrons(window.CAP_SQUADRONS);
    Object.entries(groups).forEach(([groupName, squadrons]) => {
      const group = document.createElement('optgroup');
      group.label = groupName;
      group.dataset.capSquadronGroup = 'true';
      squadrons.forEach((squadron) => {
        const option = document.createElement('option');
        option.value = squadron.code;
        option.textContent = `${squadron.squadronName} - ${squadron.city} (${squadron.code})`;
        group.appendChild(option);
      });
      select.appendChild(group);
    });
  }

  function renderTurnstile() {
    const turnstileElement = document.querySelector('.cf-turnstile');
    const siteKey = window.CAP_RESPONSE_FORM_CONFIG?.turnstileSiteKey;
    const canRender = window.turnstile && typeof window.turnstile.render === 'function';

    if (!turnstileElement || !siteKey || !canRender) {
      return null;
    }

    if (turnstileWidgetId != null && turnstileRenderedElement === turnstileElement) {
      return turnstileWidgetId;
    }

    turnstileWidgetId = window.turnstile.render(turnstileElement, {
      sitekey: siteKey,
      size: turnstileElement.dataset.size || 'compact'
    });
    turnstileRenderedElement = turnstileElement;
    return turnstileWidgetId;
  }

  function toggleParentFields() {
    const selected = document.querySelector('[name="membershipType"]')?.value;
    const parentSection = document.querySelector('#parent-section');
    if (!parentSection) return;
    parentSection.hidden = selected !== 'Cadet';
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    const data = formToObject(form);
    const errors = validateFormData(data);

    renderErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStatus('Please check the highlighted fields.', 'error');
      return;
    }

    const turnstileToken = document.querySelector('[name="cf-turnstile-response"]')?.value || '';
    if (!turnstileToken) {
      setStatus('Please complete the security check.', 'error');
      return;
    }

    if (button) {
      button.disabled = true;
    }
    setStatus('Sending your request...', 'pending');

    try {
      const response = await fetch('/api/submit-interest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...data, turnstileToken })
      });
      const result = await response.json();

      if (!response.ok) {
        renderErrors(result.errors || {});
        setStatus(result.message || 'Please try again.', 'error');
        resetTurnstile();
        return;
      }

      form.reset();
      renderErrors({});
      toggleParentFields();
      setStatus(`Your request was sent to the ${result.squadronName}.`, 'success');
      if (window.turnstile) {
        resetTurnstile();
      }
    } catch (error) {
      setStatus('We could not send your request. Please try again.', 'error');
      resetTurnstile();
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  function resetTurnstile() {
    if (window.turnstile && typeof window.turnstile.reset === 'function') {
      if (turnstileWidgetId != null) {
        window.turnstile.reset(turnstileWidgetId);
      } else {
        window.turnstile.reset();
      }
    }
  }

  function initialize() {
    renderTurnstile();
    populateSquadrons();
    toggleParentFields();

    document.querySelectorAll('[name="membershipType"]').forEach((input) => {
      input.addEventListener('change', toggleParentFields);
    });

    const form = document.querySelector('#interest-form');
    if (form) {
      form.addEventListener('submit', submitForm);
    }
  }

  window.CAPResponseForm = {
    groupSquadrons,
    initialize,
    renderTurnstile,
    validateFormData
  };

  window.CAPResponseFormTurnstileLoaded = renderTurnstile;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', initialize);
  }
})();
