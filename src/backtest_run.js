export async function runBacktest({ adapter, spec }) {
  await adapter.chartSetSymbol({ symbol: spec.symbol });
  await adapter.chartSetTimeframe({ timeframe: spec.timeframe });

  const results = await adapter.dataGetStrategyResults();
  const trades = await adapter.dataGetTrades();
  const ohlcv = await adapter.dataGetOhlcv({ summary: true });
  const benchmarkBuyAndHold = computeBuyAndHold(ohlcv);

  return {
    results,
    trades,
    benchmark_buy_and_hold: benchmarkBuyAndHold
  };
}

export function computeBuyAndHold(ohlcv) {
  const firstClose = Number(ohlcv?.first_close ?? ohlcv?.firstClose);
  const lastClose = Number(ohlcv?.last_close ?? ohlcv?.lastClose);

  if (!Number.isFinite(firstClose) || !Number.isFinite(lastClose) || firstClose === 0) {
    throw new Error("Cannot compute buy-and-hold benchmark without first and last close.");
  }

  return {
    first_close: firstClose,
    last_close: lastClose,
    return_percent: ((lastClose - firstClose) / firstClose) * 100
  };
}
