import { render, screen } from "@testing-library/react";
import { useLinkStatus } from "next/link";
import { NavLinkContent } from "src/components/nav-link";
import { describe, expect, it, vi } from "vitest";

/**
 * Component tests for NavLinkContent (jsdom). It is rendered inside a `<Link>` and shows a loading
 * indicator while that link's destination is navigating. `useLinkStatus` is mocked to control the
 * pending state (jsdom has no App Router Link context).
 */
vi.mock("next/link", () => ({
	default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useLinkStatus: vi.fn(),
}));

const mockUseLinkStatus = vi.mocked(useLinkStatus);

describe("NavLinkContent", () => {
	it("shows a loading indicator only while its link destination is pending", () => {
		// Given the link is navigating (pending)
		mockUseLinkStatus.mockReturnValue({ pending: true });
		const { rerender } = render(<NavLinkContent>Home</NavLinkContent>);

		// Then the label is shown alongside a loading indicator
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByLabelText("Loading")).toBeInTheDocument();

		// When navigation completes (idle)
		mockUseLinkStatus.mockReturnValue({ pending: false });
		rerender(<NavLinkContent>Home</NavLinkContent>);

		// Then the indicator clears (label remains)
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.queryByLabelText("Loading")).toBeNull();
	});
});
