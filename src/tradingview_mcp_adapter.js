export function createTradingViewMcpAdapter() {
  return {
    available: false,
    reason:
      "TradingView MCP tools are not exposed to this Node process. Wire Claude/Codex MCP tool calls here before running the back half.",
    async tvHealthCheck() {
      throw unavailable("tv_health_check");
    },
    async pineNew() {
      throw unavailable("pine_new");
    },
    async pineSetSource() {
      throw unavailable("pine_set_source");
    },
    async pineSmartCompile() {
      throw unavailable("pine_smart_compile");
    },
    async pineGetErrors() {
      throw unavailable("pine_get_errors");
    },
    async pineGetConsole() {
      throw unavailable("pine_get_console");
    },
    async pineSave() {
      throw unavailable("pine_save");
    },
    async pineListScripts() {
      throw unavailable("pine_list_scripts");
    },
    async pineOpen() {
      throw unavailable("pine_open");
    },
    async chartSetSymbol() {
      throw unavailable("chart_set_symbol");
    },
    async chartSetTimeframe() {
      throw unavailable("chart_set_timeframe");
    },
    async dataGetStrategyResults() {
      throw unavailable("data_get_strategy_results");
    },
    async dataGetTrades() {
      throw unavailable("data_get_trades");
    },
    async dataGetOhlcv() {
      throw unavailable("data_get_ohlcv");
    },
    async drawShape() {
      throw unavailable("draw_shape");
    },
    async captureScreenshot() {
      throw unavailable("capture_screenshot");
    }
  };
}

function unavailable(tool) {
  return new Error(`mcp__tradingview__${tool} is unavailable in this runtime.`);
}
