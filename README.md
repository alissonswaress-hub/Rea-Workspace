## Nova integração: REA + Copilot Agent (programação com IA)

O **REA Hub** agora usa o GitHub Copilot de duas formas: pelo **Agent no VS Code** (que já aparece no Codespace) ou pela **CLI**, que permite gerar código a partir do celular depois de instalar e autenticar uma vez. O Copilot escreve código próprio, em vez de reaproveitar o antigo template genérico.

**Para atualizar o laboratório no Codespace existente:**

~~~bash
git pull --ff-only && bash scripts/rea-hub-mobile.sh --upgrade
~~~

Entre no REA Hub, identifique um aplicativo ou analise o APK, e abra **04 / INTELIGÊNCIA ARTIFICIAL → Desenvolver com Copilot**. Escolha nome e funcionalidades; clique em **Preparar projeto para o Copilot**. Em seguida:

- **No notebook:** copie a tarefa e envie para o **Copilot Agent** que já aparece à direita no Codespace. O agente especializado reconstrutor-rea está incluído no repositório.
- **No celular, após ativar CLI:** execute uma única vez no Codespace **npm install -g @github/copilot && copilot login**. Depois use **IA: construir aplicativo agora** no REA Hub, com confirmação de consumo de créditos. A prévia abre na porta **4174, PRIVATE**.

A programação automática requer autenticação e créditos de GitHub Copilot. Os testes de integração usam mocks, pois **a execução real na sua conta ainda depende dessa ativação**. O aplicativo produzido será um projeto original e revisável, não uma cópia exata do APK. Veja [guia REA + Copilot](docs/REA-COPILOT.md).

O antigo gerador por modelos foi **desativado na interface**. A seção **05 / LIMPEZA** permite excluir os rascunhos antigos sem apagar REA, Hopper, JADX nem relatórios.

## Abrir REA Hub direto pelo celular

O laboratório agora pode ser adicionado à tela inicial do Android, com login lembrado no aparelho e painel em segundo plano.

No **Codespace existente**, abra um novo terminal e execute **uma única vez**:

```bash
git pull --ff-only && bash scripts/rea-hub-mobile.sh --upgrade
```

O terminal imprimirá **o link privado exato** do seu REA Hub e sua senha inicial. Abra esse link pelo Chrome do celular, marque **Lembrar acesso neste celular** e escolha **⋮ → Adicionar à tela inicial**. Mantenha a porta **3000 privada**.

O Codespaces pode pausar. Se o atalho não abrir, inicie seu Codespace em https://github.com/codespaces. O servidor foi configurado para reiniciar nas próximas sessões. Veja [guia completo para celular](docs/ACESSO-CELULAR.md).

# REA Workspace

Ambiente dedicado ao **REA (Reverse Engineer Anything)**, separado dos demais projetos.

## Projeto independente inspirado em apps de treino: TreinoLab

Além do laboratório REA, este repositório agora contém o **TreinoLab**, um aplicativo demonstrativo próprio de treinos, disponível em projetos/treinolab. Ele **não é uma cópia do Befit**, mas utiliza as funcionalidades públicas da categoria como referência: fichas, exercícios, registro de carga e acompanhamento de progresso.

No **Codespace já existente**, abra um novo terminal e execute:

~~~bash
git pull --ff-only && npm run treino
~~~

Na aba **Portas**, clique na porta **4173** e selecione **Abrir no navegador**. Mantenha a porta **Private**. O REA Hub da porta 3000 continua separado.

O TreinoLab funciona sem conta, com dados locais do navegador, e não deve ser usado como serviço de produção sem banco de dados, autenticação e revisão de segurança. Para documentação e funcionalidades, consulte [README TreinoLab](projetos/treinolab/README.md).

## Comece aqui: analisar aplicativo Android somente pelo celular

**Fluxo simples, sem computador ou ADB:** acesse o REA Hub na porta privada 3000 do seu Codespace.

