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

## Iteração atual — refinamento transversal, sem redesign

### Pedido original desta iteração
“Melhora significativamente o design do jogo para o SSS tier, não quero que refaças o design, quero que melhores, procura também elementos e componentes com design abaixo e melhora para ficar tudo ao mesmo nível, textos, títulos, ícones, botões etc. Sem testes e sem agente de testes, tira prints e melhora tudo”.

Confirmação do utilizador: melhorar todas as páginas com autonomia, mantendo a estrutura, as cores e as funcionalidades; verificar apenas através de capturas de ecrã.

### Decisões e implementação
- Respeitado o contrato visual existente; não foi feito redesign, não foram trocados logótipo/cenário e não foram alterados os outros jogos.
- Camada de apresentação final em `src/palavras/refinamento.css`, importada depois dos estilos anteriores. Novas variáveis de acabamento, contornos iluminados, sombras de contacto, gradientes por material e estados de interação discretos.
- Menu: títulos dos modos secundários reforçados, exemplos/descrições mais legíveis, combo com hierarquia própria, melhor sequência com mais espaço, botões e navegação com relevo coerente. Níveis identificados por `NV.` e assinatura `PENSA · JOGA · APRENDE`.
- Recordes: cabeçalho com taça, mesmas ilustrações dos modos, pontuação num visor próprio, domínio e coleção mais claros. Tamanhos compactos para ecrãs baixos.
- Definições: ícones específicos de som, vibração e animações; tonalidades azul/rosa/lilás, switches maiores e mensagem de gravação automática. Corrigidos os centros dos ícones para não parecerem formas preenchidas indistintas.
- Palavra diária: cabeçalho próprio, calendário e definição com melhor hierarquia e acabamento.
- Partida: campo de resposta, botões, indicadores, avisos e pausa refinados. Ilustração corresponde ao modo da ronda (incluindo cadeias); a regra de jogo não foi alterada. `PULAR` passa a `SALTAR` mantendo comportamento.
- Resultado: visor da pontuação, estatísticas e ações coerentes com o menu. Corrigida quebra de linha em `JOGAR OUTRA VEZ` a 320px.
- Revisão: legendas legíveis, cartões compactos e tipografia ajustada ao comprimento de cada palavra e à largura disponível, evitando letras isoladas em palavras como `ESPÉCIMENS`.
- Regras, dicionários, tempos, vidas, pontuação e chaves de armazenamento preservados. Alterações em main.ts limitadas à apresentação.
- A pré-visualização deste ambiente precisou de reinstalar dependências com Yarn e de restaurar o serviço supervisor `nexus-word` com a configuração Vite existente. `.env.local` define host, porta, URL externa e hostname interno permitido; nada disto está hardcoded no código do jogo.

### Revisão realizada nesta iteração
- Apenas revisão visual através da ferramenta de capturas e navegação para mostrar os ecrãs. Não foram executadas suites de testes, scripts de testes, typecheck ou agente de testes.
- Capturas antes/depois do menu, recordes, definições, palavra diária, partida nos três modos, pausa, resultados e revisão.
- Composições mobile captadas em frames de 320×568, 390×780 e 430×790, dentro de viewport 1920×800. Confirmados visualmente menu completo, encaixe dos recordes no ecrã baixo, botão dos resultados numa linha e tipografia adaptável na revisão.
- Navegação da partida mantida no fluxo, sem sobrepor os cartões. Em ecrãs baixos, a partida continua a permitir scroll vertical; não se ocultam funcionalidades para forçar o encaixe.
- Pacote web isolado do Nexus Word atualizado com `yarn palavras:build`. Nenhuma compilação Android nativa ou verificação em dispositivo físico foi feita nesta iteração.

### Backlog atual
- P0: nenhuma pendência visual bloqueante identificada nas capturas; não foi feita regressão funcional abrangente por opção explícita do utilizador.
- P1: resultado partilhável com a mesma identidade gráfica, apenas se pedido.
- P2: consolidar as várias camadas CSS legadas após aprovação deste acabamento, evitando refatorações arriscadas nesta iteração exclusivamente visual.
- Próxima tarefa: recolher feedback sobre este refinamento, mantendo sempre a composição e a identidade coloridas.

