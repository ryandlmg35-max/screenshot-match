import type { Partida, Tecnico, Time } from '@/types/simulator';

export interface PressFactorComparison {
  label: string;
  homeVal: string;
  awayVal: string;
  advantage: 'home' | 'away' | 'even';
}

export interface PressQuestion {
  outlet: string;
  journalist: string;
  speakerName: string;
  speakerTeam: string;
  question: string;
  answer: string;
}

export interface PressConferenceReport {
  storylineBadge: string;
  headline: string;
  subheadline: string;
  factors: PressFactorComparison[];
  questions: PressQuestion[];
}

const TACTIC_NAME: Record<Time['estilo_tatico'], string> = {
  posse: 'Posse de Bola',
  'contra-ataque': 'Contra-Ataque',
  'pressao-alta': 'Pressão Alta',
  retranca: 'Bloco Baixo',
};

export function generatePressConference(
  match: Partida,
  home: Time,
  away: Time,
  homeCoach?: Tecnico,
  awayCoach?: Tecnico,
  compName = 'Competição',
): PressConferenceReport {
  const gc = match.gols_casa ?? 0;
  const gf = match.gols_fora ?? 0;
  const diff = Math.abs(gc - gf);
  const isDraw = gc === gf;
  const winner = gc > gf ? home : gf > gc ? away : null;
  const loser = gc > gf ? away : gf > gc ? home : null;
  const winnerGoals = Math.max(gc, gf);
  const loserGoals = Math.min(gc, gf);
  const eloGap = winner && loser ? loser.elo_rating - winner.elo_rating : 0;
  const isUpset = eloGap >= 45;

  let storylineBadge = 'PÓS-JOGO';
  let headline = `${home.nome} ${gc} x ${gf} ${away.nome} pela ${compName}`;
  let subheadline = `Partida disputada no ${home.estadio} sob clima ${match.clima.toLowerCase()}.`;

  if (match.classico && winner) {
    storylineBadge = 'CLÁSSICO DECISIVO';
    headline = `${winner.nome} vence o clássico contra ${loser?.nome} por ${winnerGoals} a ${loserGoals}!`;
  } else if (isUpset && winner && loser) {
    storylineBadge = 'ZEBRA DA RODADA';
    headline = `Surpresa! ${winner.nome} derruba o favorito ${loser.nome} (${winnerGoals}x${loserGoals})`;
  } else if (diff >= 3 && winner) {
    storylineBadge = 'GOLEADA';
    headline = `Passeio! ${winner.nome} aplica ${winnerGoals}x${loserGoals} sobre ${loser?.nome}`;
  } else if (isDraw) {
    storylineBadge = 'EMPATE EQUILIBRADO';
    headline = `Tudo igual no ${home.estadio}: ${home.nome} ${gc} x ${gf} ${away.nome}`;
  } else if (winner) {
    storylineBadge = 'VITÓRIA IMPORTANTE';
    headline = `${winner.nome} supera ${loser?.nome} por ${winnerGoals} a ${loserGoals}`;
  }

  const stats = match.sumula?.estatisticas;
  const mvp = match.sumula?.melhor_em_campo;
  if (mvp) {
    subheadline = `${mvp.nome} foi eleito o Melhor em Campo em duelo marcado pelo estilo de ${TACTIC_NAME[home.estilo_tatico]} vs ${TACTIC_NAME[away.estilo_tatico]}.`;
  }

  const factors: PressFactorComparison[] = stats
    ? [
        {
          label: 'Posse de Bola',
          homeVal: `${stats.posse_casa}%`,
          awayVal: `${stats.posse_fora}%`,
          advantage: stats.posse_casa > stats.posse_fora + 4 ? 'home' : stats.posse_fora > stats.posse_casa + 4 ? 'away' : 'even',
        },
        {
          label: 'Gols Esperados (xG)',
          homeVal: stats.xg_casa.toFixed(2),
          awayVal: stats.xg_fora.toFixed(2),
          advantage: stats.xg_casa > stats.xg_fora + 0.25 ? 'home' : stats.xg_fora > stats.xg_casa + 0.25 ? 'away' : 'even',
        },
        {
          label: 'Finalizações no Gol',
          homeVal: String(stats.finalizacoes_gol_casa),
          awayVal: String(stats.finalizacoes_gol_fora),
          advantage:
            stats.finalizacoes_gol_casa > stats.finalizacoes_gol_fora
              ? 'home'
              : stats.finalizacoes_gol_fora > stats.finalizacoes_gol_casa
                ? 'away'
                : 'even',
        },
        {
          label: 'Defesas do Goleiro',
          homeVal: String(stats.defesas_casa ?? 0),
          awayVal: String(stats.defesas_fora ?? 0),
          advantage:
            (stats.defesas_casa ?? 0) > (stats.defesas_fora ?? 0)
              ? 'home'
              : (stats.defesas_fora ?? 0) > (stats.defesas_casa ?? 0)
                ? 'away'
                : 'even',
        },
      ]
    : [];

  const hCoachName = homeCoach?.nome ?? `Técnico do ${home.sigla}`;
  const aCoachName = awayCoach?.nome ?? `Técnico do ${away.sigla}`;

  const questions: PressQuestion[] = [
    {
      outlet: 'Gazeta Esportiva',
      journalist: 'Lucas Amaral',
      speakerName: winner ? (winner.id === home.id ? hCoachName : aCoachName) : hCoachName,
      speakerTeam: winner ? winner.nome : home.nome,
      question: winner
        ? `Professor, a estratégia de ${TACTIC_NAME[winner.estilo_tatico]} funcionou muito bem hoje. O que foi determinante para conquistar esses ${winnerGoals} gols?`
        : `Professor, apesar do empate em ${gc}x${gf}, o time criou ${stats?.xg_casa.toFixed(2) ?? 'boas'} chances de xG. Faltou capricho na finalização?`,
      answer: winner
        ? `Trabalhamos muito a compactação durante a semana. ${mvp ? `${mvp.nome} fez uma partida brilhante, mas o mérito é do coletivo.` : 'O grupo manteve a concentração do início ao fim.'} Esse resultado eleva ainda mais nossa confiança na ${compName}.`
        : `Criamos oportunidades suficientes para sair com os 3 pontos, mas o adversário se fechou bem. Vamos ajustar a pontaria para a próxima rodada.`,
    },
    {
      outlet: 'Diário Tático',
      journalist: 'Mariana Costa',
      speakerName: loser ? (loser.id === home.id ? hCoachName : aCoachName) : aCoachName,
      speakerTeam: loser ? loser.nome : away.nome,
      question: loser
        ? `Com a derrota por ${loserGoals}x${winnerGoals}, a moral do elenco cai um pouco. Como recuperar o grupo já para o próximo compromisso?`
        : `Jogando fora de casa no ${home.estadio}, você considera esse ${gc}x${gf} um ponto ganho pela postura da equipe?`,
      answer: loser
        ? `Não podemos baixar a cabeça. Tivemos momentos bons, mas erramos nas transições defensivas. Vamos analisar os números de posse e finalizações e responder em campo no próximo jogo.`
        : `Pontuar fora de casa em um jogo duro como esse é sempre valioso. Nosso plano de ${TACTIC_NAME[away.estilo_tatico]} deu equilíbrio ao time.`,
    },
  ];

  return {
    storylineBadge,
    headline,
    subheadline,
    factors,
    questions,
  };
}
