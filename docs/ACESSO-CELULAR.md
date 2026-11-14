# REA Hub no celular: acesso por um ícone

O **REA Hub** é o laboratório privado que já funciona com REA, Hopper e análise Android por JADX. Você **não precisa hospedar um segundo site ou publicar a porta**.

## Ativar uma vez no Codespace existente

Abra o Codespace do repositório **Rea-Workspace** (você pode usar o navegador do celular), abra um **novo terminal** e cole esta única linha:

~~~bash
git pull --ff-only && bash scripts/rea-hub-mobile.sh --upgrade
~~~

O comando:
- Atualiza o código do painel sem mexer nos outros projetos.
- Reinicia somente o processo do REA Hub neste repositório, se existir.
- Inicia o REA Hub em segundo plano, sem precisar deixar `npm start` aberto.
- Configura a inicialização automática para novas sessões do Codespace; para o Codespace já existente há um fallback ao abrir um novo terminal.
- Gera e mostra **seu link privado real** usando as variáveis do Codespaces e **uma senha privada** que permanece a mesma nos próximos reinícios.
- Salva a senha em `.rea-private/secret`, ignorada pelo Git; o diretório fica dentro de `/workspaces` e é preservado em rebuilds.

**Não compartilhe a senha e não publique o link ou a porta. A porta 3000 deve continuar com visibilidade Private.**

## Colocar o ícone REA Hub no Android

1. No Chrome do Android, abra o **link exibido no terminal** depois do comando anterior. Faça login no GitHub, caso solicitado, porque o link usa uma porta privada.
2. Digite a **senha privada** mostrada durante a configuração, apenas uma vez. Deixe marcada **Lembrar acesso neste celular pessoal**.
3. Toque nos **três pontos (⋮)** do Chrome e selecione **Adicionar à tela inicial** ou **Instalar app**. Confirme o nome **REA Hub**.

Depois disso, o REA Hub terá um ícone junto dos aplicativos. Ele lembrará sua senha neste aparelho até você tocar em Bloquear, limpar os dados do navegador ou perder o armazenamento local.

O aplicativo também oferece um botão **Instalar REA Hub** quando o Chrome disponibilizar essa opção.

## Quando não abrir

O GitHub Codespaces **para após inatividade** e possui limite de duração de sessão. O ícone é um atalho ao laboratório hospedado no Codespace, não um servidor 24/7.

- Toque em [Meus Codespaces](https://github.com/codespaces), **inicie** o Codespace do Rea-Workspace, volte ao REA Hub e recarregue a página.
- Quando o Codespace for retomado, `postStartCommand` pode iniciar o painel automaticamente se a configuração do contêiner já tiver sido aplicada. No Codespace existente, a configuração pelo `.bashrc` também inicia o painel ao abrir um novo terminal.
- **Não reconstrua o contêiner apenas para o atalho.** Isso pode remover instalações manuais do Hopper/JADX feitas fora de `/workspaces`.
- Se perder a senha, abra o terminal do Codespace e execute `cat .rea-private/secret`. Não compartilhe capturas de tela que contenham essa senha.

Os relatórios de análise ficam em `results/`. A chave em `.rea-private/` não é adicionada ao Git.

## Para acessar 24 horas por dia

Isso exige substituir o Codespaces por um servidor próprio continuamente ligado (VPS/VM) com acesso HTTPS privado, autenticação e dependências REA/Hopper/JADX instaladas. Não é possível garantir disponibilidade contínua apenas com GitHub Codespaces; tampouco seria seguro publicar a porta sem controle de acesso.