## Iteração — 10 efeitos visuais automáticos

### Pedido e decisões do utilizador
- Pedido original: “Com as prints que tens quero 10 efeitos visuais novos que combinem com o jogo”.
- Escolheu efeitos mais festivos, sem tapar palavras ou botões, e acrescentou: “As 3 opções, escolhi uma mas quero as 3 com QI e lógica máxima”.
- Correção explícita posterior: “Sem configuração nas definições”. Não foi acrescentado qualquer seletor de intensidade, opção, configuração ou chave de armazenamento. As três intensidades são combinadas pelo contexto: ambiente discreto, interações equilibradas e conquistas festivas.
- Mantida a indicação anterior de verificar apenas através de capturas, sem suites ou agente de testes.

### Os dez efeitos implementados
1. **Brisa de pétalas** — seis folhas/pétalas nas margens, atrás dos cartões do menu.
2. **Constelação do logótipo** — pequenas estrelas com movimento lento à volta da marca, sem atravessar as letras.
3. **Perspetiva das peças** — inclinação das ilustrações com o ponteiro e resposta elástica ao toque; textos e alvos de toque imóveis.
4. **Rebordo de luz** — fio luminoso acompanha a borda dos cartões ao focar/apontar/tocar, com centro mascarado transparente e intervalo mínimo entre ativações.
5. **Ondas de arranque** — três anéis sincronizados com cada número da contagem decrescente, atrás do conteúdo. Coordenadas locais corrigidas para desktop e mobile.
6. **Poeira de escrita** — pequenas faíscas fora do campo, limitadas a uma emissão por 110 ms, sem depender da correção da resposta.
7. **Estrelas de recompensa** — estrelas sobem pela margem esquerda até à pontuação após um acerto, não cruzando a pergunta.
8. **Órbita de combo** — quatro estrelas no perímetro do indicador, apenas nos marcos 3/5/7/10/12/15/20/25/50/100; o valor permanece legível.
9. **Labaredas de calor** — cinco pequenas chamas no topo do medidor apenas enquanto o estado real `on-fire` está ativo; sem flashes.
10. **Festa de recorde** — confettis nas laterais do resultado, exclusivamente quando o jogo confirma um novo recorde. Centro, estatísticas e botões livres.

### Arquitetura e proteção da experiência
- Novos módulos de apresentação: `efeitos-motor.ts`, `efeitos-menu.ts`, `efeitos-partida.ts`, `efeitos.ts` e `efeitos.css`. Inicialização/disposição em `main.ts`; sem dependências adicionais.
- CSS e Web Animations, sem canvas permanente nem ciclos JavaScript de desenho. Limite de 56 animações transitórias simultâneas, limpeza após conclusão/cancelamento e cancelamento ao mudar de ecrã, fazer scroll/resize, pausar ou ocultar a página.
- Decorações `aria-hidden` e `pointer-events:none`; não alteram hitboxes, respostas, vidas, relógios, pontos ou armazenamento. Efeitos de recompensa/combo não são emitidos durante rondas silenciosas.
- Respeitam `prefers-reduced-motion` e o interruptor de animações já existente. Ambiente suspenso por trás de painéis e efeitos removidos durante pausa/background; sem novo controlo nas definições.
- Corrigido seletor de atualização dos níveis para `button[data-modo]`: o atributo de apresentação no `#jogo` também correspondia ao seletor anterior, mas não contém `.nw-level`.

