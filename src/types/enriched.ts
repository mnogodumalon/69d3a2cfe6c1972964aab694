import type { Trainingsprotokoll } from './app';

export type EnrichedTrainingsprotokoll = Trainingsprotokoll & {
  ausgefuehrte_uebungenName: string;
  zugeordnetes_zielName: string;
};
