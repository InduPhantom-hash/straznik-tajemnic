import { isSameOriginOrLoopback } from './origin-validator';

describe('isSameOriginOrLoopback', () => {
  const requestUrl = 'http://localhost:4050/api/desktop/update/start';

  it('accepts identical origin', () => {
    expect(isSameOriginOrLoopback('http://localhost:4050', requestUrl)).toBe(true);
  });

  it('accepts 127.0.0.1 when server normalized to localhost with identical port', () => {
    expect(isSameOriginOrLoopback('http://127.0.0.1:4050', requestUrl)).toBe(true);
  });

  it('accepts IPv6 loopback [::1] on identical port', () => {
    expect(isSameOriginOrLoopback('http://[::1]:4050', requestUrl)).toBe(true);
  });

  it('accepts localhost when target URL is 127.0.0.1', () => {
    expect(isSameOriginOrLoopback('http://localhost:4050', 'http://127.0.0.1:4050/api/desktop/cold-start')).toBe(true);
  });

  it('rejects port mismatch between loopback addresses', () => {
    expect(isSameOriginOrLoopback('http://127.0.0.1:4051', requestUrl)).toBe(false);
    expect(isSameOriginOrLoopback('http://localhost:3000', requestUrl)).toBe(false);
  });

  it('rejects external domains attempting CSRF on local server', () => {
    expect(isSameOriginOrLoopback('https://evil.com', requestUrl)).toBe(false);
    expect(isSameOriginOrLoopback('http://evil.com:4050', requestUrl)).toBe(false);
    expect(isSameOriginOrLoopback('http://attacker.local:4050', requestUrl)).toBe(false);
  });

  it('rejects protocol mismatch', () => {
    expect(isSameOriginOrLoopback('https://localhost:4050', requestUrl)).toBe(false);
  });

  it('rejects missing or empty origin headers', () => {
    expect(isSameOriginOrLoopback(null, requestUrl)).toBe(false);
    expect(isSameOriginOrLoopback(undefined, requestUrl)).toBe(false);
    expect(isSameOriginOrLoopback('', requestUrl)).toBe(false);
    expect(isSameOriginOrLoopback('not-a-valid-url', requestUrl)).toBe(false);
  });
});
