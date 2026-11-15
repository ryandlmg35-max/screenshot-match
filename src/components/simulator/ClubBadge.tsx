import { useState } from 'react';
import type { Time } from '@/types/simulator';

const PALETTE = [
  ['#16a34a', '#14532d'],
  ['#dc2626', '#7f1d1d'],
  ['#2563eb', '#1e3a8a'],
  ['#d97706', '#78350f'],
  ['#7c3aed', '#4c1d95'],
  ['#0891b2', '#164e63'],
  ['#be123c', '#881337'],
  ['#0f172a', '#334155'],
];

function getClubColors(id: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] as [string, string];
}

interface ClubBadgeProps {
  team: Pick<Time, 'id' | 'nome' | 'sigla' | 'logo_url'>;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE_MAP = {
  xs: 'h-4 w-4 text-[7px]',
  sm: 'h-6 w-6 text-[9px]',
  md: 'h-8 w-8 text-[10px]',
  lg: 'h-14 w-14 text-sm',
};

export function ClubBadge({ team, size = 'sm' }: ClubBadgeProps) {
  const [failed, setFailed] = useState(false);
  const [c1, c2] = getClubColors(team.id);

  if (!team.logo_url || failed) {
    return (
      <span
        title={team.nome}
        className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold tracking-tight text-white shadow-xs select-none ${SIZE_MAP[size]}`}
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      >
        {team.sigla.slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={team.logo_url}
      alt={`Escudo ${team.nome}`}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 object-contain ${SIZE_MAP[size]}`}
    />
  );
}
