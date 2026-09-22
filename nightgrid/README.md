# Nightgrid — Clandestine Operations

Jogo 4X / base-building / expedition RPG para Android, single-player, feito em
**Godot 4.3** com GDScript. Desenhado de raiz para **retrato** (1080 × 1920),
uma mão, toque, sem multijogador, sem backend e sem compras.

Terceiro jogo deste repositório, independente dos outros dois: vive todo em
`nightgrid/` e não partilha código nem ferramentas com o The Hollow Star nem
com a Serpente.

---

## O ciclo

```
Base → Produção → Melhorias → Operativos → Equipas → Mapa
     → Expedição → Combate → Loot → Progressão → Nova região
```

O jogador começa com um complexo clandestino em Harbour Reach: um
Headquarters, um gerador, uma oficina e um armazém. Tudo o resto — dinheiro,
gente, informação, território — tem de ser tirado ao mapa.

## Os cinco ecrãs

| Separador | O que faz |
|---|---|
| **BASE** | O complexo em quatro zonas, com rolagem vertical. Cada estrutura é desenhada e tocável no sítio; toca-se para abrir a folha de baixo com níveis, custos, produção e o botão de construção. |
| **MAP** | Mapa visual de 1400 × 2600 por região, com arraste, pinça, nevoeiro de guerra em células de 200, marcadores por tipo, eventos com contador e a rota da equipa a andar em tempo real. |
| **OPERATIVES** | Grelha de duas colunas com o plantel, as três equipas e o recrutamento. Página de detalhe com estatísticas, perícia e os três slots de equipamento. |
| **MISSIONS** | História, diárias, semanais e proezas, cada uma com progresso, objectivo, recompensa e `CLAIM`. Mais a escada de login diário. |
| **INVENTORY** | Tudo o que está em armazém, filtrado por slot, com o poder de cada peça e "equipar a quem". |

## Conteúdo

- **10 edifícios.** Headquarters (limita o nível de todos os outros), Operations
  Center, Intel Center, Barracks, Power Generator, Workshop, Warehouse, Garage,
  Medical Center, Training Ground. Cada um com nível, custo, tempo de obra,
  efeito e produção próprios.
- **6 recursos.** Cash, Materials, Fuel, Intel, Supplies e Premium Tokens. Os
  Tokens só se ganham a jogar — não há compras de nenhum tipo.
- **12 operativos originais** em 5 classes (Assault, Tank, Support, Sniper,
  Specialist) e 4 raridades, cada um com nome, alcunha, biografia, perícia
  activa e retrato próprio.
- **30 peças de equipamento** em três slots e quatro raridades, com origem
  declarada.
- **5 regiões** — Harbour Reach, Sable Quarter, Iron Verge, Null District,
  Ashline Basin — com paleta, facção NPC, nível recomendado e 16 localizações
  cada (80 no total): nós de recursos, caches, sítios de exploração, armazéns
  abandonados, comboios, acampamentos, pontos de informação, alvos de elite,
  duas missões de história e um chefe.
- **7 tipos de evento dinâmico** que aparecem sozinhos em terreno já explorado
  e desaparecem ao fim de um contador.
- **33 missões**: 10 de história em cadeia, 6 diárias, 5 semanais, 12 proezas.

## Combate

Automático, vertical, com inimigos em cima e a equipa em baixo. A ordem de
acção sai de uma barra de velocidade (ATB): cada unidade enche o medidor ao
ritmo da sua velocidade e age quando transborda. O painel central mostra quem
age a seguir.

Cada unidade tem HP, ataque, defesa, velocidade, probabilidade e dano crítico,
e energia de perícia. Há ataques normais, perícias especiais, críticos, números
de dano a subir, barras de vida, escudos e estados: queimadura, hemorragia,
atordoamento, lentidão, marcação, mais buffs e debuffs de atributo.

Velocidade de visualização em 1×, 2× e 3×.

## Progresso offline

Produção, energia, construção, viagens e eventos são todos guiados por
*timestamps* do relógio do sistema, não por contadores de quadros. Por isso o
jogo fechado e o jogo aberto avançam exactamente da mesma maneira, e o
progresso offline sai de graça: ao abrir, cada gestor é adiantado até agora e o
ecrã **WHILE YOU WERE AWAY** mostra o que aconteceu.

