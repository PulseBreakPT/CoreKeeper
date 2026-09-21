import type { Modo } from './logica';
import type { Missao } from './progressao';

export type Idioma = 'pt-PT' | 'en' | 'es' | 'pt-BR';

const CHAVE_IDIOMA = 'serpente:idioma:v1';

/** Um dicionário: chave de texto para o texto já escrito. */
type Textos = Record<string, string>;

const pt: Textos = {
  meta: 'Serpente — um jogo arcade para telemóvel.',
  configurar: 'CONFIGURA A PARTIDA', titulo: 'A tua cobra.<br><em>As tuas regras.</em>',
  jogar: 'Jogar', visual: 'Visual', carreira: 'Carreira', ambiente: 'AMBIENTE DA ARENA',
  cor: 'COR DO TEMA E DA COBRA', pele: 'PELE ANIMADA', idioma: 'IDIOMA / LANGUAGE', escolherModo: 'ESCOLHE O MODO',
  floresta: 'Floresta', oceano: 'Oceano', violeta: 'Violeta', brasa: 'Brasa',
  lima: 'Lima', ciano: 'Ciano', rosa: 'Rosa', dourada: 'Dourada', aurora: 'Aurora', pulso: 'Pulso', prisma: 'Prisma',
  classico: 'Clássico', classicoDesc: 'Sem limite. Só instinto.', relogio: 'Contra o tempo', relogioDesc: '10 segundos por luz.',
  portais: 'Portais', portaisDesc: 'Atravessa as margens.', zen: 'Zen', zenDesc: 'Sem derrota. Só fluxo.',
  escuro: 'Eclipse', escuroDesc: 'Visão limitada à cabeça.', obstaculos: 'Labirinto', obstaculosDesc: 'Blocos em cada arena.',
  umaVida: 'Uma vida', umaVidaDesc: 'Mais rápido. Pontos ×2.', desafio: 'DESAFIO DO DIA',
  extremo: 'Extremo', extremoDesc: 'Velocidade sem piedade.', mini: 'Arena mini', miniDesc: '13 × 13. Espaço mínimo.', dupla: 'Duas cobras', duplaDesc: 'Controla duas em espelho.',
  progressao: 'PROGRESSÃO LOCAL', percurso: 'O teu percurso.', percursoDesc: 'Recordes, missões e conquistas ficam guardados neste dispositivo.',
  nivel: 'NÍVEL', recordeAtual: 'RECORDE ATUAL', conquistas: 'CONQUISTAS', entrar: 'ENTRAR NA ARENA',
  moedas: 'MOEDAS', loja: 'Loja', ranking: 'Ranking', definicoes: 'Definições', segundaOportunidade: 'SEGUNDA OPORTUNIDADE · 25 ◇',
  poderes: 'PODERES', historico: 'Histórico', comprar: 'COMPRAR', equipado: 'EQUIPADO', sensibilidade: 'Sensibilidade', canhoto: 'Modo esquerdino', movimentoReduzido: 'Reduzir animações', daltonico: 'Modo daltónico', temaAutomatico: 'Tema automático',
  vidas: 'Vida extra', escudo: 'Escudo', ima: 'Íman', lento: 'Tempo lento', dobro: 'Pontos ×2', veneno: 'Veneno', inversao: 'Controlos invertidos',
  saldoInsuficiente: 'Moedas insuficientes', adquirido: 'ADQUIRIDO', equipar: 'EQUIPAR', objetivosHoje: 'OBJETIVOS DE HOJE',
  pontos: 'PONTOS', recorde: 'RECORDE', segue: 'Segue o<br><em>instinto.</em>', jogarAcao: 'JOGAR',
  pausaEtiqueta: 'JOGO EM PAUSA', respira: 'Respira.', continuar: 'CONTINUAR', espera: 'A arena fica à tua espera.',
  fimEtiqueta: 'FIM DA PARTIDA', jogarOutra: 'JOGAR OUTRA VEZ', partilhar: 'PARTILHAR RESULTADO', voltar: 'Toca para voltar à arena.',
  missao: 'MISSÃO', segmentos: 'SEGMENTOS', ritmo: 'RITMO', deslizaArena: 'DESLIZA NA ARENA', gesto: 'uma direção por gesto',
  perfil: 'PERFIL LOCAL', tuaCarreira: 'A tua carreira', fechar: 'Fechar',
  partidas: 'partidas', luzes: 'luzes', pronto: 'À TUA ESPERA', prepara: 'PREPARA-TE', fluxo: 'NO FLOW',
  emPausa: 'EM PAUSA', conquistada: 'ARENA CONQUISTADA', maisUma: 'MAIS UMA?', arenaCheia: 'ARENA CHEIA',
  tempoEsgotado: 'TEMPO ESGOTADO', fimJogo: 'FIM DE JOGO', cheiaDesc: 'Encheste o tabuleiro. Não há mais sítio para crescer.',
  novoRecorde: 'Recorde novo!', missaoCumprida: 'Missão cumprida.', conquistaNova: 'Conquista: {nome}.',
  deslizaComecar: 'Desliza para começar', teclasComecar: 'Setas ou WASD para começar',
  somLigar: 'Ligar som', somDesligar: 'Desligar som', pausar: 'Pausar partida', retomar: 'Continuar partida', abrirMenu: 'Abrir menu principal',
  copiado: 'RESULTADO COPIADO ', vai: 'VAI', partilhaTexto: 'Marquei {pontos} pontos e cheguei a {segmentos} segmentos no modo {modo} de Serpente. Consegues superar?',
  statPartidas: 'PARTIDAS', statPontos: 'PONTOS', statLuzes: 'LUZES', statEspeciais: 'ESPECIAIS', statCombo: 'MELHOR COMBO', statCobra: 'MAIOR COBRA', statMissoes: 'MISSÕES', statMinutos: 'MINUTOS',
  missaoComidas: 'Recolhe {n} luzes', missaoCombo: 'Alcança combo ×{n}', missaoPontos: 'Marca {n} pontos', missaoEspeciais: 'Apanha {n} luzes especiais', missaoComprimento: 'Chega aos {n} segmentos',
  diario0: 'Portais instáveis', diario1: 'Arena em eclipse', diario2: 'Circuito de blocos', diario3: 'Ritmo ascendente',
  conquista_despertar_nome: 'Despertar', conquista_despertar_desc: 'Termina a primeira partida.',
  conquista_dez_nome: 'Primeira dezena', conquista_dez_desc: 'Marca 10 pontos numa carreira.',
  conquista_centuria_nome: 'Centúria', conquista_centuria_desc: 'Recolhe 100 luzes.',
  conquista_sintonia_nome: 'Sintonia', conquista_sintonia_desc: 'Alcança um combo ×3.',
  conquista_imparavel_nome: 'Imparável', conquista_imparavel_desc: 'Alcança o combo máximo ×5.',
  conquista_alquimista_nome: 'Alquimista', conquista_alquimista_desc: 'Recolhe 20 luzes especiais.',
  conquista_alongada_nome: 'Alongada', conquista_alongada_desc: 'Chega aos 20 segmentos.',
  conquista_objectivo_nome: 'Objectivo', conquista_objectivo_desc: 'Cumpre uma missão de partida.',
  conquista_veterano_nome: 'Veterano', conquista_veterano_desc: 'Joga 25 partidas.',
  conquista_conquista_nome: 'Conquista', conquista_conquista_desc: 'Enche completamente uma arena.',
  conquista_secreto_veloz_nome: 'Relâmpago', conquista_secreto_veloz_desc: 'Supera 30 pontos no modo extremo.',
  conquista_secreto_duplo_nome: 'Gémeas', conquista_secreto_duplo_desc: 'Domina uma partida com duas cobras.',
  conquista_secreto_cofre_nome: 'Cofre', conquista_secreto_cofre_desc: 'Acumula 250 moedas.',
};

