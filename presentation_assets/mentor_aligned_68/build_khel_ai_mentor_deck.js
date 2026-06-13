const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Om Batavia";
pptx.company = "Khel AI";
pptx.subject = "Mentor-aligned technical documentation for eleven cricket intelligence APIs";
pptx.title = "Khel AI Cricket Intelligence APIs - Mentor Review";
pptx.lang = "en-US";
pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos", lang: "en-US" };

const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(ROOT, "dashboard", "sprint1_showcase", "screenshots");
const MANIFEST = fs.readFileSync(path.join(__dirname, "api_manifest_lines.jsonl"), "utf8")
  .trim().split(/\r?\n/).map((line) => JSON.parse(line));
const manifestByNum = Object.fromEntries(MANIFEST.map((item) => [item.num, item]));

const C = {
  bg: "06251A",
  bg2: "082E20",
  panel: "103D2B",
  panelDark: "031A12",
  green: "49E38B",
  gold: "E3B82F",
  white: "F5F7F6",
  muted: "A7C1B4",
  line: "286A4B",
  red: "FF7A83",
  blue: "3BC8E8",
};

pptx.defineSlideMaster({
  title: "TECH",
  background: { color: C.bg },
  objects: [
    { rect: { x: 0, y: 0, w: 13.333, h: 0.09, fill: { color: C.green }, line: { color: C.green } } },
    { text: { text: "KHEL AI  /  STUDENT 5  /  OM BATAVIA", options: { x: 0.5, y: 7.12, w: 5.5, h: 0.16, fontSize: 7.5, bold: true, color: "6E9B83", charSpacing: 1.2, margin: 0 } } },
    { text: { text: "Synthetic/faux dataset - demonstration workflow", options: { x: 8.15, y: 7.12, w: 4.55, h: 0.16, fontSize: 7.5, color: "6E9B83", align: "right", margin: 0 } } },
  ],
  slideNumber: { x: 12.82, y: 7.1, color: "6E9B83", fontSize: 8 },
});

