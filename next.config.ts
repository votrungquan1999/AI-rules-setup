import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Disable static optimization for API routes
	output: "standalone",
	cacheComponents: true,
	experimental: {
		useCache: true,
	},
};

export default nextConfig;
