# Mapa do Calouro

Mapa ilustrado do Campus Ministro Petrônio Portella (UFPI, Teresina) para calouros e veteranos se acharem e se ajudarem.
O site é um único arquivo: `index.html`. O resto da pasta são os testes automáticos e as regras do projeto.

## O que tem aqui
| Arquivo / pasta | Para que serve |
|---|---|
| `index.html` | O mapa. É o que o GitHub Pages publica. |
| `CLAUDE.md` e `AGENTS.md` | Regras que qualquer IA deve seguir ao mexer no projeto (testes, privacidade, segurança). |
| `docs/CHECKLIST-SEGURANCA-LGPD.md` | Lista conferida a cada versão: que dados existem, quem vê, por quanto tempo. |
| `tests/unit/` | Testes das regras do jogo (XP, limites, títulos), dos "robôs trapaceiros", da privacidade e de chaves secretas. |
| `tests/e2e/` | Testes que abrem o mapa num navegador de verdade: capa, salas e andares, toques, pessoas, contribuições, privacidade e desempenho com 1000 pessoas. |
| `.github/workflows/testes.yml` | Faz o GitHub rodar todos os testes sozinho a cada atualização. |

## Versão beta
Mudanças grandes vão primeiro para `beta/index.html`, publicada em `/beta/` (ex.: https://romulocortez.github.io/mapa-do-calouro/beta/).
Chaves de teste na beta: `?fps=1` mostra os quadros por segundo; `?svg=1` volta o fundo para o desenho antigo, para comparar no mesmo aparelho.
Testes de algo que só existe na beta começam com `test.skip(process.env.PAGINA !== "/beta/", ...)`. Quando a beta é aprovada, ela substitui o `index.html` (e `beta/audio/` vai para `audio/`), e essas linhas são apagadas.

## Como os testes aparecem no GitHub
A cada envio de arquivos, abra a aba **Actions** do repositório. Um ✓ verde quer dizer que tudo passou;
um ✗ vermelho mostra qual teste quebrou (e o relatório fica disponível para baixar por 7 dias).

## Rodar os testes no computador (opcional)
Precisa do Node.js 22 instalado.
```
npm install
npx playwright install chromium
npm test
```
`npm run servidor` abre o mapa em http://localhost:4173 para testar no navegador.

## Regra de ouro
Mudou uma regra do jogo → mude o teste junto. Corrigiu um bug → primeiro um teste que mostra o bug.
Nenhum dado pessoal real e nenhuma chave secreta entram neste repositório.
