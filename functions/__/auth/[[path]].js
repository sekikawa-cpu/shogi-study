// Firebase's supported same-origin auth proxy avoids third-party storage restrictions.
export async function onRequest({request}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/__/auth/')) return new Response('Not found', {status:404});
  if (!['GET','POST','HEAD'].includes(request.method)) return new Response('Method not allowed', {status:405});
  const upstream = new URL(url.pathname + url.search, 'https://ds-study-705f8.firebaseapp.com');
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');
  const response = await fetch(new Request(upstream, {
    method:request.method, headers,
    body:['GET','HEAD'].includes(request.method) ? undefined : request.body,
    redirect:'manual'
  }));
  const outputHeaders = new Headers(response.headers);
  outputHeaders.set('Cache-Control','no-store');
  const location = outputHeaders.get('Location');
  if (location?.startsWith('https://ds-study-705f8.firebaseapp.com/__/auth/')) {
    outputHeaders.set('Location', location.replace('https://ds-study-705f8.firebaseapp.com', url.origin));
  }
  return new Response(response.body, {status:response.status, headers:outputHeaders});
}
