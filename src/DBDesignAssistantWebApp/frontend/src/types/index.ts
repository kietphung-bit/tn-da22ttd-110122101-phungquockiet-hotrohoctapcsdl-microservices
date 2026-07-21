export type RoleName = "STUDENT" | "INSTRUCTOR" | "ADMIN";
export type UserGender = "MALE" | "FEMALE" | "OTHER";
export type ExerciseSource = "MANUAL" | "AI_GENERATED";
export type ExerciseReviewStatus = "DRAFT" | "APPROVED" | "REJECTED";

export type Role = {
    roleId: number;
    roleName: RoleName;
};

export type User = {
    userId: number;
    userEmail: string;
    fullName: string;
    userGender: UserGender | null;
    userDob: string | null;
    userPhone: string | null;
    userAddress: string | null;
    role: Role;
    isActive: boolean;
};

export type LoginRequest = {
    userEmail: string;
    password: string;
};

export type RegisterRequest = {
    userEmail: string;
    password: string;
    fullName: string;
    userGender?: UserGender | null;
    userDob?: string | null;
    userPhone?: string | null;
    userAddress?: string | null;
};

export type AccountProfileUpdateRequest = {
    fullName: string;
    userGender?: UserGender | null;
    userDob?: string | null;
    userPhone?: string | null;
    userAddress?: string | null;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
};

export type AdminCreateUserRequest = {
    userEmail: string;
    password: string;
    fullName: string;
    roleName: "STUDENT" | "INSTRUCTOR";
    userGender?: UserGender | null;
    userDob?: string | null;
    userPhone?: string | null;
    userAddress?: string | null;
};

export type AuthResponse = {
    accessToken: string;
    tokenType: string;
    userId: number;
    roleName: RoleName;
};

export type Exercise = {
    exerciseId: number;
    exTitle: string;
    exDescription: string | null;
    scenarioData: Record<string, unknown>;
    exerciseSource?: ExerciseSource;
    exerciseCode?: string | null;
    createdBy: User;
    ownerStudent?: User | null;
    baseExerciseId?: number | null;
    baseExerciseCode?: string | null;
    isPublished: boolean;
    studentArchived?: boolean | null;
    studentArchivedAt?: string | null;
};

export type ExerciseRequest = {
    exTitle: string;
    exDescription?: string | null;
    scenarioData: Record<string, unknown>;
    exerciseSource?: ExerciseSource;
    exerciseCode?: string | null;
    ownerStudentId?: number | null;
    baseExerciseId?: number | null;
    createdById: number;
    isPublished: boolean;
};

export type ExerciseGenerationRequest = {
    customPrompt?: string;
    topic?: string;
    difficulty: string;
    businessDomain?: string;
    businessContext?: string;
    keywords?: string;
    baseExerciseId?: number | null;
    additionalRequirements?: string;
};

export type ExerciseGenerationResponse = {
    exerciseId: number;
    exerciseCode: string;
    title: string;
    description: string;
    scenarioData: Record<string, unknown>;
    exerciseSource: "AI_GENERATED";
    ownerStudentId: number | null;
    baseExerciseId?: number | null;
    isPublished?: boolean;
};

export type ExerciseReviewRequest = {
    reason?: string;
    publish?: boolean;
};

export type SampleSolution = {
    sampleSolutionId: number;
    exerciseId: number;
    exerciseCode?: string | null;
    solutionData: Record<string, unknown>;
};

export type SampleSolutionRequest = {
    solutionData: Record<string, unknown>;
};

export type SubmissionStatus = "DRAFT" | "SUBMITTED" | "PROCESSING" | "GRADED" | "FAILED";

export type EvaluationDetail = {
    detailId: number | null;
    errorType: string | null;
    evaDescription: string | null;
    errorLocation: string | null;
};

export type AIEvaluation = {
    evaluationId: number;
    submissionId: number;
    roundId?: number | null;
    roundNumber?: number | null;
    roundsUsed?: number | null;
    maxRounds?: number | null;
    canResubmit?: boolean | null;
    overallScore: number | null;
    evaluatedAt: string | null;
    provider?: string | null;
    model?: string | null;
    fallbackUsed?: boolean | null;
    fallbackFrom?: string | null;
    details: EvaluationDetail[] | null;
};

export type EvaluationRound = {
    roundId: number;
    submissionId: number;
    roundNumber: number;
    roundStatus: SubmissionStatus;
    overallScore: number | null;
    provider?: string | null;
    model?: string | null;
    fallbackUsed?: boolean | null;
    fallbackFrom?: string | null;
    submittedAt: string | null;
    gradedAt: string | null;
    details: EvaluationDetail[] | null;
};

