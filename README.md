# BID FBFV — Federação Brasileira de Futebol Virtual

Sistema web para consulta pública do Boletim Informativo Diário (BID) de transferências, clubes e atletas, com área administrativa integrada ao **Supabase** e pronta para deploy na **Vercel**.

## Estrutura do Repositório

- `index.html`: Interface principal de consulta pública (busca por atleta, clube ou tipo de movimentação) + modal de login administrativo.
- `admin.html`: Painel administrativo para cadastrar clubes, atletas e registrar/atualizar transferências no BID.
- `js/config.js`: Carrega as configurações do Supabase via variáveis/meta/global e inicializa o cliente.
- `js/public-bid.js`: Lógica de listagem, filtros e busca em tempo real no BID (com fallback demonstrativo caso o Supabase ainda não esteja configurado).
- `js/admin.js`: Autenticação com Supabase Auth e operações CRUD em `clubs`, `players` e `transfers`.
- `css/styles.css`: Estilo escuro/esportivo moderno e responsivo.
- `supabase/schema.sql`: Script SQL para criar as tabelas (`clubs`, `players`, `transfers`, `profiles`) e políticas de **Row Level Security (RLS)**.
- `vercel.json`: Configuração de rotas e headers para deploy estático na Vercel.
- `.env.example`: Exemplo das variáveis necessárias.

## Como usar

1. Crie um projeto no **Supabase** e execute o conteúdo de `supabase/schema.sql` no **SQL Editor**.
2. Crie um usuário administrador em **Authentication > Users** no Supabase e defina `role = 'admin'` na tabela `profiles` para o `id` desse usuário.
3. Envie este repositório para o **GitHub** e importe na **Vercel**.
4. Na Vercel, configure as variáveis de ambiente (ou ajuste `js/config.js` / injeção de build):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
