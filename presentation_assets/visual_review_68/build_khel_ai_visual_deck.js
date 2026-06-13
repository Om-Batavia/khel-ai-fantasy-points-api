const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Om Batavia";
pptx.company = "Khel AI";
pptx.subject = "Visual mentor-review presentation for eleven cricket intelligence APIs";
pptx.title = "Khel AI Cricket Intelligence APIs - Visual Review Edition";
pptx.lang = "en-US";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "en-US",
};

const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(ROOT, "dashboard", "sprint1_showcase", "screenshots");
const MANIFEST = fs.readFileSync(path.join(__dirname, "api_manifest_lines.jsonl"), "utf8")
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line));
const manifestByNum = Object.fromEntries(MANIFEST.map((item) => [item.num, item]));

const specSource = fs.readFileSync(path.join(__dirname, "build_khel_ai_mentor_deck.js"), "utf8");
const specStart = specSource.indexOf("const apiSpecs = [");
const specEnd = specSource.indexOf("\n];", specStart);
if (specStart < 0 || specEnd < 0) throw new Error("Could not locate API specifications.");
const specLiteral = specSource.slice(specSource.indexOf("[", specStart), specEnd + 2);
const apiSpecs = Function(`"use strict"; return (${specLiteral});`)();

const C = {
  paper: "FBF7F0",
  paper2: "F4EDE2",
  ink: "15362B",
  ink2: "284C3F",
  orange: "E56B2F",
  orangeSoft: "F7D7C5",
  green: "2E8B63",
  greenSoft: "D8EDDF",
  teal: "1F8994",
  tealSoft: "D6ECEE",
  gold: "D5A72E",
  goldSoft: "F4E8BE",
  blue: "3974A5",
  blueSoft: "DDE9F3",
  rose: "B95757",
  roseSoft: "F2DADA",
  white: "FFFFFF",
  gray: "6F766F",
  line: "D7D0C5",
  dark: "102A22",
};

const sprintAccent = { 1: C.orange, 2: C.green, 3: C.teal };
const sprintSoft = { 1: C.orangeSoft, 2: C.greenSoft, 3: C.tealSoft };

pptx.defineSlideMaster({
  title: "LIGHT",
  background: { color: C.paper },
  objects: [
    { text: { text: "KHEL AI  •  CRICKET INTELLIGENCE", options: { x: 0.48, y: 7.1, w: 4.2, h: 0.16, fontFace: "Aptos", fontSize: 7.5, bold: true, color: "8D938D", charSpacing: 1.1, margin: 0 } } },
    { text: { text: "Student 5  •  Om Batavia", options: { x: 8.7, y: 7.1, w: 3.9, h: 0.16, fontFace: "Aptos", fontSize: 7.5, color: "8D938D", align: "right", margin: 0 } } },
  ],
  slideNumber: { x: 12.75, y: 7.08, color: "8D938D", fontSize: 8 },
});

function addText(slide, text, x, y, w, h, size = 14, color = C.ink, options = {}) {
  slide.addText(text, {
    x, y, w, h,
    fontFace: options.fontFace || "Aptos",
    fontSize: size,
    color,
    bold: !!options.bold,
    italic: !!options.italic,
    align: options.align || "left",
    valign: options.valign || "top",
    margin: options.margin ?? 0.03,
    fit: "shrink",
    breakLine: false,
    charSpacing: options.charSpacing || 0,
    transparency: options.transparency || 0,
  });
}

function rect(slide, x, y, w, h, fill, radius = 0.12, line = fill, transparency = 0) {
  const type = radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect;
  slide.addShape(type, {
    x, y, w, h,
    rectRadius: radius,
    fill: { color: fill, transparency },
    line: { color: line, transparency: line === fill ? 100 : 0, width: 1 },
  });
}

function line(slide, x, y, w, h, color = C.line, width = 1) {
  slide.addShape(pptx.ShapeType.line, { x, y, w, h, line: { color, width, beginArrowType: "none", endArrowType: "none" } });
}

function circle(slide, x, y, d, fill, transparency = 0) {
  slide.addShape(pptx.ShapeType.ellipse, {
    x, y, w: d, h: d,
    fill: { color: fill, transparency },
    line: { color: fill, transparency: 100 },
  });
}

function pill(slide, text, x, y, w, fill, color = C.white) {
  rect(slide, x, y, w, 0.34, fill, 0.17);
  addText(slide, text.toUpperCase(), x, y + 0.095, w, 0.13, 8.5, color, { bold: true, align: "center", charSpacing: 0.8 });
}

