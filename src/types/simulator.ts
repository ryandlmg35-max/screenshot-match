export type TipoCompeticao = 'liga' | 'copa' | 'continental';
export type FormatoCompeticao = 'pontos-corridos' | 'mata-mata' | 'grupos';
export type Posicao = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PON' | 'ATA';
export type PernaDominante = 'Direita' | 'Esquerda' | 'Ambas';
export type EstiloTatico = 'posse' | 'contra-ataque' | 'pressao-alta' | 'retranca';
export type ClimaPartida = 'Ensolarado' | 'Nublado' | 'Chuva leve' | 'Chuva forte' | 'Calor intenso';
export type CondicaoGramado = 'Excelente' | 'Bom' | 'Regular' | 'Pesado';

export interface Pais {
  id: string;
  nome: string;
  continente: string;
  codigo_iso: string;
}

export interface Competicao {
  id: string;
  nome: string;
  pais_id: string | null;
  tipo: TipoCompeticao;
  divisao: number | null;
  formato: FormatoCompeticao;
}

export interface Temporada {
  id: string;
  competicao_id: string;
  ano_inicio: number;
  ano_fim: number;
  ativa: boolean;
}

export interface TituloHistorico {
  competicao: string;
  quantidade: number;
  ultimo_ano?: number;
}

export interface Time {
  id: string;
  nome: string;
  sigla: string;
  pais_id: string;
  cidade: string;
  estadio: string;
  logo_url: string;
  elo_rating: number;
  estilo_tatico: EstiloTatico;
  moral_elenco: number;
  home_bonus: number;
  orcamento: number;
  titulos_historicos: TituloHistorico[];
  forma_recente: Array<'V' | 'E' | 'D'>;
}

export interface TimeCompeticao {
  id?: string;
  time_id: string;
  competicao_id: string;
  temporada_id: string;
  grupo?: string | null;
}

export interface AtributosJogador {
  finalizacao: number;
  passe: number;
  drible: number;
  velocidade: number;
  forca_fisica: number;
  marcacao: number;
  visao_jogo: number;
  posicionamento: number;
  reflexos: number;
}

export interface HistoricoJogadorTemporada {
  ano: number;
  competicao_id: string;
  competicao_nome: string;
  time_id: string;
  time_nome: string;
  jogos: number;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
}

export interface OcorrenciaJogador {
  id: string;
  tipo: 'lesao' | 'suspensao_amarelo' | 'suspensao_vermelho';
  descricao: string;
  jogos_fora: number;
  rodada: number;
  competicao_nome: string;
}

export interface Jogador extends AtributosJogador {
  id: string;
  time_id: string;
  nome: string;
  posicao: Posicao;
  numero: number;
  nacionalidade: string;
  idade: number;
  overall: number;
  perna_dominante: PernaDominante;
  forma_fisica: number;
  moral: number;
  amarelos_acumulados: number;
  vermelhos_temporada: number;
  suspenso_jogos: number;
  lesionado_jogos: number;
  lesao_descricao: string | null;
  salario_semanal: number;
  valor_mercado: number;
  contrato_fim_ano: number;
  historico_temporadas: HistoricoJogadorTemporada[];
  timeline_ocorrencias: OcorrenciaJogador[];
}

export interface Tecnico {
  id: string;
  time_id: string;
  nome: string;
  nacionalidade: string;
}

export type TipoEventoPartida =
  | 'gol'
  | 'cartao_amarelo'
  | 'cartao_vermelho'
  | 'substituicao'
  | 'defesa_goleiro'
  | 'lesao'
  | 'penalti_convertido'
  | 'penalti_perdido';

export interface EventoPartida {
  minuto: number;
  tipo: TipoEventoPartida;
  time_id: string;
  jogador_id: string;
  jogador_nome: string;
  assistencia_id?: string;
  assistencia_nome?: string;
  substituido_id?: string;
  substituido_nome?: string;
  narracao: string;
}

export interface EscalacaoJogador {
  id: string;
  nome: string;
  posicao: Posicao;
  numero: number;
  overall: number;
  forma_fisica?: number;
  moral?: number;
}

export interface EstatisticasPartida {
  posse_casa: number;
  posse_fora: number;
  finalizacoes_casa: number;
  finalizacoes_fora: number;
  finalizacoes_gol_casa: number;
  finalizacoes_gol_fora: number;
  finalizacoes_fora_casa: number;
  finalizacoes_fora_fora: number;
  defesas_casa: number;
  defesas_fora: number;
  xg_casa: number;
  xg_fora: number;
  escanteios_casa: number;
  escanteios_fora: number;
  faltas_casa: number;
  faltas_fora: number;
}

export interface Sumula {
  overall_casa: number;
  overall_fora: number;
  titulares_casa: EscalacaoJogador[];
  titulares_fora: EscalacaoJogador[];
  reservas_casa?: EscalacaoJogador[];
  reservas_fora?: EscalacaoJogador[];
  eventos: EventoPartida[];
  estatisticas: EstatisticasPartida;
  vencedor_penaltis_id?: string | null;
  melhor_em_campo?: { jogador_id: string; nome: string; time_id: string };
}

export interface Partida {
  id: string;
  competicao_id: string;
  temporada_id: string;
  time_casa_id: string;
  time_fora_id: string;
  gols_casa: number | null;
  gols_fora: number | null;
  penaltis_casa: number | null;
  penaltis_fora: number | null;
  rodada: number;
  fase: string;
  data: string;
  finalizada: boolean;
  clima: ClimaPartida;
  gramado: CondicaoGramado;
  classico: boolean;
  sumula: Sumula | null;
}

export interface Classificacao {
  id?: string;
  competicao_id: string;
  temporada_id: string;
  time_id: string;
  grupo?: string | null;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  saldo: number;
}

export interface Artilharia {
  id?: string;
  jogador_id: string;
  competicao_id: string;
  temporada_id: string;
  gols: number;
  assistencias: number;
}

export interface Transferencia {
  id: string;
  jogador_id: string;
  jogador_nome: string;
  posicao: Posicao;
  overall: number;
  time_origem_id: string | null;
  time_destino_id: string;
  valor: number;
  tipo: 'compra' | 'livre' | 'base';
  temporada_ano: number;
  data: string;
}
