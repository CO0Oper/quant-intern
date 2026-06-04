export function createLogger() {
  const startedAt = Date.now();

  return {
    step(name, detail = "") {
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      const suffix = detail ? ` - ${detail}` : "";
      console.log(`[${elapsed}s] ${name}${suffix}`);
    },
    json(name, value) {
      console.log(`${name}: ${JSON.stringify(value, null, 2)}`);
    }
  };
}
