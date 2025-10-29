import { QuestionsDialogContent, QuestionsDialogWrapper } from "./questions-dialog.ui";

/**
 * Questions Dialog component
 * Composes the dialog wrapper and content
 */
export function QuestionsDialog() {
	return (
		<QuestionsDialogWrapper>
			<QuestionsDialogContent />
		</QuestionsDialogWrapper>
	);
}