function pageHeader(slide, title, kicker, accent = C.orange, subtitle = "") {
  addText(slide, kicker.toUpperCase(), 0.62, 0.36, 5.5, 0.22, 9, accent, { bold: true, charSpacing: 1.4 });
  addText(slide, title, 0.62, 0.68, 11.7, 0.55, 26, C.ink, { bold: true, fontFace: "Aptos Display" });
  if (subtitle) addText(slide, subtitle, 0.64, 1.25, 11.4, 0.3, 11, C.gray);
  line(slide, 0.62, subtitle ? 1.66 : 1.42, 12.05, 0, C.line, 1);
}

function smallLabel(slide, text, x, y, color = C.gray) {
  addText(slide, text.toUpperCase(), x, y, 2.8, 0.18, 8.5, color, { bold: true, charSpacing: 0.9 });
}

function addBullets(slide, items, x, y, w, h, size = 14, color = C.ink, bulletColor = C.orange) {
  const rowH = h / Math.max(items.length, 1);
  items.forEach((item, i) => {
    circle(slide, x, y + i * rowH + Math.min(0.14, rowH * 0.28), 0.09, bulletColor);
    addText(slide, item, x + 0.2, y + i * rowH, w - 0.2, rowH - 0.02, size, color, { valign: "mid" });
  });
}

function addCode(slide, text, x, y, w, h, accent = C.green, size = 10) {
  rect(slide, x, y, w, h, C.dark, 0.12);
  rect(slide, x, y, 0.08, h, accent, 0);
  addText(slide, text, x + 0.22, y + 0.16, w - 0.38, h - 0.3, size, "D6F0E4", { fontFace: "Consolas" });
}

function addScreenshot(slide, file, x, y, w, h, accent = C.orange) {
  rect(slide, x - 0.08, y - 0.08, w + 0.16, h + 0.16, C.white, 0.14, C.line);
  slide.addImage({ path: file, x, y, w, h });
  rect(slide, x - 0.08, y - 0.08, 0.11, h + 0.16, accent, 0);
}

function compact(value, depth = 0) {
  if (depth > 2) return Array.isArray(value) ? ["…"] : { more: "…" };
  if (Array.isArray(value)) return value.length ? [compact(value[0], depth + 1), "…"] : [];
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).slice(0, depth === 0 ? 6 : 4).forEach(([key, val]) => {
      out[key] = compact(val, depth + 1);
    });
    return out;
  }
  return value;
}

function jsonText(value, max = 760) {
  let text = JSON.stringify(compact(value), null, 2);
  if (text.length > max) text = `${text.slice(0, max - 24)}\n  "more": "…"\n}`;
  return text;
}

function fieldDescription(name) {
  const labels = {
    match_id: "Unique match identifier",
    innings_id: "Unique innings identifier",
    player: "Player identity and role",
    balls: "Ordered delivery-event list",
    recent_performances: "Chronological recent records",
    player_match_rows: "Historical player-match rows",
    prior_performances: "Overall historical samples",
    opponent_performances: "Samples against opponent",
    batting_event_probabilities: "Batting probabilities, each 0-1",
    bowling_event_probabilities: "Bowling probabilities, each 0-1",
    fielding_event_probabilities: "Fielding probabilities, each 0-1",
    event_point_values: "Fantasy scoring values",
    target_match_date: "Anti-leakage cutoff date",
    stable_slope_threshold: "Trend-label threshold",
    prior_weight: "Weight assigned to prior",
    max_evidence_weight: "Opponent evidence cap",
    smoothing_k: "Bayesian smoothing constant",
    form_trend_score: "Upstream API 7 form score",
    opponent_posterior: "Upstream API 9 matchup estimate",
  };
  return labels[name] || name.replaceAll("_", " ");
}

function fieldRows(fields, limit = 7) {
  return fields.slice(0, limit).map((field) => [
    field.name,
    String(field.type).replaceAll("NoneType", "None").slice(0, 26),
    field.required ? "Required" : "Optional",
    fieldDescription(field.name),
  ]);
}

function addTable(slide, rows, x, y, w, h, accent) {
  slide.addTable([["Field", "Type", "Rule", "Meaning"], ...rows], {
    x, y, w, h,
    border: { type: "solid", color: C.line, pt: 0.8 },
    fill: C.white,
    color: C.ink,
    fontFace: "Aptos",
    fontSize: 9.2,
    margin: 0.07,
    rowH: 0.39,
    colW: [w * 0.22, w * 0.25, w * 0.17, w * 0.36],
    autoFit: false,
    bold: false,
  });
  rect(slide, x, y, w, 0.39, accent, 0);
  const widths = [w * 0.22, w * 0.25, w * 0.17, w * 0.36];
  ["Field", "Type", "Rule", "Meaning"].forEach((label, i) => {
    const left = x + widths.slice(0, i).reduce((sum, value) => sum + value, 0);
    addText(slide, label, left + 0.07, y + 0.12, widths[i] - 0.14, 0.14, 8.3, C.white, { bold: true });
  });
}

