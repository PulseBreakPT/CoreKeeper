# Nexus Word — fiel à referência colorida

## Pedido e correção de direção
Original: "Procura na Internet como é o design do jogo Da Steam Click The Button e aplica no meu jogo, com QI e lógica máxima. Copia mas não sejas tão óbvio, inspira te e melhora o design. Quero um design SSS tier."

O utilizador REJEITOU o redesign escuro e pediu: "Isso não tem nada a ver com o que eu pedi. Reverte para o design antigo e melhora significativamente o design para o SSS tier até atingir este nível, deve ser igual a este design agora."
Referência obrigatória: https://customer-assets-39nsmqrw.emergentagent.net/job_mind-click-quest/artifacts/pldioy1p_file_000000000d7881f4b0edb48274df21e9.png
Depois: "Continua a melhorar, com QI e lógica máxima, quero um design SSS tier" e "Atua como as 5 melhores profissões e empresas do mercado para resolver isto".

## Arquitetura e âmbito
- Vanilla TypeScript/Vite, DOM/CSS, Capacitor Android independente em `palavras-app`.
- Repositório inclui outros jogos. As alterações recentes são do Nexus Word (`src/palavras`, `palavras.html`), não do Hollow Star descrito no README. Não modificar os outros jogos.
- Manter modo plural, singular, contrário, vidas/tempo/combos/pontos, eventos especiais, progressão e chaves de localStorage existentes.
- Não existem contas, backend ou integrações externas necessários.
- Preview via supervisor `nexus-word`, `vite.preview.config.ts`, variáveis APP_HOST/APP_PORT/APP_URL/APP_PREVIEW_HOST. `/` abre Nexus Word apenas na preview. `/index.html` mantém Hollow Star. `yarn palavras:build` atualiza o pacote web Android.

## Implementado — direção atual
- Tema escuro removido. Restaurada a composição vertical colorida do menu original.
- Logótipo e peças decorativas extraídos da imagem do utilizador; dados, botões e textos de jogo são HTML interativo, não uma captura de ecrã.
- Céu ciano, colinas/folhagem em camadas, chão creme, flores e rochas em SVG próprio.
- Cartão amarelo dominante, botão verde JOGAR, modos verde/rosa, cartões diários roxo/azul e barra creme, alinhados à referência.
- Tipografia Lilita One + Nunito/Baloo, relevos, brilho localizado e respostas ao toque. Exemplos do menu estáveis para corresponder à imagem e evitar alterações de largura durante a escolha.
- Partida e resultados recuperados no mesmo estilo colorido; suporte a ecrãs baixos/teclado via scroll interno.
- Recordes com cores por modo, nível, combo, domínio, pontuação e coleção; coleção mostra contagem real em vez de denominador fixo que não incluía respostas em cadeia.
- Definições com switches acessíveis de som, vibração e animações, gravados localmente. Som do menu e da partida sincronizados.
- Foco, Escape/Tab nos painéis, fundo inert, estado acessível das vidas, atributos de teste estáveis, respeito pelo movimento reduzido do sistema.
- Guardas de pausa impedem submissão/salto durante pausa; rótulo de pausa reinicializado entre partidas.

## Verificação
- Compilação final isolada Nexus Word, compilação dos outros jogos e typecheck aprovados depois de todos os refinamentos.
- 104 testes unitários do repositório aprovados novamente; outros jogos sem alterações de lógica.
- Capturas do menu colorido, partida e recordes confirmaram carregamento e funcionamento básico.
- O utilizador pediu explicitamente continuar o polimento através das próprias capturas, sem chamar o agente de testes. Esta última iteração de correções visuais é verificada diretamente com o navegador.
- Verificação direta: painel Definições limitado à largura do jogo (corrigido excesso de largura desktop), mudança de som, Escape, resposta correta com pontos reais, pausa com relógio congelado, retoma, perda das 3 vidas e resultado real. Capturas responsivas em frames de 320×568, 390×780 e 430×790.
- Painel de pausa colorido adicionado com CONTINUAR; evita o estado de pausa visualmente apagado/ambíguo. Recordes de combo e descrições deixam de ser truncados nos cartões pequenos.
- Verificação final direta dos três modos: cada um aceita uma resposta correta real, soma pontos e regressa ao menu. Preferência de animações persiste ao recarregar; switches de vibração, fecho dos painéis e palavra diária funcionam em largura mobile.
- Capturas finais validadas em 320×568, 390×780 e 430×790: sem overflow horizontal e navegação completamente visível. Ecrãs altos usam espaço nos cartões; ecrãs pequenos reduzem margens não interativas. Altura de 430px simulando teclado mantém resposta e controlos acessíveis por scroll.
- Um erro do seletor da própria verificação (`.nw-bottom` encontrava os dois menus) foi corrigido para `#menu .nw-bottom`; a verificação final passou. Nenhum agente de testes foi chamado nesta iteração.

## Próximas tarefas
- P0: sem falhas conhecidas nas verificações realizadas. Não foi feita validação num dispositivo Android físico.
- P1: se o utilizador quiser, cartão de resultados partilhável no mesmo estilo.
- P2: simplificar CSS legado após aprovação visual, sem mudar a composição pedida.

Não voltar a seguir o blueprint escuro anterior. O contrato atual está em `/app/design_guidelines.json`.