import { describe, expect, it } from "vitest";
import { uploadCommand } from "../../src/cli/commands/upload";

describe("uploadCommand scope gate", () => {
	it("refuses to publish without an explicit scope or --global, before touching the filesystem", async () => {
		// Given a skill path that does not exist, and no scope/global choice.
		// When the operator runs upload.
		// Then it is refused on the scope rule — never reaching the (missing) file.
		await expect(uploadCommand({ agent: "claude-code", skillPath: "/nonexistent/skill-dir-xyz" })).rejects.toThrow(
			/--scope .* --global/,
		);
	});
});