function evidenceMetrics(num, response) {
  const maps = {
    "01": [["Score", response.score], ["Overs", response.overs], ["Run rate", response.run_rate], ["Top batter", response.top_batter?.name]],
    "02": [["Score", `${response.total_runs}/${response.wickets}`], ["Overs", response.overs], ["Run rate", response.run_rate], ["Top batter", response.top_batter?.name]],
    "03": [["Score", response.score], ["Runs needed", response.runs_needed], ["Balls left", response.balls_remaining], ["RRR", response.required_run_rate]],
    "04": [["Target", response.target], ["Score", response.current_score], ["Runs needed", response.runs_needed], ["RRR", response.required_run_rate]],
    "05": [["Outlook", response.prediction], ["RRR", response.required_run_rate], ["CRR", response.current_run_rate], ["Wickets", response.wickets_in_hand]],
    "06": [["Label", response.trend_label], ["Slope", response.regression_slope], ["Average", response.recent_average], ["Confidence", response.trend_confidence]],
    "07": [["Score", response.form_trend_score], ["Label", response.trend_label], ["Confidence", response.trend_confidence], ["Average", response.derived_variables_used?.recent_average]],
    "08": [["Prior", response.prior_performance_estimate], ["Evidence", response.opponent_specific_evidence], ["Strength", response.evidence_strength], ["Posterior", response.posterior_estimate]],
    "09": [["Adjusted", response.posterior_expectation], ["Label", response.label], ["Confidence", response.confidence_label], ["Mode", response.supporting_values?.model_mode]],
    "10": [["Total EV", response.expected_value_components?.total_expected_fantasy_points], ["Batting", response.expected_value_components?.batting_expected_points], ["Bowling", response.expected_value_components?.bowling_expected_points], ["Fielding", response.expected_value_components?.fielding_expected_points]],
    "11": [["Prediction", response.final_prediction], ["Statistical", response.expected_fantasy_points], ["Selection", response.selection_value_label], ["Model", response.best_model_name]],
  };
  return maps[num];
}

function metricStrip(slide, entries, x, y, w, accent, cardH = 0.9) {
  const gap = 0.12;
  const cardW = (w - gap * (entries.length - 1)) / entries.length;
  entries.forEach(([label, value], i) => {
    const left = x + i * (cardW + gap);
    rect(slide, left, y, cardW, cardH, C.white, 0.12, C.line);
    addText(slide, String(value ?? "—"), left + 0.13, y + cardH * 0.15, cardW - 0.26, cardH * 0.34, cardH < 0.8 ? 15 : 18, C.ink, { bold: true });
    addText(slide, label.toUpperCase(), left + 0.13, y + cardH * 0.64, cardW - 0.26, cardH * 0.17, cardH < 0.8 ? 7.2 : 7.8, accent, { bold: true, charSpacing: 0.6 });
  });
}

function apiOverview(spec) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[spec.sprint];
  const soft = sprintSoft[spec.sprint];
  const rightLed = Number(spec.num) % 2 === 0;
  pill(slide, `Sprint ${spec.sprint}`, 0.62, 0.4, 1.15, accent);
  addText(slide, `API ${Number(spec.num).toString().padStart(2, "0")}`, 0.62, 1.08, 2.6, 0.7, 38, accent, { bold: true, fontFace: "Aptos Display" });
  addText(slide, spec.name, 0.62, 1.82, 6.3, 1.05, 31, C.ink, { bold: true, fontFace: "Aptos Display" });
  pill(slide, `${spec.method}  ${spec.route}`, 0.64, 3.05, 4.9, C.ink);

  const heroX = rightLed ? 7.2 : 7.55;
  circle(slide, heroX + 2.25, 0.45, 4.25, soft, 8);
  addText(slide, Number(spec.num), heroX + 2.4, 1.1, 3.2, 2.2, 100, accent, { bold: true, align: "center", valign: "mid", transparency: 8 });
  addText(slide, spec.sprint === 1 ? "LIVE MATCH" : spec.sprint === 2 ? "PLAYER CONTEXT" : "FANTASY DECISION", heroX + 2.25, 4.0, 3.6, 0.25, 10, C.ink, { bold: true, align: "center", charSpacing: 1.6 });

  rect(slide, 0.62, 4.0, 6.0, 2.38, C.white, 0.16, C.line);
  smallLabel(slide, "Purpose", 0.9, 4.35, accent);
  addText(slide, spec.purpose, 0.9, 4.72, 5.4, 0.72, 18, C.ink, { bold: true, valign: "mid" });
  addText(slide, spec.problem, 0.9, 5.62, 5.4, 0.48, 11.5, C.gray, { valign: "mid" });

  rect(slide, 7.15, 4.85, 5.55, 1.53, soft, 0.16);
  smallLabel(slide, "Where Khel AI uses it", 7.45, 5.15, accent);
  addText(slide, spec.integration.join("  •  "), 7.45, 5.55, 4.95, 0.45, 13, C.ink, { bold: true, valign: "mid" });
}