const apiSpecs = [
  {
    num: "01", sprint: 1, name: "Live Match Scoreboard API", method: "GET",
    route: "/student5/live-scoreboard/{match_id}", shot: "01_live_scoreboard.png",
    purpose: "Aggregate a live match snapshot into one frontend-ready scoreboard response.",
    problem: "Raw match, innings, player, and delivery rows are fragmented; a frontend should not rebuild cricket state independently.",
    flow: ["Receive match_id", "Load saved match and innings", "Aggregate legal balls, runs, wickets", "Rank top performers", "Return recent-ball context"],
    formulas: ["total_runs = sum(runs_off_bat + extras)", "overs = legal_balls // 6 + remainder notation", "run_rate = total_runs / legal_balls x 6"],
    validation: ["match_id is required", "Unknown match returns HTTP 404", "Missing database returns HTTP 500", "Wickets are capped at 10"],
    integration: ["Live match dashboard", "Broadcast overlay", "AI commentary context"],
    limitations: ["Snapshot uses stored data rather than a streaming feed", "Top-performer ranking is descriptive, not predictive"],
  },
  {
    num: "02", sprint: 1, name: "Innings Summary API", method: "GET",
    route: "/student5/innings-summary/{innings_id}", shot: "02_innings_summary.png",
    purpose: "Transform one completed innings into scorecard, efficiency, and top-performer summaries.",
    problem: "Ball events are too granular for post-innings analysis and must be reconciled into batter and bowler records.",
    flow: ["Receive innings_id", "Load saved deliveries", "Aggregate team total", "Build batter and bowler tables", "Select top performers"],
    formulas: ["strike_rate = runs / balls_faced x 100", "economy = runs_conceded / legal_balls x 6", "innings_run_rate = total_runs / legal_balls x 6"],
    validation: ["innings_id must be positive", "Unknown innings returns HTTP 404", "Safe division handles zero balls", "Only legal balls count toward overs"],
    integration: ["Scorecard tab", "Post-innings report", "Player performance cards"],
    limitations: ["Depends on complete saved ball-event history", "Fielding analysis is outside this endpoint"],
  },
  {
    num: "03", sprint: 1, name: "Current Match State API", method: "POST",
    route: "/student5/match-state", shot: "03_current_match_state.png",
    purpose: "Explain the current chase using target, score, time, wickets, and scoring pressure.",
    problem: "A score alone does not explain whether the chase is ahead, behind, or under resource pressure.",
    flow: ["Validate match and innings context", "Aggregate current score", "Count legal balls and wickets", "Calculate chase resources", "Create cricket-language status"],
    formulas: ["runs_needed = max(target - score, 0)", "balls_remaining = total_balls - legal_balls", "wickets_remaining = 10 - wickets", "CRR and RRR use six-ball rates"],
    validation: ["Non-negative runs and extras", "Positive target and overs limit", "Ball number >= 1", "Empty ball list returns a valid initial state"],
    integration: ["Chase progress card", "Live commentary", "Match-state agent tool"],
    limitations: ["No weather or DLS adjustment", "Assumes standard ten-wicket innings"],
  },
  {
    num: "04", sprint: 1, name: "Required Run Rate API", method: "POST",
    route: "/student5/required-run-rate", shot: "04_required_run_rate.png",
    purpose: "Return the exact scoring pace required to complete a chase.",
    problem: "Clients often calculate RRR inconsistently, especially when wides and no-balls are present.",
    flow: ["Read target and delivery history", "Aggregate score", "Count legal balls only", "Calculate remaining requirement", "Return substituted equation"],
    formulas: ["RRR = runs_needed / balls_remaining x 6", "runs_needed = max(target - current_score, 0)"],
    validation: ["Target must be positive when present", "Overs limit must be positive", "Illegal deliveries do not consume a ball", "No target returns an explicit non-chase response"],
    integration: ["Live pressure panel", "Commentary sentence", "Mobile scorecard"],
    limitations: ["No DLS/par-score support", "Does not itself classify win chance"],
  },
  {
    num: "05", sprint: 1, name: "Win Probability Label API", method: "POST",
    route: "/student5/match-outlook", shot: "05_win_probability.png",
    purpose: "Classify the chase as High, Medium, or Low Chance using transparent cricket rules.",
    problem: "Users need an interpretable match outlook, but an uncalibrated numeric probability would be misleading.",
    flow: ["Calculate match state", "Compare RRR with CRR", "Inspect wickets and balls", "Apply declared thresholds", "Return label and reason"],
    formulas: ["High: RRR <= CRR + 1.5 and wickets >= 4", "Low: RRR > CRR + 4 or critical wickets/resources", "Otherwise: Medium"],
    validation: ["Uses validated match-state payload", "Target reached returns High Chance", "No target returns context-safe output", "Reason and heuristic accompany every label"],
    integration: ["Live outlook badge", "Explainable AI commentary", "Match dashboard alert"],
    limitations: ["Heuristic, not trained probability", "Thresholds need calibration on real match data"],
  },
  {
    num: "06", sprint: 2, name: "Form Trend Derived Variables API", method: "POST",
    route: "/student5/form-trend", shot: "06_form_trend_variables.png",
    purpose: "Measure player form direction, volatility, linear fit, and confidence from recent performances.",
    problem: "A recent average cannot reveal whether performance is improving, declining, or unstable.",
    flow: ["Sort performances chronologically", "Derive or accept performance score", "Fit OLS regression", "Measure volatility and R-squared", "Classify normalized slope"],
    formulas: ["performance = runs + 0.10 x strike_rate - dismissal_penalty", "slope = covariance(x,y) / variance(x)", "normalized_trend = slope / average", "confidence = R2 x noise adjustment"],
    validation: ["At least three performances", "Unique positive sequence numbers", "Non-negative runs and scores", "Positive stable-slope threshold"],
    integration: ["Player form chart", "Trend filter", "Upstream fantasy feature"],
    limitations: ["Linear trend misses nonlinear form", "Six-match sample is small"],
  },
  {
    num: "07", sprint: 2, name: "Form Trend Final Output API", method: "POST",
    route: "/student5/form-trend-final", shot: "07_form_trend_final.png",
    purpose: "Convert form statistics into a 0-100 score, label, confidence, and explanation.",
    problem: "Frontends should not independently interpret raw regression values or duplicate threshold logic.",
    flow: ["Accept recent or player-match rows", "Exclude target leakage", "Calculate derived variables", "Map normalized slope to score", "Return label and explanation"],
    formulas: ["form_score = clamp(50 + normalized_trend x 100, 0, 100)", "Rising > +threshold; Declining < -threshold; else Stable"],
    validation: ["Recent performances or player rows required", "Minimum three records", "Player rows must match requested player", "Target row must not enter history"],
    integration: ["Player dashboard badge", "Selection ranking", "AI-agent explanation"],
    limitations: ["Score mapping is rule-based", "Confidence can remain low despite a strong direction"],
  },
  {
    num: "08", sprint: 2, name: "Opponent Bayesian Derived Variables API", method: "POST",
    route: "/student5/opponent-bayesian-derived", shot: "08_bayesian_variables.png",
    purpose: "Update a player's overall performance expectation using opponent-specific evidence.",
    problem: "Overall form can hide favorable or difficult matchup history, while one opponent result is too noisy to trust alone.",
    flow: ["Calculate overall prior", "Calculate opponent mean", "Measure opponent volatility", "Compute evidence strength", "Produce weighted posterior"],
    formulas: ["consistency = 1 - volatility / (average + volatility)", "evidence_strength = capped_n x consistency", "posterior = weighted prior + opponent evidence"],
    validation: ["At least three prior samples", "At least one opponent sample", "Positive prior and evidence weights", "Non-negative performance values"],
    integration: ["Opponent matchup card", "Pre-match report", "Fantasy context feature"],
    limitations: ["Two opponent samples are fragile", "Posterior depends on chosen weights"],
  },
  {
    num: "09", sprint: 2, name: "Opponent Bayesian Final Output API", method: "POST",
    route: "/student5/opponent-bayesian-final", shot: "09_bayesian_final.png",
    purpose: "Return an opponent-adjusted performance score, matchup label, and confidence.",
    problem: "A posterior number needs a decision label, change explanation, and evidence warning before product use.",
    flow: ["Filter player history before target date", "Separate opponent rows", "Calculate smoothed posterior", "Measure prior change", "Classify matchup and confidence"],
    formulas: ["weight = opponent_n / (opponent_n + smoothing_k)", "posterior = (1-weight) x prior + weight x evidence", "change_percent = (posterior-prior) / prior x 100"],
    validation: ["History or explicit samples required", "Target-date anti-leakage filter", "Positive smoothing and weights", "No matching history returns HTTP 422"],
    integration: ["Pre-match player panel", "Opponent-adjusted fantasy input", "AI matchup explanation"],
    limitations: ["Sparse opponent history produces low confidence", "Neutral label can mask a meaningful but uncertain shift"],
  },
  {
    num: "10", sprint: 3, name: "Expected Fantasy Points Derived Variables API", method: "POST",
    route: "/student5/expected-fantasy-derived", shot: "10_expected_fantasy_variables.png",
    purpose: "Calculate expected fantasy value from event probabilities and scoring rules.",
    problem: "Fantasy outcomes combine uncertain batting, bowling, and fielding events; raw averages hide those components.",
    flow: ["Receive event probabilities", "Load point values", "Multiply each probability by value", "Sum component totals", "Classify expected value"],
    formulas: ["event_EV = probability x point_value", "total_EV = batting_EV + bowling_EV + fielding_EV"],
    validation: ["All probabilities constrained to 0-1", "Required event groups enforced", "Point values have documented defaults", "Non-negative player event inputs"],
    integration: ["Fantasy contribution chart", "Player comparison", "Explainable recommendation input"],
    limitations: ["Per-opportunity EV is not a complete match projection", "Probabilities need larger role-specific samples"],
  },
  {
    num: "11", sprint: 3, name: "Expected Fantasy Points Final Output API", method: "POST",
    route: "/student5/expected-fantasy-final", shot: "11_expected_fantasy_final.png",
    purpose: "Produce the final fantasy projection, model provenance, risk, and selection label.",
    problem: "Khel AI needs an actionable prediction while retaining feature-contract safety, fallback behavior, and honest model limits.",
    flow: ["Build pre-match historical features", "Load cached .pkl bundle", "Enforce feature_columns.json", "Validate prediction range/distribution", "Return ML or statistical fallback"],
    formulas: ["final_prediction = valid ML output else statistical fallback", "selection: Must Pick / Strong Pick / Risk Pick / Avoid"],
    validation: ["Exact saved feature order", "At least one prior match", "No target-date leakage", "Reject NaN, infinite, or 0-200 outliers", "Batch size 1-100"],
    integration: ["Fantasy selection panel", "Batch player ranking", "AI model-vs-statistical explanation"],
    limitations: ["Demo-only synthetic model", "Negative test R2 indicates weak generalization", "Free-tier Render can cold-start"],
  },
];

