import type { MetadataRoute } from "next";
import { BASE_URL } from "src/lib/metadata";

/**
 * Generate sitemap for search engines
 */
export default function sitemap(): MetadataRoute.Sitemap {
	const currentDate = new Date();

	return [
		{
			url: BASE_URL,
			lastModified: currentDate,
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${BASE_URL}/select-rules`,
			lastModified: currentDate,
			changeFrequency: "daily",
			priority: 0.9,
		},
		{
			url: `${BASE_URL}/api/rules`,
			lastModified: currentDate,
			changeFrequency: "daily",
			priority: 0.5,
		},
	];
}
