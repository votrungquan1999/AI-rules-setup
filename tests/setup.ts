import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Mock scrollIntoView for Radix UI components (not available in jsdom). Guarded so node-environment
// tests (e.g. repository integration tests) that reuse this setup file don't crash on a missing DOM.
if (typeof Element !== "undefined") {
	Element.prototype.scrollIntoView = () => {
		// Mock implementation - no-op
	};
}

// Cleanup after each test
afterEach(() => {
	cleanup();
});
