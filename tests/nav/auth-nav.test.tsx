import { render, screen } from "@testing-library/react";
import { useLinkStatus } from "next/link";
import { AuthNav } from "src/components/auth-nav";
import { describe, expect, it, vi } from "vitest";

/**
 * Component test for the authenticated nav bar (jsdom). Each nav link must surface a per-link
 * loading indicator while its destination is navigating, so reviewers get feedback on click.
 * `next/navigation` and `next/link` (incl. `useLinkStatus`) are mocked since jsdom has no router.
 */
vi.mock("next/navigation", () => ({
	usePathname: () => "/kb",
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
	useLinkStatus: vi.fn(),
}));

const mockUseLinkStatus = vi.mocked(useLinkStatus);

describe("AuthNav", () => {
	it("shows a loading indicator on its links while navigation is pending, and none when idle", () => {
		// Given navigation is in flight
		mockUseLinkStatus.mockReturnValue({ pending: true });
		const { rerender } = render(<AuthNav />);

		// Then every nav link surfaces a loading indicator (the label still renders)
		expect(screen.getByText("KB Review")).toBeInTheDocument();
		expect(screen.queryAllByLabelText("Loading")).toHaveLength(4);

		// When navigation settles
		mockUseLinkStatus.mockReturnValue({ pending: false });
		rerender(<AuthNav />);

		// Then no indicators remain
		expect(screen.queryAllByLabelText("Loading")).toHaveLength(0);
	});
});
