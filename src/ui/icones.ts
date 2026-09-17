/** Converte os sprites em imagens reutilizáveis pelo HTML do HUD. */

import { sprite } from '../render/sprites';
import { spriteItem, temPintorItem } from '../render/itens';
import { rampa, type Paleta } from '../render/paleta';
import { itemDef } from '../game/items';

const cache = new Map<string, string>();

export function iconeItem(id: string): string {
  const existente = cache.get(id);
  if (existente) return existente;
  const def = itemDef(id);
  // Os itens com pintor próprio saem a 48px; o resto (blocos de construção)
  // continua a usar a arte do tile, que é o que eles são no mundo.
  const canvas = !def
    ? spriteItem('i_po', rampa('#6b6b78'))
    : temPintorItem(def.sprite)
      ? spriteItem(def.sprite, def.paleta, undefined, def.variante ?? 0)
      : sprite(def.sprite, 0, def.paleta);
  const url = canvas.toDataURL();
  cache.set(id, url);
  return url;
}

/** Glifo de interface (botões), memorizado por chave e paleta. */
export function iconeUi(chave: string, p: Paleta): string {
  const k = `ui:${chave}:${p.base}`;
  const existente = cache.get(k);
  if (existente) return existente;
  const url = sprite(chave, 0, p).toDataURL();
  cache.set(k, url);
  return url;
}

export function elementoIcone(id: string, classe = 'icone'): HTMLImageElement {
  const img = new Image();
  img.src = iconeItem(id);
  img.className = classe;
  img.alt = itemDef(id)?.nome ?? id;
  img.draggable = false;
  return img;
}
