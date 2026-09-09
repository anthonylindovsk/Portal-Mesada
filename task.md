# ESCOPO DE PROJETO — USO INTERNO (FAMÍLIA) — PORTAL DE MESADA POR TAREFAS

**Data:** 15/08/2026
**Cliente:** Alexandre Magno (uso familiar)
**Origem:** Transcrição de reunião de 15/08/2026
**Participantes:** Alexandre Magno
**Status:** Revisão 2 — regras de negócio validadas; pendências residuais na seção 12
**Prazo alvo:** 30/08/2026

---

## 1. Resumo executivo

Portal web para gestão de tarefas domésticas remuneradas. O pai, atuando como perfil `master`, cria tarefas com nome, valor em reais e prazo de conclusão, direcionadas a uma das duas crianças — Anthony ou Gabriel. Cada criança acessa o portal pelo celular, executa a tarefa, marca como concluída, escreve uma observação e anexa uma foto comprovando a execução.

Além da tarefa direcionada, o pai pode criar **tarefa bônus**: tarefa sem destinatário definido, visível para as duas crianças ao mesmo tempo. A primeira que aceitar se torna a dona da tarefa, e ela desaparece do painel da outra.

O pai aprova ou rejeita cada conclusão. Somente após a aprovação o valor da tarefa entra no saldo da criança. Ao final do período, o pai registra o pagamento da mesada, o saldo zera e o pagamento fica gravado em histórico permanente.

O sistema entrega ainda uma tela de resumo com somatório por criança, quantidade de atividades concluídas, atividades perdidas e indicadores de dinheiro gerado e dinheiro perdido no período.

O projeto é também um **exercício de aprendizado**: é o primeiro projeto de quem está começando a programar. Toda decisão técnica deve favorecer a solução mais simples que atenda ao requisito, evitando abstração desnecessária, framework e build step.

## 2. Problema de negócio

Hoje o controle de mesada por tarefas é feito de forma informal, sem registro. Isso gera três problemas:

- **Não há comprovação de execução.** A criança diz que fez; não existe evidência.
- **Não há memória do que foi combinado.** Tarefa atribuída e não executada some da conversa, sem consequência visível.
- **O cálculo do valor é manual e discutível.** Sem somatório registrado, o fechamento da mesada vira negociação.

O portal transforma o combinado em registro auditável: tarefa com valor e prazo, foto de comprovação, aprovação explícita do pai e saldo calculado pelo sistema.

## 3. Objetivos e critérios de sucesso

| Nº | Objetivo | Como medir |
|----|----------|------------|
| 1 | Pai cria tarefas com valor e prazo sem depender de conversa | Tarefa criada em menos de 1 minuto pela tela |
| 2 | Criança comprova execução com foto | 100% das tarefas aprovadas possuem foto anexada |
| 3 | Valor da mesada é calculado pelo sistema, não à mão | Saldo exibido bate com a soma das tarefas aprovadas no período |
| 4 | Tarefa não executada no prazo gera consequência visível | Tarefa expirada aparece na lista de perdidas com valor não ganho |
| 5 | Acesso funciona no computador e no celular | Todas as telas utilizáveis em viewport de 360px e 1366px |
| 6 | Projeto publicado e versionado | URL pública acessível e repositório GitHub com histórico de commits |

## 4. Escopo incluído

- **Acesso por perfil.** Três perfis fixos: 1 `master` (pai) e 2 `junior` (Anthony e Gabriel), com entrada por seleção de perfil e PIN de 4 dígitos definido pelo próprio usuário no primeiro acesso.
- **Gestão de tarefas.** Criação, edição e exclusão de tarefas pelo `master`, com nome, valor livre, criança destinatária e prazo.
- **Tarefa bônus.** Tarefa criada sem destinatário, disputada pelas duas crianças, com aceite exclusivo para quem chegar primeiro.
- **Execução.** Conclusão da tarefa pelo `junior` com observação e foto obrigatória, limitada a 3 tentativas.
- **Aprovação.** Fila de conclusões pendentes para o `master` aprovar ou rejeitar.
- **Expiração.** Tarefa não concluída até o prazo passa automaticamente a perdida, com possibilidade de reabertura pelo `master`.
- **Saldo.** Somatório do valor das tarefas aprovadas e ainda não pagas, por criança.
- **Pagamento.** Registro de pagamento da mesada, zerando o saldo e gravando histórico permanente.
- **Resumo.** Tela de relatório com filtro por período, quantidade de atividades, dinheiro gerado, dinheiro perdido e lista de atividades perdidas.
- **Responsividade.** Layout adaptado para desktop e celular.
- **Publicação.** Repositório GitHub e site publicado no GitHub Pages.

## 5. Fora de escopo

Os itens abaixo não foram solicitados. Estão listados como delimitação explícita e devem ser tratados como premissa até que o cliente diga o contrário.

- Cadastro autônomo de novos usuários ou perfis pela tela (os três perfis são fixos).
- Recuperação de PIN esquecido por e-mail ou SMS.
- Notificação push, e-mail ou WhatsApp de tarefa nova ou prazo vencendo.
- Tarefa recorrente ou repetição automática (ex.: "toda segunda-feira").
- Categoria, etiqueta ou prioridade de tarefa.
- Integração com meio de pagamento real (PIX, banco, cartão).
- Exportação de relatório em PDF ou Excel.
- Aplicativo nativo instalável (o acesso é por navegador).
- Modo offline com sincronização posterior.
- Gráficos de evolução histórica. A tela de resumo entrega números e listas, não visualizações.

## 6. Requisitos técnicos e restrições

- **Plataforma:** aplicação web responsiva, acessada por navegador em desktop e celular.
- **Stack:** HTML, CSS e JavaScript puro (sem framework, sem build step, sem bundler).
- **Persistência:** Firebase — `Firestore` para dados e `Storage` para as fotos. Escolhido por dispensar servidor próprio e ser operável de um projeto estático.
- **Autenticação:** seleção de perfil com PIN de 4 dígitos na aplicação, apoiada em `Firebase Anonymous Auth` para permitir regras de segurança no `Firestore` e no `Storage`.
- **Ambiente / hospedagem:** GitHub Pages, servindo o conteúdo estático direto do repositório.
- **Volume esperado:** 3 usuários, ordem de dezenas de tarefas por mês e uma foto por tarefa concluída. Volume baixo, dentro do plano gratuito do Firebase.
- **Segurança e acesso:** o PIN é um controle de conveniência doméstica, não uma barreira de segurança forte. Regras do `Firestore` e do `Storage` devem impedir escrita anônima irrestrita.
- **Prazo / marcos:** primeira versão publicada e em uso até **30/08/2026**.

## 7. Integrações

| Sistema | Direção | Dados | Frequência | Chave de identidade | Status |
|---------|---------|-------|------------|---------------------|--------|
| `Firebase Firestore` | Bidirecional | Perfis, tarefas, pagamentos | Tempo real | `perfilId` | Confirmada |
| `Firebase Storage` | Envio | Foto de conclusão da tarefa | Sob demanda | `tarefaId` | Confirmada |
| `Firebase Anonymous Auth` | Leitura | Token de sessão | No acesso | `uid` anônimo | A validar |

## 8. Regras de negócio críticas

