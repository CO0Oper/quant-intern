export async function annotateChart({ adapter, verdict, resultsSummary }) {
  await adapter.drawShape({
    type: "text",
    text: `${resultsSummary} | ${verdict.verdict.toUpperCase()}`,
    anchor: "top_left"
  });

  return adapter.captureScreenshot({ region: "chart" });
}
