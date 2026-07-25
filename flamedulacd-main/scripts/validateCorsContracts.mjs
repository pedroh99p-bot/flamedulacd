import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(projectRoot, '..');
const officialOrigins = [
  'https://flamedula.org.br',
  'https://www.flamedula.org.br',
];

const files = {
  publicCors: path.join(projectRoot, 'supabase/functions/_shared/cors.ts'),
  adminCors: path.join(repositoryRoot, 'admflamedula-main/supabase/functions/_shared/cors.ts'),
  contract: path.join(projectRoot, 'docs/public-intake-contract.md'),
};

const adminFunctions = [
  'generate-cloudinary-signature',
  'resolve-youtube-metadata',
  'record-operational-event',
];

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const publicCors = read(files.publicCors);
const adminCors = read(files.adminCors);
const contract = read(files.contract);

for (const origin of officialOrigins) {
  assert(publicCors.includes(origin), `CORS público não permite ${origin}`);
  assert(adminCors.includes(origin), `CORS administrativo não permite ${origin}`);
  assert(contract.includes(origin), `Contrato público não documenta ${origin}`);
}

assert(adminCors.includes('handleCorsPreflight'), 'Helper CORS administrativo não trata preflight.');
assert(adminCors.includes('ORIGIN_NOT_ALLOWED'), 'Helper CORS administrativo não recusa origem desconhecida.');

for (const functionName of adminFunctions) {
  const functionPath = path.join(
    repositoryRoot,
    'admflamedula-main/supabase/functions',
    functionName,
    'index.ts',
  );
  const source = read(functionPath);
  assert(source.includes("../_shared/cors.ts"), `${functionName} não usa o helper CORS compartilhado.`);
  assert(!source.includes('configuredOrigins[0]'), `${functionName} ainda contém fallback inseguro de origem.`);
}

console.log('Contratos CORS validados para o domínio oficial e funções administrativas.');