**RN01 — Estados da tarefa**

A tarefa transita por estes estados, e apenas por eles:

`aberta` → `disponivel` (quando uma criança aceita a tarefa bônus)
`disponivel` → `aguardando_aprovacao` → `aprovada`
`disponivel` → `perdida` (por expiração ou cancelamento manual)
`aberta` → `perdida` (por expiração ou cancelamento, se ninguém aceitou)
`aguardando_aprovacao` → `disponivel` (quando o `master` rejeita)
`perdida` → `disponivel` ou `aberta` (quando o `master` reabre, voltando ao estado de origem)

O estado `aberta` só existe em tarefa bônus. Tarefa direcionada nasce em `disponivel`.

**RN02 — Permissão por perfil**

| Ação | `master` | `junior` |
|------|----------|----------|
| Criar, editar e excluir tarefa | Sim | Não |
| Cancelar e reabrir tarefa | Sim | Não |
| Aprovar e rejeitar conclusão | Sim | Não |
| Registrar pagamento | Sim | Não |
| Ver resumo de todas as crianças | Sim | Não |
| Concluir tarefa com observação e foto | Não | Sim, apenas nas tarefas atribuídas a si |
| Aceitar tarefa bônus | Não | Sim |
| Ver o próprio saldo e as próprias tarefas | Não se aplica | Sim |

O `junior` nunca enxerga tarefa atribuída ao outro `junior`. A única exceção é a tarefa bônus em `status = aberta`, que é visível para os dois até alguém aceitar.

**RN03 — Expiração automática**

Tarefa com `status = disponivel` cujo `prazo` seja anterior à data e hora atuais passa a `status = perdida` na primeira carga de tela após o vencimento. O `master` pode reabrir, o que devolve a tarefa para `disponivel`. A reabertura exige informar um novo `prazo` futuro.

**RN04 — Foto obrigatória**

A conclusão só é gravada com foto anexada. Observação é opcional; foto não é.

**RN05 — Cálculo do saldo disponível**

```
saldo_disponivel(crianca) =
    SOMA(valor das tarefas com status = aprovada e pago = false, da criança)
```

Somente tarefa aprovada entra no saldo. Tarefa em `aguardando_aprovacao` não conta.

*Exemplo numérico:*
Criança 1 tem quatro tarefas no mês — R$ 5,00 aprovada, R$ 10,00 aprovada, R$ 7,50 aguardando aprovação, R$ 3,00 perdida.
→ `saldo_disponivel = 5,00 + 10,00 = R$ 15,00`

**RN06 — Dinheiro gerado no período**

```
dinheiro_gerado(crianca, periodo) =
    SOMA(valor das tarefas com status = aprovada e data_aprovacao dentro do periodo)
```

Diferente do saldo: considera tarefas já pagas. É o total conquistado, não o total a receber.

*Exemplo numérico:*
No período, criança 1 teve R$ 15,00 aprovados e já recebeu R$ 15,00 em pagamento.
→ `dinheiro_gerado = R$ 15,00` e `saldo_disponivel = R$ 0,00`

**RN07 — Dinheiro perdido no período**

```
dinheiro_perdido(crianca, periodo) =
    SOMA(valor das tarefas com status = perdida e data_perda dentro do periodo)
```

*Exemplo numérico:*
Criança 1 perdeu duas tarefas no período, de R$ 3,00 e R$ 4,50.
→ `dinheiro_perdido = R$ 7,50`

Tarefa reaberta e depois aprovada deixa de contar como perdida. O indicador reflete o estado atual da tarefa, não o histórico de transições.

**RN08 — Registro de pagamento**

Ao registrar pagamento, o sistema grava um documento em `pagamentos` com o valor total, a data e a lista de `tarefaId` liquidadas, e marca cada uma dessas tarefas com `pago = true`. O saldo disponível volta a zero. O histórico de pagamentos é permanente e nunca é apagado pela aplicação.

*Exemplo numérico:*
Saldo de R$ 15,00, composto pelas tarefas T1 (R$ 5,00) e T2 (R$ 10,00).
→ Pagamento gravado com `valor = 15,00` e `tarefas = [T1, T2]`; T1 e T2 recebem `pago = true`; `saldo_disponivel = R$ 0,00`.

**RN09 — Período do relatório**

O filtro padrão do resumo é a competência mensal corrente, do dia 1 ao último dia do mês. O usuário pode alterar data inicial e final livremente.

**RN10 — Moeda e arredondamento**

Todos os valores são em reais, com duas casas decimais. Valores são gravados em centavos (número inteiro) para evitar erro de ponto flutuante e formatados para exibição com `Intl.NumberFormat('pt-BR')`.

O valor de cada tarefa é livre, definido pelo `master` no momento da criação. Não existe tabela de preços por tipo de tarefa nem teto mensal de ganho por criança: enquanto houver tarefa disponível, a criança pode continuar concluindo.

**RN11 — Tarefa bônus e aceite exclusivo**

Tarefa criada com `tipoAtribuicao = bonus` nasce com `criancaId = null` e `status = aberta`, visível para as duas crianças.

Ao aceitar, o sistema grava `criancaId` com o perfil de quem aceitou, `dataAceite` e muda o `status` para `disponivel`. A partir daí a tarefa se comporta como tarefa direcionada e some do painel da outra criança.

O aceite é **exclusivo e irreversível pela criança**: a segunda tentativa de aceite falha, com mensagem informando que a tarefa já foi pega. Somente o `master` pode desfazer, editando a tarefa de volta para bônus.

*Exemplo:*
Tarefa bônus "Limpar o guarda-roupas — R$ 10,00" é criada e aparece para Anthony e Gabriel. Anthony aceita às 14h02.
→ A tarefa passa a ter `criancaId = Anthony` e `status = disponivel`; some do painel de Gabriel; o valor de R$ 10,00 só poderá entrar no saldo de Anthony.

**RN12 — Limite de tentativas de conclusão**

Cada tarefa admite no máximo **3 tentativas de conclusão**. O contador `tentativas` incrementa a cada envio da criança e não é zerado pela rejeição.

Ao ser rejeitada pela terceira vez, a tarefa vai para `status = perdida`, com `dataPerda` preenchida, e passa a contar como dinheiro perdido. A criança não pode mais enviá-la.

*Exemplo:*
Tarefa de R$ 8,00. Envio 1 rejeitado (`tentativas = 1`), envio 2 rejeitado (`tentativas = 2`), envio 3 rejeitado (`tentativas = 3`).
→ Tarefa vai para `perdida` e os R$ 8,00 entram em dinheiro perdido.

O limite também se aplica indiretamente ao prazo: se o prazo vencer antes das 3 tentativas, vale a expiração da RN03.

**RN13 — Definição do PIN no primeiro acesso**

Os três perfis são criados sem PIN, com `pinDefinido = false`. No primeiro acesso, ao escolher o perfil, o usuário define o próprio PIN de 4 dígitos, digitado duas vezes para confirmação. A partir do segundo acesso, o perfil pede o PIN normalmente.

O `master` pode zerar o PIN de qualquer perfil `junior`, devolvendo-o ao estado de primeiro acesso. Nenhum perfil pode zerar o PIN do `master`.

## 9. Backlog de atividades

