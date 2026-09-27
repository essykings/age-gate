import { toLanguageCode } from '../settings/language';

// Built-in wording for every piece of the popup the site owner doesn't type themselves,
// plus the defaults used when they leave a text field blank. Picked by the language the
// visitor is viewing the page in, falling back to English.
export interface UiStrings {
  heading: (age: number) => string;
  body: string;
  yes: (age: number) => string;
  no: (age: number) => string;
  dobHeading: string;
  segmentedHeading: string;
  segmentedBody: string;
  dobLabel: string;
  confirm: string;
  enter: string;
  day: string;
  month: string;
  year: string;
  dayPlaceholder: string;
  monthPlaceholder: string;
  yearPlaceholder: string;
  errorEmpty: string;
  errorInvalid: string;
  restrictedHeading: string;
  restrictedBody: (age: number) => string;
  testingNote: string;
}

const EN: UiStrings = {
  heading: (age) => `Are you ${age} or older?`,
  body: 'You must confirm your age to view this site.',
  yes: (age) => `Yes, I am ${age}+`,
  no: (age) => `No, I am under ${age}`,
  dobHeading: 'Please confirm your date of birth',
  segmentedHeading: 'Confirm your age',
  segmentedBody: 'Enter your date of birth to continue',
  dobLabel: 'Date of birth',
  confirm: 'Confirm',
  enter: 'Enter',
  day: 'Day',
  month: 'Month',
  year: 'Year',
  dayPlaceholder: 'DD',
  monthPlaceholder: 'MM',
  yearPlaceholder: 'YYYY',
  errorEmpty: 'Please enter your date of birth.',
  errorInvalid: 'That date doesn’t look right. Please check it.',
  restrictedHeading: 'Access Restricted',
  restrictedBody: (age) => `You must be ${age} or older to view this site.`,
  testingNote: 'Always shown during testing',
};

