import type { Submission } from "../types";

const DEFAULT_MAX_ROUNDS = 3;

export const getSubmissionMaxRounds = (submission: Submission) => {
    return submission.maxRounds ?? submission.evaluation?.maxRounds ?? DEFAULT_MAX_ROUNDS;
};

export const getSubmissionRoundsUsed = (submission: Submission) => {
    return submission.roundsUsed
        ?? submission.evaluation?.roundsUsed
        ?? submission.evaluationRounds?.length
        ?? 0;
};

export const hasSubmissionRoundsRemaining = (submission: Submission) => {
    return getSubmissionRoundsUsed(submission) < getSubmissionMaxRounds(submission);
};

export const canContinueSubmission = (submission: Submission) => {
    if (submission.submissionStatus === "DRAFT") {
        return (submission.canResubmit ?? hasSubmissionRoundsRemaining(submission))
            && hasSubmissionRoundsRemaining(submission);
    }

    if (submission.submissionStatus !== "GRADED" && submission.submissionStatus !== "FAILED") {
        return false;
    }

    return (submission.canResubmit ?? hasSubmissionRoundsRemaining(submission))
        && hasSubmissionRoundsRemaining(submission);
};

export const shouldReopenSubmission = (submission: Submission) => {
    return submission.submissionStatus === "GRADED" || submission.submissionStatus === "FAILED";
};

export const getNextSubmissionRound = (submission: Submission) => {
    const maxRounds = getSubmissionMaxRounds(submission);
    return Math.min(getSubmissionRoundsUsed(submission) + 1, maxRounds);
};