### 9.1 Resumo

| ID | Atividade | Tipo | Complexidade | Depende de | Fase |
|----|-----------|------|--------------|------------|------|
| A01 | Criar repositório e estrutura de pastas | Infra | Baixa | — | 1 |
| A02 | Criar projeto no Firebase e conectar o SDK | Infra | Média | A01 | 1 |
| A03 | Definir e documentar o modelo de dados | Banco de dados | Média | A02 | 1 |
| A04 | Criar carga inicial dos três perfis fixos | Banco de dados | Baixa | A03 | 1 |
| A05 | Implementar sessão com Anonymous Auth | Backend | Média | A02 | 1 |
| A06 | Criar tela de seleção de perfil com PIN | Frontend | Média | A04, A05 | 1 |
| A07 | Implementar controle de acesso por perfil | Regra de negócio | Média | A06 | 1 |
| A08 | Criar layout base e folha de estilo responsiva | Frontend | Média | A01 | 1 |
| A09 | Configurar regras de segurança do Firestore e Storage | Infra | Alta | A03, A05 | 1 |
| A10 | Publicar o portal no GitHub Pages | Infra | Baixa | A01 | 1 |
| A11 | Criar formulário de cadastro de tarefa | Frontend | Média | A08 | 2 |
| A12 | Implementar gravação da tarefa no Firestore | Backend | Baixa | A03, A11 | 2 |
| A13 | Criar listagem de tarefas do master | Frontend | Média | A12 | 2 |
| A14 | Implementar edição de tarefa | Frontend | Baixa | A13 | 2 |
| A15 | Implementar exclusão de tarefa | Frontend | Baixa | A13 | 2 |
| A16 | Criar painel de tarefas da criança | Frontend | Média | A07, A12 | 2 |
| A17 | Implementar conclusão da tarefa com observação | Regra de negócio | Média | A16 | 2 |
| A18 | Implementar captura e upload da foto de conclusão | Integração | Alta | A09, A17 | 2 |
| A19 | Implementar expiração automática por prazo | Regra de negócio | Alta | A12 | 2 |
| A20 | Implementar reabertura de tarefa perdida | Regra de negócio | Média | A19 | 2 |
| A21 | Criar fila de conclusões pendentes de aprovação | Frontend | Média | A17 | 2 |
| A22 | Implementar aprovação e rejeição da conclusão | Regra de negócio | Média | A21 | 2 |
| A23 | Implementar cancelamento manual de tarefa | Regra de negócio | Baixa | A13 | 2 |
| A24 | Implementar cálculo do saldo disponível | Regra de negócio | Alta | A22 | 2 |
| A25 | Exibir saldo e progresso no painel da criança | Frontend | Baixa | A24 | 2 |
| A26 | Criar tela de resumo por criança | Frontend | Média | A24 | 3 |
| A27 | Implementar filtro de período no resumo | Frontend | Média | A26 | 3 |
| A28 | Calcular indicadores de dinheiro gerado e perdido | Regra de negócio | Alta | A27 | 3 |
| A29 | Criar listagem de atividades perdidas | Frontend | Baixa | A27 | 3 |
| A30 | Implementar registro de pagamento da mesada | Regra de negócio | Alta | A24 | 3 |
| A31 | Criar histórico de pagamentos | Frontend | Baixa | A30 | 3 |
| A32 | Ajustar responsividade mobile das telas da criança | Frontend | Média | A25 | 3 |
| A33 | Escrever README do repositório | Infra | Baixa | A10 | 3 |
| A34 | Implementar criação e listagem de tarefa bônus | Regra de negócio | Média | A12, A13 | 2 |
| A35 | Implementar aceite exclusivo de tarefa bônus | Regra de negócio | Alta | A16, A34 | 2 |
| A36 | Implementar limite de 3 tentativas de conclusão | Regra de negócio | Média | A22 | 2 |
| A37 | Implementar definição de PIN no primeiro acesso | Frontend | Média | A06 | 1 |

**Totais:** 37 atividades — 11 Baixa, 19 Média, 7 Alta.

### 9.2 Detalhamento

#### A01 — Criar repositório e estrutura de pastas

**Tipo:** Infra
**Complexidade:** Baixa
**Depende de:** —
**Fase:** 1

**Descrição**
Criar o repositório no GitHub e a estrutura mínima de arquivos do projeto: `index.html`, pasta `css/`, pasta `js/` e pasta `assets/`. Sem framework e sem gerenciador de pacotes.

**Critérios de aceite**
- [ ] Repositório criado no GitHub com branch principal
- [ ] `index.html` abre no navegador sem erro no console
- [ ] Estrutura de pastas `css/`, `js/` e `assets/` existe
- [ ] Arquivo `.gitignore` ignora credenciais locais

**Observações técnicas**
Manter os scripts como módulos ES (`type="module"`) para permitir importar o SDK do Firebase por CDN sem bundler.

---

#### A02 — Criar projeto no Firebase e conectar o SDK

**Tipo:** Infra
**Complexidade:** Média
**Depende de:** A01
**Fase:** 1

**Descrição**
Criar o projeto no console do Firebase, habilitar `Firestore`, `Storage` e `Anonymous Auth`. Importar o SDK por CDN e criar `js/firebase.js` exportando as instâncias já inicializadas.

**Critérios de aceite**
- [ ] Projeto criado no console do Firebase
- [ ] `Firestore`, `Storage` e `Anonymous Auth` habilitados
- [ ] `js/firebase.js` exporta `db`, `storage` e `auth`
- [ ] Uma leitura de teste no `Firestore` retorna sem erro no console

**Observações técnicas**
A configuração do Firebase para web é pública por natureza. A proteção real vem das regras de segurança de A09, não de esconder a chave.

---

#### A03 — Definir e documentar o modelo de dados

**Tipo:** Banco de dados
**Complexidade:** Média
**Depende de:** A02
**Fase:** 1

**Descrição**
Definir as coleções do `Firestore` e documentar os campos em `docs/modelo-dados.md`.

Coleções previstas:
- `perfis`: `id`, `nome`, `tipo` (`master` ou `junior`), `pinHash`, `pinDefinido`, `avatarCor`
- `tarefas`: `id`, `nome`, `descricao`, `valorCentavos`, `tipoAtribuicao` (`direcionada` ou `bonus`), `criancaId`, `prazo`, `status`, `tentativas`, `motivoRejeicao`, `observacaoCrianca`, `fotoUrl`, `dataCriacao`, `dataAceite`, `dataConclusao`, `dataAprovacao`, `dataPerda`, `pago`, `pagamentoId`
- `pagamentos`: `id`, `criancaId`, `valorCentavos`, `dataPagamento`, `tarefaIds`, `observacao`

**Critérios de aceite**
- [ ] `docs/modelo-dados.md` lista todas as coleções, campos, tipos e valores possíveis de `status` e `tipoAtribuicao`
- [ ] `criancaId` está definido como aceitando `null`, para suportar tarefa bônus não aceita
- [ ] Valores monetários definidos como inteiro em centavos
- [ ] Campos de data definidos como `Timestamp` do Firestore
- [ ] Documento explica quais campos são obrigatórios em cada estado da tarefa

---

#### A04 — Criar carga inicial dos três perfis fixos

