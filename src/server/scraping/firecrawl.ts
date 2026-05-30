/*
 * Firecrawl website scraping helper.
 * Normalizes user-provided URLs and fetches main-page markdown content for
 * offering ingestion and prospect source extraction.
 */
type FirecrawlScrapeResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    title?: string;
    metadata?: {
      title?: string;
      description?: string;
      sourceURL?: string;
    };
  };
  error?: string;
};

export async function scrapeUrlWithFirecrawl(url: string) {
  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const normalizedUrl =
    url.startsWith("http://") || url.startsWith("https://")
      ? url
      : `https://${url}`;

  const response = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: normalizedUrl,
      formats: ["markdown"],
      onlyMainContent: true,
      maxAge: 172800000,
      timeout: 60000,
    }),
  });

  const data = (await response.json()) as FirecrawlScrapeResponse;

  if (!response.ok || data.success === false) {
    throw new Error(data.error || `Firecrawl failed with status ${response.status}.`);
  }

  const markdown = data.data?.markdown?.trim();

  if (!markdown) {
    throw new Error("Firecrawl returned no readable page content.");
  }

  return {
    url: normalizedUrl,
    title: data.data?.title || data.data?.metadata?.title || "",
    description: data.data?.metadata?.description || "",
    markdown,
  };
}