### Capturas e pacote
- Capturas comparativas em 320×568, 390×780 e 430×790: menu, interações, contagem, cinco acertos reais, combo, calor e resultados com e sem novo recorde.
- Capturas finais desktop: perspetiva/rebordo, contagem centrada, escrita, definições inalteradas, movimento desligado e restaurado. Não surgiram erros de página na última sessão de capturas.
- Pacote web atualizado por `yarn palavras:build`. Não foram executados testes automatizados, typecheck, agente de testes ou compilação Android nativa.
- P0: nenhum impedimento visual observado nas capturas realizadas; sem validação em Android físico nesta iteração.
- P1 opcional: celebração específica do desafio diário, se o utilizador quiser expandir os dez efeitos.
- P2: medição de consumo em dispositivos reais e consolidação dos estilos legados, fora do âmbito desta passagem visual.

## Iteração — celebração própria do desafio diário

### Pedido e escolha
- Pedido: “Próxima melhoria possível: uma celebração própria ao completar o desafio diário.”
- Escolha explícita: “Brilho breve ao atingir a meta e celebração festiva ao terminar a partida, sem distrair durante o jogo”.
- Mantidas as restrições anteriores: automático, sem novas configurações nas definições, identidade visual preservada e revisão apenas através de capturas.

### Implementado
- `atualizarProgressoDesafio()` acompanha o progresso real e regista a passagem de menos de 15 para 15 ou mais; respeita a data UTC já usada pelo jogo. A conclusão fica guardada de imediato.
- Brilho dourado de 600 ms no perímetro do combo ao completar a meta; não abre modal, não muda o relógio nem o intervalo entre perguntas.
- No final: cartão dourado/verde “Dia conquistado!”, taça ilustrada com pequeno movimento, descrição das 15 respostas, selo 15/15 e confettis dourados/cianos/verdes nas laterais.
- Festa coordenada com novos recordes: preserva o texto do recorde, mas não sobrepõe duas emissões de confettis.
- Celebração única por dia neste dispositivo, com estado pendente guardado em `nexus-word:celebracao-diaria:v1`. Se o jogador sair/reabrir antes do resultado, a celebração fica para a próxima partida terminada nesse dia. Não apresenta retroativamente desafios já completos antes desta funcionalidade.
- O estado pendente só é consumido quando o resultado está visível e a página em primeiro plano. Com movimento reduzido, mostra o cartão estático. Se localStorage falhar, conserva o estado durante a sessão, sem bloquear o jogo.
- Cartão compacto em ecrãs baixos, preservando os botões do resultado. Sem novos botões/configurações.
- Durante as capturas, a pontuação de quatro dígitos quebrava linha no indicador. Corrigido com tamanho tipográfico adaptativo à largura e ao número de caracteres, sem truncar o valor ou aumentar a altura.

### Arquitetura
- `conquista-diaria.ts`: meta, registo/consumo da conquista, persistência e marcação do cartão de resultado.
- `efeitos-desafio.ts` e `desafio-conquista.css`: brilho, taça, confettis, apresentação e adaptação responsiva.
- Integração pontual em `main.ts`, `efeitos.ts` e guarda de prioridade em `efeitos-partida.ts`; reaproveita o motor de efeitos e a taça existentes, sem dependências externas.
- Ajuste de legibilidade da pontuação em `interface.ts` e `refinamento.css`.

### Revisão por capturas e pacote
- Partida real até combo ×15; captados brilho, pergunta seguinte sem interrupção e resultado da conquista em 320×568, 390×780 e 430×790.
- Captada partida seguinte sem repetição da festa já consumida.
- Segunda sessão de capturas: 15 acertos reais, saída para o menu, reabertura, desafio ainda concluído e celebração pendente no resultado seguinte, mesmo sem novo recorde. Captura confirma confettis laterais e todos os botões visíveis no ecrã pequeno.
- Pontuação de quatro dígitos apresentada numa só linha nas capturas finais; sem erros de página reportados nessa sessão.
- Compilação `yarn palavras:build` atualizada. Não foram executadas suites de testes, typecheck, agente de testes ou compilação Android.

### Próximas tarefas
- P0: nenhuma pendência visual bloqueante nas capturas; sem validação em dispositivo físico nesta iteração.
- P1 opcional: cartão partilhável da conquista diária.
- P2: medição de desempenho em dispositivos físicos e consolidação de CSS legado.