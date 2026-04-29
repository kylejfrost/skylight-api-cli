import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverEndpoints } from '../src/discover.js';

test('discovers apisauce endpoints', () => {
  const src = "x.apisauce.get(`frames/${s}/lists`); x.apisauce.post('user/export'); x.apisauce.delete(\"frames/${s}/messages/${n}\")";
  const rows = discoverEndpoints(src);
  assert.deepEqual(rows.map((r) => `${r.method} ${r.endpoint}`), [
    'GET frames/${s}/lists',
    'DELETE frames/${s}/messages/${n}',
    'POST user/export',
  ]);
});
