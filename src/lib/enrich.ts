import type { EnrichedTrainingsprotokoll } from '@/types/enriched';
import type { Fitnessziele, Trainingsprotokoll, Uebungsverwaltung } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface TrainingsprotokollMaps {
  uebungsverwaltungMap: Map<string, Uebungsverwaltung>;
  fitnesszieleMap: Map<string, Fitnessziele>;
}

export function enrichTrainingsprotokoll(
  trainingsprotokoll: Trainingsprotokoll[],
  maps: TrainingsprotokollMaps
): EnrichedTrainingsprotokoll[] {
  return trainingsprotokoll.map(r => ({
    ...r,
    ausgefuehrte_uebungenName: resolveDisplay(r.fields.ausgefuehrte_uebungen, maps.uebungsverwaltungMap, 'uebung_name'),
    zugeordnetes_zielName: resolveDisplay(r.fields.zugeordnetes_ziel, maps.fitnesszieleMap, 'ziel_bezeichnung'),
  }));
}
