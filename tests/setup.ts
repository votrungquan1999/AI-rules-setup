import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Mock scrollIntoView for Radix UI components (not available in jsdom)
Element.prototype.scrollIntoView = () => {
	// Mock implementation - no-op
};

// Cleanup after each test
afterEach(() => {
	cleanup();
});
