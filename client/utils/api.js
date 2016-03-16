import 'whatwg-fetch';



export function request({ url, data, params = {} }) {
  try {
    const response = fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: data ? ((data instanceof FormData) ? data : JSON.stringify(data)) : undefined,
      ...params
    })
    const contentType = response.headers.get('content-type');

    if (response.status < 200 || response.status >= 400) {
      const error = Error('API Error');
      error.response = response;
      throw error;
    }

    if (response.status === 200 && contentType.indexOf('application/json') !== -1) {
      return response.json();
    }
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
    throw  err;
  }
}

export function get(url) {
  console.log(' a get request is astorming!! ', url);
  return request({ url });
}

export function post(url, data) {
  return request({ url, data, params: { method: 'post' } });
}

export function del(url) {
  return request({ url, params: { method: 'delete' } });
}