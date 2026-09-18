#!/usr/bin/env python3
"""
Corta as folhas de UI em peças soltas e com nome.

As folhas vêm como uma imagem só. Uma interface a sério precisa de cada
moldura, botão e ícone como ficheiro próprio, para o CSS poder esticá-los,
trocá-los por estado e pô-los onde a interface manda. É isso que aqui se faz.

Os rectângulos foram tirados a olho da folha (com os limites reais apertados
ao alfa depois), e algumas peças da folha estão coladas — por isso há cortes
manuais, como as três variantes do botão de ataque.

Precisa de Pillow. Corre-se à mão quando as folhas mudam:

    pip install Pillow && python3 scripts/cortar-ui.py
"""

import json
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
ORIGEM = RAIZ / 'arte' / 'ui'
DESTINO = RAIZ / 'src' / 'assets' / 'ui'
ALFA_MIN = 24

# (pasta/nome, folha, (x0, y0, x1, y1), largura máxima)
# A largura máxima existe para não levar para o telemóvel píxeis que ninguém vê:
# um slot desenhado a 56 px não precisa de uma textura de 160.
PECAS: list[tuple[str, str, tuple[int, int, int, int], int]] = [
    # --- HUD: barras, molduras e ornamentos ---------------------------------
    ('hud/barra-vida',      '1-hud', (15, 48, 526, 168), 512),
    ('hud/barra-energia',   '1-hud', (15, 170, 526, 292), 512),
    ('hud/barra-xp',        '1-hud', (15, 299, 526, 420), 512),
    ('hud/painel-leitura',  '1-hud', (14, 433, 697, 704), 683),
    ('hud/barra-recurso',   '1-hud', (721, 458, 1229, 555), 508),
    ('hud/aviso',           '1-hud', (715, 581, 1237, 740), 522),
    ('hud/hotbar',          '1-hud', (14, 728, 804, 896), 790),
    ('hud/botao-menu',      '1-hud', (1156, 761, 1232, 1044), 96),
    ('hud/etiqueta',        '1-hud', (700, 876, 1133, 1014), 448),
    ('hud/separador',       '1-hud', (43, 1058, 610, 1168), 512),
    ('hud/canto-esquerdo',  '1-hud', (879, 1095, 999, 1225), 120),
    ('hud/canto-direito',   '1-hud', (1104, 1095, 1226, 1226), 120),
    ('hud/estrela',         '1-hud', (1001, 1101, 1108, 1225), 96),

    # --- Painéis de menu ----------------------------------------------------
    ('paineis/inventario',  '2-paineis', (14, 9, 473, 505), 512),
    ('paineis/criar',       '2-paineis', (480, 13, 836, 506), 512),
    ('paineis/dialogo',     '2-paineis', (515, 516, 826, 812), 512),
    ('paineis/confirmar',   '2-paineis', (842, 515, 1237, 807), 512),
    ('paineis/barra-titulo','2-paineis', (7, 840, 667, 930), 660),
    ('paineis/pesquisa',    '2-paineis', (7, 936, 667, 1014), 660),
    ('paineis/separadores', '2-paineis', (684, 843, 1250, 923), 566),
    ('paineis/cabecalho',   '2-paineis', (797, 1024, 1230, 1148), 512),
    ('paineis/barra',       '2-paineis', (789, 1162, 1233, 1228), 444),

    # --- Controlos ----------------------------------------------------------
    ('controlos/joystick-base',  '3-controlos', (10, 29, 285, 306), 256),
    ('controlos/joystick-aceso', '3-controlos', (296, 29, 571, 306), 256),
    ('controlos/joystick-punho', '3-controlos', (580, 155, 712, 288), 128),
    ('controlos/joystick-punho-aceso', '3-controlos', (716, 146, 866, 295), 144),
    ('controlos/atacar',         '3-controlos', (12, 312, 192, 512), 192),
    ('controlos/atacar-activo',  '3-controlos', (192, 312, 372, 512), 192),
    ('controlos/atacar-premido', '3-controlos', (372, 312, 553, 512), 192),
    ('controlos/botao',          '3-controlos', (17, 508, 230, 730), 192),
    ('controlos/botao-premido',  '3-controlos', (230, 508, 428, 730), 192),
    ('controlos/botao-cristal',  '3-controlos', (819, 516, 1035, 725), 192),
    ('controlos/botao-simples',  '3-controlos', (1035, 516, 1238, 725), 192),
    ('controlos/botao-perigo',   '3-controlos', (620, 517, 810, 722), 192),
    ('controlos/mais',           '3-controlos', (1058, 836, 1142, 920), 96),
    ('controlos/menos',          '3-controlos', (1150, 836, 1233, 920), 96),
    ('controlos/interruptor-off','3-controlos', (887, 61, 1047, 152), 160),
    ('controlos/interruptor-on', '3-controlos', (1061, 61, 1225, 152), 160),
    ('controlos/principal',      '3-controlos', (769, 1093, 1225, 1205), 456),
    ('controlos/principal-activo','3-controlos', (289, 1064, 759, 1211), 470),
    ('controlos/caixa',          '3-controlos', (32, 963, 106, 1038), 96),
    ('controlos/caixa-marcada',  '3-controlos', (128, 962, 205, 1038), 96),

    # --- Slots --------------------------------------------------------------
    ('slots/normal',     '4-slots', (18, 13, 175, 193), 128),
    ('slots/activo',     '4-slots', (187, 13, 365, 200), 144),
    ('slots/raro',       '4-slots', (379, 13, 544, 195), 128),
    ('slots/bloqueado',  '4-slots', (556, 13, 717, 195), 128),

    # Slots de equipamento: já vêm com a peça desenhada por dentro, o que diz
    # ao jogador o que lá vai antes de ter alguma coisa para pôr.
    ('slots/elmo',   '4-slots', (210, 203, 370, 379), 128),
    ('slots/peito',  '4-slots', (384, 203, 544, 379), 128),
    ('slots/pernas', '4-slots', (726, 203, 884, 379), 128),

    # --- Ícones de categoria ------------------------------------------------
    ('icones/mochila',     '4-slots', (26, 763, 134, 891), 96),
    ('icones/combate',     '4-slots', (141, 762, 251, 890), 96),
    ('icones/picareta',    '4-slots', (251, 762, 362, 890), 96),
    ('icones/cristais',    '4-slots', (368, 762, 475, 890), 96),
    ('icones/pocao',       '4-slots', (485, 762, 593, 889), 96),
    ('icones/comida',      '4-slots', (602, 762, 708, 889), 96),
    ('icones/saco',        '4-slots', (717, 762, 825, 889), 96),
    ('icones/mapa',        '4-slots', (835, 762, 944, 890), 96),
    ('icones/definicoes',  '4-slots', (953, 762, 1062, 890), 96),
    ('icones/correio',     '4-slots', (1072, 762, 1181, 892), 96),
    ('icones/bau',         '4-slots', (25, 895, 220, 1029), 160),


    # --- Estações de criação (folhas 5 a 7) ---------------------------------
    ('estacoes/bancada-quadro',  '5-criacao', (368, 20, 580, 322), 320),
    ('estacoes/bancada-quadro-raro', '5-criacao', (588, 20, 792, 322), 320),
    ('estacoes/linha-material',  '5-criacao', (430, 462, 792, 548), 384),
    ('estacoes/barra-progresso', '5-criacao', (12, 352, 424, 432), 400),
    ('estacoes/aba',             '5-criacao', (818, 18, 902, 106), 96),
    ('estacoes/aba-activa',      '5-criacao', (818, 110, 902, 200), 96),
    ('estacoes/emblema-bancada',    '5-criacao', (432, 1046, 517, 1150), 96),
    ('estacoes/emblema-alquimia',   '5-criacao', (516, 1046, 602, 1150), 96),
    ('estacoes/emblema-maquina',    '5-criacao', (601, 1046, 685, 1150), 96),
    ('estacoes/emblema-cristal',    '5-criacao', (684, 1046, 768, 1150), 96),
    ('estacoes/emblema-nucleo',     '5-criacao', (767, 1046, 857, 1150), 96),
    ('estacoes/botao-sim',       '5-criacao', (816, 992, 1022, 1058), 256),
    ('estacoes/botao-nao',       '5-criacao', (1028, 992, 1242, 1058), 256),

    ('estacoes/forno-frio',   '6-forja', (12, 8, 268, 330), 288),
    ('estacoes/forno-aceso',  '6-forja', (272, 8, 528, 330), 288),
    ('estacoes/forno-maximo', '6-forja', (532, 8, 792, 330), 288),
    ('estacoes/barra-calor',  '6-forja', (12, 470, 582, 570), 512),
    ('estacoes/barra-fole',   '6-forja', (12, 580, 582, 668), 512),
    ('estacoes/cadinho',      '6-forja', (995, 478, 1122, 646), 160),

    ('estacoes/caldeirao',      '7-alquimia', (0, 0, 348, 336), 320),
    ('estacoes/painel-mistura', '7-alquimia', (322, 12, 966, 432), 440),

    # --- Sistemas (folha 9) -------------------------------------------------
    ('paineis/linha',        '9-sistemas', (733, 92, 1124, 166), 384),
    ('paineis/linha-aviso',  '9-sistemas', (733, 16, 1124, 90), 384),
    ('paineis/linha-ok',     '9-sistemas', (733, 168, 1124, 242), 384),
    ('sistemas/faixa-chefe', '9-sistemas', (555, 722, 912, 882), 512),
    ('sistemas/placa-selada','9-sistemas', (916, 718, 1243, 926), 360),
    # --- Avisos -------------------------------------------------------------
    ('avisos/erro', '4-slots', (20, 1049, 310, 1144), 320),
    ('avisos/info', '4-slots', (317, 1049, 612, 1141), 320),
    ('avisos/ok',   '4-slots', (618, 1049, 916, 1141), 320),
]

