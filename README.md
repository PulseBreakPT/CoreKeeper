# The Hollow Star

Jogo de exploração, mineração e sobrevivência subterrânea para telemóvel, ao estilo do
Core Keeper e do Minecraft, construído em TypeScript e Canvas 2D. Corre no browser,
instala-se como aplicação (PWA) e tem também build Android nativa (APK) via Capacitor.

> *"Everything buried was buried for a reason."*

---

## A premissa

Muito antes de existir memória escrita, uma estrela viva caiu no planeta e continuou a
descer. Chama-se **Veyra**. Por onde passou, a pedra ganhou memória, os cristais
começaram a crescer como organismos e civilizações inteiras nasceram e desapareceram à
volta dela.

Acordas numa cápsula, sem memória, ao lado de uma estrutura negra que te reconhece:
*"Portador identificado."* És o **Bearer 73**. Não há saída para a superfície — só há
para baixo, através de oito camadas de ruínas, até ao coração da estrela.

---

## As oito camadas

Cada camada tem a sua rocha, os seus minérios, a sua fauna e a civilização que ali morreu.
O ambiente é gerado proceduralmente a partir de uma semente, em anéis à volta do Relé.

| # | Camada | O que lá está |
|---|--------|---------------|
| I | The Forgotten Burrows | Minas abandonadas, Duststone, Ferrite e Tinshade |
| II | The Verdant Deep | Floresta subterrânea, Mycel, Verdglass |
| III | The Ashen Foundries | Fábricas Kael ainda a trabalhar, Ember Iron, Kaelite |
| IV | The Glass Desert | Areia transformada em vidro, tempestades, Stormglass |
| V | The Drowned Kingdom | Templos submersos, Abyss Pearl |
| VI | The Bone Expanse | O esqueleto de uma criatura colossal, Ossium |
| VII | The Silent City | A capital Kael intacta — e vazia |
| VIII | The Veil | Onde as leis naturais deixam de funcionar. Veilstone, Starshard, Nullstone |

Sete guardiões, um por camada, guardam os fragmentos da consciência de Veyra:
**Goruun**, **Myra**, **Varkan**, **A Serpente Tempestade**, **Nereth**, **O Gigante Oco**
e **Bearer Zero**. Cada fragmento que recuperas torna Veyra mais desperta.

---

## O que está implementado

**Mundo**
- Geração procedural infinita por chunks, determinística a partir de uma semente
- 8 biomas em anéis, com deformação por ruído (as fronteiras não são círculos)
- 57 tipos de bloco, 16 tipos de chão, veios de minério por camada
- Arenas de guardião esculpidas no mundo, sempre no mesmo sítio para a mesma semente
- Só as alterações do jogador são gravadas — o resto regenera-se a partir da semente

**Jogo**
- Mineração com progressão de sete níveis de ferramenta
- Combate corpo a corpo e à distância (projécteis com perfuração e ricochete)
- 26 criaturas com comportamentos distintos: perseguir, saltar, emboscar, atirar,
  entrar em fase, e o *Observer*, que só se move quando não estás a olhar para ele
- Mutações de elite (Star-Touched, Ancient, Hollowed, Veilborn, Overgrown, Mechanized)
- 7 guardiões com padrões próprios
- Criação em cinco estações (Bancada, Forja, Fundição de Arco, Lareira, Fabricador Kael)
- 8 conjuntos de armadura com bónus de conjunto completo, comida com buffs temporários
- Fome, regeneração, cápsulas que definem onde reapareces
- Gravação automática em `localStorage`

**Apresentação**
- Pixel art gerada inteiramente em código, a 32×32, com cinco tons por material
- Auto-tiling: a rocha liga-se, mostra face frontal e projecta sombra
- Oclusão ambiente nos cantos, luz colorida propagada por BFS, bloom, grão de filme,
  vinheta e tonalidade por bioma
- HUD de metal e vidro com medidor de FPS sempre visível

---

## Como jogar

O jogo é feito para **ecrã deitado**: é assim que vês a caverna à tua frente e
alcanças os dois controlos com os polegares. No telemóvel de pé aparece um aviso
para rodar; a versão Android arranca já deitada.

| Acção | Telemóvel | Teclado |
|-------|-----------|---------|
| Andar | Arrastar na metade esquerda | WASD / setas |
| Minar e atacar | Botão MINAR | Espaço |
| Colocar | Botão POR | F |
| Usar estação / comer | Botão USAR | E |
| Mochila | Botão MOCH | I ou Tab |
| Escolher item | Tocar na hotbar | 1–8 |