function apiHow(spec) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[spec.sprint];
  const soft = sprintSoft[spec.sprint];
  pageHeader(slide, `${spec.name}: how it works`, "Processing logic", accent, "A visible path from validated cricket input to explainable output.");

  const startY = 1.95;
  spec.flow.forEach((step, i) => {
    const x = 0.72 + i * 2.49;
    if (i < spec.flow.length - 1) line(slide, x + 1.65, startY + 0.48, 0.82, 0, accent, 2.2);
    circle(slide, x, startY, 0.92, i % 2 ? soft : accent);
    addText(slide, String(i + 1), x, startY + 0.26, 0.92, 0.28, 17, i % 2 ? accent : C.white, { bold: true, align: "center" });
    addText(slide, step, x - 0.22, startY + 1.08, 1.36, 0.65, 11, C.ink, { bold: true, align: "center", valign: "top" });
  });

  rect(slide, 0.62, 4.15, 7.75, 2.16, C.dark, 0.18);
  smallLabel(slide, "Main formulas and rules", 0.92, 4.48, C.gold);
  const formulaH = Math.min(0.46, 1.42 / Math.max(spec.formulas.length, 1));
  spec.formulas.slice(0, 4).forEach((formula, i) => {
    addText(slide, formula, 0.95, 4.88 + i * formulaH, 7.0, formulaH - 0.02, 11.2, "E7F4ED", { fontFace: "Consolas", valign: "mid" });
  });

  rect(slide, 8.65, 4.15, 4.05, 2.16, soft, 0.18);
  smallLabel(slide, "Engineering approach", 8.95, 4.48, accent);
  addBullets(slide, [
    "Pydantic validates the contract",
    "Service logic handles cricket rules",
    "Response includes interpretation",
  ], 8.95, 4.86, 3.38, 1.18, 11.5, C.ink, accent);
}

function apiSchema(spec) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[spec.sprint];
  const soft = sprintSoft[spec.sprint];
  const manifest = manifestByNum[spec.num];
  pageHeader(slide, `${spec.name}: API contract`, "Input and output schema", accent, "The frontend and model service agree on one explicit, validated contract.");

  pill(slide, "Request", 0.65, 1.85, 1.1, accent);
  addTable(slide, fieldRows(manifest.request_fields, 7), 0.65, 2.28, 5.88, 3.38, accent);
  pill(slide, "Response", 6.8, 1.85, 1.18, C.ink);
  addTable(slide, fieldRows(manifest.response_fields, 7), 6.8, 2.28, 5.88, 3.38, C.ink2);

  rect(slide, 0.65, 5.92, 12.03, 0.62, soft, 0.12);
  addText(slide, "Nested records are summarized for presentation. The complete machine-readable contract remains available through FastAPI OpenAPI.", 0.9, 6.12, 11.52, 0.2, 10.5, C.ink, { align: "center", valign: "mid" });
}

function apiExample(spec) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[spec.sprint];
  const soft = sprintSoft[spec.sprint];
  const manifest = manifestByNum[spec.num];
  pageHeader(slide, `${spec.name}: request to response`, "Validation and example", accent, "The example is generated from the same local service logic used by the dashboard.");

  rect(slide, 0.62, 1.9, 3.15, 4.65, soft, 0.16);
  smallLabel(slide, "Guardrails", 0.9, 2.23, accent);
  addBullets(slide, spec.validation, 0.9, 2.65, 2.58, 2.85, 12.2, C.ink, accent);
  rect(slide, 0.9, 5.72, 2.58, 0.5, C.white, 0.1);
  addText(slide, "Clear 4xx/5xx errors, never silent failure", 1.04, 5.88, 2.3, 0.16, 9.2, C.ink, { bold: true, align: "center" });

  smallLabel(slide, "Sample request", 4.08, 1.95, accent);
  addCode(slide, jsonText(manifest.request_sample, 650), 4.08, 2.3, 3.95, 4.25, accent, 8.8);
  smallLabel(slide, "Sample response", 8.32, 1.95, C.ink);
  addCode(slide, jsonText(manifest.response_sample, 720), 8.32, 2.3, 4.38, 4.25, C.gold, 8.5);
}

