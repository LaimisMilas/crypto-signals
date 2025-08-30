import { eTagOfJSON, handleConditionalReq } from '../../src/services/httpCache.js';

test('ETag changes with payload', () => {
  const a = eTagOfJSON({x:1});
  const b = eTagOfJSON({x:2});
  expect(a).not.toEqual(b);
});

test('handleConditionalReq true on matching ETag', () => {
  const etag = eTagOfJSON({a:1});
  const req = { headers: { 'if-none-match': etag } };
  const res = { };
  expect(handleConditionalReq(req, res, etag, Date.now())).toBe(true);
});
