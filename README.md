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