function apiEvidence(spec) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[spec.sprint];
  const soft = sprintSoft[spec.sprint];
  const manifest = manifestByNum[spec.num];
  pageHeader(slide, `${spec.name}: visual evidence`, "Dashboard integration", accent, "Presentation-ready output produced from the real API service response.");

  const reverse = Number(spec.num) % 2 === 0;
  const imageX = reverse ? 4.36 : 0.68;
  const sideX = reverse ? 0.68 : 9.05;
  addScreenshot(slide, path.join(SHOTS, spec.shot), imageX, 1.92, 8.0, 4.1, accent);

  rect(slide, sideX, 1.92, 3.6, 2.02, soft, 0.16);
  smallLabel(slide, "Product placement", sideX + 0.28, 2.22, accent);
  addBullets(slide, spec.integration, sideX + 0.28, 2.62, 3.03, 1.03, 11.5, C.ink, accent);

  rect(slide, sideX, 4.16, 3.6, 1.86, C.white, 0.16, C.line);
  smallLabel(slide, "Honest limitations", sideX + 0.28, 4.48, C.rose);
  addBullets(slide, spec.limitations, sideX + 0.28, 4.88, 3.03, 0.82, 10.6, C.ink, C.rose);

  metricStrip(slide, evidenceMetrics(spec.num, manifest.response_sample), 0.68, 6.22, 12.0, accent, 0.72);
}

function modelCardSlide() {
  const slide = pptx.addSlide("LIGHT");
  pageHeader(slide, "API 11 model card", "Model safety and deployment", C.teal, "The saved model is useful as a demonstrator, but its measured limits remain visible.");

  rect(slide, 0.65, 1.9, 4.0, 2.12, C.tealSoft, 0.16);
  smallLabel(slide, "Model identity", 0.93, 2.2, C.teal);
  addText(slide, "StandardScaler\n+\nLinear Regression", 0.93, 2.63, 2.2, 1.05, 23, C.ink, { bold: true, fontFace: "Aptos Display", valign: "mid" });
  pill(slide, "Version 2.0.0", 3.16, 2.67, 1.17, C.teal);
  pill(slide, "demo_only", 3.16, 3.15, 1.17, C.ink);

  rect(slide, 4.9, 1.9, 3.72, 2.12, C.white, 0.16, C.line);
  smallLabel(slide, "Data and split", 5.18, 2.2, C.orange);
  addBullets(slide, [
    "264 canonical rows",
    "220 modelling rows",
    "Chronological 70/15/15",
    "154 / 33 / 33 records",
  ], 5.18, 2.58, 3.08, 1.15, 11.2, C.ink, C.orange);

  rect(slide, 8.88, 1.9, 3.8, 2.12, C.greenSoft, 0.16);
  smallLabel(slide, "Request safety", 9.16, 2.2, C.green);
  addBullets(slide, [
    "model.pkl loads once",
    "Exact feature order",
    "No request-time retraining",
    "Batch size 1-100",
  ], 9.16, 2.58, 3.12, 1.15, 11.2, C.ink, C.green);

  metricStrip(slide, [["Test MAE", "26.577"], ["Test RMSE", "33.530"], ["Test R²", "-0.037"], ["Baseline MAE", "29.065"]], 0.65, 4.3, 12.03, C.teal);

  rect(slide, 0.65, 5.47, 8.4, 1.03, C.dark, 0.14);
  smallLabel(slide, "Public deployment", 0.93, 5.72, C.gold);
  addText(slide, "student5-expected-fantasy-final-api.onrender.com", 0.93, 6.03, 7.68, 0.22, 13, C.white, { bold: true });
  rect(slide, 9.28, 5.47, 3.4, 1.03, C.roseSoft, 0.14);
  smallLabel(slide, "Interpretation", 9.55, 5.72, C.rose);
  addText(slide, "Negative test R² means the model is not production-ready.", 9.55, 6.0, 2.86, 0.3, 10.8, C.ink, { bold: true, valign: "mid" });
}

