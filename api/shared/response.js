function json(status, body, headers = {}) {
  return {
    status,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    body: JSON.stringify(body)
  };
}

module.exports = {
  json
};