export type ChaveTexto = string;

const en: Textos = {
  meta: 'Serpente — a mobile arcade game.',
  configurar: 'SET UP YOUR RUN', titulo: 'Your snake.<br><em>Your rules.</em>',
  jogar: 'Play', visual: 'Visual', carreira: 'Career', ambiente: 'ARENA ENVIRONMENT', cor: 'THEME AND SNAKE COLOR', pele: 'ANIMATED SKIN', idioma: 'LANGUAGE', escolherModo: 'CHOOSE A MODE',
  floresta: 'Forest', oceano: 'Ocean', violeta: 'Violet', brasa: 'Ember', lima: 'Lime', ciano: 'Cyan', rosa: 'Pink', dourada: 'Gold', aurora: 'Aurora', pulso: 'Pulse', prisma: 'Prism',
  classico: 'Classic', classicoDesc: 'No limit. Pure instinct.', relogio: 'Time attack', relogioDesc: '10 seconds per light.', portais: 'Portals', portaisDesc: 'Cross the edges.', zen: 'Zen', zenDesc: 'No defeat. Just flow.', escuro: 'Eclipse', escuroDesc: 'Vision follows the head.', obstaculos: 'Maze', obstaculosDesc: 'Blocks in every arena.', umaVida: 'One life', umaVidaDesc: 'Faster. Double points.', desafio: 'DAILY CHALLENGE',
  progressao: 'LOCAL PROGRESSION', percurso: 'Your journey.', percursoDesc: 'Records, missions and achievements are saved on this device.', nivel: 'LEVEL', recordeAtual: 'CURRENT BEST', conquistas: 'ACHIEVEMENTS', entrar: 'ENTER THE ARENA',
  pontos: 'SCORE', recorde: 'BEST', segue: 'Follow your<br><em>instinct.</em>', jogarAcao: 'PLAY', pausaEtiqueta: 'GAME PAUSED', respira: 'Breathe.', continuar: 'CONTINUE', espera: 'The arena will wait for you.', fimEtiqueta: 'RUN COMPLETE', jogarOutra: 'PLAY AGAIN', partilhar: 'SHARE RESULT', voltar: 'Tap to return to the arena.', missao: 'MISSION', segmentos: 'SEGMENTS', ritmo: 'PACE', deslizaArena: 'SWIPE IN THE ARENA', gesto: 'one direction per gesture', perfil: 'LOCAL PROFILE', tuaCarreira: 'Your career', fechar: 'Close',
  partidas: 'runs', luzes: 'lights', pronto: 'WAITING FOR YOU', prepara: 'GET READY', fluxo: 'IN THE FLOW', emPausa: 'PAUSED', conquistada: 'ARENA CONQUERED', maisUma: 'ONE MORE?', arenaCheia: 'ARENA FILLED', tempoEsgotado: 'TIME UP', fimJogo: 'GAME OVER', cheiaDesc: 'You filled the board. There is nowhere left to grow.', novoRecorde: 'New record!', missaoCumprida: 'Mission complete.', conquistaNova: 'Achievement: {nome}.', deslizaComecar: 'Swipe to start', teclasComecar: 'Arrow keys or WASD to start', somLigar: 'Turn sound on', somDesligar: 'Turn sound off', pausar: 'Pause game', retomar: 'Resume game', abrirMenu: 'Open main menu', copiado: 'RESULT COPIED ', vai: 'GO', partilhaTexto: 'I scored {pontos} points and reached {segmentos} segments in Serpente’s {modo} mode. Can you beat it?',
  statPartidas: 'RUNS', statPontos: 'POINTS', statLuzes: 'LIGHTS', statEspeciais: 'SPECIALS', statCombo: 'BEST COMBO', statCobra: 'LONGEST SNAKE', statMissoes: 'MISSIONS', statMinutos: 'MINUTES',
  missaoComidas: 'Collect {n} lights', missaoCombo: 'Reach combo ×{n}', missaoPontos: 'Score {n} points', missaoEspeciais: 'Collect {n} special lights', missaoComprimento: 'Reach {n} segments', diario0: 'Unstable portals', diario1: 'Eclipse arena', diario2: 'Block circuit', diario3: 'Rising pace',
  conquista_despertar_nome: 'Awakening', conquista_despertar_desc: 'Finish your first run.', conquista_dez_nome: 'First ten', conquista_dez_desc: 'Score 10 career points.', conquista_centuria_nome: 'Centurion', conquista_centuria_desc: 'Collect 100 lights.', conquista_sintonia_nome: 'Harmony', conquista_sintonia_desc: 'Reach a ×3 combo.', conquista_imparavel_nome: 'Unstoppable', conquista_imparavel_desc: 'Reach the maximum ×5 combo.', conquista_alquimista_nome: 'Alchemist', conquista_alquimista_desc: 'Collect 20 special lights.', conquista_alongada_nome: 'Long form', conquista_alongada_desc: 'Reach 20 segments.', conquista_objectivo_nome: 'Objective', conquista_objectivo_desc: 'Complete a run mission.', conquista_veterano_nome: 'Veteran', conquista_veterano_desc: 'Play 25 runs.', conquista_conquista_nome: 'Conquest', conquista_conquista_desc: 'Completely fill an arena.',
  extremo: 'Extreme', extremoDesc: 'Merciless speed.', mini: 'Mini arena', miniDesc: '13 × 13. Minimal space.', dupla: 'Twin snakes', duplaDesc: 'Control two mirrored snakes.', moedas: 'COINS', loja: 'Shop', ranking: 'Ranking', definicoes: 'Settings', segundaOportunidade: 'SECOND CHANCE · 25 ◇', poderes: 'POWERS', historico: 'History', comprar: 'BUY', equipado: 'EQUIPPED', sensibilidade: 'Sensitivity', canhoto: 'Left-handed mode', movimentoReduzido: 'Reduce motion', daltonico: 'Color-blind mode', temaAutomatico: 'Automatic theme',
};

