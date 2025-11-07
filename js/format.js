// All processing is client-side & rule-based. Rules stored in localStorage('ctxRules').

export function loadRules() {
  try {
    const raw = localStorage.getItem('ctxRules');
    if (!raw) return defaultRules();
    const parsed = JSON.parse(raw);
    return { ...defaultRules(), ...parsed }; // fill any new defaults
  } catch {
    return defaultRules();
  }
}

export function saveRules(rules) {
  localStorage.setItem('ctxRules', JSON.stringify(rules));
}

function defaultRules() {
  return {
    // general
    trimWhitespace: true,
    normalizeSpaces: true,
    sentenceCase: true,
    removeFillers: true,         // uh, um, you know, like...
    smartPunctuation: true,      // normalize quotes, dashes, spaces before punctuation
    numbersAsDigits: false,      // e.g., "ten" -> "10" (simple map)
    bulletizeLists: true,        // break lines with list-like cues into bullets

    // medical-ish / neuro-friendly
    expandAbbrev: true,          // small dictionary expansion
    sectionizeSOAP: false,       // wrap into SOAP sections if cues found
    sectionizeStrokeNote: false, // create Stroke-focused sections if cues found
    redactPHI: false,            // remove simple “my name is…”, phone, MRN patterns
  };
}

/** Main entry: returns formatted HTML string (already safe textContent per node creation). */
export function reformatText(input) {
  const rules = loadRules();
  let text = input || '';

  if (rules.trimWhitespace) text = text.trim();
  if (rules.normalizeSpaces) text = text.replace(/\s+/g, ' ');

  if (rules.removeFillers) {
    text = removeFillers(text);
  }
  if (rules.expandAbbrev) {
    text = expandAbbrev(text);
  }
  if (rules.numbersAsDigits) {
    text = wordsToNumbers(text);
  }
  if (rules.smartPunctuation) {
    text = smartPunct(text);
  }
  if (rules.sentenceCase) {
    text = toSentenceCase(text);
  }

  // Paragraphization: keep existing paragraphs (double newlines) or sentence groups
  const paragraphs = toParagraphs(text);

  let blocks = paragraphs;

  // Sectionizers (deterministic)
  if (rules.sectionizeSOAP) {
    blocks = toSOAP(blocks);
  } else if (rules.sectionizeStrokeNote) {
    blocks = toStrokeNote(blocks);
  }

  if (rules.bulletizeLists) {
    blocks = bulletize(blocks);
  }

  if (rules.redactPHI) {
    blocks = blocks.map(redactPHI);
  }

  return blocks.join('\n\n'); // plain text with double newlines between blocks
}

// ---------- helpers ----------
function removeFillers(s) {
  // conservative, word-boundary only
  return s
    .replace(/\b(uh|um|erm|hmm)\b/gi, '')
    .replace(/\b(you know|i mean|like)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function expandAbbrev(s) {
  // Small, safe dictionary; add more as needed
  const map = [
    [/\bBP\b/g, 'blood pressure'],
    [/\bHR\b/g, 'heart rate'],
    [/\bRR\b/g, 'respiratory rate'],
    [/\bO2\b/g, 'oxygen'],
    [/\bASA\b/g, 'aspirin'],
    [/\bAFib\b/gi, 'atrial fibrillation'],
    [/\bTIA\b/g, 'transient ischemic attack'],
    [/\bLKW\b/g, 'last known well'],
    [/\bIVT\b/g, 'intravenous thrombolysis'],
    [/\bMT\b/g, 'mechanical thrombectomy'],
    [/\bNIHSS\b/g, 'NIH Stroke Scale'],
    [/\bCVA\b/g, 'stroke'],
  ];
  for (const [re, val] of map) s = s.replace(re, val);
  return s;
}

function wordsToNumbers(s) {
  // very small en-US map; avoids big NLP libs
  const map = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
  return s.replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/gi, m => String(map[m.toLowerCase()]));
}

function smartPunct(s) {
  // normalize spaces around punctuation; unify quotes/dashes lightly
  s = s.replace(/\s+([,.;:!?])/g, '$1');     // no space before punctuation
  s = s.replace(/([,.;:!?])(?!\s)/g, '$1 '); // space after if missing
  s = s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"); // curly -> straight
  s = s.replace(/ ?— ?/g, ' — ');            // normalize em dash spacing
  return s.replace(/\s{2,}/g, ' ').trim();
}

function toSentenceCase(s) {
  // Split into sentences and capitalize the first letter
  const parts = s.split(/(?<=[.!?])\s+/);
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function toParagraphs(s) {
  // If user already has \n\n, respect it; else group every ~3 sentences
  if (s.includes('\n\n')) return s.split(/\n{2,}/).map(x => x.trim()).filter(Boolean);
  const sentences = s.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out = [];
  for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i+3).join(' '));
  return out;
}