function titleSlide() {
  const slide = pptx.addSlide("LIGHT");
  circle(slide, 8.1, -1.25, 6.6, C.orangeSoft, 0);
  circle(slide, 9.1, 0.15, 4.9, C.greenSoft, 12);
  rect(slide, 0.62, 0.55, 1.2, 0.38, C.ink, 0.19);
  addText(slide, "KHEL AI", 0.62, 0.665, 1.2, 0.14, 8.5, C.white, { bold: true, align: "center", charSpacing: 1.1 });
  addText(slide, "Cricket Intelligence\nAPI Platform", 0.62, 1.42, 6.15, 1.75, 42, C.ink, { bold: true, fontFace: "Aptos Display" });
  addText(slide, "11 APIs. 3 sprints. One explainable decision pipeline.", 0.66, 3.48, 5.75, 0.5, 20, C.orange, { bold: true });
  addText(slide, "Mentor review edition  •  Student 5  •  Om Batavia", 0.66, 4.35, 5.9, 0.3, 12.5, C.gray);
  addScreenshot(slide, path.join(SHOTS, "11_expected_fantasy_final.png"), 7.16, 1.32, 5.45, 3.07, C.teal);
  metricStrip(slide, [["APIs", "11"], ["Sprints", "3"], ["Dashboards", "11"], ["Public model API", "1"]], 0.66, 5.38, 11.95, C.orange);
}

function contentsSlide() {
  const slide = pptx.addSlide("LIGHT");
  pageHeader(slide, "Presentation map", "Contents", C.orange, "A technical walkthrough that moves from live match state to fantasy selection.");
  const rows = [
    ["01", "Live Match Intelligence", "5 APIs", "Slides 6-32", C.orange, C.orangeSoft],
    ["02", "Player Performance Analytics", "4 APIs", "Slides 33-54", C.green, C.greenSoft],
    ["03", "Fantasy Decision Engine", "2 APIs", "Slides 55-67", C.teal, C.tealSoft],
    ["04", "One Explainable Pipeline", "Conclusion", "Slide 68", C.ink, C.paper2],
  ];
  rows.forEach((row, i) => {
    const y = 1.92 + i * 1.15;
    rect(slide, 0.65, y, 12.0, 0.92, row[5], 0.14);
    addText(slide, row[0], 0.9, y + 0.23, 0.55, 0.3, 18, row[4], { bold: true });
    addText(slide, row[1], 1.72, y + 0.2, 5.9, 0.34, 19, C.ink, { bold: true });
    addText(slide, row[2], 8.1, y + 0.28, 1.7, 0.22, 11, C.gray, { bold: true, align: "center" });
    pill(slide, row[3], 10.35, y + 0.27, 1.9, row[4]);
  });
}

function contextSlide() {
  const slide = pptx.addSlide("LIGHT");
  pageHeader(slide, "Cricket data is rich, but not immediately useful", "Problem context", C.orange, "Khel AI needs a layer that converts raw events into consistent, product-ready intelligence.");
  const items = [
    ["01", "Fragmented", "Match, innings, player and delivery data live at different grains.", C.orange, C.orangeSoft],
    ["02", "Too granular", "Ball events need aggregation before a user can understand the match.", C.green, C.greenSoft],
    ["03", "Inconsistent", "Different clients can calculate overs, rates and labels differently.", C.teal, C.tealSoft],
    ["04", "Hard to trust", "Predictions need provenance, metrics, validation and fallback behavior.", C.blue, C.blueSoft],
  ];
  items.forEach((item, i) => {
    const x = 0.68 + (i % 2) * 6.1;
    const y = 1.92 + Math.floor(i / 2) * 2.25;
    rect(slide, x, y, 5.82, 1.86, item[5], 0.18);
    addText(slide, item[0], x + 0.28, y + 0.26, 0.7, 0.45, 25, item[4], { bold: true });
    addText(slide, item[1], x + 1.13, y + 0.28, 4.25, 0.35, 19, C.ink, { bold: true });
    addText(slide, item[2], x + 1.13, y + 0.8, 4.25, 0.65, 12.5, C.gray, { valign: "mid" });
  });
}

function architectureSlide() {
  const slide = pptx.addSlide("LIGHT");
  pageHeader(slide, "One platform, three intelligence layers", "System architecture", C.green, "Specialised APIs remain independently testable, reusable and explainable.");

  const layers = [
    ["SPRINT 1", "What is happening?", "Delivery events → match state", C.orange, C.orangeSoft],
    ["SPRINT 2", "How is the player trending?", "History → context and confidence", C.green, C.greenSoft],
    ["SPRINT 3", "What should Khel AI recommend?", "Expected value → selection", C.teal, C.tealSoft],
  ];
  layers.forEach((layer, i) => {
    const x = 0.72 + i * 4.18;
    rect(slide, x, 2.0, 3.72, 3.62, layer[4], 0.22);
    pill(slide, layer[0], x + 0.28, 2.3, 1.15, layer[3]);
    addText(slide, layer[1], x + 0.28, 3.0, 3.08, 0.85, 22, C.ink, { bold: true, fontFace: "Aptos Display", valign: "mid" });
    line(slide, x + 0.28, 4.05, 2.95, 0, layer[3], 2);
    addText(slide, layer[2], x + 0.28, 4.38, 3.08, 0.55, 13, C.gray, { bold: true, align: "center", valign: "mid" });
  });
  addText(slide, "VALIDATE  →  CALCULATE  →  EXPLAIN  →  INTEGRATE", 1.6, 6.12, 10.2, 0.3, 15, C.ink, { bold: true, align: "center", charSpacing: 1.4 });
}