Arranca a partir do Relé, arranca Ironroot das paredes, faz uma **Bancada** com 8, e sobe
de nível de ferramenta. O Relé aponta-te o guardião vivo mais próximo.

---

## Serpente — o segundo jogo

No mesmo repositório vive um segundo jogo, independente do primeiro: **Serpente**, uma
versão moderna do clássico jogo da cobra. Abre em `serpente.html`.

```bash
npm run serpente       # abre o jogo directamente no browser
npm run serpente:apk   # compila o APK da Serpente (app própria, não o Hollow Star)
```

A Serpente também é **aplicação Android própria**, separada do Hollow Star: `appId`
`pt.pulsebreak.serpente`, nome *Serpente*, ícone próprio e sem orientação forçada — joga-se
de pé ou deitado. Vive em `serpente-app/`, com a sua configuração de Capacitor e o seu
projecto nativo; o `npm run serpente:build` compila só esta página para `serpente-app/www`,
por isso o APK leva 3,6 MB e nem um ficheiro do outro jogo. O CI compila-o em cada push e
publica-o como artefacto `serpente-apk`.

Arena quadrada de 21×21, sempre igual em todos os ecrãs, que se ajusta ao espaço
disponível mantendo as células quadradas. A serpente anda sozinha assim que dás a
primeira ordem e acelera a cada comida — de 150 ms por passo até um tecto de 74 ms, com
uma curva que decai devagar para o jogo continuar controlável quando está rápido.

| Acção | Telemóvel | Teclado |
|-------|-----------|---------|
| Virar | Deslizar na arena | WASD / setas |
| Começar | Tocar ou deslizar | Qualquer direcção |
| Jogar de novo | Botão ou toque | Enter / Espaço |
| Modo | Botão do cronómetro | — |
| Som | Botão do altifalante | — |

**Contagem de arranque.** A primeira ordem não põe a serpente a andar: põe o 3, 2, 1,
VAI a andar. São 1,94 s a olhar para o tabuleiro antes de alguma coisa se mexer — no
modo de relógio é o que impede que os dez segundos comecem a correr antes de teres
olhado para onde está a comida. A contagem fica por trás da serpente, que continua a ser
o assunto, e podes mudar de direcção enquanto ela corre.

**Dois modos.** No clássico só as paredes e o próprio corpo matam. No **relógio** há
sempre dez segundos para chegar à comida, e o contador volta ao topo a cada refeição —
é sempre a mesma janela, não encolhe com a partida. Dez segundos são folgados mas nunca
confortáveis: a maior distância possível na arena são 40 passos, que ao ritmo inicial
dão seis segundos, e a folga que sobra é exactamente o que dá para hesitar.

O tempo lê-se na própria moldura da arena, que vai drenando, e fica vermelha e mais
grossa nos últimos trinta por cento; nos últimos três segundos o número aparece em
grande, ténue, no meio do campo, com um tique a acompanhar. Não há mais nada na
interface por causa disto. Cada modo tem o seu recorde, porque as pontuações não são
comparáveis entre eles.

O swipe é reancorado a cada 16 px, por isso encadeias curvas sem levantar o dedo, e
só a arena trava o toque — o resto da página continua normal. As inversões sobre o
próprio corpo são recusadas mesmo em rajadas de teclas, e entrar na célula que a cauda
liberta no mesmo passo é legal, como no original. Encher o tabuleiro ganha a partida. O
recorde fica em `localStorage`.

**A comida tem critério.** Sortear uniformemente entre as casas livres é o que quase
toda a gente faz, e é o que estraga partidas: a comida cai atrás de uma parede feita
pelo próprio corpo, ou colada a ele, e perde-se sem ter errado. Aqui o espaço livre é
partido em regiões ligadas a cada refeição, e a escolha passa por dois filtros: só
células da **maior região a que a cabeça consegue mesmo chegar** — nunca do outro lado
do corpo, nunca numa bolsa apertada se houver espaço aberto — e, dentro dessa região,
um sorteio em que uma casa com quatro vizinhos livres vale cinco vezes mais do que uma
encurralada com um só. Se a cabeça estiver fechada, a partida já está perdida e a comida
vai para a maior região que exista: o jogo continua honesto e só declara vitória com a
arena mesmo cheia.

Toda a lógica vive em `src/serpente/logica.ts`, sem DOM nem canvas, e é testada à parte.

