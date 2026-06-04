import { pathToFileURL } from "node:url";

const CDP_BASE_URL = process.env.TV_CDP_URL || "http://127.0.0.1:9222";

export async function checkTradingViewCdp() {
  const [version, pages] = await Promise.all([
    fetchJson(`${CDP_BASE_URL}/json/version`),
    fetchJson(`${CDP_BASE_URL}/json/list`)
  ]);

  const chartPages = pages.filter((page) =>
    typeof page.url === "string" && page.url.includes("tradingview.com/chart")
  );

  return {
    reachable: true,
    browser: version.Browser,
    user_agent: version["User-Agent"],
    chart_pages: chartPages.map((page) => ({
      id: page.id,
      title: page.title,
      url: page.url
    }))
  };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}`);
  }
  return response.json();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkTradingViewCdp()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
