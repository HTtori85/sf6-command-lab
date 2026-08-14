import type { MetadataRoute } from "next";

const SITE_URL = "https://sf6-command-lab-xwh5-ctcb2cjxo-httori85s-projects.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
