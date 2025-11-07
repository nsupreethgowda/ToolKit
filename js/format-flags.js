export function loadRules() {
  try {
    const raw = localStorage.getItem('ctxRules');
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}
function defaults() {
  return {
    trimWhitespace: true,
    normalizeSpaces: true,
    sentenceCase: true,
    removeFillers: true,
    smartPunctuation: true,
    numbersAsDigits: false,
    bulletizeLists: true,
    expandAbbrev: true,           // kept for legacy; actual expansions now come from packs
    sectionizeSOAP: false,
    sectionizeStrokeNote: false,
    redactPHI: false
  };
}
