# Portal Mesada — guia para trabalhar neste repositório

Portal web doméstico para gerenciar mesada por tarefas: o pai (`master`) cria
tarefas com valor e prazo para Anthony ou Gabriel (`junior`), cada criança
comprova a execução com foto, o pai aprova e o sistema calcula o saldo. Tem
tarefa "bônus" (sem dono, disputada pelas duas crianças) e registro de
pagamento com histórico permanente.

O projeto nasceu de um escopo formal (regras de negócio numeradas RN01–RN13
e um backlog de 37 atividades A01–A37, combinado com o cliente doméstico —
o próprio usuário). Esse documento não faz mais parte do repositório; os
números RN/A aparecem neste arquivo só como referência interna de onde cada
decisão veio, não como link para algo que exista aqui.

## Regra de ouro do projeto

Isto é um projeto de aprendizado (primeiro projeto de quem está começando a
programar). **Sem framework, sem build step, sem bundler.** HTML, CSS e JS
puro, módulos ES (`type="module"`) importando o SDK do Firebase direto do
CDN (`gstatic.com/firebasejs`). Prefira a solução mais simples e explícita à
mais "elegante". Não introduza React/Vite/npm nem abstrações que um
iniciante não consiga acompanhar.

## Stack

- **Firestore**: dados (`perfis`, `tarefas`, `pagamentos`).
- **Storage**: uma foto de comprovação por tarefa (`tarefas/{tarefaId}/comprovante.jpg`).
- **Anonymous Auth**: só para as regras de segurança exigirem `request.auth != null`. Ver limitação abaixo.
- **Hospedagem**: GitHub Pages — todo caminho de arquivo é relativo.

## Modelo de dados

**`perfis/{id}`** — `id` é um dos três valores fixos: `pai`, `anthony`, `gabriel`.
- `nome`, `tipo` (`master` | `junior`), `avatarCor`
- `pinHash` (SHA-256 hex de `pin + ":" + id`, ver `js/pin.js`), `pinDefinido` (bool)
- Não existe CRUD de perfis pela tela — os três são carga manual pelo console do Firebase.

**`tarefas/{id}`**
- `nome`, `descricao`, `valorCentavos` (inteiro, nunca float)
- `tipoAtribuicao`: `"fixa" | "bonus"` — **desvio do escopo original**, que previa `"direcionada"`. O código já em produção usa `"fixa"`; mantive por não valer a pena migrar dados existentes por um nome. Se migrar um dia, seed roda antes do rename.
- `criancaId`: `"anthony" | "gabriel" | null` (null só em bônus não aceito)
- `prazo`, `status`, `tentativas` (int, nunca zera por rejeição — RN12), `motivoRejeicao`, `observacaoCrianca`, `fotoUrl`
- `dataCriacao`, `dataAceite`, `dataConclusao`, `dataAprovacao`, `dataPerda` (todos `serverTimestamp()`)
- `pago` (bool), `pagamentoId`
- `pago` só é marcado `true` pelo fluxo de pagamento em `resumoa26.js` (`registrarPagamento`, grava `pagamentos` + `writeBatch`). Não existe mais um botão "marcar como pago" avulso em `pai.js` — havia um antes desta sessão e foi removido porque marcava `pago=true` sem criar o documento em `pagamentos`, violando a RN08 (todo pagamento tem que deixar rastro no histórico).

**`pagamentos/{id}`** — `criancaId`, `valorCentavos`, `dataPagamento`, `tarefaIds[]`, `observacao`. Nunca é editado ou apagado pela aplicação (RN08).

## RN01 — máquina de estados da tarefa

```
aberta        → disponivel   (criança aceita bônus, js/crianca.js:aceitarBonus)
aberta        → perdida      (expira ou é cancelada sem ninguém aceitar)
disponivel    → aguardando_aprovacao → aprovada
disponivel    → perdida      (expiração ou cancelamento manual)
aguardando_aprovacao → disponivel   (pai rejeita, tentativas < 3)
aguardando_aprovacao → perdida      (pai rejeita na tentativa 3)
perdida       → disponivel | aberta (pai reabre — zera tentativas)
```
`aberta` só existe em tarefa bônus. Tarefa direcionada nasce em `disponivel`.

## Cálculos financeiros (RN05/06/07) — `js/calculos.js`

Módulo puro, sem DOM nem Firestore, usado por `pai.js`, `crianca.js` e
`resumoa26.js`. Qualquer alteração de regra de saldo/gerado/perdido entra
aqui, não espalhada pelas telas.

