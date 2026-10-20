# Regras do projeto Mapa do Calouro (para qualquer agente de IA que trabalhar aqui)

O Mapa do Calouro é usado por estudantes da UFPI, inclusive calouros com menos de 18 anos.
Ele lida com dados de outras pessoas (nome, curso, posição, conversas, fotos). Por isso:

## Antes de programar
1. Escreva um plano curto do que vai mudar e espere aprovação.
2. Pedido vago ("balanceia isso", "deixa seguro") não vira código: pergunte o que exatamente se quer.
3. As regras do jogo são decididas pelo coordenador do projeto. Não mude valores de XP, limites ou títulos por conta própria.

## Testes (obrigatório)
4. Toda regra nova do jogo ganha um teste em `tests/unit/` antes de ir para o ar.
5. Todo bug corrigido ganha antes um **teste de regressão** que reproduz o bug e falha; só então corrija.
6. Rode `npm test` antes de entregar. Nada vai para a branch principal com teste falhando.
7. As regras de pontuação e de privacidade ficam no bloco `/* <regras-xp> ... </regras-xp> */` do `index.html`, sem depender do resto da página. Os testes leem esse bloco direto.

## Dados pessoais e segurança (LGPD)
8. **Não colete o que não precisa.** Nada de telefone, CPF, matrícula, endereço ou foto de perfil.
9. **Localização ao vivo nunca vai para o banco.** Só passa pela conexão em tempo real e some quando a pessoa sai.
10. Dado guardado que identifica alguém (ex.: e-mail do login) fica **criptografado** no banco.
11. Conversas que as pessoas acham privadas: avisar que não são privadas, apagar depois do prazo (30 dias) e criptografar no banco.
12. Toda tabela tem regra de acesso (RLS no Supabase). Cada pessoa lê só o que é dela; a coordenação lê denúncias e relatos.
13. **XP é calculado no servidor ou a partir de dados que o celular não consegue forjar.** Nunca aceitar "eu ganhei X pontos" vindo do aparelho.
14. **Nunca** coloque chave secreta (ex.: `service_role` do Supabase) no repositório, no chat ou no `index.html`. Use os "secrets" do GitHub/Supabase.
15. Dados de teste são sempre inventados. Nunca use nome, e-mail ou telefone de pessoa real nos testes.
16. A IA não deixa o sistema seguro sozinha: a cada entrega, preencha o `docs/CHECKLIST-SEGURANCA-LGPD.md`.

## Entrega
17. Commits pequenos, com descrição clara do que mudou.
18. Mudança grande vai primeiro para o ambiente de teste (beta) com um grupo pequeno, depois para todos.
