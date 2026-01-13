import { spawn } from "node:child_process";
import { join } from "node:path";

/**
 * Spawns the CLI process with the given arguments
 * @param args - Command line arguments to pass to the CLI
 * @param options - Options for the spawned process
 * @returns Promise that resolves to the CLI result
 */
export function spawnCLI(
	args: string[],
	options: {
		cwd?: string;
		timeout?: number;
	} = {},
): {
	result: Promise<{ stdout: string; stderr: string; exitCode: number }>;
} {
	const cliPath = join(process.cwd(), "src", "cli", "index.ts");
	const child = spawn("tsx", [cliPath, ...args], {
		cwd: options.cwd || process.cwd(),
		stdio: ["ignore", "pipe", "pipe"],
		env: {
			...process.env, // Inherit environment variables including AI_RULES_API_URL
		},
	});

	const stdoutAccumulator: string[] = [];
	const stderrAccumulator: string[] = [];

	const timeout = options.timeout || 30000;
	const timeoutId = setTimeout(() => {
		child.kill();
	}, timeout);

	child.stdout?.on("data", (data: Buffer) => {
		stdoutAccumulator.push(data.toString());
	});

	child.stderr?.on("data", (data: Buffer) => {
		stderrAccumulator.push(data.toString());
	});

	const result = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
		child.on("close", (code: number) => {
			clearTimeout(timeoutId);
			resolve({
				stdout: stdoutAccumulator.join(""),
				stderr: stderrAccumulator.join(""),
				exitCode: code || 0,
			});
		});

		child.on("error", (error: Error) => {
			clearTimeout(timeoutId);
			reject(new Error(`Failed to spawn CLI: ${error.message}`));
		});
	});

	return { result };
}
