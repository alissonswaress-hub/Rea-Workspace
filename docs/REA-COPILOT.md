# REA Hub + GitHub Copilot: construção real de aplicativos

A integração usa GitHub Copilot para programar o aplicativo. O REA/Hopper/JADX faz análise técnica e o Copilot escreve código novo com base nas evidências disponíveis, requisitos e instruções. **Isso não é um clonador automático de APKs proprietários.**

## Depois de atualizar o Codespace

Abra o Codespace existente e execute uma única vez:

~~~bash
git pull --ff-only && bash scripts/rea-hub-mobile.sh --upgrade
~~~

O REA Hub continua na porta privada 3000. A prévia dos aplicativos criados automaticamente fica na porta privada **4174**, separada do painel. Na aba Portas, adicione/encaminhe 4174 caso ainda não apareça. **Nunca torne essas portas públicas.**

## Duas formas de usar a IA

### Opção A: GitHub Copilot Agent já visível no VS Code

Sem instalar novas ferramentas:

1. No REA Hub, identifique um app pela Play Store ou analise o APK com REA + JADX.
2. Na seção **04 / INTELIGÊNCIA ARTIFICIAL → Desenvolver com Copilot**, escolha a fonte, digite o nome do nosso app e descreva suas funcionalidades.
3. Toque em **Preparar projeto para o Copilot**. O painel salva uma missão em results/copilot-missions, com apenas metadados técnicos selecionados, sem copiar APK ou código proprietário.
4. Toque **Copiar tarefa para Copilot Agent no notebook**.
5. No chat do GitHub Copilot à direita no VS Code do Codespace, faça login com sua conta GitHub se necessário, selecione **Agent** ou o agente personalizado **reconstrutor-rea**, cole e envie.
6. Revise e aprove as ações de edição e testes solicitadas pelo Copilot. Ele trabalhará na pasta de projeto informada na missão. Confira os arquivos entregues, os testes e a prévia.

O agente especializado está configurado em .github/agents/reconstrutor-rea.agent.md. As regras gerais do repositório estão em .github/copilot-instructions.md.

### Opção B: Gerar código pela IA diretamente no celular com Copilot CLI

Este fluxo exige uma **ativação única no notebook**, separada da autenticação do Copilot Chat. O CLI é um produto oficial do GitHub e pode consumir créditos da sua conta.

No terminal do Codespace, use:

~~~bash
npm install -g @github/copilot && copilot login
~~~

Entre no GitHub pelo endereço e código fornecidos durante a autenticação. Não envie esse código para outras pessoas. O Copilot CLI é uma ferramenta externa; o REA Hub não instala automaticamente sem sua solicitação.

Depois volte ao REA Hub no celular:

1. Prepare uma missão na seção **Desenvolver com Copilot**.
2. Clique em **Verificar conexão do Copilot**.
3. Quando o CLI aparecer como instalado, toque em **IA: construir aplicativo agora**.
4. Confirme que o trabalho pode consumir créditos de Copilot.
5. Acompanhe na seção **Acompanhamento**. Se terminar com sucesso, use **Abrir aplicativo criado pela IA** para ver a prévia na porta privada 4174.

Nesta opção a CLI recebe somente uma cópia do brief dentro de results/copilot-missions/<id>/app. Os arquivos do aplicativo ficam **fora do Git**, na mesma pasta. O REA Hub limita ferramentas à leitura e edição, negando comandos shell e acesso via web. São verificados index.html, styles.css, app.js e a sintaxe do app.js. Isso não garante segurança integral nem qualidade de produção; revise todo código antes de usar.

Se a autenticação ou créditos falharem, o job mostrará o erro. O Copilot não será executado automaticamente sem o clique e a confirmação do usuário.

## O que o sistema realmente sabe

- **Link da Play Store:** apenas identificador e metadados públicos. Não revela o código.
- **APK analisado:** lista parte do manifesto, classes, componentes, permissões e outras evidências observadas; a análise pode ser limitada por ofuscação, Flutter e execução remota.
- **Copilot:** transforma esse contexto e requisitos em **código original**, com implementação e testes. Ele não recupera dados, servidores, algoritmos secretos, compras, assinaturas ou APIs privadas do app original.
- **Para semelhança funcional maior:** forneça prints das telas, descreva navegação e comportamentos esperados. A engenharia reversa sozinha não revela todo o design.
- **Copyright:** não copie código proprietário, materiais protegidos ou segredos. Não contorne pagamentos, autenticação ou licenças.

## Privacidade e isolamento

As tarefas e os códigos gerados automaticamente ficam em results/copilot-missions/, ignorados pelo Git. O agente do VS Code, quando acionado manualmente, pode produzir novos arquivos em projetos/copilot/; revise antes de qualquer commit em um repositório público. Os APKs ficam em targets/, os relatórios em results/painel/; nada disso deve ser enviado ao GitHub.

A prévia automática usa um servidor HTTP isolado na porta 4174 (origem diferente da central REA). Mantenha-a PRIVATE e não use código não revisado para aplicações reais.

## Testes

O GitHub Actions executa npm test e valida todos os fluxos de Copilot com um **agente simulado**. Isso testa autenticação, preparação da missão, controle de permissões, arquivos e prévia, mas **não comprova a execução efetiva do Copilot da sua conta**. Para isso, instale/autentique CLI e rode uma missão real.

Documentação oficial:
- https://docs.github.com/en/copilot/get-started/cli-quickstart
- https://docs.github.com/en/copilot/how-tos/copilot-in-your-ide/use-copilot-agents/use-agent-mode?tool=vscode
- https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/authenticate-copilot-cli