const es: Textos = {
  meta: 'Serpente — un juego arcade para móvil.', configurar: 'CONFIGURA LA PARTIDA', titulo: 'Tu serpiente.<br><em>Tus reglas.</em>', jogar: 'Jugar', visual: 'Visual', carreira: 'Carrera', ambiente: 'AMBIENTE DE LA ARENA', cor: 'COLOR DEL TEMA Y LA SERPIENTE', pele: 'ASPECTO ANIMADO', idioma: 'IDIOMA / LANGUAGE', escolherModo: 'ELIGE EL MODO',
  floresta: 'Bosque', oceano: 'Océano', violeta: 'Violeta', brasa: 'Brasa', lima: 'Lima', ciano: 'Cian', rosa: 'Rosa', dourada: 'Dorada', aurora: 'Aurora', pulso: 'Pulso', prisma: 'Prisma',
  classico: 'Clásico', classicoDesc: 'Sin límite. Puro instinto.', relogio: 'Contrarreloj', relogioDesc: '10 segundos por luz.', portais: 'Portales', portaisDesc: 'Cruza los bordes.', zen: 'Zen', zenDesc: 'Sin derrota. Solo fluye.', escuro: 'Eclipse', escuroDesc: 'Visión limitada a la cabeza.', obstaculos: 'Laberinto', obstaculosDesc: 'Bloques en cada arena.', umaVida: 'Una vida', umaVidaDesc: 'Más rápido. Puntos ×2.', desafio: 'DESAFÍO DIARIO',
  progressao: 'PROGRESIÓN LOCAL', percurso: 'Tu recorrido.', percursoDesc: 'Récords, misiones y logros se guardan en este dispositivo.', nivel: 'NIVEL', recordeAtual: 'RÉCORD ACTUAL', conquistas: 'LOGROS', entrar: 'ENTRAR EN LA ARENA', pontos: 'PUNTOS', recorde: 'RÉCORD', segue: 'Sigue tu<br><em>instinto.</em>', jogarAcao: 'JUGAR', pausaEtiqueta: 'JUEGO EN PAUSA', respira: 'Respira.', continuar: 'CONTINUAR', espera: 'La arena te esperará.', fimEtiqueta: 'FIN DE LA PARTIDA', jogarOutra: 'JUGAR DE NUEVO', partilhar: 'COMPARTIR RESULTADO', voltar: 'Toca para volver a la arena.', missao: 'MISIÓN', segmentos: 'SEGMENTOS', ritmo: 'RITMO', deslizaArena: 'DESLIZA EN LA ARENA', gesto: 'una dirección por gesto', perfil: 'PERFIL LOCAL', tuaCarreira: 'Tu carrera', fechar: 'Cerrar',
  partidas: 'partidas', luzes: 'luces', pronto: 'TE ESTÁ ESPERANDO', prepara: 'PREPÁRATE', fluxo: 'EN EL FLUJO', emPausa: 'EN PAUSA', conquistada: 'ARENA CONQUISTADA', maisUma: '¿OTRA MÁS?', arenaCheia: 'ARENA COMPLETA', tempoEsgotado: 'TIEMPO AGOTADO', fimJogo: 'FIN DEL JUEGO', cheiaDesc: 'Has llenado el tablero. No queda espacio para crecer.', novoRecorde: '¡Nuevo récord!', missaoCumprida: 'Misión completada.', conquistaNova: 'Logro: {nome}.', deslizaComecar: 'Desliza para empezar', teclasComecar: 'Flechas o WASD para empezar', somLigar: 'Activar sonido', somDesligar: 'Desactivar sonido', pausar: 'Pausar partida', retomar: 'Continuar partida', abrirMenu: 'Abrir menú principal', copiado: 'RESULTADO COPIADO ', vai: 'YA', partilhaTexto: 'He conseguido {pontos} puntos y {segmentos} segmentos en el modo {modo} de Serpente. ¿Puedes superarlo?',
  statPartidas: 'PARTIDAS', statPontos: 'PUNTOS', statLuzes: 'LUCES', statEspeciais: 'ESPECIALES', statCombo: 'MEJOR COMBO', statCobra: 'SERPIENTE MÁS LARGA', statMissoes: 'MISIONES', statMinutos: 'MINUTOS', missaoComidas: 'Recoge {n} luces', missaoCombo: 'Alcanza combo ×{n}', missaoPontos: 'Consigue {n} puntos', missaoEspeciais: 'Recoge {n} luces especiales', missaoComprimento: 'Llega a {n} segmentos', diario0: 'Portales inestables', diario1: 'Arena en eclipse', diario2: 'Circuito de bloques', diario3: 'Ritmo ascendente',
  conquista_despertar_nome: 'Despertar', conquista_despertar_desc: 'Termina tu primera partida.', conquista_dez_nome: 'Primera decena', conquista_dez_desc: 'Consigue 10 puntos de carrera.', conquista_centuria_nome: 'Centuria', conquista_centuria_desc: 'Recoge 100 luces.', conquista_sintonia_nome: 'Sintonía', conquista_sintonia_desc: 'Alcanza un combo ×3.', conquista_imparavel_nome: 'Imparable', conquista_imparavel_desc: 'Alcanza el combo máximo ×5.', conquista_alquimista_nome: 'Alquimista', conquista_alquimista_desc: 'Recoge 20 luces especiales.', conquista_alongada_nome: 'Alargada', conquista_alongada_desc: 'Llega a 20 segmentos.', conquista_objectivo_nome: 'Objetivo', conquista_objectivo_desc: 'Completa una misión de partida.', conquista_veterano_nome: 'Veterano', conquista_veterano_desc: 'Juega 25 partidas.', conquista_conquista_nome: 'Conquista', conquista_conquista_desc: 'Llena completamente una arena.',
  extremo: 'Extremo', extremoDesc: 'Velocidad sin piedad.', mini: 'Arena mini', miniDesc: '13 × 13. Espacio mínimo.', dupla: 'Dos serpientes', duplaDesc: 'Controla dos en espejo.', moedas: 'MONEDAS', loja: 'Tienda', ranking: 'Ranking', definicoes: 'Ajustes', segundaOportunidade: 'SEGUNDA OPORTUNIDAD · 25 ◇', poderes: 'PODERES', historico: 'Historial', comprar: 'COMPRAR', equipado: 'EQUIPADO', sensibilidade: 'Sensibilidad', canhoto: 'Modo zurdo', movimentoReduzido: 'Reducir animaciones', daltonico: 'Modo daltónico', temaAutomatico: 'Tema automático',
};

