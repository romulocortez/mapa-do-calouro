# Checklist de segurança e LGPD — preencher a cada versão

Não sou advogado: para dúvidas jurídicas, consultar o encarregado de dados (DPO) da UFPI.

| # | Pergunta | V27 (19/10/2026) | V28 beta (20/10/2026) | V29 beta (20/10/2026) | V30 beta (20/10/2026) | V31 beta (20/10/2026) | V32 beta (20/10/2026) | V33 beta (20/10/2026) | V34 beta (20/10/2026) | V35 beta (21/10/2026) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | A versão cria algum dado pessoal novo? Qual, e ele é mesmo necessário? | Não cria. Conversas da aba Ajuda agora expiram. | Não. Só muda o desenho do mapa (fundo em canvas). | Não. Fonte, pergaminho, zoom e aba Contribua. | Não. Tamanho do ID, contraste e salas do Anexo CCE/CCHL. | Nome do coordenador no exemplo, a pedido e com consentimento dele (adulto, figura pública do curso). Nenhum outro dado. | Não. Só a escolha "música ligada/desligada", guardada no próprio aparelho. | Não. O professor do easter egg passa a aparecer sempre, a pedido dele. | Não. Só a escolha do campus, guardada no aparelho. | Não. Salas e planta do CCE. |
| 2 | Onde esse dado fica guardado, e quem consegue ler? | Banco do artefato no Claude: pedidos, ofertas e relatos por pessoa; a coordenação lê relatos e denúncias. | Nada novo. O canvas fica só na memória do aparelho. | Nada novo. | Nada novo. | Fica só no código do exemplo (não vai para banco). | Nada vai para o servidor. | Nada novo (trajeto fixo no código). | No próprio aparelho (localStorage). | Nada novo. |
| 3 | Por quanto tempo ele fica guardado? Há exclusão automática? | Conversas de pedidos encerrados: 30 dias. Relatos: até 40 por pessoa (falta prazo; ver pendências). | Nada novo. | Nada novo. | Nada novo. | Enquanto existir o exemplo. | Até a pessoa limpar os dados do navegador. | Nada novo. | Até limpar os dados do navegador. | Nada novo. |
| 4 | A localização é gravada em algum lugar? | Não. Só a presença ao vivo; os relatos guardam o ponto do problema, não a pessoa. | Não. O canvas desenha só ruas e prédios, nunca pessoas. | Não. Centralizar uma pessoa só move a câmera no próprio aparelho. | Não. | Não: é um trajeto fixo, não a posição real dele. | Não. | Não: trajeto fixo, não a posição real dele. | Não. Em Picos o GPS fica desligado até o mapa ser calibrado, para não mostrar posição errada. | Não. |
| 5 | O XP pode ser forjado pelo celular? | Não: é recalculado das confirmações e das decisões da coordenação (testes em `tests/unit/trapaca.test.mjs`). | Nada muda no XP. | Nada muda no XP. | Nada muda no XP. | Nada muda no XP. | Nada muda no XP. | Nada muda no XP. | Nada muda no XP. | Nada muda no XP. |
| 6 | Há chave secreta ou dado real no repositório? | Não (teste `segredos.test.mjs`). | Não (teste `segredos.test.mjs` também na beta). | Não (imagem do pergaminho é desenho, sem dado pessoal). | Não. | Não. Os testes não escrevem o nome real (regra 15): acham o professor pelo papel. | Não. | Não. | Não. | Não. A planta DWG não vai para o repositório; só a imagem das paredes do CCE, sem nomes de pessoas. |
| 7 | Textos enviados são checados contra telefone, e-mail e CPF? | Sim: CPF bloqueado; telefone e e-mail pedem confirmação. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. |
| 8 | Fotos saem sem localização da câmera (EXIF)? | Sim, a foto é redesenhada antes do envio. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. |
| 9 | Existe aviso claro do que é público e do que não é privado? | Sim na aba Ajuda. Falta o texto de consentimento antes de aparecer no mapa. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Sem mudança. | Ele não conta como pessoa online. | Picos ainda não se conecta ao banco ao vivo (evita misturar pessoas de campi diferentes). | Sem mudança. |
| 10 | Todos os testes passaram? | Sim (`npm test`). | Sim: `npm test` (principal) e `PAGINA=/beta/ npm test` (beta). | Sim: principal e beta. | Sim: principal e beta. | Sim: principal e beta. | Sim: principal e beta. | Sim: principal e beta. | Sim: principal e beta. | Sim: principal e beta. |

## Pendências conhecidas (fase Supabase)
- Login com e-mail institucional e e-mail criptografado no banco.
- Conversas criptografadas no banco.
- Regras de acesso (RLS) com testes que tentam ler dados de outra pessoa e precisam falhar.
- Barrar anéis de contas falsas: XP só para e-mail institucional, conta com alguns dias e detecção de grupos fechados.
- Prazo de exclusão para relatos e fotos (ex.: 6 meses).
- Texto de consentimento antes de aparecer no mapa; regra para menores de 18 anos (decidir com o DPO).
- Botão "Apagar meus dados".
