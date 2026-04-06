import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Uebungsverwaltung, Fitnessziele, Koerpermessung, Trainingsprotokoll } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [uebungsverwaltung, setUebungsverwaltung] = useState<Uebungsverwaltung[]>([]);
  const [fitnessziele, setFitnessziele] = useState<Fitnessziele[]>([]);
  const [koerpermessung, setKoerpermessung] = useState<Koerpermessung[]>([]);
  const [trainingsprotokoll, setTrainingsprotokoll] = useState<Trainingsprotokoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [uebungsverwaltungData, fitnesszieleData, koerpermessungData, trainingsprotokollData] = await Promise.all([
        LivingAppsService.getUebungsverwaltung(),
        LivingAppsService.getFitnessziele(),
        LivingAppsService.getKoerpermessung(),
        LivingAppsService.getTrainingsprotokoll(),
      ]);
      setUebungsverwaltung(uebungsverwaltungData);
      setFitnessziele(fitnesszieleData);
      setKoerpermessung(koerpermessungData);
      setTrainingsprotokoll(trainingsprotokollData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [uebungsverwaltungData, fitnesszieleData, koerpermessungData, trainingsprotokollData] = await Promise.all([
          LivingAppsService.getUebungsverwaltung(),
          LivingAppsService.getFitnessziele(),
          LivingAppsService.getKoerpermessung(),
          LivingAppsService.getTrainingsprotokoll(),
        ]);
        setUebungsverwaltung(uebungsverwaltungData);
        setFitnessziele(fitnesszieleData);
        setKoerpermessung(koerpermessungData);
        setTrainingsprotokoll(trainingsprotokollData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const uebungsverwaltungMap = useMemo(() => {
    const m = new Map<string, Uebungsverwaltung>();
    uebungsverwaltung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [uebungsverwaltung]);

  const fitnesszieleMap = useMemo(() => {
    const m = new Map<string, Fitnessziele>();
    fitnessziele.forEach(r => m.set(r.record_id, r));
    return m;
  }, [fitnessziele]);

  return { uebungsverwaltung, setUebungsverwaltung, fitnessziele, setFitnessziele, koerpermessung, setKoerpermessung, trainingsprotokoll, setTrainingsprotokoll, loading, error, fetchAll, uebungsverwaltungMap, fitnesszieleMap };
}