**Tipo:** Banco de dados
**Complexidade:** Baixa
**Depende de:** A03
**Fase:** 1

**Descrição**
Criar os três documentos da coleção `perfis`: um `master` (pai) e dois `junior` chamados `Anthony` e `Gabriel`. Os perfis são criados **sem PIN**, com `pinDefinido = false`, para que cada um defina o próprio no primeiro acesso. A carga pode ser feita por um script único em `scripts/seed.js` ou manualmente pelo console do Firebase, desde que documentada.

**Critérios de aceite**
- [ ] Três documentos existem na coleção `perfis`: pai, `Anthony` e `Gabriel`
- [ ] Cada perfil tem `nome`, `tipo`, `avatarCor` e `pinDefinido = false`
- [ ] Nenhum perfil tem `pinHash` preenchido na carga inicial
- [ ] O processo de carga está documentado no README

---

#### A05 — Implementar sessão com Anonymous Auth

**Tipo:** Backend
**Complexidade:** Média
**Depende de:** A02
**Fase:** 1

**Descrição**
Autenticar o navegador anonimamente no Firebase ao carregar a aplicação, para que as regras de segurança possam exigir usuário autenticado. Manter a sessão viva entre recarregamentos.

**Critérios de aceite**
- [ ] Ao abrir o portal, o usuário anônimo é criado ou recuperado sem intervenção
- [ ] O `uid` fica acessível para as demais telas
- [ ] Recarregar a página não gera um novo `uid`
- [ ] Falha de autenticação exibe mensagem de erro em tela, não apenas no console

**Observações técnicas**
Anonymous Auth é a camada de máquina; o PIN de A06 é a camada de pessoa. São controles distintos e ambos são necessários.

---

#### A06 — Criar tela de seleção de perfil com PIN

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A04, A05
**Fase:** 1

**Descrição**
Tela inicial exibindo os três perfis como cards clicáveis. Ao escolher um perfil, abrir teclado numérico para digitar o PIN de 4 dígitos. PIN correto grava o perfil ativo na sessão e redireciona para o painel correspondente.

**Critérios de aceite**
- [ ] Os três perfis aparecem como cards com nome e cor
- [ ] Perfil com `pinDefinido = false` é desviado para o fluxo de primeiro acesso de A37
- [ ] O campo de PIN aceita exatamente 4 dígitos numéricos
- [ ] PIN incorreto exibe mensagem e limpa o campo, sem redirecionar
- [ ] PIN correto redireciona `master` para o painel de gestão e `junior` para o painel de tarefas
- [ ] O perfil ativo persiste em `sessionStorage` até o encerramento da sessão
- [ ] Existe ação de sair que limpa o perfil ativo

**Observações técnicas**
Comparar o PIN por hash, não por igualdade de texto puro. Em celular, o campo deve acionar o teclado numérico (`inputmode="numeric"`).

---

#### A07 — Implementar controle de acesso por perfil

**Tipo:** Regra de negócio
**Complexidade:** Média
**Depende de:** A06
**Fase:** 1

**Descrição**
Criar a função de guarda que verifica o perfil ativo antes de renderizar cada tela e antes de cada operação de escrita, conforme a matriz de permissão da RN02.

**Critérios de aceite**
- [ ] Tela de gestão só renderiza para perfil `master`
- [ ] Acesso direto por URL a uma tela restrita redireciona para a seleção de perfil
- [ ] `junior` só recebe da consulta as tarefas cujo `criancaId` seja o seu
- [ ] Ações de criar, editar, excluir, aprovar e pagar são bloqueadas para `junior`
- [ ] Sem perfil ativo na sessão, qualquer tela redireciona para a seleção de perfil

---

#### A08 — Criar layout base e folha de estilo responsiva

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A01
**Fase:** 1

**Descrição**
Definir a base visual do portal: variáveis CSS de cor, tipografia, espaçamento, cabeçalho com identificação do perfil ativo, navegação e componentes reutilizáveis de card, botão, campo e mensagem de status.

**Critérios de aceite**
- [ ] Variáveis CSS centralizadas em um único arquivo
- [ ] Layout funciona sem quebra em viewport de 360px e de 1366px
- [ ] Botões têm área de toque mínima de 44px em mobile
- [ ] Componentes de card, botão e campo estão documentados com exemplo de uso
- [ ] Existe estado visual de carregando, vazio e erro

**Observações técnicas**
Usar CSS Grid ou Flexbox com `min-width` e `clamp()`. Sem framework de CSS: o objetivo pedagógico inclui escrever o layout na mão.

---

#### A09 — Configurar regras de segurança do Firestore e Storage

**Tipo:** Infra
**Complexidade:** Alta
**Depende de:** A03, A05
**Fase:** 1

**Descrição**
Escrever as regras de segurança do `Firestore` e do `Storage` para impedir leitura e escrita por usuário não autenticado e limitar o formato e o tamanho dos arquivos enviados.

**Critérios de aceite**
- [ ] Nenhuma leitura ou escrita é permitida sem usuário autenticado
- [ ] Escrita na coleção `perfis` é bloqueada pela aplicação cliente
- [ ] Upload no `Storage` aceita apenas `image/*` e no máximo 2MB por arquivo
- [ ] Regras testadas no simulador do console do Firebase, com caso positivo e caso negativo documentados
- [ ] Regras versionadas em `firestore.rules` e `storage.rules` no repositório

**Observações técnicas**
Esta é a atividade de maior risco do projeto: regra permissiva deixa a base aberta na internet. Não subir para produção com regra de modo de teste.

---

#### A10 — Publicar o portal no GitHub Pages

**Tipo:** Infra
**Complexidade:** Baixa
**Depende de:** A01
**Fase:** 1

**Descrição**
Habilitar o GitHub Pages no repositório e validar que a URL pública carrega o portal em desktop e celular.

**Critérios de aceite**
- [ ] GitHub Pages habilitado e URL pública funcionando
- [ ] Portal abre no celular pela URL, sem erro de console
- [ ] O domínio da URL está autorizado no Firebase Authentication
- [ ] Novo commit na branch principal reflete no site publicado

**Observações técnicas**
GitHub Pages serve apenas conteúdo estático. Todo caminho de arquivo deve ser relativo, nunca absoluto a partir da raiz.

---

#### A11 — Criar formulário de cadastro de tarefa

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A08
**Fase:** 2

**Descrição**
Formulário do `master` para criar tarefa com: `nome` (obrigatório), `descricao` (opcional), `valorCentavos` (obrigatório, com máscara de moeda), destinatário e `prazo` (data e hora).

O campo de destinatário oferece três opções: `Anthony`, `Gabriel` ou **Tarefa bônus (quem pegar primeiro)**. A terceira opção grava `tipoAtribuicao = bonus`.

**Critérios de aceite**
- [ ] Campo de valor exibe máscara em reais, aceita valor livre e converte para centavos ao gravar
- [ ] Prazo vem pré-preenchido com 3 dias a partir do momento atual e pode ser alterado
- [ ] Prazo anterior ao momento atual é rejeitado com mensagem em tela
- [ ] Campos obrigatórios vazios impedem o envio
- [ ] Seleção de destinatário oferece as duas crianças e a opção de tarefa bônus
- [ ] Após gravar, o formulário é limpo e exibe confirmação

