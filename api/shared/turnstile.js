async function verifyTurnstile(token, remoteIp, env = process.env, fetchImpl = fetch) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error('TURNSTILE_SECRET_KEY is not configured.');
  }

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  if (remoteIp) {
    params.set('remoteip', remoteIp);
  }

  const response = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Turnstile verification failed with HTTP ${response.status}.`);
  }

  const result = await response.json();
  return Boolean(result.success);
}

module.exports = {
  verifyTurnstile
};
