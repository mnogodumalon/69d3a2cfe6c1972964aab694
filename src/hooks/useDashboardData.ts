import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Koerpermessung, Uebungsverwaltung, Trainingsprotokoll, Fitnessziele } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [koerpermessung, setKoerpermessung] = useState<Koerpermessung[]>([]);
  const [uebungsverwaltung, setUebungsverwaltung] = useState<Uebungsverwaltung[]>([]);
  const [trainingsprotokoll, setTrainingsprotokoll] = useState<Trainingsprotokoll[]>([]);
  const [fitnessziele, setFitnessziele] = useState<Fitnessziele[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [koerpermessungData, uebungsverwaltungData, trainingsprotokollData, fitnesszieleData] = await Promise.all([
        LivingAppsService.getKoerpermessung(),
        LivingAppsService.getUebungsverwaltung(),
        LivingAppsService.getTrainingsprotokoll(),
        LivingAppsService.getFitnessziele(),
      ]);
      setKoerpermessung(koerpermessungData);
      setUebungsverwaltung(uebungsverwaltungData);
      setTrainingsprotokoll(trainingsprotokollData);
      setFitnessziele(fitnesszieleData);
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
        const [koerpermessungData, uebungsverwaltungData, trainingsprotokollData, fitnesszieleData] = await Promise.all([
          LivingAppsService.getKoerpermessung(),
          LivingAppsService.getUebungsverwaltung(),
          LivingAppsService.getTrainingsprotokoll(),
          LivingAppsService.getFitnessziele(),
        ]);
        setKoerpermessung(koerpermessungData);
        setUebungsverwaltung(uebungsverwaltungData);
        setTrainingsprotokoll(trainingsprotokollData);
        setFitnessziele(fitnesszieleData);
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

  return { koerpermessung, setKoerpermessung, uebungsverwaltung, setUebungsverwaltung, trainingsprotokoll, setTrainingsprotokoll, fitnessziele, setFitnessziele, loading, error, fetchAll, uebungsverwaltungMap, fitnesszieleMap };
}