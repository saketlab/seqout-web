import { SITE_URL } from "@/utils/constants";
import type { MetadataRoute } from "next";

const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "GoogleOther",
  "Google-CloudVertexBot",
  "Applebot-Extended",
  "CCBot",
  "Bytespider",
  "Amazonbot",
  "meta-externalagent",
  "meta-externalfetcher",
  "FacebookBot",
  "cohere-ai",
  "cohere-training-data-crawler",
  "AI2Bot",
  "Ai2Bot-Dolma",
  "Diffbot",
  "YouBot",
  "DuckAssistBot",
  "MistralAI-User",
  "PanguBot",
  "Timpibot",
  "Omgilibot",
  "ImagesiftBot",
  "Kangaroo Bot",
  "img2dataset",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: "/api/",
      },

      // SEO crawlers
      { userAgent: "AhrefsBot", disallow: "/" },
      { userAgent: "SemrushBot", disallow: "/" },
      { userAgent: "SemrushBot-SA", disallow: "/" },
      { userAgent: "MJ12bot", disallow: "/" },
      { userAgent: "DotBot", disallow: "/" },
      { userAgent: "BLEXBot", disallow: "/" },
      { userAgent: "Barkrowler", disallow: "/" },
      { userAgent: "DataForSeoBot", disallow: "/" },
      { userAgent: "SEOkicks", disallow: "/" },
      { userAgent: "serpstatbot", disallow: "/" },
      { userAgent: "MegaIndex", disallow: "/" },
      { userAgent: "PetalBot", disallow: "/" },

      // AI training, search and agent crawlers
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