export type AdminEvaluationRound = {
    roundId: number;
    submissionId: number;
    studentId: number;
    studentName: string | null;
    studentEmail: string | null;
    roundNumber: number;
    roundStatus: SubmissionStatus;
    overallScore: number | null;
    provider?: string | null;
    model?: string | null;
    fallbackUsed?: boolean | null;
    fallbackFrom?: string | null;
    submittedAt: string | null;
    gradedAt: string | null;
};

export type PracticeInsightsScope = "ALL" | "DIRECT" | "DERIVED_AI";

export type AdminPracticeInsightsFilters = {
    from?: string;
    to?: string;
    status?: SubmissionStatus;
    roundStatus?: SubmissionStatus;
    exerciseSource?: ExerciseSource;
    exerciseId?: number;
    studentId?: number;
    provider?: string;
    fallbackUsed?: boolean;
};

export type PracticeIssueTypeItem = {
    errorType: string | null;
    count: number;
    affectedSubmissionCount: number;
    affectedRoundCount?: number;
};

export type PracticeSkillAnalyticsItem = {
    skillCode: string;
    skillName: string | null;
    issueCount: number;
    affectedRoundCount: number;
    affectedSubmissionCount: number;
    commonErrorTypes?: string[] | null;
    impactRate?: number | null;
};

export type PracticeScoreDistributionItem = {
    bucket: string | null;
    minScore: number | null;
    maxScore: number | null;
    roundCount: number;
    affectedSubmissionCount: number;
    averageScore: number | null;
};

export type PracticeRoundDistributionItem = {
    roundNumber: number | null;
    roundCount: number;
    gradedCount: number;
    failedCount: number;
    processingCount: number;
    averageScore: number | null;
};

export type PracticeTrendItem = {
    date: string | null;
    submissionCount: number;
    gradedRoundCount: number;
    averageScore: number | null;
};

export type AdminPracticeInsightsSummary = {
    totalSubmissions: number;
    totalStudents: number;
    totalExercises: number;
    totalRounds: number;
    gradedRounds: number;
    failedRounds: number;
    processingRounds: number;
    averageScore: number | null;
    completionRate: number;
    failureRate: number;
    fallbackRate: number;
};

export type AdminPracticeStatusBreakdownItem = {
    status: SubmissionStatus;
    count: number;
};

export type AdminPracticeProviderBreakdownItem = {
    provider: string | null;
    model: string | null;
    roundCount: number;
    gradedCount: number;
    failedCount: number;
    fallbackCount: number;
    averageScore: number | null;
};

export type AdminPracticeInsightsResponse = {
    summary: AdminPracticeInsightsSummary;
    statusBreakdown: AdminPracticeStatusBreakdownItem[];
    providerBreakdown: AdminPracticeProviderBreakdownItem[];
    scoreDistribution?: PracticeScoreDistributionItem[];
    roundDistribution?: PracticeRoundDistributionItem[];
    trend?: PracticeTrendItem[];
    trendDateSource?: string | null;
    topIssueTypes: PracticeIssueTypeItem[];
    skillAnalytics?: PracticeSkillAnalyticsItem[];
    recentRounds: AdminEvaluationRound[];
};

export type InstructorExerciseInsightsFilters = {
    from?: string;
    to?: string;
    submissionStatus?: SubmissionStatus;
    roundStatus?: SubmissionStatus;
    roundNumber?: number;
    provider?: string;
    fallbackUsed?: boolean;
    scope?: PracticeInsightsScope;
};

export type InstructorExerciseInsightsExerciseSummary = {
    exerciseId: number;
    exerciseCode: string | null;
    exerciseTitle: string | null;
    exerciseSource: ExerciseSource;
    isPublished: boolean;
};

export type InstructorExerciseInsightsScopeSummary = {
    selectedScope: PracticeInsightsScope;
    directExerciseId: number;
    derivedAiExerciseCount: number;
    includedSubmissionCount: number;
};

export type InstructorExerciseInsightsSummary = {
    directSubmissionCount: number;
    derivedAiExerciseCount: number;
    derivedSubmissionCount: number;
    participantCount: number;
    gradedCount: number;
    failedCount: number;
    processingCount: number;
    totalRounds: number;
    averageScore: number | null;
    fallbackRate: number;
};

export type AnonymizedSubmissionSummary = {
    submissionId: number;
    exerciseScope: PracticeInsightsScope;
    submissionStatus: SubmissionStatus;
    roundsUsed: number | null;
    latestRoundStatus: SubmissionStatus | null;
    latestScore: number | null;
    submittedAt: string | null;
    gradedAt: string | null;
};

