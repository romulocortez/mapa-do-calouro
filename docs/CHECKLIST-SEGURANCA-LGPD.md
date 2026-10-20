# Checklist de segurança e LGPD — preencher a cada versão

Não sou advogado: para dúvidas jurídicas, consultar o encarregado de dados (DPO) da UFPI.

| # | Pergunta | V27 (19/10/2026) |
|---|---|---|
| 1 | A versão cria algum dado pessoal novo? Qual, e ele é mesmo necessário? | Não cria. Conversas da aba Ajuda agora expiram. |
| 2 | Onde esse dado fica guardado, e quem consegue ler? | Banco do artefato no Claude: pedidos, ofertas e relatos por pessoa; a coordenação lê relatos e denúncias. |
| 3 | Por quanto tempo ele fica guardado? Há exclusão automática? | Conversas de pedidos encerrados: 30 dias. Relatos: até 40 por pessoa (falta prazo; ver pendências). |
| 4 | A localização é gravada em algum lugar? | Não. Só a presença ao vivo; os relatos guardam o ponto do problema, não a pessoa. |
| 5 | O XP pode ser forjado pelo celular? | Não: é recalculado das confirmações e das decisões da coordenação (testes em `tests/unit/trapaca.test.mjs`). |
| 6 | Há chave secreta ou dado real no repositório? | Não (teste `segredos.test.mjs`). |
| 7 | Textos enviados são checados contra telefone, e-mail e CPF? | Sim: CPF bloqueado; telefone e e-mail pedem confirmação. |
| 8 | Fotos saem sem localização da câmera (EXIF)? | Sim, a foto é redesenhada antes do envio. |
| 9 | Existe aviso claro do que é público e do que não é privado? | Sim na aba Ajuda. Falta o texto de consentimento antes de aparecer no mapa. |
| 10 | Todos os testes passaram? | Sim (`npm test`). |

## Pendências conhecidas (fase Supabase)
- Login com e-mail institucional e e-mail criptografado no banco.
- Conversas criptografadas no banco.
- Regras de acesso (RLS) com testes que tentam ler dados de outra pessoa e precisam falhar.
- Barrar anéis de contas falsas: XP só para e-mail institucional, conta com alguns dias e detecção de grupos fechados.
- Prazo de exclusão para relatos e fotos (ex.: 6 meses).
- Texto de consentimento antes de aparecer no mapa; regra para menores de 18 anos (decidir com o DPO).
- Botão "Apagar meus dados".
