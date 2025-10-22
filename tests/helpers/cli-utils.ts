import { type ChildProcess, spawn } from "node:child_process";
import { join } from "node:path";

/**
 * Spawns the CLI process in interactive mode with access to stdin for sending keys
 * @param args - Command line arguments to pass to the CLI
 * @param options - Options for the spawned process
 * @returns Object with child process handle and promise that resolves to result
 */
export function spawnCLI(
	args: string[],
	options: {
		cwd?: string;
		timeout?: number;
	} = {},
): {
	child: ChildProcess;
	result: Promise<{ stdout: string; stderr: string; exitCode: number }>;
} {
	const cliPath = join(process.cwd(), "src", "cli", "index.ts");
	const child = spawn("tsx", [cliPath, ...args], {
		cwd: options.cwd || process.cwd(),
		stdio: ["pipe", "pipe", "pipe"],
	});

	let stdout = "";
	let stderr = "";

	const timeout = options.timeout || 30000;
	const timeoutId = setTimeout(() => {
		child.kill();
	}, timeout);

	child.stdout?.on("data", (data: Buffer) => {
		stdout += data.toString();
	});

	child.stderr?.on("data", (data: Buffer) => {
		stderr += data.toString();
	});

	const result = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
		child.on("close", (code: number) => {
			clearTimeout(timeoutId);
			resolve({
				stdout,
				stderr,
				exitCode: code || 0,
			});
		});

		child.on("error", (error: Error) => {
			clearTimeout(timeoutId);
			reject(new Error(`Failed to spawn CLI: ${error.message}`));
		});

		// Log when CLI process starts successfully
		child.on("spawn", () => {
			console.log("✅ CLI process spawned successfully");
		});
	});

	return { child, result };
}

/**
 * Enum for CLI key types to ensure type safety
 */
export enum CLIKey {
	ArrowUp = "arrow-up",
	ArrowDown = "arrow-down",
	ArrowRight = "arrow-right",
	ArrowLeft = "arrow-left",
	Enter = "enter",
	Space = "space",
	Tab = "tab",
	Escape = "escape",
	Backspace = "backspace",
	Delete = "delete",
	CtrlC = "ctrl-c",
	CtrlD = "ctrl-d",
	CtrlZ = "ctrl-z",
	// Letters for shortcuts like 'a' for select all
	a = "a",
	// Add more letters as needed
}

/**
 * Key sequence mappings for interactive CLI testing
 */
const KEY_SEQUENCES = {
	// Arrow keys
	"arrow-up": "\u001b[A",
	"arrow-down": "\u001b[B",
	"arrow-right": "\u001b[C",
	"arrow-left": "\u001b[D",

	// Special keys
	enter: "\n",
	space: " ",
	tab: "\t",
	escape: "\u001b",
	backspace: "\b",
	delete: "\u007f",

	// Common key combinations
	"ctrl-c": "\u0003",
	"ctrl-d": "\u0004",
	"ctrl-z": "\u001a",

	// Text input
	text: (text: string) => text,

	// Letters for shortcuts
	a: "a",
} as const;

/**
 * Sends a sequence of keys to a spawned CLI process
 * @param childProcess - The spawned child process with stdin available
 * @param keys - Array of keys to send (using CLIKey enum or plain text strings)
 * @returns Promise that resolves when keys are sent
 */
export function sendKeys(childProcess: { stdin: NodeJS.WritableStream | null }, keys: (CLIKey | string)[]): void {
	for (const key of keys) {
		if (Object.values(CLIKey).includes(key as CLIKey)) {
			// It's a CLIKey enum value, look it up in KEY_SEQUENCES
			const keySequence = KEY_SEQUENCES[key as keyof typeof KEY_SEQUENCES];
			if (typeof keySequence === "function") {
				throw new Error(`Key '${key}' requires a parameter`);
			}
			childProcess.stdin?.write(keySequence);
		} else {
			// Plain text string
			childProcess.stdin?.write(key);
		}
	}
}
