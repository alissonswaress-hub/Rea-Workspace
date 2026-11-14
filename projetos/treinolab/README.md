# TreinoLab | Aplicativo próprio de treinos

**Status:** primeira versão funcional para navegador e celular (PWA). Projeto independente, não afiliado ao Befit.

## Referência pública
- Play Store: https://play.google.com/store/apps/details?id=app.befit
- Site oficial: https://appbefit.com/pt-br/caracteristicas/

O Befit foi estudado como referência **de funcionalidades**, com base na descrição pública: planos adaptados ao objetivo, treinos, registros de séries/pesos, progressão, biblioteca de exercícios, acompanhamento muscular e recursos premium. **Nenhum código, APK, imagem, logotipo, interface exata ou dado privado do Befit foi utilizado neste protótipo.**

## O que já funciona
- Cinco áreas: Início, Treinos, Exercícios, Evolução e Perfil.
- Perfil com objetivo, nível, treino em casa ou academia e dias por semana.
- Geração local **por regras**, não por IA, de fichas para 2 a 5 dias.
- Fichas editáveis: adicionar/remover exercícios, configurar séries, repetições e descanso.
- Biblioteca inicial de 36 exercícios originais, sem vídeos de terceiros.
- Sessão ativa: séries, carga, repetições e cronômetro de descanso.
- Histórico e gráfico de volume calculado como peso vezes repetições.
- Backup e importação JSON; dados guardados no navegador.
- PWA offline após primeiro carregamento, conforme suporte do navegador.

## Abrir no GitHub Codespaces

Abra o **Codespace existente** do repositório Rea-Workspace. Em um terminal execute:

~~~bash
git pull --ff-only && npm run treino
~~~

Na aba **Portas**, encontre a **porta 4173**, mantenha a visibilidade **Private**, e clique em **Abrir no navegador**.

O REA Hub usa a porta 3000; o TreinoLab usa a porta 4173, em paralelo sem interferir no REA. Para interromper, pressione Ctrl+C no terminal. O Codespaces pode gerar custos conforme o uso.

## Dados e limitações

Esta é uma aplicação demonstrativa funcional, **não um serviço de produção**:
- Sem login, sincronização, backend, assinatura ou banco na nuvem.
- Dados são salvos no navegador; faça backup antes de limpá-lo.
- Regras gerais não substituem avaliação por profissionais de educação física ou saúde.
- A biblioteca inicial não possui as centenas de exercícios do Befit.
- O progresso representa volume registrado, não recuperação muscular clínica.
- Não incorpora nenhum APK ou conteúdo proprietário de terceiros.

## Caminho para transformar em produto comercial

1. Banco PostgreSQL/Supabase com contas, autenticação e exclusão de conta.
2. Catálogo próprio de exercícios com demonstrações produzidas ou licenciadas.
3. Personalização validada por profissionais; IA opcional, com limites claros.
4. Painel administrativo, notificações, métricas e sincronização.
5. Política de privacidade, segurança e adequação à LGPD.
6. Assinaturas digitais de acordo com regras vigentes da Google Play e App Store.
7. Empacotamento Android/iOS, testes de dispositivo e revisão das lojas.

## O REA não copiou o Befit

O REA e o Hopper do laboratório foram testados com um programa **original em C**, não com o APK do Befit. O link da Play Store não fornece o APK nem o código-fonte. Para uma análise autorizada de APK Android serão necessários o arquivo obtido legitimamente e ferramentas adequadas como JADX, configuradas separadamente.

## Comandos

- npm run treino: abre o app na porta 4173.
- npm run test:treino: verifica o servidor.
- node --check projetos/treinolab/app.js: verifica a sintaxe.