---

#### A12 — Implementar gravação da tarefa no Firestore

**Tipo:** Backend
**Complexidade:** Baixa
**Depende de:** A03, A11
**Fase:** 2

**Descrição**
Gravar a tarefa na coleção `tarefas` com `pago = false`, `tentativas = 0` e `dataCriacao` preenchida pelo servidor. Tarefa direcionada nasce com `status = disponivel`; tarefa bônus nasce com `status = aberta` e `criancaId = null`.

**Critérios de aceite**
- [ ] Documento criado com todos os campos do modelo de dados
- [ ] Tarefa direcionada nasce em `disponivel` e tarefa bônus nasce em `aberta`
- [ ] `tentativas` é inicializado em zero
- [ ] `dataCriacao` usa o timestamp do servidor
- [ ] Erro de gravação exibe mensagem em tela e não limpa o formulário
- [ ] A tarefa recém-criada aparece na listagem sem recarregar a página

---

#### A13 — Criar listagem de tarefas do master

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A12
**Fase:** 2

**Descrição**
Listagem de todas as tarefas para o `master`, com filtro por criança e por `status`, ordenada por prazo. Cada linha mostra nome, criança, valor, prazo e status, com as ações disponíveis para aquele estado.

**Critérios de aceite**
- [ ] Todas as tarefas aparecem, de ambas as crianças
- [ ] Filtro por criança e por status funciona de forma combinada
- [ ] Cada status tem indicador visual distinto
- [ ] Tarefa vencida aparece destacada
- [ ] Lista vazia exibe estado vazio, não área em branco

---

#### A14 — Implementar edição de tarefa

**Tipo:** Frontend
**Complexidade:** Baixa
**Depende de:** A13
**Fase:** 2

**Descrição**
Permitir ao `master` editar nome, descrição, valor, criança e prazo de uma tarefa. Edição bloqueada para tarefa já aprovada.

**Critérios de aceite**
- [ ] Formulário abre preenchido com os dados atuais
- [ ] Alterações são gravadas e refletidas na listagem
- [ ] Tarefa com `status = aprovada` não pode ser editada
- [ ] As mesmas validações do cadastro se aplicam à edição

---

#### A15 — Implementar exclusão de tarefa

**Tipo:** Frontend
**Complexidade:** Baixa
**Depende de:** A13
**Fase:** 2

**Descrição**
Permitir ao `master` excluir uma tarefa, com confirmação. Excluir tarefa aprovada e paga é bloqueado para preservar o histórico financeiro.

**Critérios de aceite**
- [ ] Exclusão pede confirmação explícita antes de executar
- [ ] Tarefa com `pago = true` não pode ser excluída
- [ ] A foto vinculada é removida do `Storage` junto com a tarefa
- [ ] A tarefa some da listagem após a exclusão

---

#### A16 — Criar painel de tarefas da criança

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A07, A12
**Fase:** 2

**Descrição**
Painel do perfil `junior` mostrando as tarefas atribuídas a ele, separadas em disponíveis, aguardando aprovação, aprovadas e perdidas, mais um bloco destacado com as tarefas bônus em `status = aberta`. Cada tarefa disponível mostra o valor e o tempo restante até o prazo.

**Critérios de aceite**
- [ ] Somente tarefas do próprio `criancaId` aparecem, além das bônus em `aberta`
- [ ] O bloco de tarefas bônus é visualmente distinto das tarefas próprias
- [ ] Tarefa bônus já aceita pela outra criança some do painel
- [ ] Tarefas agrupadas por status com contagem por grupo
- [ ] Tempo restante até o prazo é exibido em cada tarefa disponível
- [ ] Layout legível em viewport de 360px sem rolagem horizontal
- [ ] Estado vazio orienta a criança quando não há tarefa disponível

---

#### A17 — Implementar conclusão da tarefa com observação

**Tipo:** Regra de negócio
**Complexidade:** Média
**Depende de:** A16
**Fase:** 2

**Descrição**
Ação de concluir tarefa: a criança escreve uma observação opcional, anexa a foto e envia. A tarefa passa a `status = aguardando_aprovacao`, com `dataConclusao` preenchida e `tentativas` incrementado em 1.

**Critérios de aceite**
- [ ] Só é possível concluir tarefa com `status = disponivel` e prazo não vencido
- [ ] Envio sem foto é bloqueado com mensagem clara
- [ ] `tentativas` incrementa em 1 a cada envio
- [ ] O número da tentativa atual é exibido para a criança antes de enviar
- [ ] Após o envio, a tarefa muda de grupo no painel
- [ ] Tarefa em `aguardando_aprovacao` não pode ser concluída de novo
- [ ] `dataConclusao` usa o timestamp do servidor

---

#### A18 — Implementar captura e upload da foto de conclusão

**Tipo:** Integração
**Complexidade:** Alta
**Depende de:** A09, A17
**Fase:** 2

**Descrição**
Campo de foto que aciona a câmera do celular ou a galeria, comprime a imagem no navegador antes de enviar e faz upload para o `Storage` no caminho `tarefas/{tarefaId}/comprovante.jpg`, gravando a URL resultante em `fotoUrl`.

**Critérios de aceite**
- [ ] No celular, o campo abre a câmera ou a galeria
- [ ] Imagem é redimensionada para no máximo 1280px no maior lado antes do upload
- [ ] Arquivo enviado fica abaixo de 500KB
- [ ] Progresso de upload é exibido em tela
- [ ] Falha de upload não deixa a tarefa em estado inconsistente
- [ ] A foto é exibida na tela de aprovação do `master`

**Observações técnicas**
Compressão via `canvas` e `toBlob`. Fotos de celular chegam com facilidade a 5MB; sem compressão, o upload trava em rede móvel e a cota do plano gratuito se esgota rápido. Atentar para a orientação EXIF, que pode rotacionar a imagem.

---

#### A19 — Implementar expiração automática por prazo

**Tipo:** Regra de negócio
**Complexidade:** Alta
**Depende de:** A12
**Fase:** 2

**Descrição**
Ao carregar as telas de listagem, identificar tarefas com `status = disponivel` e `prazo` vencido e atualizá-las para `status = perdida`, preenchendo `dataPerda`, conforme a RN03.

**Critérios de aceite**
- [ ] Tarefa vencida aparece como perdida na primeira carga após o vencimento
- [ ] `dataPerda` é gravada uma única vez, sem sobrescrever em cargas seguintes
- [ ] Tarefa em `aguardando_aprovacao` não expira, mesmo com prazo vencido
- [ ] A expiração acontece igualmente no painel da criança e no do `master`
- [ ] Nenhuma tarefa é expirada duas vezes

**Observações técnicas**
GitHub Pages não executa código agendado. A expiração é resolvida na leitura, não por rotina de servidor. Comparar sempre contra o timestamp do servidor: o relógio do celular pode estar errado, e essa é a principal fonte de divergência aqui.

---

#### A20 — Implementar reabertura de tarefa perdida

**Tipo:** Regra de negócio
**Complexidade:** Média
**Depende de:** A19
**Fase:** 2

**Descrição**
Ação do `master` que devolve uma tarefa perdida para `disponivel`, exigindo informar um novo prazo futuro e limpando `dataPerda`.

