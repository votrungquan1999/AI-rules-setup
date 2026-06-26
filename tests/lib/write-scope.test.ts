import { describe, expect, it } from "vitest";
import { resolveWriteScope } from "../../src/cli/lib/write-scope";

describe("resolveWriteScope", () => {
	it("honors named scopes, returning exactly the given tags", () => {
		// Given the operator names two scopes on a write command.
		// When the scope is resolved.
		const result = resolveWriteScope({ scope: "work,client-x" });

		// Then exactly those tags are returned.
		expect(result).toEqual(["work", "client-x"]);
	});

	it("treats --global as the global (empty-scope) result", () => {
		// Given the operator opts into global visibility.
		// When the scope is resolved.
		const result = resolveWriteScope({ global: true });

		// Then the global (empty) scope is returned.
		expect(result).toEqual([]);
	});

	it("refuses an unstated scope, telling the operator to pick --scope or --global", () => {
		// Given the operator names no scope and does not opt into global.
		// When/Then resolving is refused with a message naming both flags.
		expect(() => resolveWriteScope({})).toThrow(/--scope .* --global/);
	});

	it("refuses naming scopes and opting global at once as mutually exclusive", () => {
		// Given the operator passes both --scope and --global.
		// When/Then resolving is refused as mutually exclusive.
		expect(() => resolveWriteScope({ scope: "work", global: true })).toThrow(/mutually exclusive/);
	});

	it("cleans surrounding whitespace and drops empty entries in the scope list", () => {
		// Given a messy scope list with padding and an empty entry.
		// When the scope is resolved.
		const result = resolveWriteScope({ scope: " work , , client-x " });

		// Then only the real, trimmed tags survive.
		expect(result).toEqual(["work", "client-x"]);
	});

	it("refuses a scope list that cleans up to nothing, same as an unstated scope", () => {
		// Given a scope made only of separators/whitespace.
		// When/Then it is refused like saying nothing.
		expect(() => resolveWriteScope({ scope: " , " })).toThrow(/--scope .* --global/);
	});
});
