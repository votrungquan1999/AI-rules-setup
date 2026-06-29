import { fireEvent, render, screen } from "@testing-library/react";
import { PendingButton } from "src/components/ui/pending-button";
import { describe, expect, it, vi } from "vitest";

/**
 * Component tests for the shared PendingButton (jsdom). While pending, the button must show it is
 * working (spinner + aria-busy), be disabled, and not re-fire its action; the label still comes
 * from the caller.
 */
describe("PendingButton", () => {
	it("shows a spinner, is disabled, and does not re-fire its action while pending", () => {
		// Given a pending button with a click handler
		const onClick = vi.fn();
		render(
			<PendingButton pending onClick={onClick}>
				Save
			</PendingButton>,
		);

		// Then the caller's label is shown, the button is disabled and marked busy
		const button = screen.getByRole("button", { name: /save/i });
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("aria-busy", "true");
		// ...and it renders a spinner (an svg injected by the component)
		expect(button.querySelector("svg")).not.toBeNull();

		// When the user clicks it while pending
		fireEvent.click(button);

		// Then the action does not fire again
		expect(onClick).not.toHaveBeenCalled();
	});
});
