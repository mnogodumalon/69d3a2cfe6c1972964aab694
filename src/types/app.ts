// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Koerpermessung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    messdatum?: string; // Format: YYYY-MM-DD oder ISO String
    koerpergewicht?: number;
    koerpergroesse?: number;
    koerperfettanteil?: number;
    muskelmasse?: number;
    masse_brust?: number;
    masse_taille?: number;
    masse_huefte?: number;
    masse_oberarm?: number;
    masse_oberschenkel?: number;
    messung_notizen?: string;
  };
}

export interface Uebungsverwaltung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    uebung_name?: string;
    muskelgruppe?: LookupValue[];
    trainingstyp?: LookupValue;
    schwierigkeitsgrad?: LookupValue;
    geraet?: LookupValue;
    beschreibung?: string;
  };
}

export interface Trainingsprotokoll {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    training_datum?: string; // Format: YYYY-MM-DD oder ISO String
    trainingsname?: string;
    dauer_minuten?: number;
    kalorien?: number;
    intensitaet?: LookupValue;
    trainingsort?: LookupValue;
    ausgefuehrte_uebungen?: string;
    uebungsdetails?: string;
    zugeordnetes_ziel?: string; // applookup -> URL zu 'Fitnessziele' Record
    stimmung?: LookupValue;
    training_notizen?: string;
  };
}

export interface Fitnessziele {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ziel_bezeichnung?: string;
    zieltyp?: LookupValue;
    zielwert?: number;
    zieleinheit?: string;
    startdatum?: string; // Format: YYYY-MM-DD oder ISO String
    zieldatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    ziel_notizen?: string;
  };
}

export const APP_IDS = {
  KOERPERMESSUNG: '69d3a2bb2f0d5846dd2778fa',
  UEBUNGSVERWALTUNG: '69d3a2b6bc04b90fcbc5a871',
  TRAININGSPROTOKOLL: '69d3a2bc25f761bd428ed81a',
  FITNESSZIELE: '69d3a2bba8bdbc10cd5c9319',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'uebungsverwaltung': {
    muskelgruppe: [{ key: "ruecken", label: "Rücken" }, { key: "schultern", label: "Schultern" }, { key: "brust", label: "Brust" }, { key: "bizeps", label: "Arme (Bizeps)" }, { key: "trizeps", label: "Arme (Trizeps)" }, { key: "bauch", label: "Bauch" }, { key: "quadrizeps", label: "Beine (Quadrizeps)" }, { key: "hamstrings", label: "Beine (Hamstrings)" }, { key: "gesaess", label: "Gesäß" }, { key: "waden", label: "Waden" }, { key: "ganzkoerper", label: "Ganzkörper" }],
    trainingstyp: [{ key: "kraft", label: "Kraft" }, { key: "ausdauer", label: "Ausdauer" }, { key: "flexibilitaet", label: "Flexibilität" }, { key: "koordination", label: "Koordination" }, { key: "hiit", label: "HIIT" }],
    schwierigkeitsgrad: [{ key: "anfaenger", label: "Anfänger" }, { key: "fortgeschritten", label: "Fortgeschritten" }, { key: "experte", label: "Experte" }],
    geraet: [{ key: "kein_equipment", label: "Kein Equipment" }, { key: "kurzhanteln", label: "Kurzhanteln" }, { key: "langhantel", label: "Langhantel" }, { key: "maschine", label: "Maschine" }, { key: "kettlebell", label: "Kettlebell" }, { key: "widerstandsband", label: "Widerstandsband" }, { key: "klimmzugstange", label: "Klimmzugstange" }, { key: "sonstiges", label: "Sonstiges" }],
  },
  'trainingsprotokoll': {
    intensitaet: [{ key: "leicht", label: "Leicht" }, { key: "moderat", label: "Moderat" }, { key: "intensiv", label: "Intensiv" }, { key: "sehr_intensiv", label: "Sehr intensiv" }],
    trainingsort: [{ key: "fitnessstudio", label: "Fitnessstudio" }, { key: "zuhause", label: "Zuhause" }, { key: "draussen", label: "Draußen" }, { key: "sonstiges", label: "Sonstiges" }],
    stimmung: [{ key: "sehr_gut", label: "Sehr gut" }, { key: "gut", label: "Gut" }, { key: "neutral", label: "Neutral" }, { key: "schlecht", label: "Schlecht" }, { key: "sehr_schlecht", label: "Sehr schlecht" }],
  },
  'fitnessziele': {
    zieltyp: [{ key: "gewicht_verlieren", label: "Gewicht verlieren" }, { key: "gewicht_zunehmen", label: "Gewicht zunehmen" }, { key: "muskeln_aufbauen", label: "Muskeln aufbauen" }, { key: "ausdauer_verbessern", label: "Ausdauer verbessern" }, { key: "flexibilitaet_verbessern", label: "Flexibilität verbessern" }, { key: "bestleistung", label: "Bestleistung erreichen" }, { key: "sonstiges", label: "Sonstiges" }],
    status: [{ key: "aktiv", label: "Aktiv" }, { key: "pausiert", label: "Pausiert" }, { key: "erreicht", label: "Erreicht" }, { key: "abgebrochen", label: "Abgebrochen" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'koerpermessung': {
    'messdatum': 'date/date',
    'koerpergewicht': 'number',
    'koerpergroesse': 'number',
    'koerperfettanteil': 'number',
    'muskelmasse': 'number',
    'masse_brust': 'number',
    'masse_taille': 'number',
    'masse_huefte': 'number',
    'masse_oberarm': 'number',
    'masse_oberschenkel': 'number',
    'messung_notizen': 'string/textarea',
  },
  'uebungsverwaltung': {
    'uebung_name': 'string/text',
    'muskelgruppe': 'multiplelookup/checkbox',
    'trainingstyp': 'lookup/radio',
    'schwierigkeitsgrad': 'lookup/radio',
    'geraet': 'lookup/select',
    'beschreibung': 'string/textarea',
  },
  'trainingsprotokoll': {
    'training_datum': 'date/datetimeminute',
    'trainingsname': 'string/text',
    'dauer_minuten': 'number',
    'kalorien': 'number',
    'intensitaet': 'lookup/radio',
    'trainingsort': 'lookup/radio',
    'ausgefuehrte_uebungen': 'multipleapplookup/select',
    'uebungsdetails': 'string/textarea',
    'zugeordnetes_ziel': 'applookup/select',
    'stimmung': 'lookup/radio',
    'training_notizen': 'string/textarea',
  },
  'fitnessziele': {
    'ziel_bezeichnung': 'string/text',
    'zieltyp': 'lookup/select',
    'zielwert': 'number',
    'zieleinheit': 'string/text',
    'startdatum': 'date/date',
    'zieldatum': 'date/date',
    'status': 'lookup/radio',
    'ziel_notizen': 'string/textarea',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKoerpermessung = StripLookup<Koerpermessung['fields']>;
export type CreateUebungsverwaltung = StripLookup<Uebungsverwaltung['fields']>;
export type CreateTrainingsprotokoll = StripLookup<Trainingsprotokoll['fields']>;
export type CreateFitnessziele = StripLookup<Fitnessziele['fields']>;