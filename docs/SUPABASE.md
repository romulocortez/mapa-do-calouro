# Banco de dados no Supabase: como criar e ligar

O banco fica num projeto do Supabase só dele. Você cria o projeto e guarda duas chaves nos "secrets" do GitHub. Daí em diante, o próprio GitHub aplica e atualiza o banco a cada mudança em `supabase/`, depois de rodar os testes das regras de acesso.

## O que fica protegido, e de quem
| Dado | Onde fica | Quem consegue ler |
|---|---|---|
| Localização ao vivo | Só passa pelo Realtime (presença); não é gravada | Alunos com conta, enquanto a pessoa está visível |
| E-mail @ufpi.edu.br | Sistema de login do Supabase | Só o dono do projeto (no painel). Não aparece para alunos |
| Apelido, papel, curso | Tabela `perfis` | Alunos com conta |
| Pedidos de ajuda | Tabela `pedidos` | Alunos com conta, enquanto o pedido está aberto |
| Conversas | Tabela `mensagens`, só texto cifrado | Só as duas pessoas da conversa (nem o dono do banco) |
| Denúncias | Tabela `denuncias`; o anexo vai cifrado para a coordenação | Coordenação |
| Contribuições e fotos | Tabela `contribuicoes` e Storage privado | Quem enviou e a coordenação |

Toda tabela tem regra de acesso (RLS). Sem login, nada é lido. Sem e-mail @ufpi.edu.br, sem aceitar o termo ou sendo menor de 18 anos, nada é gravado. Os testes em `tests/db/` tentam burlar cada regra e precisam falhar.

## Passo a passo

### 1. Criar o projeto
1. Entre em supabase.com e crie uma conta (pode ser com o GitHub).
2. Clique em **New project**.
   - **Name:** `mapa-do-calouro`.
   - **Database password:** clique em gerar e guarde num gerenciador de senhas. Ela vai para o GitHub no passo 3.
   - **Region:** **South America (São Paulo)**, para os dados ficarem no Brasil.
3. Espere o projeto ficar pronto (uns 2 minutos).

### 2. Pegar os três valores
- **Project ref:** em **Project Settings → General**, o código do projeto (algo como `abcdxyz…`).
- **URL e chave pública:** em **Project Settings → API**: a **Project URL** e a chave **anon / publishable**. Essas duas são públicas: pode me mandar, elas vão para o site.
- **Token de acesso:** no seu avatar → **Account → Access Tokens → Generate new token**, com o nome `github-mapa`.

Nunca mande a chave **service_role / secret** a ninguém, nem para o Claude. O site não usa essa chave.

### 3. Guardar no GitHub (celular ou computador)
No repositório, **Settings → Secrets and variables → Actions**:
- Aba **Secrets → New repository secret**:
  - `SUPABASE_ACCESS_TOKEN`: o token do passo 2.
  - `SUPABASE_DB_PASSWORD`: a senha do banco do passo 1.
- Aba **Variables → New repository variable**:
  - `SUPABASE_PROJECT_REF`: o Project ref.

Depois, em **Actions → Banco no Supabase → Run workflow**. Em uns 3 minutos o banco está criado, com as regras, a limpeza diária e a configuração do login (só código por e-mail, sem contas anônimas, gancho que recusa e-mail que não é @ufpi.edu.br).

### 4. Envio dos e-mails (obrigatório antes de abrir para alunos)
O e-mail padrão do Supabase manda poucos códigos por hora. Para uso real, ligue um serviço de e-mail em **Authentication → Emails → SMTP Settings**. Brevo e Resend têm planos gratuitos que bastam para um campus.

### 5. Conferir no painel
- **Authentication → Hooks:** "Before User Created" apontando para `hook_antes_de_criar_usuario`.
- **Realtime → Settings:** desligue "Allow public access" (só canais privados).
- **Advisors → Security Advisor:** deve estar sem alertas vermelhos.

### 6. Coordenação
Depois que você entrar uma vez pelo app com o seu e-mail @ufpi.edu.br, rode no **SQL Editor** (troque pelo seu e-mail):

```sql
insert into public.coordenacao (uid)
select id from auth.users where email = 'seu.email@ufpi.edu.br';
```

### 7. Ligar o site
Me mande a **Project URL** e a chave **anon / publishable**. Elas entram em `supabase_publico.json` e o login passa a aparecer na beta.

## Limpeza automática (LGPD)
Todo dia às 03h15, a função `privado.limpeza()`:
- apaga as mensagens com mais de 30 dias;
- apaga o texto dos pedidos encerrados há mais de 30 dias;
- encerra os pedidos abertos há mais de 7 dias;
- apaga as denúncias e as contribuições recusadas com mais de 180 dias.

## O que ainda falta (fase 2)
- Ligar presença, pedidos, conversas cifradas, contribuições e XP do app às tabelas.
- Gerar a chave da coordenação no seu aparelho, para abrir anexos de denúncias.
- Revisão do termo pelo encarregado de dados (DPO) da UFPI e um e-mail de contato no termo.
