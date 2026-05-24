#!/usr/bin/env node
// Minimal HTTP mock of the Markup-server API used by SP10 shell-script smoke tests.
// Listens on the port given by argv[2] (or assigns a random free port and prints it).
// Never persists state; all responses are canned. Exits on SIGTERM.

import { createServer } from 'node:http';

const port = Number(process.argv[2] || 0);

const ROUTES = {
  'GET /api/version':           () => ({ status: 200, body: { version: '0.2.7', api: 'v1' } }),
  'GET /api/health':            () => ({ status: 200, body: { ok: true } }),
  'POST /api/mockups':          (body, headers) => ({ status: 201, body: { id: 'm_test', slug: 'mock', url: 'https://mock/markup/m_test', version: 1 } }),
  'POST /api/ds/sync-index':    () => ({ status: 200, body: { indexed: 1 } }),
  'POST /api/ds/components':    () => ({ status: 201, body: { id: 'c_test', slug: 'mock' } }),
  'GET /api/mockups/m_test/comments': () => ({ status: 200, body: { comments: [] } }),
  'GET /api/comments/c_test':   () => ({ status: 200, body: { id: 'c_test', body: 'hi', status: 'open' } }),
  'POST /api/comments/c_test/replies':  () => ({ status: 201, body: { id: 'r_1' } }),
  'POST /api/comments/c_test/reactions': () => ({ status: 201, body: { id: 'rx_1' } }),
  'POST /api/comments/c_test/resolve':   () => ({ status: 200, body: { id: 'c_test', status: 'resolved' } }),
};

const server = createServer((req, res) => {
  const key = `${req.method} ${req.url.split('?')[0]}`;
  const route = ROUTES[key];
  if (!route) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'not found', key }));
    return;
  }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const out = route(body, req.headers);
    res.statusCode = out.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(out.body));
  });
});

server.listen(port, () => {
  const addr = server.address();
  process.stdout.write(`listening:${addr.port}\n`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT',  () => server.close(() => process.exit(0)));
