import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Uebungsverwaltung, Fitnessziele, Koerpermessung, Trainingsprotokoll } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { UebungsverwaltungDialog } from '@/components/dialogs/UebungsverwaltungDialog';
import { UebungsverwaltungViewDialog } from '@/components/dialogs/UebungsverwaltungViewDialog';
import { FitnesszieleDialog } from '@/components/dialogs/FitnesszieleDialog';
import { FitnesszieleViewDialog } from '@/components/dialogs/FitnesszieleViewDialog';
import { KoerpermessungDialog } from '@/components/dialogs/KoerpermessungDialog';
import { KoerpermessungViewDialog } from '@/components/dialogs/KoerpermessungViewDialog';
import { TrainingsprotokollDialog } from '@/components/dialogs/TrainingsprotokollDialog';
import { TrainingsprotokollViewDialog } from '@/components/dialogs/TrainingsprotokollViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const UEBUNGSVERWALTUNG_FIELDS = [
  { key: 'uebung_name', label: 'Name der Übung', type: 'string/text' },
  { key: 'muskelgruppe', label: 'Muskelgruppe', type: 'multiplelookup/checkbox', options: [{ key: 'ruecken', label: 'Rücken' }, { key: 'schultern', label: 'Schultern' }, { key: 'brust', label: 'Brust' }, { key: 'bizeps', label: 'Arme (Bizeps)' }, { key: 'trizeps', label: 'Arme (Trizeps)' }, { key: 'bauch', label: 'Bauch' }, { key: 'quadrizeps', label: 'Beine (Quadrizeps)' }, { key: 'hamstrings', label: 'Beine (Hamstrings)' }, { key: 'gesaess', label: 'Gesäß' }, { key: 'waden', label: 'Waden' }, { key: 'ganzkoerper', label: 'Ganzkörper' }] },
  { key: 'trainingstyp', label: 'Trainingstyp', type: 'lookup/radio', options: [{ key: 'kraft', label: 'Kraft' }, { key: 'ausdauer', label: 'Ausdauer' }, { key: 'flexibilitaet', label: 'Flexibilität' }, { key: 'koordination', label: 'Koordination' }, { key: 'hiit', label: 'HIIT' }] },
  { key: 'schwierigkeitsgrad', label: 'Schwierigkeitsgrad', type: 'lookup/radio', options: [{ key: 'anfaenger', label: 'Anfänger' }, { key: 'fortgeschritten', label: 'Fortgeschritten' }, { key: 'experte', label: 'Experte' }] },
  { key: 'geraet', label: 'Benötigtes Equipment', type: 'lookup/select', options: [{ key: 'kein_equipment', label: 'Kein Equipment' }, { key: 'kurzhanteln', label: 'Kurzhanteln' }, { key: 'langhantel', label: 'Langhantel' }, { key: 'maschine', label: 'Maschine' }, { key: 'kettlebell', label: 'Kettlebell' }, { key: 'widerstandsband', label: 'Widerstandsband' }, { key: 'klimmzugstange', label: 'Klimmzugstange' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'beschreibung', label: 'Beschreibung / Ausführungshinweise', type: 'string/textarea' },
];
const FITNESSZIELE_FIELDS = [
  { key: 'ziel_bezeichnung', label: 'Bezeichnung des Ziels', type: 'string/text' },
  { key: 'zieltyp', label: 'Zieltyp', type: 'lookup/select', options: [{ key: 'gewicht_verlieren', label: 'Gewicht verlieren' }, { key: 'gewicht_zunehmen', label: 'Gewicht zunehmen' }, { key: 'muskeln_aufbauen', label: 'Muskeln aufbauen' }, { key: 'ausdauer_verbessern', label: 'Ausdauer verbessern' }, { key: 'flexibilitaet_verbessern', label: 'Flexibilität verbessern' }, { key: 'bestleistung', label: 'Bestleistung erreichen' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'zielwert', label: 'Zielwert (z.B. Zielgewicht in kg)', type: 'number' },
  { key: 'zieleinheit', label: 'Einheit des Zielwerts', type: 'string/text' },
  { key: 'startdatum', label: 'Startdatum', type: 'date/date' },
  { key: 'zieldatum', label: 'Zieldatum', type: 'date/date' },
  { key: 'status', label: 'Status', type: 'lookup/radio', options: [{ key: 'aktiv', label: 'Aktiv' }, { key: 'pausiert', label: 'Pausiert' }, { key: 'erreicht', label: 'Erreicht' }, { key: 'abgebrochen', label: 'Abgebrochen' }] },
  { key: 'ziel_notizen', label: 'Notizen zum Ziel', type: 'string/textarea' },
];
const KOERPERMESSUNG_FIELDS = [
  { key: 'messdatum', label: 'Datum der Messung', type: 'date/date' },
  { key: 'koerpergewicht', label: 'Körpergewicht (kg)', type: 'number' },
  { key: 'koerpergroesse', label: 'Körpergröße (cm)', type: 'number' },
  { key: 'koerperfettanteil', label: 'Körperfettanteil (%)', type: 'number' },
  { key: 'muskelmasse', label: 'Muskelmasse (kg)', type: 'number' },
  { key: 'masse_brust', label: 'Brustumfang (cm)', type: 'number' },
  { key: 'masse_taille', label: 'Taillenumfang (cm)', type: 'number' },
  { key: 'masse_huefte', label: 'Hüftumfang (cm)', type: 'number' },
  { key: 'masse_oberarm', label: 'Oberarmumfang (cm)', type: 'number' },
  { key: 'masse_oberschenkel', label: 'Oberschenkelumfang (cm)', type: 'number' },
  { key: 'messung_notizen', label: 'Notizen zur Messung', type: 'string/textarea' },
];
const TRAININGSPROTOKOLL_FIELDS = [
  { key: 'training_datum', label: 'Datum & Uhrzeit des Trainings', type: 'date/datetimeminute' },
  { key: 'trainingsname', label: 'Bezeichnung der Trainingseinheit', type: 'string/text' },
  { key: 'dauer_minuten', label: 'Dauer (Minuten)', type: 'number' },
  { key: 'kalorien', label: 'Kalorienverbrauch (kcal)', type: 'number' },
  { key: 'intensitaet', label: 'Intensität', type: 'lookup/radio', options: [{ key: 'leicht', label: 'Leicht' }, { key: 'moderat', label: 'Moderat' }, { key: 'intensiv', label: 'Intensiv' }, { key: 'sehr_intensiv', label: 'Sehr intensiv' }] },
  { key: 'trainingsort', label: 'Trainingsort', type: 'lookup/radio', options: [{ key: 'fitnessstudio', label: 'Fitnessstudio' }, { key: 'zuhause', label: 'Zuhause' }, { key: 'draussen', label: 'Draußen' }, { key: 'sonstiges', label: 'Sonstiges' }] },
  { key: 'ausgefuehrte_uebungen', label: 'Ausgeführte Übungen', type: 'multipleapplookup/select', targetEntity: 'uebungsverwaltung', targetAppId: 'UEBUNGSVERWALTUNG', displayField: 'uebung_name' },
  { key: 'uebungsdetails', label: 'Details zu den Übungen (Sätze, Wiederholungen, Gewicht)', type: 'string/textarea' },
  { key: 'zugeordnetes_ziel', label: 'Zugeordnetes Fitnessziel', type: 'applookup/select', targetEntity: 'fitnessziele', targetAppId: 'FITNESSZIELE', displayField: 'ziel_bezeichnung' },
  { key: 'stimmung', label: 'Stimmung / Befinden', type: 'lookup/radio', options: [{ key: 'sehr_gut', label: 'Sehr gut' }, { key: 'gut', label: 'Gut' }, { key: 'neutral', label: 'Neutral' }, { key: 'schlecht', label: 'Schlecht' }, { key: 'sehr_schlecht', label: 'Sehr schlecht' }] },
  { key: 'training_notizen', label: 'Allgemeine Notizen zum Training', type: 'string/textarea' },
];

const ENTITY_TABS = [
  { key: 'uebungsverwaltung', label: 'Übungsverwaltung', pascal: 'Uebungsverwaltung' },
  { key: 'fitnessziele', label: 'Fitnessziele', pascal: 'Fitnessziele' },
  { key: 'koerpermessung', label: 'Körpermessung', pascal: 'Koerpermessung' },
  { key: 'trainingsprotokoll', label: 'Trainingsprotokoll', pascal: 'Trainingsprotokoll' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('uebungsverwaltung');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'uebungsverwaltung': new Set(),
    'fitnessziele': new Set(),
    'koerpermessung': new Set(),
    'trainingsprotokoll': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'uebungsverwaltung': {},
    'fitnessziele': {},
    'koerpermessung': {},
    'trainingsprotokoll': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'uebungsverwaltung': return (data as any).uebungsverwaltung as Uebungsverwaltung[] ?? [];
      case 'fitnessziele': return (data as any).fitnessziele as Fitnessziele[] ?? [];
      case 'koerpermessung': return (data as any).koerpermessung as Koerpermessung[] ?? [];
      case 'trainingsprotokoll': return (data as any).trainingsprotokoll as Trainingsprotokoll[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'trainingsprotokoll':
        lists.uebungsverwaltungList = (data as any).uebungsverwaltung ?? [];
        lists.fitnesszieleList = (data as any).fitnessziele ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'trainingsprotokoll' && fieldKey === 'ausgefuehrte_uebungen') {
      const match = (lists.uebungsverwaltungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.uebung_name ?? '—';
    }
    if (entity === 'trainingsprotokoll' && fieldKey === 'zugeordnetes_ziel') {
      const match = (lists.fitnesszieleList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.ziel_bezeichnung ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'uebungsverwaltung': return UEBUNGSVERWALTUNG_FIELDS;
      case 'fitnessziele': return FITNESSZIELE_FIELDS;
      case 'koerpermessung': return KOERPERMESSUNG_FIELDS;
      case 'trainingsprotokoll': return TRAININGSPROTOKOLL_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'uebungsverwaltung': return {
        create: (fields: any) => LivingAppsService.createUebungsverwaltungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateUebungsverwaltungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteUebungsverwaltungEntry(id),
      };
      case 'fitnessziele': return {
        create: (fields: any) => LivingAppsService.createFitnesszieleEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateFitnesszieleEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteFitnesszieleEntry(id),
      };
      case 'koerpermessung': return {
        create: (fields: any) => LivingAppsService.createKoerpermessungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKoerpermessungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKoerpermessungEntry(id),
      };
      case 'trainingsprotokoll': return {
        create: (fields: any) => LivingAppsService.createTrainingsprotokollEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateTrainingsprotokollEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteTrainingsprotokollEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'uebungsverwaltung' || dialogState?.entity === 'uebungsverwaltung') && (
        <UebungsverwaltungDialog
          open={createEntity === 'uebungsverwaltung' || dialogState?.entity === 'uebungsverwaltung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'uebungsverwaltung' ? handleUpdate : (fields: any) => handleCreate('uebungsverwaltung', fields)}
          defaultValues={dialogState?.entity === 'uebungsverwaltung' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Uebungsverwaltung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Uebungsverwaltung']}
        />
      )}
      {(createEntity === 'fitnessziele' || dialogState?.entity === 'fitnessziele') && (
        <FitnesszieleDialog
          open={createEntity === 'fitnessziele' || dialogState?.entity === 'fitnessziele'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'fitnessziele' ? handleUpdate : (fields: any) => handleCreate('fitnessziele', fields)}
          defaultValues={dialogState?.entity === 'fitnessziele' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Fitnessziele']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Fitnessziele']}
        />
      )}
      {(createEntity === 'koerpermessung' || dialogState?.entity === 'koerpermessung') && (
        <KoerpermessungDialog
          open={createEntity === 'koerpermessung' || dialogState?.entity === 'koerpermessung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'koerpermessung' ? handleUpdate : (fields: any) => handleCreate('koerpermessung', fields)}
          defaultValues={dialogState?.entity === 'koerpermessung' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Koerpermessung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Koerpermessung']}
        />
      )}
      {(createEntity === 'trainingsprotokoll' || dialogState?.entity === 'trainingsprotokoll') && (
        <TrainingsprotokollDialog
          open={createEntity === 'trainingsprotokoll' || dialogState?.entity === 'trainingsprotokoll'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'trainingsprotokoll' ? handleUpdate : (fields: any) => handleCreate('trainingsprotokoll', fields)}
          defaultValues={dialogState?.entity === 'trainingsprotokoll' ? dialogState.record?.fields : undefined}
          uebungsverwaltungList={(data as any).uebungsverwaltung ?? []}
          fitnesszieleList={(data as any).fitnessziele ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Trainingsprotokoll']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Trainingsprotokoll']}
        />
      )}
      {viewState?.entity === 'uebungsverwaltung' && (
        <UebungsverwaltungViewDialog
          open={viewState?.entity === 'uebungsverwaltung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'uebungsverwaltung', record: r }); }}
        />
      )}
      {viewState?.entity === 'fitnessziele' && (
        <FitnesszieleViewDialog
          open={viewState?.entity === 'fitnessziele'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'fitnessziele', record: r }); }}
        />
      )}
      {viewState?.entity === 'koerpermessung' && (
        <KoerpermessungViewDialog
          open={viewState?.entity === 'koerpermessung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'koerpermessung', record: r }); }}
        />
      )}
      {viewState?.entity === 'trainingsprotokoll' && (
        <TrainingsprotokollViewDialog
          open={viewState?.entity === 'trainingsprotokoll'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'trainingsprotokoll', record: r }); }}
          uebungsverwaltungList={(data as any).uebungsverwaltung ?? []}
          fitnesszieleList={(data as any).fitnessziele ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}