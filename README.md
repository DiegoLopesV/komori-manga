# Komori

**Sua arte. Seu ritmo.** Um estúdio gratuito e open source para criar mangás que se revelam no ritmo do leitor.

Piloto: https://komori-manga.vercel.app

## O que está disponível

- Composição livre e modelos editáveis; quadros poligonais e curvas ajustáveis, com vértices arrastáveis.
- Importação de quadros ou páginas prontas com recortes por região. PNG, JPEG, WebP, GIF, MP4 e WebM.
- Texto, balões, onomatopeias, camadas, recorte, escala, posição e desfazer/refazer.
- Momentos ordenados de revelação/ocultação, transições, falas gravadas, SFX e música ambiente.
- Animações importadas em quadros ou páginas inteiras; loop e alternativa estática.
- Leitor por clique, setas e botões; áudio opcional, zoom, movimento reduzido e aviso adulto.
- Contas de autores, obras/capítulos, rascunhos privados e publicação do capítulo atual por link. Publicar um capítulo preserva os outros capítulos já publicados.
- Interface PT-BR/English e links externos de apoio/encomendas.

Não é uma ferramenta de desenho ou geração de animações. A arte e as gravações vêm do autor. O software usa GPL-3.0-only; as obras dos usuários continuam sendo deles. Os materiais procedurais de `public/demo` podem ser reutilizados sob CC0.

## Executar

Node.js 24 e npm. Clone o repositório e execute:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Sem Supabase, o estúdio funciona como demonstração local com rascunhos no IndexedDB. Com configuração, contas e publicação ficam disponíveis. Nunca coloque chave `service_role` ou `sb_secret_` em variáveis `VITE_`.

## Supabase e instalação própria

1. Crie um projeto Supabase e execute os arquivos SQL de `supabase/migrations` em ordem. Para um banco novo, `supabase db push` também pode aplicar as migrações depois de vincular o projeto. Nunca reaplique o SQL inicial em um banco que já o recebeu.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com a URL e chave publicável do **seu** projeto.
3. Configure em Auth a URL do site e as URLs de redirecionamento de desenvolvimento/produção. Confirmação de e-mail permanece habilitada.
4. Configure SMTP próprio antes de abrir cadastro público e recuperação de senha. O SMTP padrão do Supabase envia apenas para membros autorizados da organização. `VITE_PILOT_MODE=true` mostra essa limitação na tela de conta; não é um mecanismo de controle de acesso.
5. Hospede o frontend com `npm run build`; o resultado está em `dist/`. Qualquer hospedagem estática com fallback das rotas da aplicação serve. `vercel.json` fornece essa configuração para a Vercel.

O código não depende de credenciais do desenvolvedor original. O `supabase/config.toml` deste repositório registra o ambiente piloto; ajuste as URLs antes de enviar a configuração ao seu próprio projeto. RLS protege rascunhos; mídia só pode ser lida anonimamente quando consta na versão publicada. Uploads são imutáveis por caminho para preservar publicações. URLs assinadas duram uma hora; recarregue a obra após esse período.

Limite por arquivo: 25 MB, também aplicado no bucket. O editor aplica uma cota de 200 MB por obra; essa cota total é uma proteção na interface, não um limite de segurança no servidor. Monitorar uso total e implantar cotas por autor no servidor faz parte da preparação para operação pública. Arquivos fora de uso ficam retidos para não quebrar versões; limpeza automática ainda não existe.

## Testes

```sh
npm test                 # domínio, leitor React, histórico e políticas Postgres
npm run build            # TypeScript + bundle de produção
npx playwright install chromium
npm run test:e2e         # fluxos reais no navegador
```

Os testes de banco usam Postgres via PGlite e simulam `auth.uid()`/roles Supabase. Incluem leitura privada, autorização de escrita, isolamento da publicação e acesso aos arquivos. Isso não substitui a verificação no Supabase real.

`scripts/live-check.mjs` faz verificação opt-in com uma conta descartável: login, upload, publicação, leitura anônima e persistência. Requer `KOMORI_TEST_ADMIN_KEY` fornecida **apenas por variável de ambiente**, nunca em arquivo versionado. Não execute com essa chave em CI de contribuições externas. O teste remove exclusivamente suas fixtures ao terminar. `E2E_BASE_URL` permite verificar o deployment.

`scripts/generate-demo.mjs` regenera os pequenos arquivos WebM/WAV de teste sem usar serviços de IA.

## Revisão e próximos passos

Veja [plano de revisão](docs/REVIEW.md), [acordo do produto](docs/PRODUCT.md) e [verificação](docs/VERIFICATION.md). É uma primeira versão funcional para avaliação, não uma promessa de escala ou um editor de desenho completo.

Antes de divulgar para muitos autores: SMTP/login social, cotas no servidor, política de conteúdo e processo de denúncias, exclusão/exportação de obras e backup/restauração devem ser revisados. Aviso 18+ é uma declaração do leitor, não verificação documental de idade.

## Custos e licença

Sem anúncios ou comissão da plataforma nesta versão. Links externos vão diretamente ao serviço escolhido pelo autor. O piloto usa Vercel Hobby e Supabase Free; monitore as cotas dos provedores. O Hobby é destinado a uso pessoal não comercial; reavalie o plano/provedor antes da operação comercial ou monetização da plataforma.

Código: [GNU GPLv3](LICENSE). Fontes DM Sans e Manrope são distribuídas pelos pacotes Fontsource com suas respectivas licenças OFL. Os autores mantêm os direitos dos materiais que importarem.