- `saldoDisponivelCentavos`: soma de `aprovada` + `pago=false`.
- `dinheiroGeradoCentavos`: soma de `aprovada` com `dataAprovacao` no período (inclui já pago).
- `dinheiroPerdidoCentavos`: soma de `perdida` com `dataPerda` no período.

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `index.html` | seleção de perfil (3 botões) + modal de PIN |
| `js/pin.js` | fluxo de PIN (primeiro acesso define hash, acessos seguintes conferem) |
| `pai.html` / `js/pai.js` | painel do `master`: criar/gerenciar tarefas, aprovar/rejeitar, resetar PIN |
| `crianca.html` / `js/crianca.js` | painel único do `junior`, dirigido por `sessionStorage.perfilAtivo` (`anthony` ou `gabriel`) |
| `resumoa26.html` / `js/resumoa26.js` | relatório por criança, filtro de período, registrar pagamento, histórico |
| `js/calculos.js` | funções financeiras puras |
| `js/firebase-config.js` | inicialização do Firebase + re-export dos helpers do SDK usados no projeto |
| `js/auth.js` | login anônimo, expõe erro em `#erro-auth` quando presente na página |
| `js/script.js` | troca de abas (`mostrarAba`), usado só em `crianca.html` |
| `firestore.rules` / `storage.rules` | regras de segurança — ver limitação abaixo |

## Convenções (não "corrigir" achando que é bug)

- **Identificadores em português**: `nomeTarefa`, `excluirTarefa`, `zerarPin`, etc. Mantenha o idioma consistente ao adicionar código.
- **Ids de DOM com nome de fruta**, sem relação com o conteúdo: `banana1`, `morango2`, `melancia8`, `kiwi9`, `coco10`, `pessego11`, `maca12`, `pitaya13`, `limao7`. Isso já existia antes desta sessão; ao adicionar um elemento novo, um nome descritivo normal também serve — não é preciso inventar mais frutas.
- Os *scripts de guarda de sessão* (`if (sessionStorage.getItem('perfilAtivo') !== 'pai') location.href = 'index.html'`) são `<script>` clássicos inline no `<head>`/topo do `<body>`, de propósito — rodam antes de qualquer módulo carregar. Não mova isso para dentro de um `type="module"`, ou o redirecionamento passa a acontecer depois do primeiro paint.

## Limitação de segurança aceita

Anonymous Auth não distingue **quem** está autenticado — não há como as
`firestore.rules` saberem se a requisição vem do pai ou de uma criança. O
PIN é conveniência do cliente, não uma barreira forte. As regras hoje
garantem o que dá para garantir sem login real:
- exigem usuário autenticado;
- validam formato dos dados gravados;
- impedem excluir tarefa paga ou apagar/editar um pagamento (histórico financeiro imutável);
- impedem zerar o PIN do perfil `pai` pelo app (só recuperação manual no console).

Não escreva uma regra que finja checar "é o pai" — não é possível com essa
arquitetura. Se isso precisar mudar, é um login de verdade (Firebase Auth
com e-mail/senha ou custom claims), que é uma mudança de escopo, não um
ajuste de regra.

## O que ainda depende de ação manual (eu não tenho acesso ao console Firebase)

1. **Perfil do Gabriel**: criar documento em `perfis/gabriel` com `nome`, `tipo: "junior"`, `avatarCor`, `pinDefinido: false` — igual ao que já existe para `pai` e `anthony`.
2. **Publicar `firestore.rules` e `storage.rules`** no console do Firebase (Firestore → Regras / Storage → Regras). Testar um caso positivo e um negativo antes de considerar concluído (A09).
3. Confirmar dependência: `firestore.rules` bloqueia `create` em `perfis`, então não existe (nem faz sentido existir) um `scripts/seed.js` rodando com o SDK client-side — a carga inicial é sempre manual pelo console, como documentado no `README.md`.

## Pendências conhecidas do escopo original (não implementadas)

- **Editar tarefa** e **refinamentos visuais do resumo** (cards lado a lado) não foram feitos — funcionalidade básica de resumo existe, mas não o polimento de layout específico.
- **Revisão mobile completa** precisa de teste manual em celular real — não posso verificar isso.
- Três perguntas do escopo original seguem em aberto e não foram respondidas nem implementadas (não inventei resposta): limite de tarefas bônus simultâneas por criança, se o `master` pode retirar uma tarefa bônus já aceita e devolvê-la à disputa, e se a criança deve ver o motivo das três rejeições quando a tarefa vira perdida por esgotar tentativas.
