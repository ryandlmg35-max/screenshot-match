export type TipoCompeticao = 'liga' | 'copa' | 'continental';
export type FormatoCompeticao = 'pontos-corridos' | 'mata-mata' | 'grupos';
export type Posicao = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PON' | 'ATA';
export type PernaDominante = 'Direita' | 'Esquerda' | 'Ambas';

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

export interface Time {
  id: string;
  nome: string;
  sigla: string;
  pais_id: string;
  cidade: string;
  estadio: string;
  logo_url: string;
  elo_rating: number;
}

export interface TimeCompeticao {
  id?: string;
  time_id: string;
  competicao_id: string;
  temporada_id: string;
  grupo?: string | null;
}

export interface Jogador {
  id: string;
  time_id: string;
  nome: string;
  posicao: Posicao;
  numero: number;
  nacionalidade: string;
  idade: number;
  overall: number;
  perna_dominante: PernaDominante;
}

export interface Tecnico {
  id: string;
  time_id: string;
  nome: string;
  nacionalidade: string;
}

export interface EventoPartida {
  minuto: number;
  tipo: 'gol' | 'cartao_amarelo' | 'cartao_vermelho' | 'penalti_convertido' | 'penalti_perdido';
  time_id: string;
  jogador_id: string;
  jogador_nome: string;
  assistencia_id?: string;
  assistencia_nome?: string;
}

export interface EscalacaoJogador {
  id: string;
  nome: string;
  posicao: Posicao;
  numero: number;
  overall: number;
}

export interface EstatisticasPartida {
  posse_casa: number;
  posse_fora: number;
  finalizacoes_casa: number;
  finalizacoes_fora: number;
  finalizacoes_gol_casa: number;
  finalizacoes_gol_fora: number;
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
  eventos: EventoPartida[];
  estatisticas: EstatisticasPartida;
  vencedor_penaltis_id?: string | null;
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