A gravação é automática (a cada 15 s quando há algo por gravar, e sempre que a
aplicação perde o foco ou fecha), num único JSON escrito por ficheiro temporário
e renomeado, com cópia de segurança — matar a aplicação a meio da escrita não
corrompe o save.

Guarda recursos, energia, níveis, edifícios e obras em curso, plantel, XP,
equipamento, inventário, equipas, expedições a meio, mapa, nevoeiro de guerra,
localizações limpas, regiões, missões, contadores, login diário, eventos activos
e as definições.

## Arquitectura

Dados separados da lógica, e a lógica separada da interface. Nada de um
ficheiro gigante.

```
nightgrid/
├── project.godot            # retrato bloqueado, 1080×1920, GL Compatibility
├── export_presets.cfg       # Android, Android arm64 e Linux
├── autoload/                # 14 gestores, sem interface lá dentro
│   ├── game_data.gd         # tabelas estáticas, formatação de números
│   ├── save_manager.gd      # escrita atómica, cópia de segurança, autosave
│   ├── resource_manager.gd  # carteira, tectos de armazenamento, energia
│   ├── building_manager.gd  # níveis, obras, produção em buffer
│   ├── character_manager.gd # plantel, XP, estatísticas, equipamento
│   ├── squad_manager.gd     # três equipas de cinco
│   ├── map_manager.gd       # regiões, nevoeiro, descobertas, limpezas
│   ├── expedition_manager.gd# ida, chegada, combate, regresso
│   ├── combat_manager.gd    # simulação ATB, perícias, estados
│   ├── loot_manager.gd      # sorteio de recompensas por dificuldade
│   ├── mission_manager.gd   # contadores em três escalas, login diário
│   ├── event_manager.gd     # eventos temporários no mapa
│   ├── ui_manager.gd        # separador actual, pilha, avisos
│   └── game_manager.gd      # arranque, nível do jogador, offline, dev mode
├── data/                    # só dados: edifícios, personagens, itens,
│                            # regiões, inimigos, missões, eventos
├── ui/
│   ├── palette.gd           # cores e medidas (toque, espaçamento, tamanhos)
│   ├── widgets/             # ícones vectoriais, botões, barras, retratos,
│   │                        # folhas de baixo, avisos, cabeçalho, navegação
│   ├── screens/             # os cinco separadores e o mapa
│   ├── sheets/              # folhas de baixo: edifício, local, equipa,
│   │                        # personagem, item, recursos, recrutamento
│   └── overlays/            # combate, recompensas, offline, dev
├── scenes/main.tscn         # casca: cabeçalho, ecrãs, navegação, camadas
├── scripts/                 # toolchain.sh e build-apk.sh
└── tests/                   # gameplay_test.gd e o arnês de capturas
```

**Zero ficheiros de arte.** Retratos, ícones, edifícios, marcadores do mapa e
molduras são todos desenhados por código a partir de primitivas, com semente
determinística por personagem. Não há nenhum recurso de terceiros no projecto —
o único ficheiro de imagem é `assets/icon.svg`, desenhado aqui.

## Interface móvel

- Retrato bloqueado no `project.godot` e no manifesto (`screenOrientation=portrait`).
- Espaço de desenho de 1080 de largura com `stretch_mode=canvas_items` e
  `aspect=expand`: a altura acompanha o aparelho, a largura é sempre a mesma.
- Alvos de toque com pelo menos 126 px de desenho (≈ 48 dp num telemóvel
  comum). Nada depende de *hover*.
- Áreas seguras lidas de `DisplayServer.get_display_safe_area()` e aplicadas ao
  cabeçalho e à navegação — notch, recorte de câmara, cantos redondos e barra de
  gestos do Android.
- Folhas de baixo em vez de ecrãs cheios para edifícios, locais, equipas, itens
  e detalhes rápidos: o que estava atrás continua visível.