function evidenceSlide() {
  const slide = pptx.addSlide("LIGHT");
  pageHeader(slide, "What is real in this presentation?", "Evidence and provenance", C.teal, "Every visible number is tied to the implementation, while dataset limits remain explicit.");

  const columns = [
    ["DATA", "HimanshuKhale/datasets_cricket\n4 teams • 12 synthetic T20 matches\n24 innings • 2,846 ball events", C.orange, C.orangeSoft],
    ["IMPLEMENTATION", "Real schemas.py and services.py\nActual response objects\nNo random presentation values", C.green, C.greenSoft],
    ["EVIDENCE", "11 dashboard screenshots\nAPI 11 deployed on Render\nGitHub source and PPTX assets", C.teal, C.tealSoft],
  ];
  columns.forEach((col, i) => {
    const x = 0.68 + i * 4.12;
    rect(slide, x, 2.0, 3.68, 3.76, col[3], 0.2);
    circle(slide, x + 0.28, 2.28, 0.66, col[2]);
    addText(slide, String(i + 1), x + 0.28, 2.48, 0.66, 0.2, 13, C.white, { bold: true, align: "center" });
    addText(slide, col[0], x + 1.08, 2.42, 2.2, 0.28, 12, col[2], { bold: true, charSpacing: 1.2 });
    addText(slide, col[1], x + 0.3, 3.25, 3.08, 1.75, 15, C.ink, { bold: true, align: "center", valign: "mid" });
  });
  rect(slide, 0.68, 6.0, 12.0, 0.52, C.roseSoft, 0.12);
  addText(slide, "Important: this is a synthetic/faux demonstration dataset, not real-world production cricket data.", 0.95, 6.17, 11.45, 0.18, 10.5, C.rose, { bold: true, align: "center" });
}

function sectionSlide(sprint, title, subtitle) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[sprint];
  const soft = sprintSoft[sprint];
  rect(slide, 0, 0, 13.333, 7.5, C.dark, 0);
  circle(slide, 7.55, -1.3, 7.1, accent, 62);
  circle(slide, 9.3, 1.5, 3.8, soft, 28);
  pill(slide, `Sprint ${sprint}`, 0.72, 0.75, 1.28, accent);
  addText(slide, title, 0.72, 1.62, 7.65, 1.35, 42, C.white, { bold: true, fontFace: "Aptos Display" });
  addText(slide, subtitle, 0.75, 3.32, 7.35, 0.72, 18, "C9D8D1");
  line(slide, 0.75, 4.45, 4.8, 0, accent, 4);
  const apiCount = apiSpecs.filter((api) => api.sprint === sprint).length;
  addText(slide, String(apiCount).padStart(2, "0"), 9.2, 2.22, 2.5, 1.3, 70, C.white, { bold: true, align: "center", transparency: 8 });
  addText(slide, "APIs", 9.2, 3.62, 2.5, 0.32, 15, C.white, { bold: true, align: "center", charSpacing: 2 });
}

function sprintSummary(sprint, title, apis, bullets) {
  const slide = pptx.addSlide("LIGHT");
  const accent = sprintAccent[sprint];
  const soft = sprintSoft[sprint];
  pageHeader(slide, `Sprint ${sprint}: the complete story`, "Integration summary", accent, title);

  rect(slide, 0.65, 1.92, 5.1, 4.55, C.dark, 0.18);
  smallLabel(slide, "API modules", 0.97, 2.25, C.gold);
  apis.forEach((api, i) => {
    const y = 2.8 + i * 0.62;
    circle(slide, 0.97, y, 0.37, accent);
    addText(slide, String(Number(api.num)), 0.97, y + 0.1, 0.37, 0.13, 8.5, C.white, { bold: true, align: "center" });
    addText(slide, api.name, 1.52, y + 0.04, 3.82, 0.27, 11.5, C.white, { bold: true, valign: "mid" });
  });

  rect(slide, 6.05, 1.92, 6.63, 4.55, soft, 0.18);
  smallLabel(slide, "What this sprint adds to Khel AI", 6.38, 2.25, accent);
  addBullets(slide, bullets, 6.38, 2.8, 5.88, 2.82, 15, C.ink, accent);
  pill(slide, `${apis.length} independently reusable endpoints`, 7.7, 5.72, 3.45, accent);
}