function shot(name) { return path.join(SHOTS, name); }
function addText(slide, text, x, y, w, h, size = 14, color = C.white, options = {}) {
  slide.addText(text, { x, y, w, h, fontFace: options.fontFace || "Aptos", fontSize: size, color, margin: options.margin ?? 0.04, bold: !!options.bold, align: options.align || "left", valign: options.valign || "top", fit: "shrink", breakLine: false, charSpacing: options.charSpacing || 0 });
}
function addPanel(slide, x, y, w, h, title, accent = C.green) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.panel }, line: { color: accent, width: 1 } });
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.055, fill: { color: accent }, line: { color: accent } });
  if (title) addText(slide, title, x + 0.2, y + 0.17, w - 0.4, 0.24, 10, accent, { bold: true, charSpacing: 0.6 });
}
function addHeader(slide, title, subtitle, tag) {
  addText(slide, title, 0.55, 0.25, 9.7, 0.45, 24, C.white, { bold: true });
  if (subtitle) addText(slide, subtitle, 0.57, 0.78, 9.7, 0.25, 10, C.gold, {});
  slide.addShape(pptx.ShapeType.rect, { x: 10.45, y: 0.18, w: 2.45, h: 0.52, fill: { color: C.gold }, line: { color: C.gold } });
  addText(slide, tag, 10.45, 0.33, 2.45, 0.18, 9, C.panelDark, { bold: true, align: "center" });
  slide.addShape(pptx.ShapeType.line, { x: 0, y: 1.08, w: 13.333, h: 0, line: { color: C.line, width: 1 } });
}
function addBullets(slide, items, x, y, w, h, size = 15, color = C.white) {
  const runs = [];
  items.forEach((item) => runs.push({ text: item, options: { bullet: { indent: 15 }, hanging: 4, breakLine: true, paraSpaceAfterPt: 10 } }));
  slide.addText(runs, { x, y, w, h, fontFace: "Aptos", fontSize: size, color, margin: 0.05, fit: "shrink", valign: "mid" });
}
function addCode(slide, text, x, y, w, h, size = 10.5) {
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: C.panelDark }, line: { color: C.line, width: 1 } });
  addText(slide, text, x + 0.15, y + 0.14, w - 0.3, h - 0.28, size, "A5F3C6", { fontFace: "Consolas" });
}
function compact(value, depth = 0) {
  if (depth > 2) return Array.isArray(value) ? "[...]" : "{...}";
  if (Array.isArray(value)) return value.length ? [compact(value[0], depth + 1), "..."] : [];
  if (value && typeof value === "object") {
    const out = {};
    Object.entries(value).slice(0, depth === 0 ? 7 : 5).forEach(([k, v]) => { out[k] = compact(v, depth + 1); });
    return out;
  }
  return value;
}
function jsonText(value, max = 900) {
  let text = JSON.stringify(compact(value), null, 2);
  if (text.length > max) text = text.slice(0, max - 20) + "\n  ...\n}";
  return text;
}
function fieldDesc(name) {
  const labels = {
    match_id: "Unique match identifier", innings_id: "Unique innings identifier", player: "Player identity and role",
    balls: "Ordered delivery-event list", recent_performances: "Chronological recent performance records",
    player_match_rows: "Historical player-match rows", prior_performances: "Overall historical samples",
    opponent_performances: "Samples against selected opponent", batting_event_probabilities: "Batting event probabilities, each 0-1",
    bowling_event_probabilities: "Bowling event probabilities, each 0-1", fielding_event_probabilities: "Fielding event probabilities, each 0-1",
    event_point_values: "Fantasy scoring values", target_match_date: "Anti-leakage cutoff date",
    stable_slope_threshold: "Rising/Stable/Declining threshold", prior_weight: "Weight assigned to overall prior",
    max_evidence_weight: "Cap on opponent evidence", smoothing_k: "Bayesian smoothing constant",
    form_trend_score: "Upstream form score from API 7", opponent_posterior: "Upstream matchup estimate from API 9",
  };
  return labels[name] || name.replaceAll("_", " ");
}
function fieldRows(fields, limit = 8) {
  return fields.slice(0, limit).map((f) => [f.name, String(f.type).replaceAll("NoneType", "None").slice(0, 34), f.required ? "Yes" : "No", fieldDesc(f.name)]);
}
function addTable(slide, rows, x, y, w, h) {
  const tableRows = [["Field", "Type", "Required", "Description"], ...rows];
  slide.addTable(tableRows, {
    x, y, w, h, border: { type: "solid", color: C.line, pt: 1 },
    fill: C.panel, color: C.white, fontFace: "Aptos", fontSize: 9,
    margin: 0.06, rowH: 0.33,
    colW: [w * 0.23, w * 0.23, w * 0.13, w * 0.41],
    bold: false,
    autoFit: false,
  });
  slide.addShape(pptx.ShapeType.rect, { x, y, w, h: 0.34, fill: { color: C.panelDark }, line: { color: C.green, width: 1 } });
  ["Field", "Type", "Required", "Description"].forEach((t, i) => {
    const widths = [w * 0.23, w * 0.23, w * 0.13, w * 0.41];
    const left = x + widths.slice(0, i).reduce((a, b) => a + b, 0);
    addText(slide, t, left + 0.06, y + 0.1, widths[i] - 0.12, 0.14, 8, C.green, { bold: true });
  });
}
function addScreenshot(slide, file, x, y, w, h) {
  slide.addShape(pptx.ShapeType.rect, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, fill: { color: C.panelDark }, line: { color: C.green, width: 1.4 } });
  slide.addImage({ path: file, x, y, w, h });
}
function addMetricCards(slide, entries, y = 5.62) {
  const gap = 0.14, totalW = 12.2, w = (totalW - gap * (entries.length - 1)) / entries.length;
  entries.forEach(([label, value], i) => {
    const x = 0.55 + i * (w + gap);
    addPanel(slide, x, y, w, 0.9, label.toUpperCase(), C.gold);
    addText(slide, String(value), x + 0.18, y + 0.39, w - 0.36, 0.32, 18, C.white, { bold: true });
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
    "09": [["Adjusted score", response.posterior_expectation], ["Label", response.label], ["Confidence", response.confidence_label], ["Mode", response.supporting_values?.model_mode]],
    "10": [["Total EV", response.expected_value_components?.total_expected_fantasy_points], ["Batting", response.expected_value_components?.batting_expected_points], ["Bowling", response.expected_value_components?.bowling_expected_points], ["Fielding", response.expected_value_components?.fielding_expected_points]],
    "11": [["Final prediction", response.final_prediction], ["Statistical", response.expected_fantasy_points], ["Selection", response.selection_value_label], ["Model", response.best_model_name]],
  };
  return maps[num];
}
function apiOverview(spec) {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, `API ${Number(spec.num)} - ${spec.name}`, `${spec.method} ${spec.route}`, "WHAT / WHY");
  [["API Name", spec.name], ["Endpoint", `${spec.method}  ${spec.route}`], ["Sprint", `Sprint ${spec.sprint}`], ["Status", spec.num === "11" ? "Public Render deployment" : "Local service + verified dashboard"]].forEach((item, i) => {
    const x = 0.55 + i * 3.08;
    addPanel(slide, x, 1.3, 2.9, 0.82, item[0], i % 2 ? C.gold : C.green);
    addText(slide, item[1], x + 0.17, 1.7, 2.55, 0.25, 11, i % 2 ? C.gold : C.green, { bold: true });
  });
  addPanel(slide, 0.55, 2.35, 6.0, 2.0, "OBJECTIVE", C.green);
  addText(slide, spec.purpose, 0.8, 2.85, 5.5, 0.9, 19, C.white, { bold: true, valign: "mid" });
  addPanel(slide, 6.75, 2.35, 6.0, 2.0, "CRICKET PROBLEM", C.gold);
  addText(slide, spec.problem, 7.0, 2.85, 5.5, 0.9, 16, C.white, { valign: "mid" });
  addPanel(slide, 0.55, 4.6, 12.2, 1.75, "WHY THIS MATTERS TO KHEL AI", C.green);
  addBullets(slide, spec.integration, 0.8, 4.97, 11.7, 1.05, 16);
}
function apiHow(spec) {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, `${spec.name} - Processing Logic`, "From validated input to structured cricket intelligence", "HOW");
  const stepW = 2.27;
  spec.flow.forEach((step, i) => {
    const x = 0.55 + i * 2.48;
    slide.addShape(pptx.ShapeType.chevron, { x, y: 1.45, w: stepW, h: 0.75, fill: { color: i % 2 ? "17623F" : "125134" }, line: { color: i % 2 ? C.gold : C.green, width: 1 } });
    addText(slide, `${i + 1}. ${step}`, x + 0.12, 1.7, stepW - 0.35, 0.2, 10, C.white, { bold: true, align: "center" });
  });
  addPanel(slide, 0.55, 2.55, 7.6, 3.55, "CORE FORMULAS / RULES", C.gold);
  spec.formulas.forEach((formula, i) => addCode(slide, formula, 0.82, 3.05 + i * 0.74, 7.06, 0.55, 11.5));
  addPanel(slide, 8.38, 2.55, 4.37, 3.55, "ENGINEERING APPROACH", C.green);
  addBullets(slide, ["Separate schema validation from service logic", "Use cricket-specific legal-ball handling", "Return explanation alongside numeric output", "Keep response directly consumable by dashboards"], 8.65, 3.0, 3.85, 2.6, 14);
}
function apiSchema(spec) {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, `${spec.name} - API Schema`, "Editable request and response contracts from Pydantic models", "SCHEMA");
  const m = manifestByNum[spec.num];
  addPanel(slide, 0.55, 1.3, 6.0, 5.55, "REQUEST SCHEMA", C.green);
  addTable(slide, fieldRows(m.request_fields, 8), 0.75, 1.78, 5.6, 4.52);
  addPanel(slide, 6.75, 1.3, 6.0, 5.55, "RESPONSE SCHEMA", C.gold);
  addTable(slide, fieldRows(m.response_fields, 8), 6.95, 1.78, 5.6, 4.52);
  addText(slide, "Nested objects and arrays are summarized here; the complete schema remains available in FastAPI/OpenAPI.", 0.75, 6.48, 11.8, 0.22, 9, C.muted);
}
function apiExample(spec) {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, `${spec.name} - Validation and Example`, "Representative payloads generated from the real local service workflow", "VALIDATION");
  const m = manifestByNum[spec.num];
  addPanel(slide, 0.55, 1.28, 4.0, 5.58, "VALIDATION / ERROR HANDLING", C.gold);
  addBullets(slide, spec.validation, 0.78, 1.76, 3.55, 3.1, 13.5);
  addPanel(slide, 4.78, 1.28, 3.8, 5.58, "SAMPLE REQUEST", C.green);
  addCode(slide, jsonText(m.request_sample, 760), 4.98, 1.74, 3.4, 4.65, 8.7);
  addPanel(slide, 8.8, 1.28, 3.95, 5.58, "SAMPLE RESPONSE", C.gold);
  addCode(slide, jsonText(m.response_sample, 820), 9.0, 1.74, 3.55, 4.65, 8.5);
}
function apiEvidence(spec) {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, `${spec.name} - Evidence and Integration`, "Verified dashboard output generated by the corresponding service logic", "EVIDENCE");
  addScreenshot(slide, shot(spec.shot), 0.55, 1.35, 7.15, 4.02);
  addPanel(slide, 7.95, 1.35, 4.8, 1.8, "KHEL AI INTEGRATION", C.green);
  addBullets(slide, spec.integration, 8.2, 1.75, 4.3, 1.1, 13.5);
  addPanel(slide, 7.95, 3.38, 4.8, 1.99, "KNOWN LIMITATIONS", C.gold);
  addBullets(slide, spec.limitations, 8.2, 3.78, 4.3, 1.15, 13);
  addMetricCards(slide, evidenceMetrics(spec.num, manifestByNum[spec.num].response_sample));
}
function modelCardSlide() {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, "API 11 - Model Card and Deployment", "Saved artifact, feature contract, metrics, baseline, and public endpoints", "MODEL CARD");
  addPanel(slide, 0.55, 1.3, 4.0, 2.15, "MODEL IDENTITY", C.green);
  addBullets(slide, ["Model: StandardScaler + LinearRegression", "Version: 2.0.0", "Target: fantasy_points", "Mode: demo_only", "Source: HimanshuKhale/datasets_cricket"], 0.78, 1.72, 3.55, 1.5, 12.5);
  addPanel(slide, 4.78, 1.3, 4.0, 2.15, "DATA AND SPLIT", C.gold);
  addBullets(slide, ["264 canonical rows", "220 training workflow rows", "Chronological 70/15/15 split", "Train 154 | Validation 33 | Test 33", "All features calculated before target match"], 5.0, 1.72, 3.55, 1.5, 12.5);
  addPanel(slide, 9.0, 1.3, 3.75, 2.15, "REQUEST SAFETY", C.green);
  addBullets(slide, ["model.pkl loaded once", "Exact feature_columns.json order", "No request-time training", "Batch endpoint: 1-100 rows", "422/503 errors are explicit"], 9.22, 1.72, 3.3, 1.5, 12);
  addMetricCards(slide, [["Test MAE", "26.577"], ["Test RMSE", "33.530"], ["Test R2", "-0.037"], ["Baseline MAE", "29.065"]], 3.75);
  addPanel(slide, 0.55, 4.95, 12.2, 1.35, "PUBLIC DEPLOYMENT", C.gold);
  addText(slide, "Hosted API: https://student5-expected-fantasy-final-api.onrender.com", 0.82, 5.35, 6.8, 0.23, 12, C.white, { bold: true });
  addText(slide, "Swagger: /docs   |   Model metadata: /model-info   |   Prediction: /predict   |   Batch: /predict-batch", 0.82, 5.75, 10.8, 0.22, 10.5, C.muted);
  addText(slide, "Limitation: small synthetic dataset; metrics demonstrate the API and modelling workflow, not production accuracy.", 0.82, 6.35, 11.5, 0.25, 10.5, C.red, { bold: true });
}
function sectionSlide(sprint, title, subtitle, accent) {
  const slide = pptx.addSlide("TECH");
  slide.addShape(pptx.ShapeType.ellipse, { x: 7.5, y: -1.2, w: 7.2, h: 7.2, fill: { color: accent, transparency: 85 }, line: { transparency: 100 } });
  addText(slide, `SPRINT ${sprint}`, 0.7, 0.75, 3.0, 0.4, 14, accent, { bold: true, charSpacing: 2.5 });
  addText(slide, title, 0.7, 1.55, 10.8, 1.0, 40, C.white, { bold: true });
  addText(slide, subtitle, 0.72, 2.85, 8.7, 0.65, 18, C.muted);
  slide.addShape(pptx.ShapeType.line, { x: 0.72, y: 4.0, w: 5.2, h: 0, line: { color: accent, width: 3 } });
}
function sprintSummary(sprint, title, apis, bullets) {
  const slide = pptx.addSlide("TECH");
  addHeader(slide, `Sprint ${sprint} - Integration and Lessons`, title, "SUMMARY");
  addPanel(slide, 0.55, 1.35, 5.9, 4.95, "API MODULES", C.green);
  apis.forEach((a, i) => {
    addText(slide, `${a.num}`, 0.82, 1.82 + i * 0.72, 0.45, 0.25, 13, C.gold, { bold: true });
    addText(slide, a.name, 1.35, 1.82 + i * 0.72, 4.7, 0.25, 13, C.white, { bold: true });
  });
  addPanel(slide, 6.7, 1.35, 6.05, 4.95, "WHAT THE SPRINT ADDS TO KHEL AI", C.gold);
  addBullets(slide, bullets, 6.98, 1.88, 5.5, 3.9, 16);
}
function introSlides() {
  let slide = pptx.addSlide("TECH");
  slide.addShape(pptx.ShapeType.ellipse, { x: 7.4, y: -1.5, w: 7.4, h: 7.4, fill: { color: C.green, transparency: 86 }, line: { transparency: 100 } });
  addText(slide, "KHEL AI", 0.7, 0.75, 3.2, 0.32, 13, C.green, { bold: true, charSpacing: 3 });
  addText(slide, "Cricket Intelligence API Platform", 0.7, 1.35, 8.2, 1.15, 42, C.white, { bold: true });
  addText(slide, "11 APIs | 3 Sprints | Explainable cricket analytics", 0.72, 2.85, 7.6, 0.42, 22, C.gold, { bold: true });
  addText(slide, "Mentor Review Edition\nStudent 5 - Om Batavia", 0.72, 3.75, 4.2, 0.8, 18, C.muted);
  addScreenshot(slide, shot("11_expected_fantasy_final.png"), 7.35, 1.45, 5.35, 3.0);

  slide = pptx.addSlide("TECH");
  addHeader(slide, "Contents", "A 68-slide technical walkthrough aligned with the mentor samples", "INDEX");
  [["Sprint 1", "Live Match Intelligence", "Slides 6-32", C.green], ["Sprint 2", "Player Performance Analytics", "Slides 33-54", C.gold], ["Sprint 3", "Fantasy Decision Engine", "Slides 55-67", C.blue], ["Conclusion", "One Explainable Pipeline", "Slide 68", C.green]].forEach((item, i) => {
    const y = 1.45 + i * 1.28;
    addPanel(slide, 0.72, y, 11.85, 0.95, item[0], item[3]);
    addText(slide, item[1], 2.55, y + 0.31, 6.0, 0.25, 19, C.white, { bold: true });
    addText(slide, item[2], 9.75, y + 0.31, 2.2, 0.25, 13, item[3], { bold: true, align: "right" });
  });

  slide = pptx.addSlide("TECH");
  addHeader(slide, "Problem Context in Cricket Analytics", "Why a specialised API layer is needed", "WHY");
  const problems = [
    ["Fragmented Data", "Ball events, scorecards, match context, and player history live at different grains."],
    ["Raw is Not Readable", "Frontends and agents need structured cricket meaning, not unprocessed rows."],
    ["No Shared Logic", "Independent clients can calculate legal balls, rates, and labels inconsistently."],
    ["Predictions Need Trust", "Model output requires provenance, metrics, validation, and fallback behavior."],
  ];
  problems.forEach((p, i) => {
    const x = 0.55 + (i % 2) * 6.2, y = 1.45 + Math.floor(i / 2) * 2.55;
    addPanel(slide, x, y, 5.95, 2.1, p[0], i % 2 ? C.gold : C.green);
    addText(slide, p[1], x + 0.28, y + 0.7, 5.35, 0.9, 18, C.white, { valign: "mid" });
  });

  slide = pptx.addSlide("TECH");
  addHeader(slide, "System Design Philosophy", "Why eleven specialised APIs instead of one monolithic endpoint", "DESIGN");
  addPanel(slide, 0.55, 1.35, 3.85, 4.8, "SPRINT 1 - MATCH STATE", C.green);
  addBullets(slide, ["Score and innings aggregation", "Chase resources and required rate", "Explainable match outlook"], 0.82, 2.0, 3.3, 2.4, 17);
  addPanel(slide, 4.73, 1.35, 3.85, 4.8, "SPRINT 2 - PLAYER CONTEXT", C.gold);
  addBullets(slide, ["Regression-based recent form", "Opponent-specific Bayesian update", "Confidence and evidence warnings"], 5.0, 2.0, 3.3, 2.4, 17);
  addPanel(slide, 8.9, 1.35, 3.85, 4.8, "SPRINT 3 - DECISION", C.blue);
  addBullets(slide, ["Event-level expected value", "Saved .pkl model prediction", "Selection labels and fallback"], 9.17, 2.0, 3.3, 2.4, 17);
  addText(slide, "Separation of intelligence layers improves reuse, testing, scaling, and explainability.", 0.75, 6.45, 11.8, 0.3, 16, C.green, { bold: true, align: "center" });

  slide = pptx.addSlide("TECH");
  addHeader(slide, "Evidence, Dataset, and Deployment", "Authoritative sources used throughout this presentation", "EVIDENCE");
  addPanel(slide, 0.55, 1.35, 3.85, 4.95, "DATASET", C.green);
  addBullets(slide, ["HimanshuKhale/datasets_cricket", "4 teams and 12 synthetic T20 matches", "24 innings and 2,846 ball events", "Player-match and ball-level training tables", "Synthetic/faux - never presented as real data"], 0.82, 1.88, 3.3, 3.6, 14.5);
  addPanel(slide, 4.73, 1.35, 3.85, 4.95, "VERIFIED OUTPUT", C.gold);
  addBullets(slide, ["Real schemas.py and services.py functions", "Eleven 1440x810 dashboards", "Actual service response values", "Editable schema and JSON examples", "No random presentation values"], 5.0, 1.88, 3.3, 3.6, 14.5);
  addPanel(slide, 8.9, 1.35, 3.85, 4.95, "DEPLOYMENT", C.blue);
  addBullets(slide, ["API 11 publicly hosted on Render", "Swagger and model-info verified", "APIs 1-10 shown as local verified services", "GitHub repository and presentation assets", "Render free tier may cold-start"], 9.17, 1.88, 3.3, 3.6, 14.5);
}

