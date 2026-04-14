#!/usr/bin/env node
/**
 * Ingest fixtures/namu-enterprise-knowledge-base.md into RAG, then run a sample query.
 *
 * Usage:
 *   RAG_BASE=http://192.168.0.34:8081 node scripts/rag-ingest-and-test.mjs
 *   npm run rag:test-kb
 *
 * RAG_BASE defaults to VITE_RAG_BASE from .env in the project root, else http://127.0.0.1:8081
 *
 * If ingest via main-server (:8081) fails, the script tries a tiny POST to ragServer (:8082) on the
 * same host (override with RAGSERVER_DIRECT=http://host:8082) to see whether the failure is in
 * main-server vs Chroma/Ollama on ragServer.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const FIXTURE = path.join(root, 'fixtures', 'namu-enterprise-knowledge-base.md');

function readRagBaseFromEnvFile() {
  try {
    const envPath = path.join(root, '.env');
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*VITE_RAG_BASE\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, '').trim();
    }
  } catch {
    /* no .env */
  }
  return null;
}

const RAG_BASE = (process.env.RAG_BASE || readRagBaseFromEnvFile() || 'http://127.0.0.1:8081').replace(
  /\/$/,
  '',
);

/** When main-server is on :8081, ragServer is often :8082 on the same host. */
function guessRagDirectUrl(mainBase) {
  try {
    const u = new URL(mainBase);
    if (u.port === '8081') {
      u.port = '8082';
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function probeRagIngest(base, label) {
  const url = `${base.replace(/\/$/, '')}/rag/ingest`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'probe', metadata: { probe: true } }),
  });
  const body = await res.text();
  console.log(`\n[probe ${label}] POST ${url}`);
  console.log(`  status: ${res.status} ${res.statusText}`);
  console.log(`  body: ${body.slice(0, 400)}${body.length > 400 ? '…' : ''}`);
  return res.ok;
}

function printTroubleshoot() {
  console.log(`
--- troubleshoot ---
1) Rebuild & restart main-server after the ragServerClient WebClient fix (see Local-Agent-Servers/main-server).
2) On the main-server host, set if needed: RAGSERVER_BASE_URL=http://<rag-host>:8082
   (application.yml: ragserver.base-url)
3) ragServer: Chroma listening (:8000), Ollama running with nomic-embed-text.
4) main-server logs: look for "[RAG] ingest forward failed" and the printed ragserver.base-url.
`);
}

async function main() {
  const text = fs.readFileSync(FIXTURE, 'utf8');
  const ingestUrl = `${RAG_BASE}/rag/ingest`;
  const queryUrl = (q) => `${RAG_BASE}/rag/query?q=${encodeURIComponent(q)}`;

  console.log('RAG_BASE:', RAG_BASE);
  const directGuess =
    process.env.RAGSERVER_DIRECT?.replace(/\/$/, '') || guessRagDirectUrl(RAG_BASE);

  console.log('\n[1] Small payload via main-server (proves proxy + ragServer URL in main-server)');
  const smallMainOk = await probeRagIngest(RAG_BASE, 'main-server small');
  if (!smallMainOk) {
    printTroubleshoot();
    console.log(
      '\n→ Small ingest via main-server failed. Rebuild/restart main-server with ragServerClient bean; set RAGSERVER_BASE_URL if rag is not on localhost:8082 from main.',
    );
    if (directGuess) await probeRagIngest(directGuess, 'ragServer direct (small)');
    process.exitCode = 1;
    return;
  }

  console.log('\n[2] Full fixture document via main-server');
  console.log('POST', ingestUrl);

  const ingestRes = await fetch(ingestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      metadata: {
        source: 'namu-enterprise-kb',
        title: '나무 엔터프라이즈 Knowledge Base (1~7)',
        category: 'company',
      },
    }),
  });

  const ingestBody = await ingestRes.text();
  console.log('ingest status:', ingestRes.status, ingestRes.statusText);
  console.log('ingest body:', ingestBody.slice(0, 500) + (ingestBody.length > 500 ? '…' : ''));

  if (!ingestRes.ok) {
    printTroubleshoot();
    console.log(
      '\n→ Small ingest worked but full document failed. Often: increase spring.codec + rag WebClient buffer (see main-server LlmAdapterConfig) and redeploy.',
    );
    if (directGuess) {
      console.log('\n[3] Same full body direct to ragServer (bypass main-server)');
      const u = `${directGuess}/rag/ingest`;
      const r = await fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          metadata: {
            source: 'namu-enterprise-kb',
            title: '나무 엔터프라이즈 Knowledge Base (1~7)',
            category: 'company',
          },
        }),
      });
      const b = await r.text();
      console.log(`POST ${u}\n  status: ${r.status}\n  body: ${b.slice(0, 500)}`);
    }
    process.exitCode = 1;
    return;
  }

  const testQueries = [
    '(주)나무 대표이사는 누구인가요?',
    '회사 설립일은 언제인가요?',
    'RAG의 특징은 무엇인가요?',
  ];

  for (const q of testQueries) {
    const u = queryUrl(q);
    console.log('\nGET', u);
    const qr = await fetch(u);
    const qb = await qr.text();
    console.log('query status:', qr.status, qr.statusText);
    try {
      const j = JSON.parse(qb);
      console.log('query JSON:', JSON.stringify(j, null, 2).slice(0, 2000));
    } catch {
      console.log('query body:', qb.slice(0, 1500));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