# Os ícones de estado vêm numa grelha colada de 5x2 na folha 4.
BUFFS = [
    ['cura', 'dano', 'defesa', 'velocidade', 'fogo'],
    ['veneno', 'sangue', 'gelo', 'raio', 'vortice'],
]
CAIXA_BUFFS = (752, 566, 1237, 751)


def apertar(im: Image.Image) -> Image.Image:
    """Corta a folga transparente à volta do recorte."""
    limites = im.getchannel('A').point(lambda v: 255 if v >= ALFA_MIN else 0).getbbox()
    return im.crop(limites) if limites else im


def gravar(im: Image.Image, nome: str, largura_max: int, registo: dict) -> None:
    peca = apertar(im)
    if peca.width > largura_max:
        altura = round(peca.height * largura_max / peca.width)
        peca = peca.resize((largura_max, altura), Image.LANCZOS)
    destino = DESTINO / f'{nome}.png'
    destino.parent.mkdir(parents=True, exist_ok=True)
    # 255 cores com difusão: a arte é gradiente dourado sobre preto e, a esta
    # escala, a diferença não se vê — mas o pacote passa de 3,8 MB para 760 KB.
    peca.quantize(colors=255, method=Image.FASTOCTREE, dither=Image.FLOYDSTEINBERG).save(destino, optimize=True)
    registo[nome] = {'w': peca.width, 'h': peca.height}


def main() -> None:
    folhas = {f.stem.split('-', 1)[1]: Image.open(f).convert('RGBA') for f in ORIGEM.glob('folha-*.png')}
    registo: dict[str, dict[str, int]] = {}

    for nome, folha, caixa, largura in PECAS:
        gravar(folhas[folha].crop(caixa), nome, largura, registo)

    x0, y0, x1, y1 = CAIXA_BUFFS
    largura = (x1 - x0) / len(BUFFS[0])
    altura = (y1 - y0) / len(BUFFS)
    for linha, nomes in enumerate(BUFFS):
        for coluna, nome in enumerate(nomes):
            caixa = (
                round(x0 + coluna * largura), round(y0 + linha * altura),
                round(x0 + (coluna + 1) * largura), round(y0 + (linha + 1) * altura),
            )
            gravar(folhas['4-slots'].crop(caixa), f'buffs/{nome}', 80, registo)

    (DESTINO / 'indice.json').write_text(json.dumps(registo, indent=2, sort_keys=True), encoding='utf-8')
    print(f'{len(registo)} peças cortadas para {DESTINO.relative_to(RAIZ)}')


if __name__ == '__main__':
    main()
