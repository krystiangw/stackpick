import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { proxy } from '../src/proxy'

function request(host: string, protocol: string, path = '/audit/froala-editors?source=test%20link', method = 'GET') {
  return new NextRequest(`http://${host}${path}`, {
    method,
    headers: { host, 'x-forwarded-proto': protocol },
  })
}

for (const [host, protocol] of [
  ['letagentsin.com', 'http'], ['www.letagentsin.com', 'http'], ['www.letagentsin.com', 'https'],
]) {
  for (const method of ['GET', 'HEAD']) {
    const response = proxy(request(host, protocol, undefined, method))
    assert.equal(response.status, 308)
    assert.equal(response.headers.get('location'), 'https://letagentsin.com/audit/froala-editors?source=test%20link')
  }
}

// The internal URL is HTTP behind Heroku even for an external HTTPS request.
for (const input of [
  request('letagentsin.com', 'https'),
  request('localhost:3012', 'http'),
  request('stackpick.herokuapp.com', 'https'),
  request('www.letagentsin.com', 'http', '/api/corpus'),
  request('www.letagentsin.com', 'http', '/api'),
  request('www.letagentsin.com', 'http', '/pricing', 'POST'),
]) {
  assert.equal(proxy(input).headers.get('location'), null)
  assert.equal(proxy(input).headers.get('x-middleware-next'), '1')
}

const previous = process.env.STACKPICK_CONSOLE_TOKEN
try {
  delete process.env.STACKPICK_CONSOLE_TOKEN
  assert.equal(proxy(request('letagentsin.com', 'https', '/')).status, 200)
  assert.equal(proxy(request('letagentsin.com', 'https', '/app')).status, 503)
  process.env.STACKPICK_CONSOLE_TOKEN = 'seo-test-only'
  assert.equal(proxy(request('letagentsin.com', 'https', '/app')).status, 404)
  assert.equal(proxy(request('letagentsin.com', 'https', '/app/child')).status, 404)
  const authorised = request('letagentsin.com', 'https', '/app')
  authorised.cookies.set('stackpick_console', 'seo-test-only')
  assert.equal(proxy(authorised).headers.get('x-middleware-next'), '1')
} finally {
  if (previous === undefined) delete process.env.STACKPICK_CONSOLE_TOKEN
  else process.env.STACKPICK_CONSOLE_TOKEN = previous
}

console.log('SEO routing: redirects, proxy protocol, preview/API boundaries and console access passed')