**Critérios de aceite**
- [ ] Ação disponível apenas em tarefa com `status = perdida`
- [ ] Novo prazo obrigatório e obrigatoriamente futuro
- [ ] `dataPerda` é limpa ao reabrir
- [ ] A tarefa reaberta deixa de contar em dinheiro perdido
- [ ] A tarefa volta a aparecer como disponível no painel da criança

---

#### A21 — Criar fila de conclusões pendentes de aprovação

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A17
**Fase:** 2

**Descrição**
Tela do `master` listando as tarefas em `aguardando_aprovacao`, com nome da tarefa, criança, valor, observação e a foto ampliável.

**Critérios de aceite**
- [ ] Apenas tarefas em `aguardando_aprovacao` aparecem na fila
- [ ] A foto é exibida em miniatura e pode ser ampliada
- [ ] A observação da criança é exibida na íntegra
- [ ] Um indicador mostra a quantidade de pendências na navegação
- [ ] Fila vazia exibe estado vazio

---

#### A22 — Implementar aprovação e rejeição da conclusão

**Tipo:** Regra de negócio
**Complexidade:** Média
**Depende de:** A21
**Fase:** 2

**Descrição**
Aprovar move a tarefa para `status = aprovada` e grava `dataAprovacao`. Rejeitar devolve para `status = disponivel`, limpa `dataConclusao`, `observacaoCrianca` e `fotoUrl`, e exige um motivo visível para a criança.

**Critérios de aceite**
- [ ] Aprovação grava `dataAprovacao` com timestamp do servidor
- [ ] Tarefa aprovada passa a compor o saldo da criança
- [ ] Rejeição exige motivo preenchido
- [ ] Tarefa rejeitada volta a ficar disponível para a criança refazer, respeitando o limite tratado em A36
- [ ] `tentativas` não é zerado pela rejeição
- [ ] O motivo da rejeição é exibido no painel da criança
- [ ] A foto anterior é removida do `Storage` ao rejeitar

---

#### A23 — Implementar cancelamento manual de tarefa

**Tipo:** Regra de negócio
**Complexidade:** Baixa
**Depende de:** A13
**Fase:** 2

**Descrição**
Ação do `master` que move uma tarefa `disponivel` diretamente para `perdida`, mesmo antes do prazo, gravando `dataPerda`.

**Critérios de aceite**
- [ ] Ação disponível apenas em tarefa com `status = disponivel`
- [ ] Cancelamento pede confirmação
- [ ] A tarefa cancelada passa a contar em dinheiro perdido
- [ ] A tarefa some das disponíveis no painel da criança

---

#### A24 — Implementar cálculo do saldo disponível

**Tipo:** Regra de negócio
**Complexidade:** Alta
**Depende de:** A22
**Fase:** 2

**Descrição**
Função que calcula o saldo disponível de uma criança conforme a RN05: soma dos valores das tarefas com `status = aprovada` e `pago = false`.

**Critérios de aceite**
- [ ] Cálculo confere com o exemplo da RN05: R$ 5,00 + R$ 10,00 = R$ 15,00
- [ ] Tarefa em `aguardando_aprovacao` não entra no saldo
- [ ] Tarefa perdida não entra no saldo
- [ ] Tarefa já paga não entra no saldo
- [ ] Soma feita em centavos inteiros, sem ponto flutuante
- [ ] Exibição formatada em reais no padrão brasileiro

**Observações técnicas**
Esta é a função financeira central do sistema. Isolar em um módulo próprio, sem mistura com código de tela, para permitir verificação independente.

---

#### A25 — Exibir saldo e progresso no painel da criança

**Tipo:** Frontend
**Complexidade:** Baixa
**Depende de:** A24
**Fase:** 2

**Descrição**
Card em destaque no topo do painel da criança mostrando o saldo disponível, a quantidade de tarefas concluídas e a quantidade de tarefas disponíveis no momento.

**Critérios de aceite**
- [ ] Saldo exibido em reais, formatado no padrão brasileiro
- [ ] Contadores de concluídas e disponíveis conferem com a listagem
- [ ] O card atualiza após uma tarefa ser aprovada
- [ ] Card legível em viewport de 360px

---

#### A26 — Criar tela de resumo por criança

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A24
**Fase:** 3

**Descrição**
Tela do `master` com um bloco por criança, exibindo quantidade de atividades concluídas, quantidade de atividades perdidas, dinheiro gerado, dinheiro perdido e saldo disponível.

**Critérios de aceite**
- [ ] Um bloco por criança, lado a lado no desktop e empilhados no mobile
- [ ] Os cinco indicadores aparecem em cada bloco
- [ ] Valores conferem com as listagens de tarefas
- [ ] Tela acessível apenas ao perfil `master`

---

#### A27 — Implementar filtro de período no resumo

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A26
**Fase:** 3

**Descrição**
Filtro de data inicial e final aplicado aos indicadores do resumo, com padrão na competência mensal corrente conforme a RN09.

**Critérios de aceite**
- [ ] Ao abrir a tela, o período vem preenchido do dia 1 ao último dia do mês atual
- [ ] Alterar as datas recalcula todos os indicadores
- [ ] Data final anterior à inicial é rejeitada com mensagem
- [ ] Existe atalho para o mês anterior
- [ ] O período selecionado aparece escrito na tela

---

#### A28 — Calcular indicadores de dinheiro gerado e perdido

**Tipo:** Regra de negócio
**Complexidade:** Alta
**Depende de:** A27
**Fase:** 3

**Descrição**
Implementar os cálculos das RN06 e RN07, filtrando por `dataAprovacao` e `dataPerda` dentro do período selecionado.

**Critérios de aceite**
- [ ] Dinheiro gerado confere com o exemplo da RN06: R$ 15,00 mesmo com saldo zerado por pagamento
- [ ] Dinheiro perdido confere com o exemplo da RN07: R$ 3,00 + R$ 4,50 = R$ 7,50
- [ ] Tarefa reaberta e aprovada deixa de contar como perdida
- [ ] Dinheiro gerado inclui tarefas já pagas; saldo disponível não
- [ ] Tarefas fora do período não entram em nenhum dos dois indicadores
- [ ] Somas feitas em centavos inteiros

**Observações técnicas**
A distinção entre dinheiro gerado e saldo disponível é a principal fonte de confusão do relatório. São números diferentes por definição e devem ter rótulos que deixem isso claro na tela.

---

#### A29 — Criar listagem de atividades perdidas

**Tipo:** Frontend
**Complexidade:** Baixa
**Depende de:** A27
**Fase:** 3

**Descrição**
Lista, dentro da tela de resumo, das tarefas com `status = perdida` no período, com nome, criança, valor não ganho, prazo original e data da perda.

**Critérios de aceite**
- [ ] Somente tarefas perdidas dentro do período aparecem
- [ ] Cada linha mostra o valor que deixou de ser ganho
- [ ] A soma da coluna de valor bate com o indicador de dinheiro perdido
- [ ] Lista ordenada por data da perda, mais recente primeiro

---

#### A30 — Implementar registro de pagamento da mesada

**Tipo:** Regra de negócio
**Complexidade:** Alta
**Depende de:** A24
**Fase:** 3