const br: Textos = {
  ...pt,
  meta: 'Serpente — um jogo arcade para celular.', configurar: 'CONFIGURE A PARTIDA', titulo: 'Sua cobra.<br><em>Suas regras.</em>',
  escolherModo: 'ESCOLHA O MODO', portaisDesc: 'Atravesse as bordas.', percurso: 'Sua jornada.', percursoDesc: 'Recordes, missões e conquistas ficam salvos neste dispositivo.',
  tuaCarreira: 'Sua carreira', recordeAtual: 'RECORDE ATUAL', segue: 'Siga o seu<br><em>instinto.</em>', espera: 'A arena espera por você.', fluxo: 'NO FLUXO',
  fimEtiqueta: 'FIM DA PARTIDA', jogarOutra: 'JOGAR NOVAMENTE', voltar: 'Toque para voltar à arena.', pronto: 'ESPERANDO VOCÊ', prepara: 'PREPARE-SE',
  cheiaDesc: 'Você preencheu o tabuleiro. Não há mais espaço para crescer.', novoRecorde: 'Novo recorde!',
  deslizaComecar: 'Deslize para começar', teclasComecar: 'Setas ou WASD para começar', deslizaArena: 'DESLIZE NA ARENA', gesto: 'uma direção por gesto',
  somLigar: 'Ligar som', somDesligar: 'Desligar som', retomar: 'Continuar partida', copiado: 'RESULTADO COPIADO ',
  partilhaTexto: 'Marquei {pontos} pontos e cheguei a {segmentos} segmentos no modo {modo} de Serpente. Você consegue superar?',
  missaoComidas: 'Colete {n} luzes', missaoCombo: 'Alcance combo ×{n}', missaoPontos: 'Marque {n} pontos',
  missaoEspeciais: 'Pegue {n} luzes especiais', missaoComprimento: 'Chegue aos {n} segmentos',
  conquista_despertar_desc: 'Termine a primeira partida.', conquista_dez_desc: 'Marque 10 pontos na carreira.',
  conquista_centuria_desc: 'Colete 100 luzes.', conquista_sintonia_desc: 'Alcance um combo ×3.',
  conquista_imparavel_desc: 'Alcance o combo máximo ×5.', conquista_alquimista_desc: 'Colete 20 luzes especiais.',
  conquista_alongada_desc: 'Chegue aos 20 segmentos.', conquista_objectivo_nome: 'Objetivo',
  conquista_objectivo_desc: 'Cumpra uma missão de partida.', conquista_veterano_desc: 'Jogue 25 partidas.',
  conquista_conquista_desc: 'Preencha completamente uma arena.',
};

