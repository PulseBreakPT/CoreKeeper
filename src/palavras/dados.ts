export type Modo = 'plural' | 'singular' | 'contrario';
export interface Pergunta { word: string; answer: string; acceptedAnswers: string[] }

const plural: Pergunta[] = [
  ['árvore','árvores'],['animal','animais'],['papel','papéis'],['pão','pães'],['cão','cães'],['mão','mãos'],['irmão','irmãos'],['limão','limões'],['capitão','capitães'],['cidadão','cidadãos'],
  ['flor','flores'],['mulher','mulheres'],['rapaz','rapazes'],['luz','luzes'],['nariz','narizes'],['funil','funis'],['farol','faróis'],['caracol','caracóis'],['azul','azuis'],['hotel','hotéis'],
  ['carro','carros'],['janela','janelas'],['cidade','cidades'],['avião','aviões'],['estação','estações'],['jardim','jardins'],['viagem','viagens'],['nuvem','nuvens'],['homem','homens'],['jovem','jovens'],
  ['mar','mares'],['mês','meses'],['país','países'],['português','portugueses'],['lápis','lápis'],['tórax','tórax'],['anel','anéis'],['barril','barris'],['fuzil','fuzis'],['degrau','degraus'],
  ['chapéu','chapéus'],['herói','heróis'],['museu','museus'],['mãe','mães'],['leão','leões'],['alemão','alemães'],['guardião','guardiões'],['órgão','órgãos'],['sótão','sótãos'],['verão','verões'],
  ['ovo','ovos'],['peixe','peixes'],['folha','folhas'],['ponte','pontes'],['relógio','relógios'],['telemóvel','telemóveis'],['fácil','fáceis'],['difícil','difíceis'],['útil','úteis'],['gentil','gentis'],
].map(([word,answer])=>({word,answer,acceptedAnswers:[answer]}));

const singular: Pergunta[] = plural.map(({word,answer})=>({word:answer,answer:word,acceptedAnswers:[word]}));

const contrario: Pergunta[] = [
  ['quente','frio'],['alto','baixo'],['grande','pequeno'],['rápido','lento'],['claro','escuro'],['novo','velho'],['feliz','triste'],['forte','fraco'],['perto','longe'],['cedo','tarde'],
  ['abrir','fechar'],['entrar','sair'],['subir','descer'],['começar','terminar'],['ganhar','perder'],['dar','receber'],['comprar','vender'],['lembrar','esquecer'],['aceitar','recusar'],['ligar','desligar'],
  ['cheio','vazio'],['limpo','sujo'],['seco','molhado'],['duro','mole'],['pesado','leve'],['largo','estreito'],['grosso','fino'],['doce','amargo'],['rico','pobre'],['caro','barato'],
  ['verdadeiro','falso'],['certo','errado'],['igual','diferente'],['possível','impossível'],['presente','ausente'],['vivo','morto'],['sim','não'],['tudo','nada'],['sempre','nunca'],['antes','depois'],
  ['dentro','fora'],['cima','baixo'],['esquerda','direita'],['frente','trás'],['dia','noite'],['inverno','verão'],['amor','ódio'],['paz','guerra'],['coragem','medo'],['ordem','desordem'],
  ['amigo','inimigo'],['adulto','criança'],['fácil','difícil'],['bonito','feio'],['calmo','agitado'],['silencioso','ruidoso'],['generoso','egoísta'],['educado','mal-educado'],['macio','áspero'],['profundo','raso'],
].map(([word,answer])=>({word,answer,acceptedAnswers:[answer]}));

export const PERGUNTAS: Record<Modo,Pergunta[]> = { plural, singular, contrario };