**Descrição**
Ação do `master` que registra o pagamento do saldo de uma criança conforme a RN08: cria o documento em `pagamentos` e marca as tarefas liquidadas com `pago = true`.

**Critérios de aceite**
- [ ] A tela mostra o valor a pagar e a lista de tarefas que o compõem antes de confirmar
- [ ] Confirmação grava o pagamento com valor, data e `tarefaIds`
- [ ] Todas as tarefas liquidadas recebem `pago = true` e `pagamentoId`
- [ ] Saldo disponível fica zerado após o registro
- [ ] Gravação feita em transação: ou tudo é gravado, ou nada é
- [ ] Pagamento com saldo zero é bloqueado
- [ ] Confere com o exemplo da RN08: R$ 15,00 pagos, T1 e T2 marcadas, saldo em R$ 0,00

**Observações técnicas**
Usar `writeBatch` ou transação do `Firestore`. Gravar o pagamento sem marcar as tarefas duplicaria o saldo na leitura seguinte, que é a falha mais grave possível neste sistema.

---

#### A31 — Criar histórico de pagamentos

**Tipo:** Frontend
**Complexidade:** Baixa
**Depende de:** A30
**Fase:** 3

**Descrição**
Listagem permanente de todos os pagamentos já registrados, por criança, com data, valor e as tarefas que compuseram cada pagamento.

**Critérios de aceite**
- [ ] Todos os pagamentos aparecem, sem recorte por período
- [ ] Cada pagamento pode ser expandido para mostrar as tarefas liquidadas
- [ ] Lista ordenada da data mais recente para a mais antiga
- [ ] O total pago acumulado por criança é exibido
- [ ] O histórico não oferece ação de exclusão

---

#### A32 — Ajustar responsividade mobile das telas da criança

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A25
**Fase:** 3

**Descrição**
Revisão final de todas as telas do perfil `junior` em celular: tamanho de fonte, área de toque, comportamento do teclado numérico, upload de foto e ausência de rolagem horizontal.

**Critérios de aceite**
- [ ] Nenhuma tela apresenta rolagem horizontal em viewport de 360px
- [ ] Todos os botões têm no mínimo 44px de área de toque
- [ ] O teclado do celular não cobre o campo que está sendo preenchido
- [ ] O fluxo completo de concluir tarefa com foto foi testado em um celular real
- [ ] Textos legíveis sem zoom

---

#### A33 — Escrever README do repositório

**Tipo:** Infra
**Complexidade:** Baixa
**Depende de:** A10
**Fase:** 3

**Descrição**
Documentar no README o que o projeto faz, como rodar localmente, como configurar o Firebase, como executar a carga inicial de perfis e como alterar os PINs.

**Critérios de aceite**
- [ ] README explica o propósito do projeto em um parágrafo
- [ ] Passo a passo de configuração do Firebase documentado
- [ ] Processo de carga inicial dos perfis documentado
- [ ] Procedimento de troca de PIN documentado
- [ ] URL do portal publicado consta no README

---

#### A34 — Implementar criação e listagem de tarefa bônus

**Tipo:** Regra de negócio
**Complexidade:** Média
**Depende de:** A12, A13
**Fase:** 2

**Descrição**
Suportar tarefa com `tipoAtribuicao = bonus` no cadastro, na gravação e na listagem do `master`, conforme a RN11. A tarefa nasce em `status = aberta` sem `criancaId`.

**Critérios de aceite**
- [ ] Tarefa bônus é gravada com `criancaId = null` e `status = aberta`
- [ ] Na listagem do `master`, tarefa bônus não aceita aparece marcada como aberta, sem criança
- [ ] Após o aceite, a listagem passa a exibir a criança dona e a `dataAceite`
- [ ] O filtro por criança do `master` inclui a opção de ver apenas as bônus em aberto
- [ ] O `master` pode editar uma tarefa bônus não aceita e convertê-la em direcionada

---

#### A35 — Implementar aceite exclusivo de tarefa bônus

**Tipo:** Regra de negócio
**Complexidade:** Alta
**Depende de:** A16, A34
**Fase:** 2

**Descrição**
Ação de aceitar tarefa bônus no painel da criança. O aceite grava `criancaId`, `dataAceite` e muda o `status` para `disponivel`, em transação, garantindo que apenas a primeira criança consiga.

**Critérios de aceite**
- [ ] Botão de aceitar aparece apenas em tarefa com `status = aberta`
- [ ] O aceite é executado em transação do `Firestore`, lendo o `status` dentro dela
- [ ] Se duas crianças aceitarem quase ao mesmo tempo, apenas uma vence e a outra recebe mensagem de tarefa já pega
- [ ] Após o aceite, a tarefa some do painel da criança que perdeu
- [ ] Após o aceite, a tarefa se comporta exatamente como tarefa direcionada
- [ ] A criança não consegue desfazer o próprio aceite

**Observações técnicas**
Esta é uma condição de corrida real: duas crianças no mesmo Wi-Fi vendo a mesma tarefa. Ler e escrever em duas operações separadas permite que as duas ganhem, e a tarefa acabaria com dois donos. Usar `runTransaction` e abortar se o `status` já não for `aberta`. Repetir a verificação nas regras de segurança do `Firestore`.

---

#### A36 — Implementar limite de 3 tentativas de conclusão

**Tipo:** Regra de negócio
**Complexidade:** Média
**Depende de:** A22
**Fase:** 2

**Descrição**
Aplicar a RN12: ao rejeitar uma conclusão cujo `tentativas` já esteja em 3, a tarefa vai para `status = perdida` com `dataPerda` preenchida, em vez de voltar para `disponivel`.

**Critérios de aceite**
- [ ] Rejeição com `tentativas` menor que 3 devolve a tarefa para `disponivel`
- [ ] Rejeição com `tentativas` igual a 3 move a tarefa para `perdida` e grava `dataPerda`
- [ ] Tarefa perdida por esgotamento de tentativas entra em dinheiro perdido
- [ ] A criança vê quantas tentativas restam antes de cada envio
- [ ] A tela de aprovação do `master` mostra o número da tentativa e avisa quando é a última
- [ ] Reabertura pelo `master` via A20 zera o contador de tentativas

---

#### A37 — Implementar definição de PIN no primeiro acesso

**Tipo:** Frontend
**Complexidade:** Média
**Depende de:** A06
**Fase:** 1

**Descrição**
Fluxo de primeiro acesso conforme a RN13: perfil com `pinDefinido = false` abre a tela de criação de PIN, com digitação e confirmação, e grava `pinHash` e `pinDefinido = true`. Inclui a ação do `master` de zerar o PIN de um perfil `junior`.

**Critérios de aceite**
- [ ] Perfil sem PIN definido abre a tela de criação em vez da tela de digitação
- [ ] O PIN precisa ser digitado duas vezes e as duas digitações precisam coincidir
- [ ] PIN com menos de 4 dígitos ou não numérico é rejeitado
- [ ] Após definir, o perfil entra direto no painel correspondente
- [ ] No acesso seguinte, o perfil pede o PIN normalmente
- [ ] O `master` consegue zerar o PIN de `Anthony` e de `Gabriel`, devolvendo-os ao primeiro acesso
- [ ] Nenhum perfil consegue zerar o PIN do `master`
- [ ] O PIN é gravado apenas como hash

