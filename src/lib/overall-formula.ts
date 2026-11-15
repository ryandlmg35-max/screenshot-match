import type { Posicao } from '@/types/simulator';

export type ReputacaoNivel = 1 | 2 | 3 | 4 | 5;

export interface OverallFormulaInput {
  posicao: Posicao;
  /** 1 = Promessa/Reserva, 2 = Rotação, 3 = Titular regular, 4 = Destaque/Seleção, 5 = Classe mundial */
  reputacao: ReputacaoNivel;
  idade: number;
  clubeElo?: number;
}

const BASE_POR_REPUTACAO: Record<ReputacaoNivel, number> = {
  5: 86,
  4: 80,
  3: 74,
  2: 68,
  1: 62,
};

/**
 * Fórmula determinística para estimar o Overall (40–99) de um jogador
 * com base em posição, reputação, curva de idade e força (Elo) do clube.
 */
export function calcularOverallEstimado({
  posicao,
  reputacao,
  idade,
  clubeElo = 1500,
}: OverallFormulaInput): number {
  const base = BASE_POR_REPUTACAO[reputacao];

  // Ajuste pelo nível competitivo do clube (Elo 1300..1950 -> -4..+6)
  const eloMod = Math.max(-4, Math.min(6, Math.round((clubeElo - 1500) / 70)));

  // Curva de idade ajustada por posição (goleiros e zagueiros atingem auge mais tarde)
  let ageMod = 0;
  if (posicao === 'GOL' || posicao === 'ZAG') {
    if (idade < 21) ageMod = -2;
    else if (idade <= 24) ageMod = 0;
    else if (idade <= 32) ageMod = 2;
    else if (idade <= 35) ageMod = 1;
    else ageMod = -2;
  } else {
    if (idade < 20) ageMod = -2;
    else if (idade <= 23) ageMod = 0;
    else if (idade <= 29) ageMod = 2;
    else if (idade <= 32) ageMod = 1;
    else ageMod = -2;
  }

  // Pequeno ajuste posicional para atacantes/meias criativos de alta reputação
  const posMod = (posicao === 'ATA' || posicao === 'MEI' || posicao === 'PON') && reputacao >= 4 ? 1 : 0;

  return Math.max(50, Math.min(95, base + eloMod + ageMod + posMod));
}
