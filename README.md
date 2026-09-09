# Portal Mesada

Portal web doméstico para gerenciar mesada por tarefas. O pai (perfil
`master`) cria tarefas com valor e prazo para Anthony ou Gabriel (perfil
`junior`); cada criança executa a tarefa, comprova com foto e o pai aprova
ou rejeita. Só depois da aprovação o valor entra no saldo da criança. Existe
também "tarefa bônus" (sem dono definido, disputada por quem aceitar
primeiro) e uma tela de resumo com saldo, dinheiro gerado/perdido no
período e registro de pagamento.

Sem framework, sem build step, sem bundler — HTML, CSS e JavaScript puro,
com o SDK do Firebase importado por CDN via módulos ES. O guia com modelo de
dados, regras de negócio e convenções do projeto está em
[`CLAUDE.md`](CLAUDE.md).

**URL publicada:** _(preencher depois de habilitar o GitHub Pages)_

## Rodando localmente

O login anônimo usa `crypto.subtle` (Web Crypto), que só funciona em
contexto seguro (`https://` ou `localhost`) — **abrir o `index.html`
direto pelo `file://` não funciona.** Suba um servidor local simples na
raiz do projeto:

```bash
python3 -m http.server 8000
# ou: npx serve .
```

E acesse `http://localhost:8000`.

## Configuração do Firebase

1. Criar um projeto no [console do Firebase](https://console.firebase.google.com).
2. Habilitar **Firestore**, **Storage** e **Authentication → Anonymous**.
3. Copiar as chaves do app web para `js/firebase-config.js` (`firebaseConfig`). Essa configuração é pública por natureza — a proteção real vem das regras de segurança, não de esconder a chave.
4. Publicar as regras de segurança — passo a passo detalhado na seção [Passo a passo — publicar as regras de segurança](#passo-a-passo--publicar-as-regras-de-segurança) abaixo. **Não deixe em modo de teste.**
5. Em Authentication → Settings → Authorized domains, adicionar o domínio do GitHub Pages depois de publicado.

## Carga inicial dos perfis

Os três perfis são fixos e não têm tela de cadastro — são criados
manualmente na coleção `perfis` do Firestore, pelo console:

| Documento (id) | `nome` | `tipo` | `pinDefinido` |
|---|---|---|---|
| `pai` | Pai | `master` | `false` |
| `anthony` | Anthony | `junior` | `false` |
| `gabriel` | Gabriel | `junior` | `false` |

Não preencher `pinHash` na carga inicial — cada perfil define o próprio PIN
de 4 dígitos no primeiro acesso pelo app (dois cliques: digitar e
confirmar). `avatarCor` é opcional, usado só se a UI vier a exibir cor por
perfil.

### Passo a passo — criar o documento do Gabriel

Os perfis `pai` e `anthony` já existem (foram criados assim antes desta
sessão). Falta só o `gabriel`:

1. Abra o [console do Firebase](https://console.firebase.google.com) e entre no projeto `portal-mesada`.
2. No menu à esquerda, **Build → Firestore Database**.
3. Na lista de coleções, clique em **`perfis`**.
4. Clique em **"+ Adicionar documento"** (Add document).
5. Em **"ID do documento"**, digite exatamente `gabriel` (minúsculo, sem acento) — não deixe no automático.
6. Adicione os campos, um de cada vez, clicando em **"+ Adicionar campo"**:
   - `nome` — tipo `string` — valor `Gabriel`
   - `tipo` — tipo `string` — valor `junior`
   - `pinDefinido` — tipo `boolean` — valor `false`
   - `avatarCor` — tipo `string` — valor à sua escolha (ex.: `#4caf50`) — opcional, pode pular
7. **Não** crie o campo `pinHash` agora — ele é gravado sozinho pelo app quando o Gabriel definir o PIN dele pela primeira vez.
8. Clique em **Salvar**.

Para conferir: abra o portal, clique em "Gabriel (junior)" — deve aparecer a tela de criar PIN (dois campos), não a de digitar PIN.

### Passo a passo — publicar as regras de segurança

Sem isso, o Firestore e o Storage continuam com a configuração que estavam
antes (modo de teste ou o que veio por padrão) — **é o item de maior risco
do projeto**, então vale conferir com calma.

**Firestore:**
1. No console do Firebase, **Build → Firestore Database**.
2. Clique na aba **"Regras"** (Rules), no topo.
3. Apague todo o conteúdo do editor.
4. Abra o arquivo [`firestore.rules`](firestore.rules) deste repositório, copie o conteúdo inteiro e cole no editor do console.
5. Clique em **"Publicar"** (Publish).

**Storage:**
1. No console do Firebase, **Build → Storage**.
2. Clique na aba **"Regras"** (Rules), no topo.
3. Apague todo o conteúdo do editor.
4. Abra o arquivo [`storage.rules`](storage.rules) deste repositório, copie o conteúdo inteiro e cole no editor do console.
5. Clique em **"Publicar"** (Publish).

Para conferir que não travou nada: abra o portal, entre com um perfil, crie
uma tarefa, e (como criança) conclua uma tarefa anexando uma foto. Se
alguma dessas ações der erro de permissão no console do navegador (F12),
volte na aba Regras do serviço correspondente e revise o que foi colado.

## PIN: como funciona e como resetar

O PIN nunca é gravado em texto puro. `js/pin.js` calcula
`SHA-256(pin + ":" + idDoPerfil)` (Web Crypto, sem biblioteca) e grava o
resultado em `pinHash`. No primeiro acesso o perfil pede o PIN duas vezes
(criação); nos acessos seguintes, pede uma vez e compara o hash.

- **Resetar o PIN de uma criança**: o pai faz login e, no painel (`pai.html`), usa os botões "Resetar PIN do Anthony" / "Resetar PIN do Gabriel". Isso zera `pinHash` e devolve o perfil ao fluxo de primeiro acesso.
- **O pai esqueceu o próprio PIN**: não tem reset pelo app (nenhum perfil pode zerar o PIN do `pai`, de propósito). Recuperação é manual: no console do Firebase, editar o documento `perfis/pai` e apagar o campo `pinHash` e marcar `pinDefinido: false`. No próximo acesso, o app pede para definir um PIN novo.

## Publicando no GitHub Pages

1. Configurações do repositório → Pages → publicar a partir da branch principal, pasta raiz.
2. Conferir que a URL pública abre sem erro no console (desktop e celular).
3. Adicionar o domínio gerado (`usuario.github.io`) nos domínios autorizados do Firebase Authentication (passo 5 da configuração acima) — sem isso, o login anônimo falha nesse domínio.
4. Atualizar o link no topo deste README.

## Limitação de segurança conhecida

Anonymous Auth garante só que a requisição vem de alguém que abriu o app —
não distingue pai de criança no servidor. O PIN é uma conveniência
doméstica, não uma barreira de segurança forte (ver `CLAUDE.md` para o que
as regras de segurança garantem e o que elas não conseguem garantir com
essa arquitetura).
