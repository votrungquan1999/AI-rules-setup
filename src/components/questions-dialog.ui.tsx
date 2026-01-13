"use client";

import { useState } from "react";
import { Button } from "src/components/ui/button";
import { Checkbox } from "src/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "src/components/ui/dialog";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { RadioGroup, RadioGroupItem } from "src/components/ui/radio-group";
import { useQuestions } from "src/lib/manifests.state";
import type { ChoiceQuestion, OpenEndedQuestion, YesNoQuestion } from "src/lib/question-types";
import { useAnsweredCount, useClearAnswers, useQuestionAnswer, useSetAnswer } from "src/lib/search.state";

/**
 * Yes/No question input component
 * Updates context state when user checks/unchecks
 */
export function YesNoQuestionInput({ question }: { question: YesNoQuestion }) {
	const answer = useQuestionAnswer(question.id);
	const setAnswer = useSetAnswer();
	const isChecked = answer?.type === "yes-no" ? answer.value : false;

	return (
		<div className="flex items-center space-x-2">
			<Checkbox
				id={question.id}
				checked={isChecked}
				onCheckedChange={(checked) => setAnswer(question.id, { type: "yes-no", value: checked === true })}
			/>
			<Label htmlFor={question.id} className="cursor-pointer">
				{question.text}
			</Label>
		</div>
	);
}

/**
 * Choice question input component
 * Updates context state when user selects an option
 */
export function ChoiceQuestionInput({ question }: { question: ChoiceQuestion }) {
	const answer = useQuestionAnswer(question.id);
	const setAnswer = useSetAnswer();
	const selectedValue = answer?.type === "choice" ? answer.value.toString() : undefined;

	return (
		<RadioGroup
			value={selectedValue ?? null}
			onValueChange={(value) => setAnswer(question.id, { type: "choice", value: parseInt(value, 10) })}
		>
			<Label className="block mb-2">{question.text}</Label>
			{question.options.map((option, index) => (
				<div key={`${question.id}-option-${index}`} className="flex items-center space-x-2">
					<RadioGroupItem value={index.toString()} id={`${question.id}-${index}`} />
					<Label htmlFor={`${question.id}-${index}`} className="cursor-pointer">
						{option.text}
					</Label>
				</div>
			))}
		</RadioGroup>
	);
}

/**
 * Open-ended question input component
 * Updates context state as user types
 */
export function OpenEndedQuestionInput({ question }: { question: OpenEndedQuestion }) {
	const answer = useQuestionAnswer(question.id);
	const setAnswer = useSetAnswer();
	const value = answer?.type === "open-ended" ? answer.value : "";

	return (
		<div className="space-y-2">
			<Label htmlFor={question.id}>{question.text}</Label>
			<Input
				id={question.id}
				value={value}
				onChange={(e) => setAnswer(question.id, { type: "open-ended", value: e.target.value })}
				placeholder="Type your answer here..."
			/>
		</div>
	);
}

/**
 * Questions dialog wrapper with open/close state
 */
export function QuestionsDialogWrapper({ children }: { children: React.ReactNode }) {
	const [open, setOpen] = useState(false);
	const answeredCount = useAnsweredCount();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">Refine Selection{answeredCount > 0 && ` (${answeredCount})`}</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">{children}</DialogContent>
		</Dialog>
	);
}

/**
 * Questions dialog content with grouped questions
 */
export function QuestionsDialogContent() {
	const questions = useQuestions();
	const answeredCount = useAnsweredCount();
	const clearAnswers = useClearAnswers();

	// Group questions by type with proper type narrowing
	const yesNoQuestions = questions.filter((q): q is YesNoQuestion => q.type === "yes-no");
	const choiceQuestions = questions.filter((q): q is ChoiceQuestion => q.type === "choice");
	const openEndedQuestions = questions.filter((q): q is OpenEndedQuestion => q.type === "open-ended");

	return (
		<>
			<DialogHeader>
				<DialogTitle>Refine Your Selection</DialogTitle>
				<DialogDescription>
					Answer questions to help us find the most relevant rules for your project.
				</DialogDescription>
			</DialogHeader>

			<div className="space-y-6 py-4">
				{/* Yes/No Questions */}
				{yesNoQuestions.length > 0 && (
					<div className="space-y-3">
						<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Yes/No Questions</h3>
						<div className="space-y-3">
							{yesNoQuestions.map((q) => (
								<YesNoQuestionInput key={q.id} question={q} />
							))}
						</div>
					</div>
				)}

				{/* Choice Questions */}
				{choiceQuestions.length > 0 && (
					<div className="space-y-3">
						<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Multiple Choice</h3>
						<div className="space-y-4">
							{choiceQuestions.map((q) => (
								<ChoiceQuestionInput key={q.id} question={q} />
							))}
						</div>
					</div>
				)}

				{/* Open-Ended Questions */}
				{openEndedQuestions.length > 0 && (
					<div className="space-y-3">
						<h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Open-Ended</h3>
						<div className="space-y-4">
							{openEndedQuestions.map((q) => (
								<OpenEndedQuestionInput key={q.id} question={q} />
							))}
						</div>
					</div>
				)}

				{questions.length === 0 && (
					<div className="text-center py-8 text-muted-foreground">No questions available yet.</div>
				)}
			</div>

			<DialogFooter>
				{answeredCount > 0 && (
					<Button variant="outline" onClick={clearAnswers}>
						Clear Answers ({answeredCount})
					</Button>
				)}
				<Button>Apply</Button>
			</DialogFooter>
		</>
	);
}
