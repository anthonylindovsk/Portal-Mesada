# Portal Mesada — guia para trabalhar neste repositório

Portal web doméstico para gerenciar mesada por tarefas: o pai (`master`) cria
tarefas com valor e prazo para Anthony ou Gabriel (`junior`), cada criança
comprova a execução com foto, o pai aprova e o sistema calcula o saldo. Tem
tarefa "bônus" (sem dono, disputada pelas duas crianças) e registro de
pagamento com histórico permanente. Um quarto perfil, `avaliador`, resolve
chamados abertos por uma criança quando uma tarefa é reprovada na 3ª
tentativa ou expira — dando a ela uma última chance de recurso.

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

- **Firestore**: dados (`perfis`, `tarefas`, `pagamentos`, `chamados` + subcoleção `chamados/{id}/mensagens`).
- **Storage**: até 5 anexos de comprovação por tarefa, foto (máx. 5MB) ou vídeo (máx. 15MB) — `tarefas/{tarefaId}/anexos/{indice}.{ext}`. Tarefas antigas podem ter um único `tarefas/{tarefaId}/comprovante.jpg` legado (ver campo `fotoUrl` abaixo).
- **Anonymous Auth**: só para as regras de segurança exigirem `request.auth != null`. Ver limitação abaixo.
- **Hospedagem**: GitHub Pages — todo caminho de arquivo é relativo.

## Modelo de dados

**`perfis/{id}`** — `id` é um dos quatro valores fixos: `pai`, `anthony`, `gabriel`, `avaliador`.
- `nome`, `tipo` (`master` | `junior` | `avaliador`), `avatarCor`
- `pinHash` (SHA-256 hex de `pin + ":" + id`, ver `js/pin.js`), `pinDefinido` (bool)
- Não existe CRUD de perfis pela tela — os quatro são carga manual pelo console do Firebase.
- Assim como `tipo` já era antes, `tipo` continua sem uso funcional no código — quem decide comportamento é sempre comparação direta do id (`"pai"`, `"anthony"`, `"gabriel"`, `"avaliador"`) espalhada pelas guardas de sessão, `index.html`, `firestore.rules` etc. Não há um array único de perfis compartilhado; adicionar um 5º perfil exigiria tocar nos mesmos pontos que o `avaliador` tocou.

**`tarefas/{id}`**
- `nome`, `descricao`, `valorCentavos` (inteiro, nunca float)
- `tipoAtribuicao`: `"fixa" | "bonus"` — **desvio do escopo original**, que previa `"direcionada"`. O código já em produção usa `"fixa"`; mantive por não valer a pena migrar dados existentes por um nome. Se migrar um dia, seed roda antes do rename.
- `criancaId`: `"anthony" | "gabriel" | null` (null só em bônus não aceito)
- `prazo`, `status`, `tentativas` (int, nunca zera por rejeição — RN12), `motivoRejeicao`, `observacaoCrianca`
- `causaPerda`: `"rejeicao" | "expiracao" | "cancelamento" | null` — gravado toda vez que `status` vira `"perdida"` (em `js/pai.js`: `rejeitarTarefa` na 3ª tentativa, `expirarSeVencida`, `cancelarTarefa`; a mesma `expirarSeVencida` existe duplicada em `js/crianca.js`). Só `"rejeicao"` e `"expiracao"` deixam a criança abrir um chamado — cancelamento manual do pai é decisão dele, não cabe recurso.
- `chamadoId`: `string | null` — referência ao doc em `chamados` aberto para essa tarefa. Impede abrir um segundo chamado para a mesma tarefa; continua gravado depois que o avaliador resolve o chamado (é o que impede um 2º recurso); só é limpo (`null`) quando o pai reabre a tarefa.
- `anexos`: array de até 5 `{url, tipo: "imagem" | "video", nome}`, gravado por `js/crianca.js` (`concluirTarefa`). Substituiu o campo `fotoUrl` (string única, um só arquivo) usado antes desta sessão — `fotoUrl` ainda pode existir em tarefas antigas e `js/pai.js` (`htmlAnexos`) sabe exibir esse formato legado como fallback quando `anexos` não existe. Rejeição/exclusão de tarefa apaga a pasta `tarefas/{tarefaId}/anexos/` inteira via `listAll` (não só um arquivo fixo).
- `dataCriacao`, `dataAceite`, `dataConclusao`, `dataAprovacao`, `dataPerda` (todos `serverTimestamp()`)
- `pago` (bool), `pagamentoId`
- `pago` só é marcado `true` pelo fluxo de pagamento em `resumoa26.js` (`pagarPeriodo`: por criança, só tarefas aprovadas no período selecionado e marcadas por checkbox; grava `pagamentos` + `writeBatch`). O antigo pagamento avulso e o "fechar período" das duas crianças foram substituídos por esse fluxo. Não existe mais um botão "marcar como pago" avulso em `pai.js` — havia um antes desta sessão e foi removido porque marcava `pago=true` sem criar o documento em `pagamentos`, violando a RN08 (todo pagamento tem que deixar rastro no histórico).

