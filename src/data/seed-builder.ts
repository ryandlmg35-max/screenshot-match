import {
  calculateMarketValueAndSalary,
  generateDetailedAttributes,
  getRivalryName,
} from '@/data/club-metadata';
import { calcularOverallEstimado, type ReputacaoNivel } from '@/lib/overall-formula';
import {
  generateKnockoutPhaseMatches,
  generateRoundRobinSchedule,
  getPhaseNameForTeamCount,
  recalculateStandings,
} from '@/lib/simulation-engine';
import type {
  Artilharia,
  Classificacao,
  Competicao,
  Jogador,
  Pais,
  Partida,
  Posicao,
  Tecnico,
  Temporada,
  Time,
  TimeCompeticao,
} from '@/types/simulator';
import { COMPETICOES, PAISES, TEMPORADAS } from './competitions';
import { buildPlayersFromTuples, SQUADS_BRASIL_SERIE_A, SQUADS_ENGLAND_PL } from './squads-brasil-england';
import { SQUADS_EUROPE_AND_WORLD_ELITE, SQUADS_ITALY_SERIE_A, SQUADS_SPAIN_LALIGA } from './squads-spain-italy-europe';
import verifiedLogos from './verified-logos.json';
import {
  CLUBS_BRASIL_SERIE_A,
  CLUBS_BRASIL_SERIE_B,
  CLUBS_CONMEBOL_AND_WORLD,
  seedToTecnico,
  seedToTime,
  type ClubSeed,
} from './teams-brasil';
import {
  CLUBS_ENGLAND_CHAMP,
  CLUBS_ENGLAND_PL,
  CLUBS_SPAIN_LALIGA,
  CLUBS_SPAIN_LALIGA2,
} from './teams-england-spain';
import {
  CLUBS_FRANCE,
  CLUBS_GERMANY,
  CLUBS_ITALY_SERIE_A,
  CLUBS_ITALY_SERIE_B,
  CLUBS_PORTUGAL,
} from './teams-italy-germany-france-portugal';
import { ALL_SECONDARY_CLUBS } from './teams-secondary-leagues';

export const ALL_CLUB_SEEDS: ClubSeed[] = [
  ...CLUBS_BRASIL_SERIE_A,
  ...CLUBS_BRASIL_SERIE_B,
  ...CLUBS_CONMEBOL_AND_WORLD,
  ...CLUBS_ENGLAND_PL,
  ...CLUBS_ENGLAND_CHAMP,
  ...CLUBS_SPAIN_LALIGA,
  ...CLUBS_SPAIN_LALIGA2,
  ...CLUBS_ITALY_SERIE_A,
  ...CLUBS_ITALY_SERIE_B,
  ...CLUBS_GERMANY,
  ...CLUBS_FRANCE,
  ...CLUBS_PORTUGAL,
  ...ALL_SECONDARY_CLUBS,
];

const ALL_CURATED_SQUADS: Record<string, import('./squads-brasil-england').PlayerTuple[]> = {
  ...SQUADS_BRASIL_SERIE_A,
  ...SQUADS_ENGLAND_PL,
  ...SQUADS_SPAIN_LALIGA,
  ...SQUADS_ITALY_SERIE_A,
  ...SQUADS_EUROPE_AND_WORLD_ELITE,
};