function conclusionSlide() {
  const slide = pptx.addSlide("LIGHT");
  pageHeader(slide, "One explainable cricket pipeline", "Conclusion", C.orange, "The eleven APIs answer three progressively more valuable questions.");
  const cards = [
    ["01", "What is happening?", "Score, innings, chase resources, required rate and outlook.", C.orange, C.orangeSoft],
    ["02", "How is the player trending?", "Form direction, opponent evidence, posterior expectation and confidence.", C.green, C.greenSoft],
    ["03", "What decision should Khel AI make?", "Expected fantasy value, saved-model prediction, risk and selection label.", C.teal, C.tealSoft],
  ];
  cards.forEach((card, i) => {
    const x = 0.68 + i * 4.12;
    rect(slide, x, 1.95, 3.7, 3.92, card[4], 0.2);
    addText(slide, card[0], x + 0.3, 2.25, 0.72, 0.5, 28, card[3], { bold: true });
    addText(slide, card[1], x + 0.3, 3.05, 3.08, 0.85, 22, C.ink, { bold: true, fontFace: "Aptos Display", valign: "mid" });
    addText(slide, card[2], x + 0.3, 4.25, 3.08, 0.96, 13, C.gray, { valign: "mid" });
  });
  rect(slide, 0.68, 6.14, 12.0, 0.52, C.dark, 0.12);
  addText(slide, "REAL LOGIC  •  VALIDATED SCHEMAS  •  HONEST METRICS  •  DASHBOARD-READY OUTPUT", 0.95, 6.31, 11.45, 0.17, 10.5, C.white, { bold: true, align: "center", charSpacing: 1.0 });
}

titleSlide();
contentsSlide();
contextSlide();
architectureSlide();
evidenceSlide();

sectionSlide(1, "Live Match Intelligence", "Five APIs transform delivery events into score, chase, pressure and outlook intelligence.");
apiSpecs.filter((api) => api.sprint === 1).forEach((api) => {
  apiOverview(api);
  apiHow(api);
  apiSchema(api);
  apiExample(api);
  apiEvidence(api);
});
sprintSummary(1, "From raw deliveries to live match understanding", apiSpecs.filter((api) => api.sprint === 1), [
  "One legal-ball calculation standard across endpoints",
  "Frontend-ready score, innings, chase and outlook responses",
  "Transparent formulas and rule-based explanations",
  "Reusable context for dashboards and AI agents",
]);

sectionSlide(2, "Player Performance Analytics", "Four APIs explain form direction and opponent-specific matchup effects.");
apiSpecs.filter((api) => api.sprint === 2).forEach((api) => {
  apiOverview(api);
  apiHow(api);
  apiSchema(api);
  apiExample(api);
  apiEvidence(api);
});
sprintSummary(2, "From player history to explainable context", apiSpecs.filter((api) => api.sprint === 2), [
  "Aarav Sharma provides one continuous six-match story",
  "Regression exposes direction, fit and volatility",
  "Bayesian updates balance prior belief with opponent evidence",
  "Confidence warnings prevent overclaiming small samples",
]);

sectionSlide(3, "Fantasy Decision Engine", "Two APIs connect event probabilities, player context and a saved prediction model.");
apiSpecs.filter((api) => api.num === "10").forEach((api) => {
  apiOverview(api);
  apiHow(api);
  apiSchema(api);
  apiExample(api);
  apiEvidence(api);
});
apiSpecs.filter((api) => api.num === "11").forEach((api) => {
  apiOverview(api);
  apiHow(api);
  apiSchema(api);
  apiExample(api);
  apiEvidence(api);
  modelCardSlide();
});
sprintSummary(3, "From uncertain events to a selection recommendation", apiSpecs.filter((api) => api.sprint === 3), [
  "Expected value keeps batting, bowling and fielding auditable",
  "Saved-model prediction never retrains during requests",
  "Feature-contract and anti-leakage checks protect validity",
  "Risk, model source and fallback reason remain visible",
]);
conclusionSlide();

if (pptx._slides.length !== 68) {
  throw new Error(`Expected 68 slides, found ${pptx._slides.length}`);
}

const output = path.join(__dirname, "Khel_AI_Visual_Review_68_Slides.pptx");
pptx.writeFile({ fileName: output });
console.log(output);
