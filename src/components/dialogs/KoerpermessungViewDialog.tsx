import type { Koerpermessung } from '@/types/app';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface KoerpermessungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Koerpermessung | null;
  onEdit: (record: Koerpermessung) => void;
}

export function KoerpermessungViewDialog({ open, onClose, record, onEdit }: KoerpermessungViewDialogProps) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Körpermessung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Datum der Messung</Label>
            <p className="text-sm">{formatDate(record.fields.messdatum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Körpergewicht (kg)</Label>
            <p className="text-sm">{record.fields.koerpergewicht ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Körpergröße (cm)</Label>
            <p className="text-sm">{record.fields.koerpergroesse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Körperfettanteil (%)</Label>
            <p className="text-sm">{record.fields.koerperfettanteil ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Muskelmasse (kg)</Label>
            <p className="text-sm">{record.fields.muskelmasse ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Brustumfang (cm)</Label>
            <p className="text-sm">{record.fields.masse_brust ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Taillenumfang (cm)</Label>
            <p className="text-sm">{record.fields.masse_taille ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Hüftumfang (cm)</Label>
            <p className="text-sm">{record.fields.masse_huefte ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Oberarmumfang (cm)</Label>
            <p className="text-sm">{record.fields.masse_oberarm ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Oberschenkelumfang (cm)</Label>
            <p className="text-sm">{record.fields.masse_oberschenkel ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen zur Messung</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.messung_notizen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}