const STRINGS: Record<string, UiStrings> = {
  en: EN,
  fr: {
    heading: (age) => `Avez-vous ${age} ans ou plus ?`,
    body: 'Vous devez confirmer votre âge pour accéder à ce site.',
    yes: (age) => `Oui, j’ai ${age} ans ou plus`,
    no: (age) => `Non, j’ai moins de ${age} ans`,
    dobHeading: 'Veuillez confirmer votre date de naissance',
    segmentedHeading: 'Confirmez votre âge',
    segmentedBody: 'Saisissez votre date de naissance pour continuer',
    dobLabel: 'Date de naissance',
    confirm: 'Confirmer',
    enter: 'Entrer',
    day: 'Jour',
    month: 'Mois',
    year: 'Année',
    dayPlaceholder: 'JJ',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'AAAA',
    errorEmpty: 'Veuillez saisir votre date de naissance.',
    errorInvalid: 'Cette date ne semble pas correcte. Veuillez la vérifier.',
    restrictedHeading: 'Accès restreint',
    restrictedBody: (age) => `Vous devez avoir ${age} ans ou plus pour accéder à ce site.`,
    testingNote: 'Toujours affiché pendant les tests',
  },
  es: {
    heading: (age) => `¿Tienes ${age} años o más?`,
    body: 'Debes confirmar tu edad para ver este sitio.',
    yes: (age) => `Sí, tengo ${age} años o más`,
    no: (age) => `No, tengo menos de ${age} años`,
    dobHeading: 'Confirma tu fecha de nacimiento',
    segmentedHeading: 'Confirma tu edad',
    segmentedBody: 'Introduce tu fecha de nacimiento para continuar',
    dobLabel: 'Fecha de nacimiento',
    confirm: 'Confirmar',
    enter: 'Entrar',
    day: 'Día',
    month: 'Mes',
    year: 'Año',
    dayPlaceholder: 'DD',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'AAAA',
    errorEmpty: 'Introduce tu fecha de nacimiento.',
    errorInvalid: 'Esa fecha no parece correcta. Revísala.',
    restrictedHeading: 'Acceso restringido',
    restrictedBody: (age) => `Debes tener ${age} años o más para ver este sitio.`,
    testingNote: 'Siempre visible durante las pruebas',
  },
  de: {
    heading: (age) => `Sind Sie ${age} Jahre oder älter?`,
    body: 'Sie müssen Ihr Alter bestätigen, um diese Website zu sehen.',
    yes: (age) => `Ja, ich bin ${age} oder älter`,
    no: (age) => `Nein, ich bin unter ${age}`,
    dobHeading: 'Bitte bestätigen Sie Ihr Geburtsdatum',
    segmentedHeading: 'Bestätigen Sie Ihr Alter',
    segmentedBody: 'Geben Sie Ihr Geburtsdatum ein, um fortzufahren',
    dobLabel: 'Geburtsdatum',
    confirm: 'Bestätigen',
    enter: 'Weiter',
    day: 'Tag',
    month: 'Monat',
    year: 'Jahr',
    dayPlaceholder: 'TT',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'JJJJ',
    errorEmpty: 'Bitte geben Sie Ihr Geburtsdatum ein.',
    errorInvalid: 'Dieses Datum scheint nicht zu stimmen. Bitte prüfen Sie es.',
    restrictedHeading: 'Zugang eingeschränkt',
    restrictedBody: (age) => `Sie müssen mindestens ${age} Jahre alt sein, um diese Website zu sehen.`,
    testingNote: 'Beim Testen immer sichtbar',
  },
  it: {
    heading: (age) => `Hai ${age} anni o più?`,
    body: 'Devi confermare la tua età per visitare questo sito.',
    yes: (age) => `Sì, ho ${age} anni o più`,
    no: (age) => `No, ho meno di ${age} anni`,
    dobHeading: 'Conferma la tua data di nascita',
    segmentedHeading: 'Conferma la tua età',
    segmentedBody: 'Inserisci la tua data di nascita per continuare',
    dobLabel: 'Data di nascita',
    confirm: 'Conferma',
    enter: 'Entra',
    day: 'Giorno',
    month: 'Mese',
    year: 'Anno',
    dayPlaceholder: 'GG',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'AAAA',
    errorEmpty: 'Inserisci la tua data di nascita.',
    errorInvalid: 'Questa data non sembra corretta. Controllala.',
    restrictedHeading: 'Accesso limitato',
    restrictedBody: (age) => `Devi avere almeno ${age} anni per visitare questo sito.`,
    testingNote: 'Sempre visibile durante i test',
  },
  pt: {
    heading: (age) => `Você tem ${age} anos ou mais?`,
    body: 'Você precisa confirmar sua idade para ver este site.',
    yes: (age) => `Sim, tenho ${age} anos ou mais`,
    no: (age) => `Não, tenho menos de ${age} anos`,
    dobHeading: 'Confirme sua data de nascimento',
    segmentedHeading: 'Confirme sua idade',
    segmentedBody: 'Informe sua data de nascimento para continuar',
    dobLabel: 'Data de nascimento',
    confirm: 'Confirmar',
    enter: 'Entrar',
    day: 'Dia',
    month: 'Mês',
    year: 'Ano',
    dayPlaceholder: 'DD',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'AAAA',
    errorEmpty: 'Informe sua data de nascimento.',
    errorInvalid: 'Essa data não parece correta. Verifique-a.',
    restrictedHeading: 'Acesso restrito',
    restrictedBody: (age) => `Você precisa ter ${age} anos ou mais para ver este site.`,
    testingNote: 'Sempre exibido durante os testes',
  },
  nl: {
    heading: (age) => `Ben je ${age} jaar of ouder?`,
    body: 'Je moet je leeftijd bevestigen om deze website te bekijken.',
    yes: (age) => `Ja, ik ben ${age} of ouder`,
    no: (age) => `Nee, ik ben jonger dan ${age}`,
    dobHeading: 'Bevestig je geboortedatum',
    segmentedHeading: 'Bevestig je leeftijd',
    segmentedBody: 'Vul je geboortedatum in om verder te gaan',
    dobLabel: 'Geboortedatum',
    confirm: 'Bevestigen',
    enter: 'Doorgaan',
    day: 'Dag',
    month: 'Maand',
    year: 'Jaar',
    dayPlaceholder: 'DD',
    monthPlaceholder: 'MM',
    yearPlaceholder: 'JJJJ',
    errorEmpty: 'Vul je geboortedatum in.',
    errorInvalid: 'Die datum lijkt niet te kloppen. Controleer hem.',
    restrictedHeading: 'Toegang beperkt',
    restrictedBody: (age) => `Je moet ${age} jaar of ouder zijn om deze website te bekijken.`,
    testingNote: 'Altijd zichtbaar tijdens het testen',
  },
};

// Languages with built-in wording, e.g. for the dashboard to mention.
export const BUILT_IN_LANGUAGES = Object.keys(STRINGS);

// Whether there's built-in wording for this language (otherwise English is used).
export const hasBuiltInWording = (language: string | null | undefined): boolean =>
  !!language && Object.prototype.hasOwnProperty.call(STRINGS, toLanguageCode(language));

export function uiStrings(language: string | null | undefined): UiStrings {
  const code = language ? toLanguageCode(language) : '';
  return STRINGS[code] ?? EN;
}
