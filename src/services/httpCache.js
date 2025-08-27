import crypto from 'crypto';

export function eTagOfJSON(obj) {
  const json = JSON.stringify(obj);
  const hash = crypto.createHash('sha1').update(json).digest('hex');
  return '"' + hash + '"';
}

export function applyCacheHeaders(res, { etag, lastModified, maxAge }) {
  if (etag) res.setHeader('ETag', etag);
  if (lastModified) res.setHeader('Last-Modified', new Date(lastModified).toUTCString());
  if (maxAge != null) {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  }
}

export function handleConditionalReq(req, _res, etag, lastModified) {
  const inm = req.headers['if-none-match'];
  if (inm && etag && inm === etag) return true;
  const ims = req.headers['if-modified-since'];
  if (ims) {
    const since = Date.parse(ims);
    if (!Number.isNaN(since) && lastModified && since >= lastModified) return true;
  }
  return false;
}

