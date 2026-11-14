# Análise real de APK Android com REA

O REA também analisa APKs Android: manifestos, permissões, classes, métodos decompilados e referências estáticas. O mecanismo utilizado é o **jadx-headless-mcp 0.7.1**, separado do Hopper. Não é necessário emulador para análise estática. O REA **não transforma APK automaticamente em aplicativo reconstruído**.

Referência: https://github.com/morluto/rea/blob/main/docs/guides/android/android-analysis.md

## 1. Ativar a análise no Codespace

No Codespace existente do Rea-Workspace, abra um NOVO terminal e execute:

~~~bash
git pull --ff-only && bash scripts/preparar-rea-android.sh
~~~

O script instala JDK 21 se necessário, baixa a versão indicada do jadx-headless-mcp, valida o SHA-256 oficial e verifica a configuração em `rea doctor --provider jadx --json`. **Não faz download de qualquer APK de terceiros.**

Depois reinicie o REA Hub. No terminal em que estiver rodando o painel, pressione Ctrl+C; execute:

~~~bash
npm start
~~~

Na aba **Portas**, mantenha a porta **3000 em Private** e abra no navegador. Clique em **App Android**, selecione um APK local, e toque em **Iniciar análise**. O limite é 160 MB. O app é inspecionado sem ser executado e recebe relatórios específicos de Android.

## 2. Conseguir o APK no próprio aparelho

O link da Play Store para o Befit é:

https://play.google.com/store/apps/details?id=app.befit

A Play Store não expõe o APK diretamente pelo navegador. Se você tem um Android com o aplicativo instalado e está autorizado a fazer análise para fins legítimos, é possível **copiar os arquivos de instalação do aparelho usando ADB**. Isso ocorre **no seu computador físico**, que pode se conectar ao aparelho por USB, não dentro do Codespace remoto.

### No Windows

1. Instale o [SDK Platform-Tools oficial do Android](https://developer.android.com/tools/releases/platform-tools). Ele fornece o comando `adb`.
2. Instale o Befit pelo Google Play no Android.
3. No Android, ative as opções do desenvolvedor e a **Depuração USB**; conecte o aparelho ao computador com cabo de dados e autorize a conexão na tela do telefone.
4. No PowerShell do **seu computador**, com `adb` disponível no PATH, execute:

~~~powershell
adb devices
adb shell pm path app.befit
~~~

O segundo comando retorna um ou vários caminhos prefixados por `package:`, por exemplo `base.apk` e `split_config.*.apk`. Para copiar todos de uma vez, use o script que criamos em `scripts/extrair-apk-android.ps1` (pode baixar o arquivo do GitHub para seu computador):

~~~powershell
./extrair-apk-android.ps1 -Package app.befit
~~~

Esse script precisa ser executado **na pasta onde o arquivo baixado está**, com acesso ao ADB. Se preferir o procedimento manual, use `adb pull CAMINHO_DO_APK arquivo.apk` para cada caminho fornecido pelo comando `pm path`.

5. A pasta `app.befit-apks` conterá os APKs extraídos. No REA Hub, selecione o `base.apk` (que pode ter menos funções que o aplicativo completo); preserve os arquivos `split_*.apk` para futuras análises. Se quiser compartilhar arquivos para estudo, use apenas um canal privado e tenha autorização. Não faça commit desses arquivos no repositório público.

Observação: certos dispositivos, versões Android e aplicativos podem impor limitações à extração, ou fornecer pacotes divididos. O procedimento não recupera dados internos de usuários, tokens de acesso ou a lógica de servidores na nuvem. **Não burla compras, licenças ou controles de acesso.**

## 3. O que a análise permitirá reconstruir

- Manifesto, permissões e componentes Android declarados
- Inventário de classes e métodos visíveis no APK
- Código decompilado parcial e relações entre chamadas
- Bibliotecas locais e recursos acessíveis, sujeitos a limitações do formato e da proteção
- Relatório técnico de funcionalidades que poderão orientar a nossa implementação independente

Não permite garantir acesso ao código-fonte original nem a modelos de IA remotos, bancos de dados e APIs privadas. Se o aplicativo usar Flutter, React Native, ofuscação ou carregamento remoto, a cobertura poderá ser incompleta.

A reimplementação de um aplicativo **com funções similares e código/identidade originais** é o objetivo. Não devemos copiar recursos protegidos ou credenciais, nem contornar recursos pagos.

## 4. Alternativa de análise pelo terminal

Se você já colocou um arquivo APK autorizado em uma pasta privada no Codespace:

~~~bash
bash scripts/analisar-android.sh /caminho/para/aplicativo.apk
~~~

Os relatórios serão gravados em `results/android/`, ignorados pelo Git. Uma análise estática não executa o aplicativo.