introSlides();
sectionSlide(1, "Live Match Intelligence", "Five APIs transform delivery events into score, chase, pressure, and outlook intelligence.", C.green);
apiSpecs.filter((a) => a.sprint === 1).forEach((spec) => { apiOverview(spec); apiHow(spec); apiSchema(spec); apiExample(spec); apiEvidence(spec); });
sprintSummary(1, "From raw deliveries to live match understanding", apiSpecs.filter((a) => a.sprint === 1), ["One legal-ball calculation standard across endpoints", "Frontend-ready score, innings, chase, and outlook responses", "Transparent formulas and rule-based explanations", "Reusable context for dashboards and AI agents"]);
sectionSlide(2, "Player Performance Analytics", "Four APIs explain form direction and opponent-specific matchup effects.", C.gold);
apiSpecs.filter((a) => a.sprint === 2).forEach((spec) => { apiOverview(spec); apiHow(spec); apiSchema(spec); apiExample(spec); apiEvidence(spec); });
sprintSummary(2, "From player history to explainable context", apiSpecs.filter((a) => a.sprint === 2), ["Aarav Sharma provides one continuous six-match story", "Regression exposes direction, fit, and volatility", "Bayesian updates balance prior belief with opponent evidence", "Confidence warnings prevent overclaiming small samples"]);
sectionSlide(3, "Fantasy Decision Engine", "Two APIs connect event probabilities, player context, and a saved prediction model.", C.blue);
apiSpecs.filter((a) => a.num === "10").forEach((spec) => { apiOverview(spec); apiHow(spec); apiSchema(spec); apiExample(spec); apiEvidence(spec); });
apiSpecs.filter((a) => a.num === "11").forEach((spec) => { apiOverview(spec); apiHow(spec); apiSchema(spec); apiExample(spec); apiEvidence(spec); modelCardSlide(); });
sprintSummary(3, "From uncertain events to a selection recommendation", apiSpecs.filter((a) => a.sprint === 3), ["Expected value keeps batting, bowling, and fielding auditable", "Saved-model prediction never retrains during requests", "Feature contract and anti-leakage checks protect validity", "Risk, model source, and fallback reason remain visible"]);