**`pagamentos/{id}`** — `criancaId`, `valorCentavos`, `dataPagamento`, `tarefaIds[]`, `observacao`. Nunca é editado ou apagado pela aplicação (RN08).
- `tipoPagamento`: `"manual" | "fechamento"` — `"fechamento"` em todo pagamento novo (`pagarPeriodo`); `"manual"` só existe em pagamentos antigos. Campo opcional/sem validação estrita na regra, mesmo nível de `observacao`.
- `periodoInicio`/`periodoFim` (`Timestamp`) — só presentes em `tipoPagamento: "fechamento"`, vêm do filtro de data já selecionado em `resumoa26.js`.
- A criança vê saldo a receber, último fechamento e histórico de `pagamentos` na aba "Recebido" de `crianca.html`/`crianca.js` (antes só o pai via isso em `resumoa26.js`).

**`chamados/{id}`** — recurso aberto pela criança quando `causaPerda` é `"rejeicao"` ou `"expiracao"`. Campos: `tarefaId`, `criancaId`, `nomeTarefa`/`valorCentavos` (denormalizados na criação, para listar sem buscar a tarefa de novo), `status` (`"aberto" | "aprovado" | "negado"`), `dataAbertura`, `dataResolucao`. Nunca é apagado (mesmo padrão de `pagamentos`); `update` só permite a transição `aberto → aprovado|negado`, uma via só.
- **Subcoleção `chamados/{id}/mensagens/{msgId}`**: `autor` (`"anthony"|"gabriel"|"pai"|"avaliador"`, vem de `sessionStorage.perfilAtivo`), `texto`, `data`. Thread imutável (sem update/delete) — a criança escreve a 1ª mensagem ao abrir o chamado (é o motivo, não existe campo `motivo` separado), o pai pode adicionar contexto, o avaliador lê tudo antes de decidir. Gerenciado por `chamados.html`/`js/chamados.js`, visível para `pai` e `avaliador` (permissões diferentes na mesma tela: só o avaliador vê os botões de decisão).

## RN01 — máquina de estados da tarefa