function bulletize(blocks) {
  return blocks.map(b => {
    // If the block contains enumeration cues, bullet them
    const lines = b.split(/;\s+|\s*\n\s*/).map(x => x.trim()).filter(Boolean);
    if (lines.length >= 3) {
      return lines.map(x => `• ${x}`).join('\n');
    }
    return b;
  });
}

function toSOAP(blocks) {
  // naive cues
  const text = blocks.join(' ');
  const sections = {
    Subjective: [],
    Objective: [],
    Assessment: [],
    Plan: []
  };
  // crude split by cues
  const subj = text.match(/\b(patient reports|history|complains|states|denies)\b/i);
  const obj = text.match(/\b(vitals|exam|neurologic exam|findings|imaging|labs)\b/i);
  const assess = text.match(/\b(assessment|impression|diagnosis)\b/i);
  const plan = text.match(/\b(plan|recommend|treat|start|continue|follow up)\b/i);

  // If we don't find cues, just return original
  if (!(subj || obj || assess || plan)) return blocks;

  const kv = [
    ['Subjective', /\b(patient reports|history|complains|states|denies)\b/ig],
    ['Objective',  /\b(vitals|exam|neurologic exam|findings|imaging|labs)\b/ig],
    ['Assessment', /\b(assessment|impression|diagnosis)\b/ig],
    ['Plan',       /\b(plan|recommend|treat|start|continue|follow up)\b/ig],
  ];

  let cur = 'Subjective';
  for (const para of toParagraphs(text)) {
    const tag = kv.find(([_, re]) => re.test(para));
    if (tag) cur = tag[0];
    sections[cur].push(para);
  }

  const out = [];
  for (const k of ['Subjective','Objective','Assessment','Plan']) {
    if (sections[k].length) {
      out.push(`${k}:\n${sections[k].join('\n')}`);
    }
  }
  return out;
}

function toStrokeNote(blocks) {
  const text = blocks.join(' ');
  const fields = [
    ['Presentation', /\b(lkw|last known well|onset|presentation|symptoms)\b/ig],
    ['Vitals & Exam', /\b(vitals|nihss|exam|neurologic exam|deficits)\b/ig],
    ['Imaging', /\b(ct|angiography|mri|flair|tici|aspects|occlusion)\b/ig],
    ['Treatment', /\b(ivt|tpa|tenecteplase|mt|thrombectomy|antiplatelet|anticoagulation)\b/ig],
    ['Plan', /\b(plan|recommend|admit|neuro icu|follow up)\b/ig],
  ];

  const out = {};
  let cur = 'Presentation';
  for (const para of toParagraphs(text)) {
    const tag = fields.find(([_, re]) => re.test(para));
    if (tag) cur = tag[0];
    if (!out[cur]) out[cur] = [];
    out[cur].push(para);
  }
  const assembled = [];
  for (const [k] of fields) {
    if (out[k]?.length) assembled.push(`${k}:\n${out[k].join('\n')}`);
  }
  return assembled.length ? assembled : blocks;
}

function redactPHI(b) {
  // very conservative examples
  b = b.replace(/\b(my name is|i am)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/gi, '[REDACTED NAME]');
  b = b.replace(/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED PHONE]');
  b = b.replace(/\b(MRN|medical record number)\s*[:#]?\s*\w+\b/gi, '[REDACTED MRN]');
  return b;
}