{
  const slide = pptx.addSlide("TECH");
  addHeader(slide, "Conclusion - One Explainable Cricket Pipeline", "Eleven specialised APIs compose into a unified Khel AI intelligence layer", "CONCLUSION");
  const cards = [
    ["SPRINT 1", "What is happening?", "Live score, innings, chase resources, required rate, and outlook.", C.green],
    ["SPRINT 2", "How is the player trending?", "Regression form, opponent evidence, posterior expectation, and confidence.", C.gold],
    ["SPRINT 3", "What decision should Khel AI make?", "Expected fantasy value, saved-model prediction, risk, and selection label.", C.blue],
  ];
  cards.forEach((c, i) => {
    const x = 0.55 + i * 4.12;
    addPanel(slide, x, 1.55, 3.85, 3.55, c[0], c[3]);
    addText(slide, c[1], x + 0.25, 2.2, 3.35, 0.65, 22, C.white, { bold: true, valign: "mid" });
    addText(slide, c[2], x + 0.25, 3.18, 3.35, 1.05, 14, C.muted, { valign: "mid" });
  });
  addPanel(slide, 0.55, 5.45, 12.2, 1.08, "FINAL RESULT", C.green);
  addText(slide, "Real service logic + validated schemas + dashboard evidence + honest metrics + clear Khel AI integration", 0.82, 5.83, 11.65, 0.3, 19, C.white, { bold: true, align: "center" });
}

if (pptx._slides.length !== 68) throw new Error(`Expected 68 slides, found ${pptx._slides.length}`);
const output = path.join(__dirname, "Khel_AI_Mentor_Aligned_68_Slides.pptx");
pptx.writeFile({ fileName: output });
console.log(output);