const DICIONARIOS: Record<Idioma, Textos> = { 'pt-PT': pt, en, es, 'pt-BR': br };

export function idiomaInicial(): Idioma {
  try {
    const guardado = localStorage.getItem(CHAVE_IDIOMA) as Idioma | null;
    if (guardado && guardado in DICIONARIOS) return guardado;
  } catch { /* usa a língua do sistema */ }
  const sistema = navigator.language.toLowerCase();
  if (sistema.startsWith('en')) return 'en';
  if (sistema.startsWith('es')) return 'es';
  if (sistema === 'pt-br' || sistema.startsWith('pt-br')) return 'pt-BR';
  return 'pt-PT';
}

let actual: Idioma = idiomaInicial();

export function idiomaActual(): Idioma { return actual; }

export function definirIdioma(idioma: Idioma): void {
  actual = idioma;
  document.documentElement.lang = idioma;
  try { localStorage.setItem(CHAVE_IDIOMA, idioma); } catch { /* preferência da sessão */ }
}

export function t(chave: keyof Textos, variaveis: Record<string, string | number> = {}): string {
  const base = DICIONARIOS[actual][chave] ?? pt[chave] ?? chave;
  return Object.entries(variaveis).reduce((texto, [nome, valor]) => texto.replaceAll(`{${nome}}`, String(valor)), base);
}

const CHAVES_MODO: Record<Modo, keyof Textos> = {
  classico: 'classico', relogio: 'relogio', portais: 'portais', zen: 'zen', escuro: 'escuro',
  obstaculos: 'obstaculos', 'uma-vida': 'umaVida', diario: 'desafio',
  extremo: 'extremo', mini: 'mini', dupla: 'dupla',
};

export function nomeModo(modo: Modo): string { return t(CHAVES_MODO[modo]).toLocaleUpperCase(actual); }

export function textoMissao(missao: Missao): string {
  const chave: Record<Missao['tipo'], keyof Textos> = {
    comidas: 'missaoComidas', combo: 'missaoCombo', pontos: 'missaoPontos',
    especiais: 'missaoEspeciais', comprimento: 'missaoComprimento',
  };
  return t(chave[missao.tipo], { n: missao.alvo });
}

export function textoConquista(id: string): { nome: string; descricao: string } {
  return {
    nome: t(`conquista_${id}_nome` as keyof Textos),
    descricao: t(`conquista_${id}_desc` as keyof Textos),
  };
}

export function nomeDiario(dia = Math.floor(Date.now() / 86_400_000)): string {
  return t(`diario${Math.abs(dia * 17 + 11) % 4}` as keyof Textos);
}
