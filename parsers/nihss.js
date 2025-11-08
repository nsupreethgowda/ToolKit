// /rules/parsers/nihss.js
// ES module: exports parser + tags for NIHSS

export const NIHSS_PARSER_TAGS = [
  "neurology", "exam", "stroke", "NIHSS", "voice-transcript"
];

/**
 * NIHSS Voice Transcript → Structured Scores + Sleek Text (browser-safe)
 * @param {string} rawTranscript
 * @returns {{ text: string, json: { tags: string[], category: string, NIHSS: object } }}
 */
export function parseNIHSSTranscript(rawTranscript) {
  const transcript = normalize(rawTranscript || "");

  // ---- Global flags ----
  const flags = {
    coma: /(?:coma|comatose|unresponsive(?:\s+to\s+pain)?|no\s*response\s*to\s*noxious|reflex\s*posturing)/i.test(transcript),
    intubated: /(?:intubated|endotracheal\s*tube|ETT|tracheostomy)/i.test(transcript),
    languageBarrier: /language\s*barrier|non[-\s]?english|interpreter\s*unavailable/i.test(transcript),
    amputation: /amputat(?:ed|ion)/i.test(transcript),
    jointFused: /joint\s*fus(?:ed|ion)/i.test(transcript),
    blindNonStroke: /blind(?:ness)?\s*(?:from|due\s*to)\s*(?:cataract|trauma|retinal|optic\s*neuropathy|glaucoma)/i.test(transcript),
    oldStrokeBaseline: /old\s*stroke|chronic\s*weakness|baseline\s*deficit/i.test(transcript),
  };

  const UNreasons = [];
  const items = {};

  // ---- Item scoring (plug your real scorers here) ----
  items["1a"] = score1a(transcript);
  items["1b"] = score1b(transcript, flags);
  items["1c"] = score1c(transcript);
  items["2"]  = scoreBestGaze(transcript);
  items["3"]  = scoreVisualFields(transcript, flags);
  items["4"]  = scoreFacial(transcript);
  items["5a"] = scoreMotorArm(transcript, "left", UNreasons);
  items["5b"] = scoreMotorArm(transcript, "right", UNreasons);
  items["6a"] = scoreMotorLeg(transcript, "left", UNreasons);
  items["6b"] = scoreMotorLeg(transcript, "right", UNreasons);
  items["7"]  = scoreAtaxia(transcript, UNreasons);
  items["8"]  = scoreSensory(transcript, flags);
  items["9"]  = scoreLanguage(transcript, flags);
  items["10"] = scoreDysarthria(transcript, flags, UNreasons);
  items["11"] = scoreNeglect(transcript);

  // ---- Cascades ----
  if (items["1a"].score === 3) {
    if (numeric(items["8"].score) && items["8"].score < 2)
      items["8"] = { score: 2, note: "Severe or total loss (coma cascade)" };
    if (numeric(items["9"].score) && items["9"].score < 3)
      items["9"] = { score: 3, note: "Mute/global (coma cascade)" };
  }
  if (flags.intubated) {
    items["10"] = { score: "UN", note: "Intubated" };
    UNreasons.push("10-Dysarthria (Intubated)");
  }
  if (flags.oldStrokeBaseline) {
    Object.keys(items).forEach(k => {
      items[k].note = annotateBaselineIfImplied(transcript, items[k].note);
    });
  }

  // ---- Total ----
  let total = 0;
  for (const k of Object.keys(items)) if (numeric(items[k].score)) total += items[k].score;

  // ---- Sleek output ----
  const lines = [
    "NIHSS Score =",
    line("1a", "Level of Consciousness", items["1a"]),
    line("1b", "What is Month/Age", items["1b"]),
    line("1c", "Open/Close Eyes&Hand", items["1c"]),
    line("2",  "Best Gaze", items["2"]),
    line("3",  "Visual Fields", items["3"]),
    line("4",  "Facial Palsy", items["4"]),
    line("5a", "Motor-Left Arm", items["5a"]),
    line("5b", "Motor-Right Arm", items["5b"]),
    line("6a", "Motor-Left Leg", items["6a"]),
    line("6b", "Motor-Right Leg", items["6b"]),
    line("7",  "Limb Ataxia", items["7"]),
    line("8",  "Sensory", items["8"]),
    line("9",  "Best Language", items["9"]),
    line("10", "Dysarthria", items["10"]),
    line("11", "Extinction/Inattention", items["11"]),
    `Total NIHSS = ${total}`,
  ];
  if (UNreasons.length) lines.push(`UN Items: ${UNreasons.join(", ")}`);

  return {
    text: lines.join("\n"),
    json: {
      tags: NIHSS_PARSER_TAGS,
      category: "neurology-exam",
      NIHSS: { ...items, Total: total, UN: UNreasons }
    }
  };
}