**Observações técnicas**
Se o `master` esquecer o próprio PIN, a recuperação é manual pelo console do Firebase. Documentar esse procedimento no README de A33.

---

## 10. Ordem de execução sugerida

**Fase 1 — Fundação:** A01, A02, A03, A04, A05, A06, A37, A07, A08, A09, A10
**Fase 2 — Núcleo funcional:** A11, A12, A13, A14, A15, A16, A17, A18, A19, A20, A21, A22, A36, A23, A34, A35, A24, A25
**Fase 3 — Relatório e fechamento:** A26, A27, A28, A29, A30, A31, A32, A33

O critério é dependência técnica real: o modelo de dados e o controle de acesso precisam existir antes de qualquer tela funcional, e o ciclo completo da tarefa precisa estar fechado antes de existir relatório sobre ele. Publicar cedo (A10) é deliberado — é mais barato descobrir problema de caminho relativo e domínio autorizado na primeira semana do que na última.

**Corte para o prazo de 30/08/2026.** São 15 dias corridos para 37 atividades, em um primeiro projeto. Se o prazo apertar, o mínimo que precisa estar publicado e em uso são as Fases 1 e 2 — o sistema já funciona com tarefa, foto, aprovação e saldo visível. A Fase 3 pode entrar na semana seguinte, com o pagamento do primeiro mês sendo calculado pela tela de saldo. Dentro da Fase 2, A34 e A35 (tarefa bônus) são as candidatas naturais a adiamento: são as únicas que não bloqueiam nenhuma outra atividade.

## 11. Riscos

| Nº | Risco | Impacto | Mitigação |
|----|-------|---------|-----------|
| 1 | Regras de segurança permissivas deixam a base aberta na internet | Alto | A09 com teste positivo e negativo documentado; nunca publicar em modo de teste |
| 2 | Foto de celular sem compressão estoura a cota do plano gratuito | Alto | Compressão obrigatória no cliente em A18, limite de 2MB na regra do Storage |
| 3 | Pagamento gravado sem marcar as tarefas duplica o saldo | Alto | Transação atômica em A30 |
| 4 | Relógio do celular errado faz tarefa expirar na hora errada | Médio | Comparar sempre contra o timestamp do servidor em A19 |
| 5 | Tarefa bônus aceita simultaneamente pelas duas crianças fica com dois donos | Alto | Transação em A35, com verificação de `status` dentro da transação e nas regras do Firestore |
| 6 | Prazo de 30/08 com 37 atividades em um primeiro projeto | Alto | Corte definido na seção 10: Fases 1 e 2 são o mínimo publicável; A34 e A35 são adiáveis |
| 7 | PIN de 4 dígitos é frágil e as crianças podem descobrir o PIN do pai | Médio | Aceito por ser uso doméstico; regras do Firestore continuam sendo a barreira real |
| 8 | Master esquece o próprio PIN e perde acesso à gestão | Médio | Procedimento de recuperação manual pelo console documentado no README em A33 |
| 9 | Criança perde a tarefa por não ver o prazo chegando | Médio | Tempo restante visível em cada tarefa em A16; sem notificação, que está fora de escopo |
| 10 | Disputa entre as crianças por tarefa bônus gera conflito fora do sistema | Médio | `dataAceite` registrada e visível, tornando o critério objetivo e auditável |
| 11 | Firebase gratuito muda de política ou de cota | Baixo | Volume baixíssimo; modelo de dados simples permite migração posterior |

## 12. Pontos a confirmar com o cliente

Os itens abaixo surgiram da definição da tarefa bônus e do limite de tentativas, e ainda não têm resposta.

1. Na tarefa bônus, o prazo conta a partir da criação ou passa a contar a partir do aceite? O escopo assume prazo absoluto definido na criação (premissa 11).
2. A criança pode aceitar quantas tarefas bônus quiser ao mesmo tempo, ou existe limite de tarefas bônus simultâneas por criança?
3. Tarefa bônus que ninguém aceitou até o prazo entra como dinheiro perdido? De quem, já que não tem dono? O escopo assume que não entra em nenhum indicador de criança (premissa 12).
4. O `master` pode retirar uma tarefa bônus da criança que já aceitou e devolvê-la à disputa?
5. Quando a tarefa é perdida por esgotar as 3 tentativas, a criança deve ver o motivo das três rejeições em algum lugar?
6. Reabrir uma tarefa perdida zera as 3 tentativas, dando à criança um novo ciclo completo. Isso é o desejado ou a reabertura deve manter o contador?

## 13. Premissas assumidas

1. **A nuvem escolhida é o Firebase.** A definição foi "Firebase ou Supabase"; o escopo foi escrito para Firebase. Trocar para Supabase mantém o backlog, mas altera A02, A05, A09 e A18.
2. **Autenticação anônima do Firebase acompanha o PIN.** O PIN sozinho não protege a base, porque a regra de segurança precisa de um usuário autenticado para avaliar. Se essa premissa cair, A09 vira uma base aberta e o risco 1 se concretiza.
3. **Os três perfis são criados por carga inicial, não por tela.** Não há CRUD de usuários. Se o cliente quiser cadastrar mais crianças depois, entram atividades novas a partir de A34.
4. **A expiração acontece na leitura, não por rotina agendada.** GitHub Pages não executa código de servidor. Se for exigida expiração em horário exato sem ninguém abrir o portal, será necessária uma Cloud Function, que hoje está fora de escopo.
5. **Valores gravados em centavos inteiros.** Não foi discutido na reunião; é decisão técnica para evitar erro de arredondamento em cálculo financeiro.
6. **O período padrão do relatório é a competência mensal corrente.** A menção a "de 1 a 31" foi interpretada como mês fechado.
7. **A rejeição de uma conclusão apaga a foto anterior.** Evita acúmulo de arquivo órfão no Storage. Se o cliente quiser guardar as tentativas rejeitadas, A22 muda.
8. **O histórico de pagamentos nunca é apagado pela aplicação.** Não há ação de excluir pagamento em nenhuma tela.
9. **Sem notificação de qualquer tipo.** A criança descobre uma tarefa nova, inclusive a bônus, abrindo o portal. Numa disputa por tarefa bônus, ganha quem abriu o portal primeiro — não quem estava mais disposto.
10. **Uma foto por tarefa.** Não foi mencionado anexo múltiplo.
11. **O prazo da tarefa bônus é absoluto, contado da criação.** Aceitar a tarefa não reinicia o relógio. Se a premissa cair, A35 passa a recalcular o `prazo` no momento do aceite.
12. **Tarefa bônus não aceita por ninguém não entra em dinheiro perdido.** Sem dono, não há a quem atribuir a perda. Ela aparece apenas na listagem geral do `master`.
13. **A reabertura de tarefa perdida zera o contador de tentativas.** Decisão técnica para evitar tarefa reaberta que já nasce sem tentativa disponível.
14. **O `master` também define o próprio PIN no primeiro acesso.** A definição foi dada para as crianças; aplicar aos três perfis mantém o fluxo único e evita PIN de pai gravado no repositório.
15. **O prazo de 30/08/2026 vale para as Fases 1 e 2.** A Fase 3 é tratada como desejável na data, não como bloqueante.