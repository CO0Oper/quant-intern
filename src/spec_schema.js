const REQUIRED_KEYS = [
  "source_video",
  "title",
  "symbol",
  "timeframe",
  "indicators",
  "entry_rules",
  "exit_rules",
  "stop",
  "sizing",
  "assumptions"
];

export function validateStrategySpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("Strategy Spec must be a JSON object.");
  }

  for (const key of REQUIRED_KEYS) {
    if (!(key in spec)) {
      throw new Error(`Strategy Spec missing required key: ${key}`);
    }
  }

  assertArray(spec.indicators, "indicators");
  assertArray(spec.entry_rules, "entry_rules");
  assertArray(spec.exit_rules, "exit_rules");
  assertArray(spec.assumptions, "assumptions");

  for (const indicator of spec.indicators) {
    assertString(indicator.name, "indicator.name");
    assertString(indicator.alias, "indicator.alias");
    if (!indicator.params || typeof indicator.params !== "object") {
      throw new Error("indicator.params must be an object.");
    }
  }

  for (const rule of spec.entry_rules) {
    assertString(rule.side, "entry_rule.side");
    assertString(rule.condition, "entry_rule.condition");
  }

  if (!spec.stop || typeof spec.stop !== "object") {
    throw new Error("stop must be an object.");
  }

  if (!spec.sizing || typeof spec.sizing !== "object") {
    throw new Error("sizing must be an object.");
  }

  return spec;
}

function assertArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array.`);
  }
}

function assertString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string.`);
  }
}