**O desenho.** O chão da arena — gradiente, grelha de pontos e vinheta — é pintado uma
vez para um buffer e reaproveitado; por cima ficam só a serpente, a comida e os efeitos,
o que deixa margem para detalhe sem sair dos 60 FPS. A serpente é desenhada como uma
linha interpolada entre dois passos e traçada em bandas que vão afinando da cabeça para
a cauda, cada uma com o seu contorno escuro — é o contorno que a mantém legível a
qualquer velocidade. A cor não é fixa: `--matiz` acompanha o intervalo entre passos, por
isso a serpente, a moldura, o halo, o marcador e o botão aquecem de esmeralda a turquesa
à medida que o jogo acelera. Ao comer há partículas, um anel, um "+1" a subir e a
moldura a acender; ao morrer, tremor, um clarão pelas bordas e o corpo a desfazer-se em
pó da cauda para a cabeça, deixando a cara para o fim. A letra é a
[Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) (OFL), guardada no
próprio jogo.

---

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local com recarregamento
npm run build      # verificação de tipos + build de produção para dist/
npm test           # testes unitários (vitest)
npm run fumo       # teste de fumo real num Chromium: joga, cria, luta e grava
npm run fumo:serpente  # o mesmo para a Serpente: joga, come, morre, reinicia, desliza
EMPACOTADA=1 npm run fumo:serpente  # corre o mesmo teste contra o pacote que vai no APK
npm run serpente:apk   # APK da Serpente (JDK 17 + Android SDK, como o do Hollow Star)
npm run perf       # mede FPS e milissegundos por quadro em cada nível de qualidade
npm run sprites    # gera uma folha com todos os sprites, para rever a arte
```

O teste de fumo e o medidor de desempenho abrem o jogo num browser verdadeiro,
jogam sozinhos e falham se alguma coisa partir — é assim que o jogo é validado.

### Estrutura

```
src/
  core/      RNG determinístico, entrada táctil/teclado, áudio, gravação, medidor
  world/     tiles, geração procedural, chunks, iluminação
  entities/  jogador, bestiário e IA, física
  game/      simulação, itens, inventário, receitas
  render/    paletas, sprites, auto-tiling, câmara, pipeline de desenho
  ui/         HUD, painéis, menus, fundo animado
  serpente/  o segundo jogo: lógica pura, desenho, controlos, som
serpente-app/  embrulho Capacitor da Serpente: configuração e projecto Android
```

---

## Android (APK)

São duas aplicações separadas, cada uma com o seu `appId` e o seu projecto nativo:

| Aplicação | `appId` | Projecto | Comando |
|---|---|---|---|
| The Hollow Star | `pt.pulsebreak.hollowstar` | `android/` | `npm run apk` |
| Serpente | `pt.pulsebreak.serpente` | `serpente-app/android/` | `npm run serpente:apk` |

O projecto Android do jogo principal está em `android/`, gerado com Capacitor.

```bash
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
# resultado: android/app/build/outputs/apk/debug/app-debug.apk
```

Requer JDK 17+ e o Android SDK (platform 34, build-tools 34.0.0) com `sdk.dir`
definido em `android/local.properties`.

> Nota: o `android/build.gradle` usa o espelho do Maven Central servido pelo Google,
> porque o repositório oficial devolve HTTP 429 a partir de IPs partilhados.

---

## Desempenho

O jogo mede-se a si próprio. O canto superior direito mostra sempre os FPS e o tempo
gasto por quadro (lógica + desenho). A qualidade gráfica ajusta-se sozinha quando o
desenho passa do orçamento, e pode ser fixada à mão no menu de pausa.

Medido com o CPU travado (Chromium a 4x, 6x e 8x mais lento, em 873×393), que é
o que se parece com um telemóvel a sério:

| CPU travado | qualidade escolhida | FPS |
|---|---|---|
| 4x | média | 53 |
| 6x | baixa | 50 |
| 8x | baixa | 47 |

Decisões que valeram a maior parte do ganho:
- terreno pintado num buffer e reutilizado enquanto a vista não muda de tile;
- chaves numéricas no acesso a chunks (as strings geravam lixo a cada tile);
- halos, sombras, vinheta e grão pré-desenhados em vez de gradientes por quadro;
- bloom desfocado no buffer pequeno antes de ser ampliado;
- tonalidade do bioma e vinheta aplicadas dentro do mapa de luz, não em passagens
  por cima do ecrã inteiro;
- sem canvas intermédio: a cena é desenhada directamente no canvas visível;
- resolução de desenho medida em píxeis de CSS, não no DPR do aparelho — arte
  feita de quadrados não ganha nada em ser desenhada a 2x, e perde metade dos FPS;
- a qualidade automática decide pelos quadros por segundo reais, porque boa parte
  do custo está na composição do canvas pelo browser e não aparece em nenhum
  cronómetro dentro do jogo.