export type InstructorExerciseInsightsResponse = {
    exercise: InstructorExerciseInsightsExerciseSummary;
    scope: InstructorExerciseInsightsScopeSummary;
    summary: InstructorExerciseInsightsSummary;
    scoreDistribution?: PracticeScoreDistributionItem[];
    roundDistribution?: PracticeRoundDistributionItem[];
    trend?: PracticeTrendItem[];
    trendDateSource?: string | null;
    topIssueTypes: PracticeIssueTypeItem[];
    skillAnalytics?: PracticeSkillAnalyticsItem[];
    anonymizedSubmissionSummaries: AnonymizedSubmissionSummary[];
};

export type SubmissionStatusResponse = {
    submissionId: number;
    submissionStatus: SubmissionStatus;
    submittedAt: string | null;
    evaluationReady: boolean;
    currentRound?: number | null;
    roundsUsed?: number | null;
    maxRounds?: number | null;
    canResubmit?: boolean | null;
};

export type Submission = {
    submissionId: number;
    userId: number;
    userFullName: string;
    userEmail: string;
    exerciseId: number;
    exerciseCode: string | null;
    exerciseTitle: string;
    diagramData: Record<string, unknown> | null;
    submissionStatus: SubmissionStatus;
    createdAt: string | null;
    submittedAt: string | null;
    studentArchived?: boolean | null;
    studentArchivedAt?: string | null;
    currentRound?: number | null;
    roundsUsed?: number | null;
    maxRounds?: number | null;
    canResubmit?: boolean | null;
    evaluation?: AIEvaluation | null;
    evaluationRounds?: EvaluationRound[] | null;
};

export type KnowledgeApprovalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
export type KnowledgeScope = "SYSTEM" | "INSTRUCTOR_CONTRIBUTED";

export type KnowledgeBase = {
    kbId: number;
    kbTitle: string;
    kbContent: string;
    kbSource?: string | null;
    kbCategory?: string | null;
    kbVector?: string | null;
    isActive: boolean;
    createdAt?: string | null;
    updatedAt?: string | null;
    createdById?: number | null;
    createdByName?: string | null;
    approvalStatus: KnowledgeApprovalStatus;
    knowledgeScope: KnowledgeScope;
    reviewedById?: number | null;
    reviewedByName?: string | null;
    reviewedAt?: string | null;
    reviewNote?: string | null;
};

export type KnowledgeBaseRequest = {
    kbTitle: string;
    kbContent: string;
    kbSource?: string | null;
    kbCategory?: string | null;
    kbVector?: string | null;
    isActive?: boolean;
};

export type Skill = {
    skillId: number;
    skillName: string;
    skillDescription?: string | null;
    skillCategory?: string | null;
    isActive: boolean;
};

export type SkillRequest = {
    skillName: string;
    skillDescription?: string | null;
    skillCategory?: string | null;
    isActive?: boolean;
};

export type StudentSkillStats = {
    statsId: number;
    studentId: number;
    studentName: string;
    skillId: number;
    skillName: string;
    proficiencyLevel: number;
    attemptCount: number;
    lastEvaluatedAt?: string | null;
};

export type AiProvider = "MOCK" | "GEMINI" | "OPENAI" | "DEEPSEEK" | "LOCAL_LLAMA";
export type RetrievalMode = "VECTOR" | "KEYWORD_FALLBACK";

export type ChatRequest = {
    message: string;
    conversationId?: string;
};

export type RetrievedKnowledge = {
    kbId: number;
    kbTitle: string;
    kbCategory?: string | null;
    kbSource?: string | null;
    snippet: string;
    rank?: number | null;
    retrievalMode?: RetrievalMode | string | null;
    relevanceScore?: number | null;
    relevanceLabel?: string | null;
    knowledgeScope?: KnowledgeScope | string | null;
    approvalStatus?: KnowledgeApprovalStatus | string | null;
    contributorDisplayName?: string | null;
};

export type ChatResponse = {
    answer: string;
    sources: RetrievedKnowledge[];
    provider: AiProvider;
    model: string;
    conversationId: string;
    retrievalMode?: RetrievalMode;
};

export type ChatMessageRole = "USER" | "ASSISTANT";

export type ChatMessageHistory = {
    messageId: number;
    role: ChatMessageRole;
    content: string;
    provider?: string | null;
    model?: string | null;
    retrievalMode?: RetrievalMode | string | null;
    createdAt: string;
};

export type ChatConversationSummary = {
    conversationId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    lastMessagePreview?: string | null;
    studentArchived?: boolean | null;
    studentArchivedAt?: string | null;
};

export type ChatConversationDetail = {
    conversationId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    studentArchived?: boolean | null;
    studentArchivedAt?: string | null;
    messages: ChatMessageHistory[];
};