const NAMES_BY_COUNTRY: Record<string, { first: string[]; last: string[]; nat: string }> = {
  bra: {
    nat: 'Brasil',
    first: ['Lucas', 'Gabriel', 'Matheus', 'Pedro', 'Rafael', 'Bruno', 'Gustavo', 'Felipe', 'Thiago', 'Leonardo', 'Vinícius', 'Caio', 'Igor', 'Danilo', 'Rodrigo', 'Eduardo', 'Henrique', 'Arthur'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro', 'Mendes'],
  },
  eng: {
    nat: 'Inglaterra',
    first: ['Jack', 'Harry', 'Oliver', 'George', 'Charlie', 'James', 'Alfie', 'Thomas', 'Joshua', 'William', 'Daniel', 'Samuel', 'Callum', 'Ben', 'Luke', 'Mason', 'Connor', 'Lewis'],
    last: ['Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies', 'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green', 'Hall', 'Clarke'],
  },
  esp: {
    nat: 'Espanha',
    first: ['Pablo', 'Alejandro', 'Daniel', 'Adrián', 'Álvaro', 'David', 'Carlos', 'Javier', 'Sergio', 'Mario', 'Diego', 'Marcos', 'Hugo', 'Iván', 'Raúl', 'Rubén', 'Óscar', 'Jorge'],
    last: ['García', 'Martínez', 'López', 'Sánchez', 'González', 'Rodríguez', 'Fernández', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero'],
  },
  ita: {
    nat: 'Itália',
    first: ['Lorenzo', 'Alessandro', 'Mattia', 'Francesco', 'Andrea', 'Marco', 'Luca', 'Matteo', 'Davide', 'Simone', 'Federico', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo', 'Filippo', 'Nicolò', 'Giacomo'],
    last: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Mancini', 'Costa', 'Giordano', 'Rizzo'],
  },
  ger: {
    nat: 'Alemanha',
    first: ['Lukas', 'Leon', 'Finn', 'Jonas', 'Felix', 'Maximilian', 'Julian', 'Tim', 'Niklas', 'Jan', 'Moritz', 'Tobias', 'Florian', 'Philipp', 'Fabian', 'Kevin', 'Dennis', 'Sebastian'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann'],
  },
  fra: {
    nat: 'França',
    first: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Enzo', 'Léo', 'Louis', 'Raphaël', 'Arthur', 'Gabriel', 'Maxime', 'Baptiste', 'Romain', 'Julien', 'Clément', 'Thomas', 'Antoine', 'Nicolas'],
    last: ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefebvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel'],
  },
  por: {
    nat: 'Portugal',
    first: ['João', 'Diogo', 'Tiago', 'Pedro', 'Rafael', 'André', 'Gonçalo', 'Bruno', 'Miguel', 'Duarte', 'Francisco', 'Tomás', 'Vasco', 'Nuno', 'Rúben', 'Ricardo', 'Filipe', 'Henrique'],
    last: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Gonçalves', 'Gomes', 'Lopes', 'Marques', 'Alves', 'Almeida', 'Ribeiro'],
  },
  arg: {
    nat: 'Argentina',
    first: ['Mateo', 'Santiago', 'Nicolás', 'Agustín', 'Tomás', 'Facundo', 'Lautaro', 'Franco', 'Joaquín', 'Valentín', 'Ignacio', 'Gonzalo'],
    last: ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'Romero', 'Sánchez', 'Acosta', 'Medina'],
  },
  col: {
    nat: 'Colômbia',
    first: ['Juan', 'Andrés', 'Sebastián', 'Camilo', 'Santiago', 'Daniel', 'Luis', 'Carlos', 'Kevin', 'Jhon', 'Yerson', 'Brayan'],
    last: ['Gómez', 'Rodríguez', 'Martínez', 'Moreno', 'Vargas', 'Rojas', 'Mosquera', 'Quintero', 'Castro', 'Mendoza', 'Castaño', 'Arias'],
  },
  uru: {
    nat: 'Uruguai',
    first: ['Facundo', 'Federico', 'Rodrigo', 'Ignacio', 'Matías', 'Santiago', 'Agustín', 'Nicolás', 'Lucas', 'Maximiliano', 'Diego', 'Emiliano'],
    last: ['Rodríguez', 'Silva', 'Pereira', 'Bentancur', 'Olivera', 'Suárez', 'Núñez', 'Cabrera', 'Méndez', 'Sosa', 'Giménez', 'Varela'],
  },
  usa: {
    nat: 'Estados Unidos',
    first: ['Tyler', 'Christian', 'Brandon', 'Jordan', 'Cole', 'Caleb', 'Aidan', 'Miles', 'Walker', 'Griffin', 'Jack', 'Noah'],
    last: ['Adams', 'Morris', 'Robinson', 'Zimmerman', 'Acosta', 'Roldan', 'Ferreira', 'Turner', 'McKennie', 'Wright', 'Clark', 'Miller'],
  },
  ksa: {
    nat: 'Arábia Saudita',
    first: ['Salem', 'Salman', 'Firas', 'Hassan', 'Mohammed', 'Abdullah', 'Saud', 'Nasser', 'Sultan', 'Ali', 'Yasser', 'Nawaf'],
    last: ['Al-Dawsari', 'Al-Faraj', 'Al-Buraikan', 'Al-Tambakti', 'Al-Owais', 'Al-Shahrani', 'Al-Ghanam', 'Kanno', 'Al-Shehri', 'Al-Qahtani', 'Al-Muwallad', 'Al-Harbi'],
  },
  intl: {
    nat: 'Argentina',
    first: ['Mateo', 'Santiago', 'Nicolás', 'Agustín', 'Tomás', 'Facundo', 'Lautaro', 'Franco', 'Joaquín', 'Valentín', 'Ignacio', 'Gonzalo', 'Emiliano', 'Maximiliano', 'Rodrigo', 'Sebastián', 'Martín', 'Lucas'],
    last: ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Díaz', 'Martínez', 'Pérez', 'Romero', 'Sánchez', 'Torres', 'Álvarez', 'Benítez', 'Acosta', 'Medina', 'Herrera', 'Castro', 'Rojas'],
  },
};

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const TARGET_FORMATION_SLOTS: Array<{ pos: Posicao; rep: ReputacaoNivel; num: number }> = [
  { pos: 'GOL', rep: 3, num: 1 },
  { pos: 'ZAG', rep: 3, num: 4 },
  { pos: 'ZAG', rep: 3, num: 3 },
  { pos: 'LAT', rep: 3, num: 2 },
  { pos: 'LAT', rep: 3, num: 6 },
  { pos: 'VOL', rep: 3, num: 5 },
  { pos: 'MEI', rep: 3, num: 8 },
  { pos: 'MEI', rep: 3, num: 10 },
  { pos: 'PON', rep: 3, num: 7 },
  { pos: 'PON', rep: 3, num: 11 },
  { pos: 'ATA', rep: 3, num: 9 },
  { pos: 'GOL', rep: 2, num: 12 },
  { pos: 'ZAG', rep: 2, num: 13 },
  { pos: 'LAT', rep: 2, num: 14 },
  { pos: 'VOL', rep: 2, num: 15 },
  { pos: 'MEI', rep: 2, num: 16 },
  { pos: 'PON', rep: 2, num: 17 },
  { pos: 'ATA', rep: 2, num: 19 },
];

function ensureSquadDepth(club: ClubSeed, existing: Jogador[]): Jogador[] {
  if (existing.length >= 16) return existing;
  const result = [...existing];
  const usedNumbers = new Set(existing.map((j) => j.numero));
  const pool = NAMES_BY_COUNTRY[club.pais_id] ?? NAMES_BY_COUNTRY['intl']!;
  let seed = hashString(club.id);

  const countByPos = (pos: Posicao) => result.filter((j) => j.posicao === pos).length;

  for (const slot of TARGET_FORMATION_SLOTS) {
    if (result.length >= 18) break;
    // Skip if already covered well
    if (slot.pos === 'GOL' && countByPos('GOL') >= 2) continue;
    if (slot.pos === 'ZAG' && countByPos('ZAG') >= 3) continue;
    if (slot.pos === 'LAT' && countByPos('LAT') >= 2) continue;
    if (slot.pos === 'VOL' && countByPos('VOL') >= 2) continue;
    if (slot.pos === 'MEI' && countByPos('MEI') >= 3) continue;
    if (slot.pos === 'PON' && countByPos('PON') >= 2) continue;
    if (slot.pos === 'ATA' && countByPos('ATA') >= 2) continue;

    seed = (seed * 1664525 + 1013904223) >>> 0;
    const first = pool.first[seed % pool.first.length]!;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const last = pool.last[seed % pool.last.length]!;
    const idade = 19 + (seed % 14);
    let num = slot.num;
    while (usedNumbers.has(num)) num++;
    usedNumbers.add(num);

    const id = `${club.id}-gen-${result.length + 1}`;
    const overall = calcularOverallEstimado({
      posicao: slot.pos,
      reputacao: slot.rep,
      idade,
      clubeElo: club.elo_rating,
    });
    const attrs = generateDetailedAttributes(id, slot.pos, overall, idade);
    const { valorMercado, salarioSemanal } = calculateMarketValueAndSalary(
      overall,
      idade,
      club.elo_rating,
    );

    result.push({
      id,
      time_id: club.id,
      nome: `${first} ${last}`,
      posicao: slot.pos,
      numero: num,
      nacionalidade: pool.nat,
      idade,
      overall,
      perna_dominante: seed % 5 === 0 ? 'Esquerda' : 'Direita',
      ...attrs,
      forma_fisica: 90 + (seed % 10),
      moral: 72 + (seed % 12),
      amarelos_acumulados: 0,
      vermelhos_temporada: 0,
      suspenso_jogos: 0,
      lesionado_jogos: 0,
      lesao_descricao: null,
      salario_semanal: salarioSemanal,
      valor_mercado: valorMercado,
      contrato_fim_ano: 2026 + (seed % 4),
      historico_temporadas: [],
      timeline_ocorrencias: [],
    });
  }

  return result;
}

export interface SimulatorDataset {
  paises: Pais[];
  competicoes: Competicao[];
  temporadas: Temporada[];
  times: Time[];
  tecnicos: Tecnico[];
  jogadores: Jogador[];
  timesCompeticao: TimeCompeticao[];
  partidas: Partida[];
  classificacao: Classificacao[];
  artilharia: Artilharia[];
  transferencias: import('@/types/simulator').Transferencia[];
  anoAtual: number;
}

export function buildInitialSimulatorDataset(): SimulatorDataset {
  const times: Time[] = [];
  const tecnicos: Tecnico[] = [];
  const jogadores: Jogador[] = [];
  const timesCompeticao: TimeCompeticao[] = [];

  for (const club of ALL_CLUB_SEEDS) {
    const time = seedToTime(club);
    const verifiedLogo = (verifiedLogos as Record<string, string>)[club.id];
    if (verifiedLogo) {
      time.logo_url = verifiedLogo;
    }
    times.push(time);
    tecnicos.push(seedToTecnico(club));

    const curated = ALL_CURATED_SQUADS[club.id];
    const basePlayers = curated ? buildPlayersFromTuples(club.id, club.elo_rating, curated) : [];
    const fullSquad = ensureSquadDepth(club, basePlayers);
    jogadores.push(...fullSquad);
  }

  const partidas: Partida[] = [];
  const classificacao: Classificacao[] = [];

  for (const comp of COMPETICOES) {
    const temp = TEMPORADAS.find((t) => t.competicao_id === comp.id)!;
    let participants = ALL_CLUB_SEEDS.filter((c) => c.competicoes.includes(comp.id)).map((c) => c.id);

    if (comp.formato === 'pontos-corridos') {
      for (const tid of participants) {
        timesCompeticao.push({
          time_id: tid,
          competicao_id: comp.id,
          temporada_id: temp.id,
          grupo: null,
        });
      }
      const compMatches = generateRoundRobinSchedule(participants, comp.id, temp.id, true);
      partidas.push(...compMatches);
      classificacao.push(
        ...recalculateStandings(
          participants.map((tid) => ({ time_id: tid })),
          compMatches,
          comp.id,
          temp.id,
        ),
      );
    } else if (comp.formato === 'mata-mata') {
      // Copa do Brasil: 32 times com pote de cabeças de chave (16 mais fortes enfrentam 16 do pote 2)
      const sortedByElo = [...participants].sort((a, b) => {
        const eloA = times.find((t) => t.id === a)?.elo_rating ?? 1500;
        const eloB = times.find((t) => t.id === b)?.elo_rating ?? 1500;
        return eloB - eloA;
      });
      const pot1 = sortedByElo.slice(0, 16);
      const pot2 = sortedByElo.slice(16, 32);
      const paired: string[] = [];
      for (let i = 0; i < Math.min(pot1.length, pot2.length); i++) {
        paired.push(pot1[i]!, pot2[pot2.length - 1 - i]!);
      }
      participants = paired;
      for (const tid of participants) {
        timesCompeticao.push({
          time_id: tid,
          competicao_id: comp.id,
          temporada_id: temp.id,
          grupo: null,
        });
      }
      const faseInicial = getPhaseNameForTeamCount(participants.length);
      const compMatches = generateKnockoutPhaseMatches(participants, comp.id, temp.id, faseInicial, 1, true);
      partidas.push(...compMatches);
    } else if (comp.formato === 'grupos') {
      // Competições continentais/internacionais: distribuição por potes (cabeças de chave por Elo)
      const groupCount = Math.max(2, Math.floor(participants.length / 4));
      const sortedByElo = [...participants].sort((a, b) => {
        const eloA = times.find((t) => t.id === a)?.elo_rating ?? 1500;
        const eloB = times.find((t) => t.id === b)?.elo_rating ?? 1500;
        return eloB - eloA;
      });
      const trimmed = sortedByElo.slice(0, groupCount * 4);
      const groupLetters = 'ABCDEFGH'.split('');

      for (let g = 0; g < groupCount; g++) {
        const groupName = `Grupo ${groupLetters[g]}`;
        // Pote 1, Pote 2, Pote 3, Pote 4 (snake seeding)
        const groupTeams = [
          trimmed[g]!,
          trimmed[groupCount + ((groupCount - 1 - g) % groupCount)]!,
          trimmed[groupCount * 2 + g]!,
          trimmed[groupCount * 3 + ((groupCount - 1 - g) % groupCount)]!,
        ];
        for (const tid of groupTeams) {
          timesCompeticao.push({
            time_id: tid,
            competicao_id: comp.id,
            temporada_id: temp.id,
            grupo: groupName,
          });
        }
        const groupMatches = generateRoundRobinSchedule(groupTeams, comp.id, temp.id, true, groupName, 1);
        partidas.push(...groupMatches);
      }

      const compEntries = timesCompeticao.filter((tc) => tc.competicao_id === comp.id && tc.temporada_id === temp.id);
      classificacao.push(...recalculateStandings(compEntries, [], comp.id, temp.id, true));
    }
  }

  // Marca clássicos nas partidas geradas
  for (const p of partidas) {
    p.classico = Boolean(getRivalryName(p.time_casa_id, p.time_fora_id));
  }

  return {
    paises: PAISES,
    competicoes: COMPETICOES,
    temporadas: TEMPORADAS,
    times,
    tecnicos,
    jogadores,
    timesCompeticao,
    partidas,
    classificacao,
    artilharia: [],
    transferencias: [],
    anoAtual: 2026,
  };
}
