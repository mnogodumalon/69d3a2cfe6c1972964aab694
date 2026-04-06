import type { Trainingsprotokoll, Uebungsverwaltung, Fitnessziele } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface TrainingsprotokollViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Trainingsprotokoll | null;
  onEdit: (record: Trainingsprotokoll) => void;
  uebungsverwaltungList: Uebungsverwaltung[];
  fitnesszieleList: Fitnessziele[];
}

export function TrainingsprotokollViewDialog({ open, onClose, record, onEdit, uebungsverwaltungList, fitnesszieleList }: TrainingsprotokollViewDialogProps) {
  function getUebungsverwaltungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return uebungsverwaltungList.find(r => r.record_id === id)?.fields.uebung_name ?? '—';
  }

  function getFitnesszieleDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return fitnesszieleList.find(r => r.record_id === id)?.fields.ziel_bezeichnung ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trainingsprotokoll anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum & Uhrzeit des Trainings</Label>
            <p className="text-sm">{formatDate(record.fields.training_datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bezeichnung der Trainingseinheit</Label>
            <p className="text-sm">{record.fields.trainingsname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Dauer (Minuten)</Label>
            <p className="text-sm">{record.fields.dauer_minuten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kalorienverbrauch (kcal)</Label>
            <p className="text-sm">{record.fields.kalorien ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Intensität</Label>
            <Badge variant="secondary">{record.fields.intensitaet?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Trainingsort</Label>
            <Badge variant="secondary">{record.fields.trainingsort?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Ausgeführte Übungen</Label>
            <p className="text-sm">{getUebungsverwaltungDisplayName(record.fields.ausgefuehrte_uebungen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Details zu den Übungen (Sätze, Wiederholungen, Gewicht)</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.uebungsdetails ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugeordnetes Fitnessziel</Label>
            <p className="text-sm">{getFitnesszieleDisplayName(record.fields.zugeordnetes_ziel)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stimmung / Befinden</Label>
            <Badge variant="secondary">{record.fields.stimmung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Allgemeine Notizen zum Training</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.training_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}