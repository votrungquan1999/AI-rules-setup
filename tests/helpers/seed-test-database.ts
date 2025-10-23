import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Manifest } from "../../src/server/types";
import { cleanDatabase, connectToTestDB, seedDatabase } from "../helpers/database-utils";

interface GitHubFixtures {
	directoryContents: Record<string, unknown[]>;
	manifests: Record<string, unknown>;
	fileContents: Record<string, string>;
}

/**
 * Load GitHub API fixtures from the recorded responses file
 */
async function loadFixtures(): Promise<GitHubFixtures> {
	const testDataPath =
		process.env.AI_RULES_TEST_DATA_PATH || join(process.cwd(), "tests", "fixtures", "github-responses.json");

	try {
		const content = await readFile(testDataPath, "utf-8");
		return JSON.parse(content) as GitHubFixtures;
	} catch (error) {
		throw new Error(`Failed to load GitHub fixtures: ${error}`);
	}
}

/**
 * Seed the test database with all data from GitHub fixtures
 */
export async function seedTestDatabase(): Promise<void> {
	console.log("🌱 Seeding test database with GitHub fixtures...");
	try {
		// Connect to test database
		await connectToTestDB();
		// Clean existing data
		await cleanDatabase();
		console.log("✅ Cleaned existing data");
		// Load fixtures
		const fixtures = await loadFixtures();
		console.log("✅ Loaded fixtures");
		// Get agents from fixtures
		const agents = (fixtures.directoryContents.rules || []) as Array<{ name: string; type: string }>;
		console.log(
			`📁 Found ${agents.length} agents:`,
			agents.map((a) => a.name),
		);

		let totalSeeded = 0;

		// Process each agent
		for (const agent of agents) {
			if (agent.type !== "dir") continue;

			const agentName = agent.name;
			const categories = (fixtures.directoryContents[`rules/${agentName}`] || []) as Array<{
				name: string;
				type: string;
			}>;
			console.log(`📁 Processing agent ${agentName} with ${categories.length} categories`);

			// Process each category
			for (const category of categories) {
				if (category.type !== "dir") continue;

				const categoryName = category.name;
				const manifestKey = `${agentName}/${categoryName}`;
				const manifest = fixtures.manifests[manifestKey] as Manifest | undefined;

				if (!manifest) {
					console.log(`⚠️  No manifest found for ${manifestKey}`);
					continue;
				}

				// Collect files for this category
				const files: Array<{ filename: string; content: string }> = [];
				if (manifest.files && Array.isArray(manifest.files)) {
					for (const file of manifest.files) {
						const filePath = `rules/${agentName}/${categoryName}/${file.path}`;
						const content = fixtures.fileContents[filePath];
						if (content) {
							// Extract filename from path (last segment)
							const filename = file.path.split("/").pop() || file.path;
							files.push({ filename, content });
						}
					}
				}

				// Seed this category
				await seedDatabase({
					agent: agentName,
					category: categoryName,
					manifest: manifest,
					files: files,
					githubCommitSha: "test-sha",
				});

				totalSeeded++;
				console.log(`✅ Seeded ${manifestKey} (${files.length} files)`);
			}
		}

		console.log(`🎉 Successfully seeded ${totalSeeded} categories`);
	} catch (error) {
		console.error("❌ Failed to seed database:", error);
		process.exit(1);
	}
}
