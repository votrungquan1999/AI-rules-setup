#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readConfigOrNull } from "../cli/lib/config";
import {
	type CaptureBodyInput,
	type CaptureMemoryInput,
	type CaptureQuestionInput,
	KbHttpClient,
} from "./kb-http-client";

const DEFAULT_API_BASE_URL = "https://ai-rules-setup.vercel.app";

/**
 * Serializes an arbitrary HTTP response body into the MCP text-content shape expected by tools.
 * @param payload - The JSON value returned by the KB HTTP client
 * @returns A CallToolResult with the payload pretty-printed as a single text block
 */
function toTextResult(payload: unknown): { content: Array<{ type: "text"; text: string }> } {
	return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

/**
 * Builds the MCP server: reads the workspace scope from `.ai-rules.json` (non-writing) and the
 * API base URL from `AI_RULES_API_URL`, then registers the six KB tools backed by the HTTP client.
 * @returns The configured (not-yet-connected) McpServer instance
 */
export async function buildServer(): Promise<McpServer> {
	const config = await readConfigOrNull(process.cwd());
	const scopes = config?.scope ?? [];
	const baseUrl = process.env.AI_RULES_API_URL || DEFAULT_API_BASE_URL;
	const client = new KbHttpClient(baseUrl, scopes);

	const server = new McpServer({ name: "ai-rules-kb", version: "0.1.0" });

	server.registerTool(
		"kb_search",
		{
			description:
				"Search the approved knowledge base for solved questions, learnings, blueprints, and memories relevant to the current task. Returns ranked results scoped to this workspace.",
			inputSchema: {
				query: z.string().describe("Free-text search query; empty returns all in-scope canonical docs"),
				type: z.enum(["question", "til", "blueprint", "memory"]).optional().describe("Optional type filter"),
			},
		},
		async ({ query, type }) => toTextResult(await client.kbSearch(query, type)),
	);

	server.registerTool(
		"kb_get",
		{
			description: "Fetch a single knowledge-base document by its id (hex ObjectId returned from kb_search).",
			inputSchema: {
				id: z.string().describe("The document's hex ObjectId"),
			},
		},
		async ({ id }) => toTextResult(await client.kbGet(id)),
	);

	server.registerTool(
		"capture_question",
		{
			description:
				"Capture a solved question as a draft for reviewer approval. Provide the problem and how it was resolved.",
			inputSchema: {
				title: z.string().describe("Short title summarizing the question"),
				problem: z.string().describe("The problem that was encountered"),
				resolution: z.string().describe("How the problem was resolved"),
				agent: z.string().optional().describe("Originating agent (e.g. claude-code)"),
			},
		},
		async (input: CaptureQuestionInput) => toTextResult(await client.captureQuestion(input)),
	);

	server.registerTool(
		"capture_til",
		{
			description: "Capture a 'today I learned' note as a draft for reviewer approval.",
			inputSchema: {
				title: z.string().describe("Short title for the learning"),
				body: z.string().describe("The learning content"),
				agent: z.string().optional().describe("Originating agent (e.g. claude-code)"),
			},
		},
		async (input: CaptureBodyInput) => toTextResult(await client.captureTil(input)),
	);

	server.registerTool(
		"capture_blueprint",
		{
			description: "Capture a reusable pattern or blueprint as a draft for reviewer approval.",
			inputSchema: {
				title: z.string().describe("Short title for the blueprint"),
				body: z.string().describe("The blueprint content"),
				agent: z.string().optional().describe("Originating agent (e.g. claude-code)"),
			},
		},
		async (input: CaptureBodyInput) => toTextResult(await client.captureBlueprint(input)),
	);

	server.registerTool(
		"capture_memory",
		{
			description:
				"Capture a concise always-on memory (loaded into every session). Must be short: at most 200 characters and 2 lines, or the server rejects it.",
			inputSchema: {
				body: z.string().describe("The memory content (<=200 chars, <=2 lines)"),
				title: z.string().optional().describe("Optional title; derived from the first line when omitted"),
				agent: z.string().optional().describe("Originating agent (e.g. claude-code)"),
			},
		},
		async (input: CaptureMemoryInput) => toTextResult(await client.captureMemory(input)),
	);

	return server;
}

/**
 * Entry point: builds the server and connects it over stdio.
 * @returns A promise that resolves once the transport is connected
 */
async function main(): Promise<void> {
	const server = await buildServer();
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error("MCP server failed to start:", error);
	process.exit(1);
});