- Botão **Voltar** do Android: fecha primeiro a camada de topo (overlay), depois
  a folha de baixo, depois volta à BASE, e só ao segundo toque seguido sai — a
  gravar antes de sair.

## Dev mode

Escondido: cinco toques na insígnia de nível, no canto superior esquerdo. A
partir daí, a insígnia abre o menu.

Infinite Energy · Fast Timers (×0,12 em todas as durações) · Add Cash · Add All
Resources · Give XP · Give Items · Complete Construction · Complete Expedition
Travel · Reveal Region · Unlock Next Region · Spawn Event · Recruit Everyone ·
Save Now · Reset Save.

---

## Compilar

### De uma vez

```bash
nightgrid/scripts/toolchain.sh     # Godot 4.3 + modelos + Android SDK + keystore
nightgrid/scripts/build-apk.sh     # importa, corre os testes e exporta o APK
# resultado: nightgrid/build/game-debug.apk
```

O `toolchain.sh` é idempotente e só busca o que falta. Respeita
`ANDROID_SDK_ROOT`/`ANDROID_HOME` e `JAVA_HOME` se já estiverem definidos.

### À mão

```bash
GODOT=~/.local/opt/godot/godot
cd nightgrid
$GODOT --headless --path . --editor --quit          # importa e indexa as classes
$GODOT --headless --path . res://tests/gameplay_test.tscn
$GODOT --headless --path . --export-debug "Android" build/game-debug.apk
```

O primeiro comando é obrigatório num clone novo: é ele que cria `.godot/` com
os recursos importados e o índice de `class_name`. Sem isso a exportação falha.

### Variante mais pequena

O preset `Android` traz arm64-v8a e x86_64 (telemóveis e emuladores), e dá
cerca de 49 MB. Se só quiseres instalar num telemóvel:

```bash
$GODOT --headless --path nightgrid --export-debug "Android arm64" \
  nightgrid/build/game-debug-arm64.apk     # ~23 MB, arm64-v8a só
```

arm64-v8a cobre qualquer aparelho Android de 2016 para cá.

### Instalar no telemóvel

```bash
adb install -r nightgrid/build/game-debug.apk
```

Ou copia o ficheiro para o aparelho e abre-o com o gestor de ficheiros, depois
de permitir instalação de fontes desconhecidas.

O APK sai assinado com a chave de depuração padrão do Android
(`~/.android/debug.keystore`, alias `androiddebugkey`) — instala-se em qualquer
aparelho mas não serve para a Play Store.

### Requisitos

| | |
|---|---|
| Godot | 4.3-stable (editor headless + modelos de exportação) |
| JDK | 17 ou mais recente (só para `apksigner`/`keytool`) |
| Android SDK | `build-tools;34.0.0` e `platforms;android-34` |
| Alvo | minSdk 21, targetSdk 34, arm64-v8a + x86_64 (ou só arm64) |

Não é preciso Gradle nem Android Studio: a exportação usa o modelo de APK
pré-compilado do Godot e assina-o com o `apksigner` do SDK.

## Testar

```bash
$GODOT --headless --path nightgrid res://tests/gameplay_test.tscn
```

`tests/gameplay_test.gd` percorre o jogo inteiro sem interface: recursos e
produção (incluindo tectos de buffer e de carteira), obras e as portas do
Headquarters, treino e equipamento, equipas, nevoeiro e o portão das missões de
história, uma expedição completa do envio ao regresso, um combate ganho e um
combate perdido contra um chefe muito acima do nível, missões e reinícios
diários, eventos a nascer e a expirar, gravar–apagar–reler campo a campo,
progresso offline de quatro horas, e uma campanha simulada de 90 expedições.

Para ver a interface sem aparelho:

```bash
xvfb-run -a $GODOT --path nightgrid --resolution 1080x1920 -- --shots
# escreve PNGs em ~/.local/share/godot/app_userdata/Nightgrid/shots/
```

`tests/` está fora do APK (`exclude_filter` no preset), por isso o arnês de
capturas nunca vai dentro do jogo.

## Não tem

Multijogador, PvP, guildas, chat, backend, microtransacções, publicidade,
assets de terceiros, botões falsos e menus que não fazem nada.
