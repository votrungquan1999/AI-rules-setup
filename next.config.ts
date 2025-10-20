import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Disable static optimization for API routes
	output: "standalone",
	experimental: {
		useCache: true,
		cacheComponents: true,
	},
};

export default nextConfig;
