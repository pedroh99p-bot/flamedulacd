# FlaMedula Landing

Landing page da FlaMedula estruturada em Vite vanilla, com HTML, CSS e JavaScript separados para facilitar manutencao e deploy na Vercel.

## Comandos

```bash
npm install
npm run dev
npm run build
```

## Desenvolvimento

A entrada principal do projeto e `index.html`, com estilos e scripts carregados
por `src/main.js`. O prototipo HTML monolitico foi removido desta versao para
evitar codigo duplicado e inseguro; os ZIPs originais continuam preservados fora
do repositorio e seus hashes estao no README da raiz.

## Deploy na Vercel

1. Suba este projeto para um repositorio no GitHub.
2. Importe o repositorio na Vercel.
3. Use `npm run build` como comando de build.
4. Use `dist` como diretorio de saida.

Configure no ambiente de preview/producao:

```text
VITE_SUPABASE_PROJECT_REF=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```