```
aberta        → disponivel   (criança aceita bônus, js/crianca.js:aceitarBonus)
aberta        → perdida      (expira ou é cancelada sem ninguém aceitar)
disponivel    → aguardando_aprovacao → aprovada
disponivel    → perdida      (expiração, causaPerda="expiracao", ou cancelamento manual, causaPerda="cancelamento")
aguardando_aprovacao → disponivel   (pai rejeita, tentativas < 3)
aguardando_aprovacao → perdida      (pai rejeita na tentativa 3, causaPerda="rejeicao")
perdida (causaPerda em [rejeicao, expiracao]) → em_recurso   (criança abre chamado, js/crianca.js:abrirChamado)
em_recurso    → aprovada     (avaliador aprova o chamado, chamados.html)
em_recurso    → perdida      (avaliador nega o chamado — causaPerda é mantido)
perdida       → disponivel | aberta (pai reabre — zera tentativas, causaPerda e chamadoId voltam a null)
(tarefa negada no recurso volta a `perdida` com `chamadoId` preenchido: sem botão de novo chamado)
```
`aberta` só existe em tarefa bônus. Tarefa direcionada nasce em `disponivel`.
`em_recurso` só existe enquanto um chamado está `"aberto"` — ver seção de
`chamados` no modelo de dados. Tarefa `perdida` por cancelamento manual do
pai nunca vira `em_recurso` (não cabe recurso para essa causa).

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
| `index.html` | seleção de perfil (4 botões) + modal de PIN |
| `js/pin.js` | fluxo de PIN (primeiro acesso define hash, acessos seguintes conferem) |
| `pai.html` / `js/pai.js` | painel do `master`: criar tarefa (avulsa ou em lote para dias diferentes), aprovar/rejeitar, resetar PIN, link para chamados |
| `crianca.html` / `js/crianca.js` | painel único do `junior`, dirigido por `sessionStorage.perfilAtivo` (`anthony` ou `gabriel`); abas de tarefas, "Chamados" (acompanha thread e decisão, responde enquanto aberto) e "Recebido" (saldo e pagamentos) |
| `resumoa26.html` / `js/resumoa26.js` | relatório por criança, filtro de período, registrar pagamento avulso ou fechar período (as duas crianças de uma vez), histórico |
| `chamados.html` / `js/chamados.js` | recurso de tarefa perdida: lista chamados, thread de mensagens, aprovar/negar (só `avaliador`). Página só de `pai` e `avaliador` |
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
- impedem zerar o PIN do perfil `pai` pelo app (só recuperação manual no console);
- impedem apagar um chamado ou editar uma mensagem depois de escrita (histórico do recurso é permanente, mesmo padrão de `pagamentos`);
- restringem a transição de status de um chamado a `aberto → aprovado|negado`, uma via só.

Não escreva uma regra que finja checar "é o pai" ou "é o avaliador" — não é
possível com essa arquitetura (quem decide o chamado é uma convenção do
cliente: os botões de aprovar/negar em `chamados.html` só aparecem quando
`sessionStorage.perfilAtivo === "avaliador"`, não uma garantia de servidor).
Se isso precisar mudar, é um login de verdade (Firebase Auth com e-mail/
senha ou custom claims), que é uma mudança de escopo, não um ajuste de regra.

## O que ainda depende de ação manual (eu não tenho acesso ao console Firebase)

1. **Perfil do avaliador**: criar documento em `perfis/avaliador` com `nome`, `tipo: "avaliador"`, `avatarCor`, `pinDefinido: false` — igual ao que já existe para `pai`, `anthony` e `gabriel`.
2. **Publicar `firestore.rules` e `storage.rules`** no console do Firebase (Firestore → Regras / Storage → Regras), incluindo as regras novas de `chamados`. Testar um caso positivo e um negativo antes de considerar concluído (A09).
3. Confirmar dependência: `firestore.rules` bloqueia `create` em `perfis`, então não existe (nem faz sentido existir) um `scripts/seed.js` rodando com o SDK client-side — a carga inicial é sempre manual pelo console, como documentado no `README.md`.

## Pendências conhecidas do escopo original (não implementadas)

- **Editar nome/descrição da tarefa** (só valor e prazo são editáveis, em `pai.js`, para tarefas `disponivel`/`aberta`) e **refinamentos visuais do resumo** (cards lado a lado) não foram feitos — funcionalidade básica de resumo existe, mas não o polimento de layout específico.
- **Revisão mobile completa** precisa de teste manual em celular real — não posso verificar isso.
- Três perguntas do escopo original seguem em aberto e não foram respondidas nem implementadas (não inventei resposta): limite de tarefas bônus simultâneas por criança, se o `master` pode retirar uma tarefa bônus já aceita e devolvê-la à disputa, e se a criança deve ver o motivo das três rejeições quando a tarefa vira perdida por esgotar tentativas.
