import { useState, useEffect, useRef, useCallback } from 'react';
import type { Uebungsverwaltung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconCamera, IconCircleCheck, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromPhoto, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey, lookupKeys } from '@/lib/formatters';

interface UebungsverwaltungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Uebungsverwaltung['fields']) => Promise<void>;
  defaultValues?: Uebungsverwaltung['fields'];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function UebungsverwaltungDialog({ open, onClose, onSubmit, defaultValues, enablePhotoScan = true, enablePhotoLocation = true }: UebungsverwaltungDialogProps) {
  const [fields, setFields] = useState<Partial<Uebungsverwaltung['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'uebungsverwaltung');
      await onSubmit(clean as Uebungsverwaltung['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoScan(file: File) {
    setScanning(true);
    setScanSuccess(false);
    try {
      const [uri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
      if (file.type.startsWith('image/')) setPreview(uri);
      const gps = enablePhotoLocation ? meta?.gps ?? null : null;
      const parts: string[] = [];
      let geoAddr = '';
      if (gps) {
        geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
        parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
        if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
      }
      if (meta?.dateTime) {
        parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "uebung_name": string | null, // Name der Übung\n  "muskelgruppe": LookupValue[] | null, // Muskelgruppe (select one or more keys: "ruecken" | "schultern" | "brust" | "bizeps" | "trizeps" | "bauch" | "quadrizeps" | "hamstrings" | "gesaess" | "waden" | "ganzkoerper") mapping: ruecken=Rücken, schultern=Schultern, brust=Brust, bizeps=Arme (Bizeps), trizeps=Arme (Trizeps), bauch=Bauch, quadrizeps=Beine (Quadrizeps), hamstrings=Beine (Hamstrings), gesaess=Gesäß, waden=Waden, ganzkoerper=Ganzkörper\n  "trainingstyp": LookupValue | null, // Trainingstyp (select one key: "kraft" | "ausdauer" | "flexibilitaet" | "koordination" | "hiit") mapping: kraft=Kraft, ausdauer=Ausdauer, flexibilitaet=Flexibilität, koordination=Koordination, hiit=HIIT\n  "schwierigkeitsgrad": LookupValue | null, // Schwierigkeitsgrad (select one key: "anfaenger" | "fortgeschritten" | "experte") mapping: anfaenger=Anfänger, fortgeschritten=Fortgeschritten, experte=Experte\n  "geraet": LookupValue | null, // Benötigtes Equipment (select one key: "kein_equipment" | "kurzhanteln" | "langhantel" | "maschine" | "kettlebell" | "widerstandsband" | "klimmzugstange" | "sonstiges") mapping: kein_equipment=Kein Equipment, kurzhanteln=Kurzhanteln, langhantel=Langhantel, maschine=Maschine, kettlebell=Kettlebell, widerstandsband=Widerstandsband, klimmzugstange=Klimmzugstange, sonstiges=Sonstiges\n  "beschreibung": string | null, // Beschreibung / Ausführungshinweise\n}`;
      const raw = await extractFromPhoto<Record<string, unknown>>(uri, schema, photoContext, DIALOG_INTENT);
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        for (const [k, v] of Object.entries(raw)) {
          if (v != null) merged[k] = v;
        }
        return merged as Partial<Uebungsverwaltung['fields']>;
      });
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handlePhotoScan(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handlePhotoScan(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Übungsverwaltung bearbeiten' : 'Übungsverwaltung hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht deine Fotos / Dokumente und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1.5" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1.5" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="flex-1 h-9 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1.5" />Dokument
              </Button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uebung_name">Name der Übung</Label>
            <Input
              id="uebung_name"
              value={fields.uebung_name ?? ''}
              onChange={e => setFields(f => ({ ...f, uebung_name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="muskelgruppe">Muskelgruppe</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_ruecken"
                  checked={lookupKeys(fields.muskelgruppe).includes('ruecken')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'ruecken'] : current.filter(k => k !== 'ruecken');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_ruecken" className="font-normal">Rücken</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_schultern"
                  checked={lookupKeys(fields.muskelgruppe).includes('schultern')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'schultern'] : current.filter(k => k !== 'schultern');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_schultern" className="font-normal">Schultern</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_brust"
                  checked={lookupKeys(fields.muskelgruppe).includes('brust')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'brust'] : current.filter(k => k !== 'brust');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_brust" className="font-normal">Brust</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_bizeps"
                  checked={lookupKeys(fields.muskelgruppe).includes('bizeps')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'bizeps'] : current.filter(k => k !== 'bizeps');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_bizeps" className="font-normal">Arme (Bizeps)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_trizeps"
                  checked={lookupKeys(fields.muskelgruppe).includes('trizeps')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'trizeps'] : current.filter(k => k !== 'trizeps');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_trizeps" className="font-normal">Arme (Trizeps)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_bauch"
                  checked={lookupKeys(fields.muskelgruppe).includes('bauch')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'bauch'] : current.filter(k => k !== 'bauch');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_bauch" className="font-normal">Bauch</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_quadrizeps"
                  checked={lookupKeys(fields.muskelgruppe).includes('quadrizeps')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'quadrizeps'] : current.filter(k => k !== 'quadrizeps');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_quadrizeps" className="font-normal">Beine (Quadrizeps)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_hamstrings"
                  checked={lookupKeys(fields.muskelgruppe).includes('hamstrings')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'hamstrings'] : current.filter(k => k !== 'hamstrings');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_hamstrings" className="font-normal">Beine (Hamstrings)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_gesaess"
                  checked={lookupKeys(fields.muskelgruppe).includes('gesaess')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'gesaess'] : current.filter(k => k !== 'gesaess');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_gesaess" className="font-normal">Gesäß</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_waden"
                  checked={lookupKeys(fields.muskelgruppe).includes('waden')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'waden'] : current.filter(k => k !== 'waden');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_waden" className="font-normal">Waden</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="muskelgruppe_ganzkoerper"
                  checked={lookupKeys(fields.muskelgruppe).includes('ganzkoerper')}
                  onCheckedChange={(checked) => {
                    setFields(f => {
                      const current = lookupKeys(f.muskelgruppe);
                      const next = checked ? [...current, 'ganzkoerper'] : current.filter(k => k !== 'ganzkoerper');
                      return { ...f, muskelgruppe: next.length ? next as any : undefined };
                    });
                  }}
                />
                <Label htmlFor="muskelgruppe_ganzkoerper" className="font-normal">Ganzkörper</Label>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trainingstyp">Trainingstyp</Label>
            <Select
              value={lookupKey(fields.trainingstyp) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, trainingstyp: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="trainingstyp"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="kraft">Kraft</SelectItem>
                <SelectItem value="ausdauer">Ausdauer</SelectItem>
                <SelectItem value="flexibilitaet">Flexibilität</SelectItem>
                <SelectItem value="koordination">Koordination</SelectItem>
                <SelectItem value="hiit">HIIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="schwierigkeitsgrad">Schwierigkeitsgrad</Label>
            <Select
              value={lookupKey(fields.schwierigkeitsgrad) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, schwierigkeitsgrad: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="schwierigkeitsgrad"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="anfaenger">Anfänger</SelectItem>
                <SelectItem value="fortgeschritten">Fortgeschritten</SelectItem>
                <SelectItem value="experte">Experte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="geraet">Benötigtes Equipment</Label>
            <Select
              value={lookupKey(fields.geraet) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, geraet: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="geraet"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="kein_equipment">Kein Equipment</SelectItem>
                <SelectItem value="kurzhanteln">Kurzhanteln</SelectItem>
                <SelectItem value="langhantel">Langhantel</SelectItem>
                <SelectItem value="maschine">Maschine</SelectItem>
                <SelectItem value="kettlebell">Kettlebell</SelectItem>
                <SelectItem value="widerstandsband">Widerstandsband</SelectItem>
                <SelectItem value="klimmzugstange">Klimmzugstange</SelectItem>
                <SelectItem value="sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="beschreibung">Beschreibung / Ausführungshinweise</Label>
            <Textarea
              id="beschreibung"
              value={fields.beschreibung ?? ''}
              onChange={e => setFields(f => ({ ...f, beschreibung: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}