import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichTrainingsprotokoll } from '@/lib/enrich';
import type { EnrichedTrainingsprotokoll } from '@/types/enriched';
import type { Fitnessziele, Koerpermessung } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TrainingsprotokollDialog } from '@/components/dialogs/TrainingsprotokollDialog';
import { KoerpermessungDialog } from '@/components/dialogs/KoerpermessungDialog';
import { FitnesszieleDialog } from '@/components/dialogs/FitnesszieleDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconFlame, IconTarget,
  IconBarbell, IconScale, IconActivity, IconChevronRight,
  IconTrophy, IconClock
} from '@tabler/icons-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';

const APPGROUP_ID = '69d3a2cfe6c1972964aab694';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    uebungsverwaltung, fitnessziele, koerpermessung, trainingsprotokoll,
    uebungsverwaltungMap, fitnesszieleMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedTrainingsprotokoll = enrichTrainingsprotokoll(trainingsprotokoll, { uebungsverwaltungMap, fitnesszieleMap });

  // Dialog states — ALL hooks before any early return
  const [trainDialog, setTrainDialog] = useState(false);
  const [editTrain, setEditTrain] = useState<EnrichedTrainingsprotokoll | null>(null);
  const [deleteTrain, setDeleteTrain] = useState<EnrichedTrainingsprotokoll | null>(null);

  const [messDialog, setMessDialog] = useState(false);
  const [editMess, setEditMess] = useState<Koerpermessung | null>(null);
  const [deleteMess, setDeleteMess] = useState<Koerpermessung | null>(null);

  const [zielDialog, setZielDialog] = useState(false);
  const [editZiel, setEditZiel] = useState<Fitnessziele | null>(null);

  const [activeTab, setActiveTab] = useState<'training' | 'koerper' | 'ziele'>('training');

  // Computed stats
  const last30 = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return enrichedTrainingsprotokoll.filter(t =>
      t.fields.training_datum ? isAfter(parseISO(t.fields.training_datum), cutoff) : false
    );
  }, [enrichedTrainingsprotokoll]);

  const totalKalorien30 = useMemo(() =>
    last30.reduce((sum, t) => sum + (t.fields.kalorien ?? 0), 0), [last30]);

  const totalMinuten30 = useMemo(() =>
    last30.reduce((sum, t) => sum + (t.fields.dauer_minuten ?? 0), 0), [last30]);

  // Sorted training entries (newest first)
  const sortedTrainings = useMemo(() =>
    [...enrichedTrainingsprotokoll].sort((a, b) =>
      (b.fields.training_datum ?? '').localeCompare(a.fields.training_datum ?? '')
    ), [enrichedTrainingsprotokoll]);

  // Sorted body measurements (newest first)
  const sortedMessungen = useMemo(() =>
    [...koerpermessung].sort((a, b) =>
      (b.fields.messdatum ?? '').localeCompare(a.fields.messdatum ?? '')
    ), [koerpermessung]);

  // Active goals
  const aktiveZiele = useMemo(() =>
    fitnessziele.filter(z => z.fields.status?.key === 'aktiv' || !z.fields.status),
    [fitnessziele]);

  // Weight chart data (last 12 measurements)
  const gewichtChartData = useMemo(() => {
    return [...sortedMessungen]
      .reverse()
      .slice(-12)
      .filter(m => m.fields.koerpergewicht != null)
      .map(m => ({
        datum: m.fields.messdatum
          ? format(parseISO(m.fields.messdatum), 'dd.MM', { locale: de })
          : '—',
        gewicht: m.fields.koerpergewicht,
        muskelmasse: m.fields.muskelmasse,
      }));
  }, [sortedMessungen]);

  // Training frequency chart (last 8 weeks)
  const trainingFreqData = useMemo(() => {
    const weeks: { woche: string; anzahl: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = subDays(new Date(), (i + 1) * 7);
      const end = subDays(new Date(), i * 7);
      const count = trainingsprotokoll.filter(t => {
        if (!t.fields.training_datum) return false;
        const d = parseISO(t.fields.training_datum);
        return isAfter(d, start) && !isAfter(d, end);
      }).length;
      weeks.push({
        woche: `KW${format(end, 'w', { locale: de })}`,
        anzahl: count,
      });
    }
    return weeks;
  }, [trainingsprotokoll]);

  const intensitaetColor: Record<string, string> = {
    leicht: 'bg-emerald-100 text-emerald-700',
    moderat: 'bg-blue-100 text-blue-700',
    intensiv: 'bg-orange-100 text-orange-700',
    sehr_intensiv: 'bg-red-100 text-red-700',
  };

  const statusColor: Record<string, string> = {
    aktiv: 'bg-emerald-100 text-emerald-700',
    pausiert: 'bg-yellow-100 text-yellow-700',
    erreicht: 'bg-violet-100 text-violet-700',
    abgebrochen: 'bg-red-100 text-red-700',
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6 pb-10">
      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Trainings (30 Tage)"
          value={String(last30.length)}
          description="Einheiten"
          icon={<IconBarbell size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kalorien (30 Tage)"
          value={totalKalorien30 > 0 ? `${totalKalorien30.toLocaleString('de')} kcal` : '—'}
          description="Verbrannt"
          icon={<IconFlame size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Trainingszeit"
          value={totalMinuten30 > 0 ? `${Math.round(totalMinuten30 / 60)} h` : '—'}
          description="Letzte 30 Tage"
          icon={<IconClock size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktive Ziele"
          value={String(aktiveZiele.length)}
          description={`von ${fitnessziele.length} gesamt`}
          icon={<IconTarget size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gewichtsverlauf */}
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4 min-w-0">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">Gewichtsverlauf</h2>
              <p className="text-xs text-muted-foreground">Letzte Messungen</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditMess(null); setMessDialog(true); }}
              className="shrink-0 ml-2"
            >
              <IconPlus size={14} className="shrink-0" />
              <span className="hidden sm:inline ml-1">Messung</span>
            </Button>
          </div>
          {gewichtChartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
              <IconScale size={32} stroke={1.5} />
              <p className="text-sm">Noch keine Messungen erfasst</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={gewichtChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="datum" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`${v} kg`, 'Gewicht']}
                />
                <Area type="monotone" dataKey="gewicht" stroke="var(--primary)" strokeWidth={2} fill="url(#gewGrad)" dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trainingsfrequenz */}
        <div className="rounded-2xl border bg-card p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4 min-w-0">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">Trainingsfrequenz</h2>
              <p className="text-xs text-muted-foreground">Einheiten pro Woche</p>
            </div>
            <Button
              size="sm"
              onClick={() => { setEditTrain(null); setTrainDialog(true); }}
              className="shrink-0 ml-2"
            >
              <IconPlus size={14} className="shrink-0" />
              <span className="hidden sm:inline ml-1">Training</span>
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trainingFreqData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="freqGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="woche" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [v, 'Trainings']}
              />
              <Area type="monotone" dataKey="anzahl" stroke="var(--primary)" strokeWidth={2} fill="url(#freqGrad)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tab Navigation + Content */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {([
            { key: 'training', label: 'Trainingsprotokolle', icon: <IconActivity size={15} className="shrink-0" /> },
            { key: 'koerper', label: 'Körpermessungen', icon: <IconScale size={15} className="shrink-0" /> },
            { key: 'ziele', label: 'Fitnessziele', icon: <IconTrophy size={15} className="shrink-0" /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Trainingsprotokolle */}
        {activeTab === 'training' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <span className="text-sm text-muted-foreground">{sortedTrainings.length} Einträge gesamt</span>
              <Button size="sm" onClick={() => { setEditTrain(null); setTrainDialog(true); }}>
                <IconPlus size={14} className="shrink-0 mr-1" />Neues Training
              </Button>
            </div>
            {sortedTrainings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <IconBarbell size={48} stroke={1.5} />
                <p className="text-sm">Noch kein Training erfasst</p>
                <Button size="sm" onClick={() => { setEditTrain(null); setTrainDialog(true); }}>
                  <IconPlus size={14} className="mr-1" />Erstes Training eintragen
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {sortedTrainings.slice(0, 15).map(t => (
                  <div key={t.record_id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{t.fields.trainingsname ?? 'Unbenanntes Training'}</span>
                        {t.fields.intensitaet && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${intensitaetColor[t.fields.intensitaet.key] ?? 'bg-muted text-muted-foreground'}`}>
                            {t.fields.intensitaet.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{t.fields.training_datum ? format(parseISO(t.fields.training_datum), 'dd.MM.yyyy HH:mm', { locale: de }) : '—'}</span>
                        {t.fields.dauer_minuten && <span>{t.fields.dauer_minuten} Min.</span>}
                        {t.fields.kalorien && <span>{t.fields.kalorien} kcal</span>}
                        {t.fields.trainingsort && <span>{t.fields.trainingsort.label}</span>}
                      </div>
                      {t.zugeordnetes_zielName && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <IconTarget size={11} className="text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{t.zugeordnetes_zielName}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditTrain(t); setTrainDialog(true); }}
                      >
                        <IconPencil size={13} className="shrink-0" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTrain(t)}
                      >
                        <IconTrash size={13} className="shrink-0" />
                      </Button>
                    </div>
                  </div>
                ))}
                {sortedTrainings.length > 15 && (
                  <div className="px-5 py-3 text-xs text-muted-foreground flex items-center gap-1">
                    <IconChevronRight size={13} />
                    {sortedTrainings.length - 15} weitere im Bereich "Trainingsprotokoll"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Körpermessungen */}
        {activeTab === 'koerper' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <span className="text-sm text-muted-foreground">{sortedMessungen.length} Einträge gesamt</span>
              <Button size="sm" onClick={() => { setEditMess(null); setMessDialog(true); }}>
                <IconPlus size={14} className="shrink-0 mr-1" />Neue Messung
              </Button>
            </div>
            {sortedMessungen.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <IconScale size={48} stroke={1.5} />
                <p className="text-sm">Noch keine Körpermessung erfasst</p>
                <Button size="sm" onClick={() => { setEditMess(null); setMessDialog(true); }}>
                  <IconPlus size={14} className="mr-1" />Erste Messung eintragen
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="px-5 py-2 font-medium">Datum</th>
                      <th className="px-3 py-2 font-medium">Gewicht</th>
                      <th className="px-3 py-2 font-medium hidden sm:table-cell">Muskelmasse</th>
                      <th className="px-3 py-2 font-medium hidden md:table-cell">Fettanteil</th>
                      <th className="px-3 py-2 font-medium hidden lg:table-cell">Taille</th>
                      <th className="px-3 py-2 font-medium w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedMessungen.slice(0, 15).map(m => (
                      <tr key={m.record_id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-5 py-2.5 font-medium">{formatDate(m.fields.messdatum)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {m.fields.koerpergewicht != null ? `${m.fields.koerpergewicht} kg` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                          {m.fields.muskelmasse != null ? `${m.fields.muskelmasse} kg` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden md:table-cell">
                          {m.fields.koerperfettanteil != null ? `${m.fields.koerperfettanteil} %` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground hidden lg:table-cell">
                          {m.fields.masse_taille != null ? `${m.fields.masse_taille} cm` : '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => { setEditMess(m); setMessDialog(true); }}
                            >
                              <IconPencil size={13} className="shrink-0" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteMess(m)}
                            >
                              <IconTrash size={13} className="shrink-0" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {sortedMessungen.length > 15 && (
                  <div className="px-5 py-3 text-xs text-muted-foreground flex items-center gap-1 border-t">
                    <IconChevronRight size={13} />
                    {sortedMessungen.length - 15} weitere im Bereich "Körpermessung"
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Fitnessziele */}
        {activeTab === 'ziele' && (
          <div>
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <span className="text-sm text-muted-foreground">{fitnessziele.length} Ziele gesamt</span>
              <Button size="sm" onClick={() => { setEditZiel(null); setZielDialog(true); }}>
                <IconPlus size={14} className="shrink-0 mr-1" />Neues Ziel
              </Button>
            </div>
            {fitnessziele.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <IconTrophy size={48} stroke={1.5} />
                <p className="text-sm">Noch keine Fitnessziele definiert</p>
                <Button size="sm" onClick={() => { setEditZiel(null); setZielDialog(true); }}>
                  <IconPlus size={14} className="mr-1" />Erstes Ziel erstellen
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {fitnessziele.map(z => (
                  <div key={z.record_id} className="flex items-start gap-3 px-5 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{z.fields.ziel_bezeichnung ?? 'Unbenanntes Ziel'}</span>
                        {z.fields.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[z.fields.status.key] ?? 'bg-muted text-muted-foreground'}`}>
                            {z.fields.status.label}
                          </span>
                        )}
                        {z.fields.zieltyp && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                            {z.fields.zieltyp.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        {z.fields.zielwert != null && (
                          <span>Ziel: {z.fields.zielwert} {z.fields.zieleinheit ?? ''}</span>
                        )}
                        {z.fields.startdatum && <span>Start: {formatDate(z.fields.startdatum)}</span>}
                        {z.fields.zieldatum && <span>Ende: {formatDate(z.fields.zieldatum)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditZiel(z); setZielDialog(true); }}
                      >
                        <IconPencil size={13} className="shrink-0" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <TrainingsprotokollDialog
        open={trainDialog}
        onClose={() => { setTrainDialog(false); setEditTrain(null); }}
        onSubmit={async (fields) => {
          if (editTrain) {
            await LivingAppsService.updateTrainingsprotokollEntry(editTrain.record_id, fields);
          } else {
            await LivingAppsService.createTrainingsprotokollEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editTrain?.fields}
        uebungsverwaltungList={uebungsverwaltung}
        fitnesszieleList={fitnessziele}
        enablePhotoScan={AI_PHOTO_SCAN['Trainingsprotokoll']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Trainingsprotokoll']}
      />

      <KoerpermessungDialog
        open={messDialog}
        onClose={() => { setMessDialog(false); setEditMess(null); }}
        onSubmit={async (fields) => {
          if (editMess) {
            await LivingAppsService.updateKoerpermessungEntry(editMess.record_id, fields);
          } else {
            await LivingAppsService.createKoerpermessungEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editMess?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Koerpermessung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Koerpermessung']}
      />

      <FitnesszieleDialog
        open={zielDialog}
        onClose={() => { setZielDialog(false); setEditZiel(null); }}
        onSubmit={async (fields) => {
          if (editZiel) {
            await LivingAppsService.updateFitnesszieleEntry(editZiel.record_id, fields);
          } else {
            await LivingAppsService.createFitnesszieleEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editZiel?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Fitnessziele']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Fitnessziele']}
      />

      <ConfirmDialog
        open={!!deleteTrain}
        title="Training löschen"
        description={`Training "${deleteTrain?.fields.trainingsname ?? ''}" wirklich löschen?`}
        onConfirm={async () => {
          if (!deleteTrain) return;
          await LivingAppsService.deleteTrainingsprotokollEntry(deleteTrain.record_id);
          setDeleteTrain(null);
          fetchAll();
        }}
        onClose={() => setDeleteTrain(null)}
      />

      <ConfirmDialog
        open={!!deleteMess}
        title="Messung löschen"
        description={`Körpermessung vom ${formatDate(deleteMess?.fields.messdatum)} wirklich löschen?`}
        onConfirm={async () => {
          if (!deleteMess) return;
          await LivingAppsService.deleteKoerpermessungEntry(deleteMess.record_id);
          setDeleteMess(null);
          fetchAll();
        }}
        onClose={() => setDeleteMess(null)}
      />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktieren Sie den Support.</p>}
    </div>
  );
}
