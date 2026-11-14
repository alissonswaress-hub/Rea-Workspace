# REA Workspace

Ambiente dedicado ao **REA (Reverse Engineer Anything)**, separado dos demais projetos.

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
