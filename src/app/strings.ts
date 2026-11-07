// The engine's own words, per language. Trail content brings its own
// languages; the interface follows the visitor's language when the engine
// has it, else English.

const strings = {
  de: {
    next: "Weiter",
    nextTo: "Weiter zu Station",
    prevTo: "Zurück zu Station",
    startAt: "Start bei",
    station: "Station",
    stations: "Stationen",
    overview: "Übersicht",
    toOverview: "Zur Übersicht",
    lastStation: "Letzte Station",
    more: "Weiterlesen",
    length: "Weglänge",
    duration: "Dauer",
    walkTime: "Gehzeit",
    walkTimeHow: "ohne Halte, gerechnet wie auf den gelben Wanderwegweisern",
    walkTimeTo: "Gehzeit bis {n}",
    gettingThere: "Anreise",
    start: "Start",
    links: "Weiterführende Informationen",
    publisher: "Herausgeber",
    basemap: "Kartenhintergrund",
    map: "Karte",
    sheet: "Stationen und Texte",
    resize: "Breite der Spalte ändern",
    approx: "ca.",
    lessThan: "unter",
    photo: "Bild",
    photos: "Bilder",
    madeWith: "Gebaut mit",
    listen: "Vorlesen",
    pause: "Pause",
    position: "Position in der Aufnahme",
    of: "von",
    syntheticVoice: "Vorgelesen von einer künstlichen Stimme",
    audioError: "Die Audiodatei lässt sich nicht abspielen.",
    noMap: "Dieses Gerät kann die Karte nicht anzeigen. Die Texte und Bilder sind alle da.",
    mapRetry: "Die Karte lädt nicht – keine Verbindung? Neuer Versuch läuft.",
    locateShow: "Meinen Standort zeigen",
    locateFollow: "Die Karte folgt Ihrem Standort",
    locateHeading: "Die Karte dreht sich mit Ihnen",
    northUp: "Norden nach oben",
    farAway: "Sie sind {d} vom Weg entfernt.",
    youAreThere: "Ihr Standort",
    locationDenied: "Der Standort ist für diese Seite gesperrt. Sie können ihn in den Einstellungen des Browsers freigeben.",
    locationUnavailable: "Noch kein Standort. Unter freiem Himmel kommt er meist schneller.",
    locationInsecure: "Der Standort braucht eine sichere Verbindung (https).",
    hereChip: "Hier",
    hereAt: "Sie sind bei",
    wayTo: "bis",
    language: "Sprache",
    machineNote: "Maschinelle Übersetzung (Original: {from}), vom Herausgeber nicht geprüft. Sie kann Fehler enthalten.",
    readOriginal: "Original lesen",
  },
  en: {
    next: "Next",
    nextTo: "Next: station",
    prevTo: "Back to station",
    startAt: "Start at",
    station: "Station",
    stations: "Stations",
    overview: "Overview",
    toOverview: "Back to the overview",
    lastStation: "Last station",
    more: "Read on",
    length: "Length",
    duration: "Duration",
    walkTime: "Walking time",
    walkTimeHow: "without stops, reckoned as on Swiss yellow trail signposts",
    walkTimeTo: "Walking time to {n}",
    gettingThere: "Getting there",
    start: "Start",
    links: "More information",
    publisher: "Published by",
    basemap: "Map background",
    map: "Map",
    sheet: "Stations and texts",
    resize: "Resize the column",
    approx: "approx.",
    lessThan: "under",
    photo: "Photo",
    photos: "Photos",
    madeWith: "Built with",
    listen: "Read aloud",
    pause: "Pause",
    position: "Position in the recording",
    of: "of",
    syntheticVoice: "Read aloud by a synthetic voice",
    audioError: "The audio cannot be played.",
    noMap: "This device can't show the map. All the texts and pictures are here.",
    mapRetry: "The map isn't loading – no connection? Trying again.",
    locateShow: "Show my location",
    locateFollow: "The map follows you",
    locateHeading: "The map turns with you",
    northUp: "North up",
    farAway: "You are {d} from the trail.",
    youAreThere: "Your location",
    locationDenied: "Location is blocked for this site. You can allow it in the browser's settings.",
    locationUnavailable: "No location yet. Under open sky it usually comes faster.",
    locationInsecure: "Location needs a secure connection (https).",
    hereChip: "Here",
    hereAt: "You are at",
    wayTo: "to",
    language: "Language",
    machineNote: "Machine translation (original: {from}), not checked by the publisher. It may contain errors.",
    readOriginal: "Read the original",
  },
  fr: {
    next: "Suivant",
    nextTo: "Suivant : station",
    prevTo: "Retour à la station",
    startAt: "Départ :",
    station: "Station",
    stations: "Stations",
    overview: "Aperçu",
    toOverview: "Retour à l\u2019aperçu",
    lastStation: "Dernière station",
    more: "Lire la suite",
    length: "Longueur",
    duration: "Durée",
    walkTime: "Temps de marche",
    walkTimeHow: "sans arrêts, calculé comme sur les panneaux jaunes de randonnée",
    walkTimeTo: "Temps de marche jusqu’à {n}",
    gettingThere: "Accès",
    start: "Départ",
    links: "Pour en savoir plus",
    publisher: "Éditeur",
    basemap: "Fond de carte",
    map: "Carte",
    sheet: "Stations et textes",
    resize: "Modifier la largeur de la colonne",
    approx: "env.",
    lessThan: "moins de",
    photo: "Photo",
    photos: "Photos",
    madeWith: "Réalisé avec",
    listen: "Lire à voix haute",
    pause: "Pause",
    position: "Position dans l\u2019enregistrement",
    of: "sur",
    syntheticVoice: "Lu par une voix de synthèse",
    audioError: "Le fichier audio ne peut pas être lu.",
    noMap: "Cet appareil ne peut pas afficher la carte. Tous les textes et images sont là.",
    mapRetry: "La carte ne se charge pas – pas de connexion ? Nouvel essai en cours.",
    locateShow: "Afficher ma position",
    locateFollow: "La carte suit votre position",
    locateHeading: "La carte tourne avec vous",
    northUp: "Nord en haut",
    farAway: "Vous êtes à {d} du sentier.",
    youAreThere: "Votre position",
    locationDenied: "La position est bloquée pour ce site. Vous pouvez l\u2019autoriser dans les paramètres du navigateur.",
    locationUnavailable: "Pas encore de position. En plein air, elle arrive en général plus vite.",
    locationInsecure: "La position nécessite une connexion sécurisée (https).",
    hereChip: "Ici",
    hereAt: "Vous êtes à",
    wayTo: "vers",
    language: "Langue",
    machineNote: "Traduction automatique (original\u00a0: {from}), non vérifiée par l\u2019éditeur. Elle peut contenir des erreurs.",
    readOriginal: "Lire l\u2019original",
  },
} as const;

export type Strings = { [K in keyof (typeof strings)["en"]]: string };

export function uiStrings(lang: string): Strings {
  return (strings as Record<string, Strings>)[lang.split("-")[0]] ?? strings.en;
}

/** Distance along the route, rounded to what a walker can use. */
export function formatDistance(m: number, lang: string, s: Strings): string {
  if (m < 50) return `${s.lessThan} 50 m`;
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(m / 1000)} km`;
}

/**
 * A walking time rounded to `step` minutes and never below it: 5 for times
 * that add up legs, as signposts round, 1 for a single short leg.
 */
export function formatMinutes(minutes: number, step: number): string {
  const r = Math.max(step, Math.round(minutes / step) * step);
  const h = Math.floor(r / 60), m = r % 60;
  return h ? `${h} h${m ? ` ${String(m).padStart(2, "0")} min` : ""}` : `${m} min`;
}

/** Distance from where the visitor is: to the ten metres nearby, to the kilometre far away. */
export function formatLive(m: number, lang: string): string {
  if (m < 995) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${new Intl.NumberFormat(lang, { maximumFractionDigits: m < 9950 ? 1 : 0 }).format(m / 1000)} km`;
}