1. Cole o link da Google Play no campo **Link da Play Store** e toque em **Identificar aplicativo**. Isso identifica o app por informações públicas, **não analisa seu código**.
2. Para uma inspeção de APK de um app que você pode estudar, instale o app no telefone. O painel inclui um atalho para o **[APK Extractor gratuito e de código aberto](https://play.google.com/store/apps/details?id=com.kolehoenicke.apkextractor)**. Ele exporta um `.apk` ou um ZIP com base + splits, sem computador, root ou ADB. Confira as condições e a fonte antes de instalar.
3. Volte ao REA Hub, selecione **APK / ZIP**, toque **Preparar análise Android** se o JADX não estiver ativo e envie o arquivo exportado. O REA gerará relatórios do manifesto e classes quando o JADX estiver disponível.

Para carregar a nova versão no **Codespace já existente** (um último passo de atualização):

```bash
git pull --ff-only && npm start
```

Se o painel antigo estiver ocupando a porta 3000, interrompa-o no terminal anterior com Ctrl+C antes de executar `npm start`. Deixe a porta **Private**. Sem o APK, nenhuma engenharia reversa real do app é possível a partir do link.

**Limite atual:** arquivo de até 160 MB. Para ZIP com APKs divididos, o painel extrai e analisa o `base.apk`, lista os demais arquivos e informa que os componentes adicionais podem exigir análise separada. Não recupera servidores nem código-fonte original. Use apenas arquivos que tem autorização para examinar e reimplemente recursos com código próprio.

## Analisar aplicativos Android APK de verdade

O REA Hub agora pode receber APKs Android com até **160 MB** e executar análise estática usando **JADX (Java) no Codespaces**, sem executar o app.

Para ativar esse recurso no **Codespace existente**, abra um novo terminal e execute:

```bash
git pull --ff-only && bash scripts/preparar-rea-android.sh
```

Depois reinicie o painel REA Hub na porta 3000 com `npm start`. Na interface, selecione **App Android**, envie um arquivo `.apk` obtido legitimamente e toque em **Iniciar análise**. O relatório indicará manifesto, permissões, classes e observações que o decompilador conseguir recuperar.

**O APK do Befit ainda não está no nosso ambiente**. A página da Play Store não disponibiliza diretamente o binário. Para obter os arquivos do app instalado em seu próprio telefone via ADB, siga [Guia Android e Befit](docs/ANDROID-REA.md). Um app do Google Play pode usar APKs divididos; o `base.apk` por si só pode revelar apenas parte do código/recursos.

Isso não é um clonador automático de aplicativos proprietários. O REA auxilia o estudo técnico; a implementação de produto com funcionalidades equivalentes usa **código e identidade próprios**.

## REA Hub: painel visual (celular e computador)

Este repositório agora inclui uma central para analisar arquivos com **REA + Hopper** pelo navegador, sem editar comandos toda vez. O painel roda **dentro do seu GitHub Codespace**, não é um site público de produção. Ele não faz upload de binários para o GitHub e não executa arquivos que você enviar.

### Abrir o painel em seu Codespace existente

1. Abra o Codespace **improved system** do `Rea-Workspace`.
2. No terminal, execute **um único comando**:

   ```bash
   git pull --ff-only && npm start
   ```

3. O terminal mostrará **SENHA TEMPORARIA**. Copie a chave (não compartilhe).
4. Na aba **Portas / Ports** do Codespaces, encontre a **porta 3000** e clique em **Abrir no navegador / Open in Browser**. Se não aparecer, na aba Portas clique em **Adicionar porta / Forward a Port** e digite `3000`.
5. Cole a senha no painel. Pressione **Programa de exemplo → Iniciar análise** ou escolha seu próprio arquivo de até 12 MB.

A porta deve continuar **Private (privada)**, nunca Public. Deixe o terminal aberto enquanto usar o painel. Para interromper, pressione **Ctrl+C** no terminal. O Codespaces possui franquias de uso e pode gerar custos.

### O que o painel faz

- Compila o exemplo `exemplos/loja_demo.c` para uma análise segura demonstrativa.
- Recebe arquivos para análise **sem executá-los**. O REA faz o processamento com o Hopper localmente.
- Exibe as etapas, consulta os relatórios JSON e permite copiar/baixar os resultados.
- Inspeciona uma função opcional e salva o histórico em `results/painel/`.
- Gera um **prompt para IA** com o relatório para ser copiado, mediante sua revisão. **Isso não significa integração automática com Codex, Copilot ou qualquer agente externo.** Para ativar esses agentes, suas instalações e autenticações precisam ser realizadas separadamente.

### Segurança e limites

- Senha efêmera gerada a cada execução. O painel bloqueia APIs sem a senha e guarda a chave apenas na sessão do navegador.
- O repositório está **público**, mas `targets/` e `results/` são ignorados pelo Git. **Não execute `git add -f` nessas pastas.**
- Ferramentas de análise também podem ter vulnerabilidades. Use apenas arquivos próprios ou com permissão; evite arquivos desconhecidos não confiáveis.
- O Hopper requer instalação e licença próprias e a análise pode demorar ou falhar em formatos não suportados.
- A configuração do caminho `/opt/hopper/bin/Hopper` já é detectada pelo painel; em um novo Codespace pode ser preciso instalar o Hopper novamente.

### Testes automáticos

O GitHub Actions executa `npm test` e valida interface, autenticação e um teste simulado de análise. Para a análise verdadeira com Hopper, utilize o Codespace que já tem Hopper instalado.

## Abrir pelo celular ou computador

1. Acesse este repositório no GitHub.
2. Toque em **Code → Codespaces → Create codespace on main**.
3. Aguarde o ambiente carregar no navegador. O arquivo `.devcontainer/devcontainer.json` instala Node.js 24 e o pacote oficial `rea-agents` automaticamente **quando um novo Codespace é criado**.
4. Abra o terminal do Codespace e execute:

   ```bash
   rea doctor
   rea setup
   ```

5. No `rea setup`, escolha um agente de programação compatível que você tenha instalado (por exemplo, Codex ou Claude Code), revise as alterações propostas e conclua a configuração. Reinicie o agente depois. Para usar apenas a linha de comando, confira `rea --help`.

> **Importante:** salvar os arquivos neste repositório não instala o REA na sua conta do GitHub nem conecta automaticamente o REA a esta conversa. A instalação acontece no Codespace, e o registro MCP depende do agente escolhido.

## Primeiro teste real (REA + Hopper)

O repositório contém um exemplo original, `exemplos/loja_demo.c`, com funções de vendas, desconto e lucro. Um teste automático no GitHub Actions verifica se o programa compila, executa e conserva nomes de funções. **A análise Hopper roda no Codespace, não no GitHub Actions**, pois Hopper está instalado no seu ambiente.

No **terminal do Codespace existente**, execute apenas:

```bash
git pull --ff-only && bash scripts/testar-rea-hopper.sh
```

O script compila o exemplo em `build/`, verifica a saída, chama `rea doctor --provider hopper --json`, tenta analisar o binário com `rea analyze --provider hopper --json` e solicita o dossiê da função `calcular_total` com `rea function`.

- Sucesso: a última linha informa **TESTE COMPLETO**.
- Se o Hopper falhar ao iniciar, consulte `results/analise-hopper-erro.txt`. O `doctor` saudável verifica o caminho e os pré-requisitos, mas não substitui uma análise real.
- Os resultados ficam em `results/` e não são enviados ao GitHub pelo script.
- Para novo Codespace, a instalação do Hopper pode precisar ser repetida; a configuração do `.bashrc` não é compartilhada automaticamente entre contêineres.

## Corrigir falha do Hopper no Codespaces (novembro de 2026)

No Codespaces, pode ocorrer `authorization_or_package_manager_failed` com `exit ENOENT`, embora `sudo` e `apt-get` existam. O REA pode tentar uma ferramenta de autorização gráfica indisponível no contêiner. O erro **não comprova** que essa é a causa; confira o comando que falhou no relatório.

Se `sudo -n true` funcionar, execute a instalação como administrador para permitir ao REA chamar diretamente o gerenciador de pacotes:

```bash
sudo -n env "PATH=$PATH" rea setup --yes --client cursor --install-hopper --json
```

O comando aprova a instalação oficial do Hopper e dependências do sistema. Rode **somente dentro de um Codespace de sua confiança** e revise o resultado. Ele pode registrar a configuração do Cursor sob o usuário root, pois será executado como administrador. A configuração do usuário normal continua separada e pode ser atualizada depois:

```bash
rea setup --yes --client cursor
rea doctor --provider hopper --json
```

Se o Hopper continuar ausente, capture o objeto `hopper` do relatório do setup; a falha da instalação pode envolver pacote indisponível, rede ou dependências. Evite novas tentativas cegas.

O Hopper tem licença própria; o modo demonstração possui limitações. O Codespaces pode ter custos de computação e armazenamento.

## Atualização e diagnóstico

```bash
rea update
rea doctor
rea --help
```

A análise nativa avançada pode exigir ferramentas separadas, como Ghidra ou Hopper, e licenças próprias. O ambiente inicial não inclui essas ferramentas.

## Segurança

Este repositório está **público** no GitHub. Não faça commit de senhas, tokens, `.env`, arquivos de clientes ou aplicações privadas. Use apenas materiais que você tem autorização para analisar.

## Referências oficiais

- [REA no GitHub](https://github.com/morluto/rea)
- [Instalação e uso](https://rea.today/pt-BR/get-started)
- [Pacote npm `rea-agents`](https://www.npmjs.com/package/rea-agents)
