import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = {
  html: path.join(projectRoot, 'index.html'),
  data: path.join(projectRoot, 'src/data/dedecoAssistant.js'),
  script: path.join(projectRoot, 'src/scripts/dedecoChat.js'),
  hemocenters: path.join(projectRoot, 'src/data/hemocenters.js'),
  avatar: path.join(projectRoot, 'public/assets/dedeco-chibi.png'),
};

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const html = read(files.html);
const data = read(files.data);
const script = read(files.script);
const combined = `${html}\n${data}\n${script}`.toLowerCase();

assert(fs.existsSync(files.avatar), 'Avatar do Dedeco virtual não foi encontrado.');
assert(fs.existsSync(files.hemocenters), 'Diretório local de hemocentros não foi encontrado.');
assert(fs.statSync(files.avatar).size < 500_000, 'Avatar do chatbot precisa ter menos de 500 KB.');
assert(html.includes('Dedeco virtual'), 'O assistente precisa declarar que é virtual.');
assert(
  html.includes('Não substitui triagem, diagnóstico ou atendimento médico.'),
  'O limite de orientação médica precisa estar visível.',
);
assert(html.includes('não é armazenada'), 'O aviso de privacidade da conversa precisa estar visível.');
assert(data.includes('https://www.gov.br/saude/'), 'Fonte oficial do Ministério da Saúde ausente.');
assert(data.includes('https://redome.inca.gov.br/'), 'Fonte oficial do REDOME ausente.');
assert(script.includes('respondWithMedicalBoundary'), 'Barreira para dúvidas médicas personalizadas ausente.');
assert(script.includes('textContent'), 'Mensagens devem ser renderizadas como texto seguro.');
assert(!combined.includes('openai.com/v1'), 'O assistente não deve depender de geração livre por IA.');
assert(!combined.includes('innerhtml'), 'O assistente não deve inserir HTML arbitrário.');

const { HEMOCENTERS } = await import(pathToFileURL(files.hemocenters));
assert(HEMOCENTERS.length === 106, 'O diretório deve preservar os 106 hemocentros recebidos.');
assert(
  HEMOCENTERS.every((entry) => entry.uf && entry.name && entry.address && Array.isArray(entry.phones)),
  'Existem hemocentros sem os campos mínimos.',
);

console.log('Assistente Dedeco validado: 106 hemocentros, fontes, privacidade e barreira médica presentes.');
