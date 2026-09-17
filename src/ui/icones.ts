/** Converte os sprites em imagens reutilizáveis pelo HTML do HUD. */

import { sprite } from '../render/sprites';
import { itemDef } from '../game/items';

const cache = new Map<string, string>();

export function iconeItem(id: string): string {
  const existente = cache.get(id);
  if (existente) return existente;
  const def = itemDef(id);
  const canvas = def ? sprite(def.sprite, 0, def.paleta) : sprite('i_po', 0);
  const url = canvas.toDataURL();
  cache.set(id, url);
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
