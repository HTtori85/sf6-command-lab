import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://sf6-command-lab-xwh5-ctcb2cjxo-httori85s-projects.vercel.app/sitemap.xml",
  };
}