/* ---------------- Helpers & placeholder scorers ---------------- */

// Use your real scoring logic here; below are safe placeholders so the module runs.

function normalize(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function numeric(x){ return typeof x === 'number' && isFinite(x); }
function line(code, label, obj){
  const v = obj?.score ?? 'UN';
  const note = obj?.note ? ` — ${obj.note}` : '';
  return `${code}-${label}: ${v}${note}`;
}
function annotateBaselineIfImplied(t, note){
  return note ? `${note}; baseline deficit noted` : 'Baseline deficit noted';
}

// --- Minimal stub scorers (replace with your full implementations) ---
function score1a(t){ return { score: /alert|awake/i.test(t) ? 0 : /drowsy|obtunded/i.test(t) ? 1 : /stupor/i.test(t) ? 2 : /coma/i.test(t) ? 3 : 0 }; }
function score1b(t, flags){ return { score: /month|age.*correct/i.test(t) ? 0 : /one.*incorrect|unable/i.test(t) ? 1 : 2 }; }
function score1c(t){ return { score: /opens.*closes/i.test(t) ? 0 : /partial/i.test(t) ? 1 : /no\s*(?:movement|command)/i.test(t) ? 2 : 0 }; }
function scoreBestGaze(t){ return { score: /gaze\s*paresis/i.test(t) ? 1 : /forced\s*deviation/i.test(t) ? 2 : 0 }; }
function scoreVisualFields(t, flags){ return { score: /partial\s*hemianopia/i.test(t) ? 1 : /complete\s*hemianopia|bilateral\s*blindness/i.test(t) ? 2 : /cortical\s*blindness/i.test(t) ? 3 : 0, note: flags?.blindNonStroke ? 'Non-stroke blindness' : undefined }; }
function scoreFacial(t){ return { score: /minor\s*paresis/i.test(t) ? 1 : /partial/i.test(t) ? 2 : /complete\s*paralysis/i.test(t) ? 3 : 0 }; }
function scoreMotorArm(t, side, UN){ return commonMotor(t, side, UN); }
function scoreMotorLeg(t, side, UN){ return commonMotor(t, side, UN); }
function commonMotor(t, side, UN){
  if (new RegExp(`${side}.*amputat|${side}.*joint\\s*fus`, 'i').test(t)) { UN.push(`Motor-${cap(side)} (amputation/fusion)`); return { score: 'UN', note: 'Amputation/fusion' }; }
  return { score: /drift/i.test(t) ? 1 : /some\s*effort.*against\s*gravity/i.test(t) ? 2 : /no\s*effort.*against\s*gravity/i.test(t) ? 3 : /no\s*movement/i.test(t) ? 4 : 0 };
}
function scoreAtaxia(t, UN){ return { score: /ataxia/i.test(t) ? (/bilateral/i.test(t) ? 2 : 1) : 0 }; }
function scoreSensory(t, flags){ return { score: /mild\s*loss/i.test(t) ? 1 : /severe|total\s*loss/i.test(t) ? 2 : 0 }; }
function scoreLanguage(t, flags){ return { score: /mild\s*aphasia/i.test(t) ? 1 : /severe\s*aphasia/i.test(t) ? 2 : /mute|global/i.test(t) ? 3 : 0 }; }
function scoreDysarthria(t, flags, UN){ if (flags?.intubated) { UN.push('10-Dysarthria (Intubated)'); return { score:'UN', note:'Intubated' }; } return { score: /mild\s*dysarthria/i.test(t) ? 1 : /severe\s*dysarthria/i.test(t) ? 2 : 0 }; }
function scoreNeglect(t){ return { score: /inattention|neglect/i.test(t) ? (/profound|severe/i.test(t) ? 2 : 1) : 0 }; }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
