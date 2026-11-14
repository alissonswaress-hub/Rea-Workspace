# REA Workspace

Ambiente dedicado ao **REA (Reverse Engineer Anything)**, separado dos demais projetos.

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
