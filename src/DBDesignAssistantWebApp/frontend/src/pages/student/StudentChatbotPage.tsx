import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import {  MessageSquarePlus } from "lucide-react";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StudentLayout from "../../components/layouts/StudentLayout";
import { useAuth } from "../../hooks/useAuth";
import chatbotApi from "../../services/chatbotApi";
import type { ChatConversationSummary, ChatResponse, RetrievedKnowledge } from "../../types";
import "./StudentChatbotPage.css";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    provider?: string;
    model?: string;
    retrievalMode?: string;
    sources?: RetrievedKnowledge[];
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type ApiErrorPayload = {
    status?: number;
    message?: string;
};

type HistoryView = "active" | "archived";

type PendingConversationArchiveAction = {
    conversation: ChatConversationSummary;
    archived: boolean;
};

const StudentChatbotPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [question, setQuestion] = useState("");
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [conversations, setConversations] = useState<ChatConversationSummary[]>([]);
    const [latestSources, setLatestSources] = useState<RetrievedKnowledge[]>([]);
    const [loading, setLoading] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [conversationLoading, setConversationLoading] = useState(false);
    const [historyView, setHistoryView] = useState<HistoryView>("active");
    const [historyActionId, setHistoryActionId] = useState<string | null>(null);
    const [pendingArchiveAction, setPendingArchiveAction] =
        useState<PendingConversationArchiveAction | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const loadConversations = useCallback(async (view: HistoryView = historyView) => {
        try {
            const data = await chatbotApi.listConversations(view === "archived");
            setConversations(data);
            setHistoryError(null);
        } catch {
            setHistoryError(t("student.chatbot.historyError"));
        } finally {
            setHistoryLoading(false);
        }
    }, [historyView, t]);

    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            try {
                const data = await chatbotApi.listConversations(historyView === "archived");
                if (!isCancelled) {
                    setConversations(data);
                    setHistoryError(null);
                }
            } catch {
                if (!isCancelled) {
                    setHistoryError(t("student.chatbot.historyError"));
                }
            } finally {
                if (!isCancelled) {
                    setHistoryLoading(false);
                }
            }
        };

        load();

        return () => {
            isCancelled = true;
        };
    }, [historyView, t]);

    const handleHistoryViewChange = (view: HistoryView) => {
        if (view === historyView) {
            return;
        }
        setHistoryView(view);
        setHistoryLoading(true);
        setHistoryError(null);
    };

    const handleNewChat = () => {
        setMessages([]);
        setQuestion("");
        setConversationId(undefined);
        setLatestSources([]);
        setError(null);
        if (historyView !== "active") {
            setHistoryView("active");
            setHistoryLoading(true);
        }
    };

    const requestArchiveToggle = (conversation: ChatConversationSummary, archived: boolean) => {
        setPendingArchiveAction({ conversation, archived });
    };

    const handleArchiveToggle = async (conversation: ChatConversationSummary, archived: boolean) => {
        setHistoryActionId(conversation.conversationId);
        setHistoryError(null);
        try {
            const updated = archived
                ? await chatbotApi.archiveConversation(conversation.conversationId)
                : await chatbotApi.restoreConversation(conversation.conversationId);
            const shouldRemainInCurrentView = Boolean(updated.studentArchived) === (historyView === "archived");
            setConversations((current) => {
                if (!shouldRemainInCurrentView) {
                    return current.filter((item) => item.conversationId !== updated.conversationId);
                }
                return current.map((item) => item.conversationId === updated.conversationId ? updated : item);
            });
            if (archived && conversation.conversationId === conversationId) {
                handleNewChat();
            }
        } catch {
            setHistoryError(
                archived
                    ? t("student.chatbot.archiveError")
                    : t("student.chatbot.restoreError")
            );
        } finally {
            setHistoryActionId(null);
        }
    };

    const handleConfirmArchiveToggle = () => {
        const action = pendingArchiveAction;
        if (!action) {
            return;
        }
        setPendingArchiveAction(null);
        void handleArchiveToggle(action.conversation, action.archived);
    };

    const handleOpenConversation = async (targetConversationId: string) => {
        if (conversationLoading || targetConversationId === conversationId) {
            return;
        }

        setConversationLoading(true);
        setError(null);
        try {
            const detail = await chatbotApi.getConversation(targetConversationId);
            setConversationId(detail.conversationId);
            setLatestSources([]);
            setMessages(
                detail.messages.map((message) => ({
                    id: String(message.messageId),
                    role: message.role === "USER" ? "user" : "assistant",
                    content: message.content,
                    provider: message.provider ?? undefined,
                    model: message.model ?? undefined,
                    retrievalMode: message.retrievalMode ?? undefined,
                    sources: [],
                }))
            );
        } catch {
            setError(t("student.chatbot.openConversationError"));
        } finally {
            setConversationLoading(false);
        }
    };

    const formatConversationTime = (value?: string) => {
        if (!value) {
            return "";
        }
        return new Date(value).toLocaleString();
    };

    const formatKnowledgeScope = (scope?: string | null) => {
        if (scope === "SYSTEM") {
            return t("student.chatbot.sourceScope.system");
        }
        if (scope === "INSTRUCTOR_CONTRIBUTED") {
            return t("student.chatbot.sourceScope.instructor");
        }
        return t("student.chatbot.unknown");
    };

    const formatApprovalStatus = (status?: string | null) => {
        if (status === "APPROVED") {
            return t("student.chatbot.approval.approved");
        }
        return status || t("student.chatbot.unknown");
    };

    const formatRelevanceLabel = (label?: string | null) => {
        if (label === "HIGH") {
            return t("student.chatbot.relevance.high");
        }
        if (label === "MEDIUM") {
            return t("student.chatbot.relevance.medium");
        }
        if (label === "LOW") {
            return t("student.chatbot.relevance.low");
        }
        return label || t("student.chatbot.relevance.match");
    };

    const formatSourceRelevance = (source: RetrievedKnowledge) => {
        if (typeof source.relevanceScore === "number") {
            return t("student.chatbot.relevance.vectorScore", {
                score: source.relevanceScore.toFixed(2),
            });
        }
        return formatRelevanceLabel(source.relevanceLabel);
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        const trimmedQuestion = question.trim();
        if (!trimmedQuestion || loading) {
            return;
        }

        const userMessage: ChatMessage = {
            id: createId(),
            role: "user",
            content: trimmedQuestion,
        };
        setMessages((current) => [...current, userMessage]);
        setQuestion("");
        setLoading(true);
        setError(null);

        try {
            const response: ChatResponse = await chatbotApi.askRag({
                message: trimmedQuestion,
                conversationId,
            });
            setConversationId(response.conversationId);
            setLatestSources(response.sources ?? []);
            setMessages((current) => [
                ...current,
                {
                    id: createId(),
                    role: "assistant",
                    content: response.answer,
                    provider: response.provider,
                    model: response.model,
                    retrievalMode: response.retrievalMode,
                    sources: response.sources,
                },
            ]);
            await loadConversations();
        } catch (err: unknown) {
            if (isAxiosError<ApiErrorPayload>(err) && err.response?.status === 429) {
                setError(err.response.data?.message ?? t("student.chatbot.rateLimitError"));
            } else {
                setError(t("student.chatbot.error"));
            }
        } finally {
            setLoading(false);
        }
    };

    const isArchivedView = historyView === "archived";
    const pendingArchiveKind = pendingArchiveAction?.archived ? "archive" : "restore";

    return (
        <StudentLayout title={t("student.chatbot.title")} onSignOut={handleSignOut}>
            <ConfirmDialog
                open={Boolean(pendingArchiveAction)}
                title={t(`student.chatbot.confirmations.${pendingArchiveKind}.title`)}
                message={t(`student.chatbot.confirmations.${pendingArchiveKind}.message`)}
                confirmLabel={t(`student.chatbot.${pendingArchiveKind}`)}
                cancelLabel={t("common.cancel")}
                variant={pendingArchiveAction?.archived ? "warning" : "normal"}
                onCancel={() => setPendingArchiveAction(null)}
                onConfirm={handleConfirmArchiveToggle}
            />
            <div className="chatbot-toolbar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <div>
                        <h2>{t("student.chatbot.title")}</h2>
                        <p>{t("student.chatbot.subtitle")}</p>
                    </div>
                </div>
            </div>

            <div className="chatbot-page">
                <aside className="chatbot-history" aria-label={t("student.chatbot.history")}>
                    <div className="chatbot-history__header">
                        <h3>{t("student.chatbot.history")}</h3>
                        <button type="button" className="btn btn-outline" onClick={handleNewChat}>
                            <MessageSquarePlus size={16} aria-hidden="true" />
                            {t("student.chatbot.newChat")}
                        </button>
                    </div>
                    <div
                        className="chatbot-history__tabs"
                        role="tablist"
                        aria-label={t("student.chatbot.historyFilter")}
                    >
                        <button
                            type="button"
                            role="tab"
                            aria-selected={historyView === "active"}
                            className={`btn btn-sm ${historyView === "active" ? "btn-primary" : "btn-outline"}`}
                            onClick={() => handleHistoryViewChange("active")}
                        >
                            {t("student.chatbot.activeConversations")}
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={historyView === "archived"}
                            className={`btn btn-sm ${historyView === "archived" ? "btn-primary" : "btn-outline"}`}
                            onClick={() => handleHistoryViewChange("archived")}
                        >
                            {t("student.chatbot.archivedConversations")}
                        </button>
                    </div>
                    <p className="chatbot-history__archive-note">
                        {t("student.chatbot.archiveNote")}
                    </p>
                    {historyLoading ? (
                        <p className="chatbot-history__state">{t("student.chatbot.historyLoading")}</p>
                    ) : historyError ? (
                        <p className="chatbot-history__error">{historyError}</p>
                    ) : conversations.length === 0 ? (
                        <p className="chatbot-history__state">
                            {isArchivedView
                                ? t("student.chatbot.noArchivedHistory")
                                : t("student.chatbot.noHistory")}
                        </p>
                    ) : (
                        <div className="chatbot-history__list">
                            {conversations.map((conversation) => (
                                <article
                                    key={conversation.conversationId}
                                    className={`chatbot-history__item${
                                        conversation.conversationId === conversationId
                                            ? " chatbot-history__item--active"
                                            : ""
                                    }`}
                                >
                                    <button
                                        type="button"
                                        className="chatbot-history__open"
                                        onClick={() => handleOpenConversation(conversation.conversationId)}
                                        disabled={conversationLoading || historyActionId === conversation.conversationId}
                                    >
                                        <span className="chatbot-history__title">
                                            {conversation.title || t("student.chatbot.untitled")}
                                        </span>
                                        <span className="chatbot-history__preview">
                                            {conversation.lastMessagePreview || t("student.chatbot.noPreview")}
                                        </span>
                                        <span className="chatbot-history__time">
                                            {formatConversationTime(conversation.updatedAt)}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline chatbot-history__action"
                                        onClick={() => requestArchiveToggle(conversation, !isArchivedView)}
                                        disabled={historyActionId === conversation.conversationId}
                                    >
                                        
                                        {historyActionId === conversation.conversationId
                                            ? t("student.chatbot.updatingArchive")
                                            : isArchivedView
                                                ? t("student.chatbot.restore")
                                                : t("student.chatbot.archive")}
                                    </button>
                                </article>
                            ))}
                        </div>
                    )}
                </aside>

                <section className="chatbot-panel" aria-label={t("student.chatbot.messages")}>
                    <div className="chatbot-messages">
                        {messages.length === 0 ? (
                            <div className="chatbot-empty">
                                <h3>{t("student.chatbot.emptyTitle")}</h3>
                                <p>{t("student.chatbot.emptyBody")}</p>
                            </div>
                        ) : (
                            messages.map((message) => (
                                <article
                                    key={message.id}
                                    className={`chatbot-message chatbot-message--${message.role}`}
                                >
                                    {message.content}
                                </article>
                            ))
                        )}
                        {loading && (
                            <article className="chatbot-message chatbot-message--assistant chatbot-message--loading">
                                <span className="chatbot-loading-dot" aria-hidden="true" />
                                <span>{t("student.chatbot.loading")}</span>
                            </article>
                        )}
                        {conversationLoading && (
                            <article className="chatbot-message chatbot-message--assistant chatbot-message--loading">
                                <span className="chatbot-loading-dot" aria-hidden="true" />
                                <span>{t("student.chatbot.openingConversation")}</span>
                            </article>
                        )}
                    </div>

                    {error && <div className="chatbot-error">{error}</div>}

                    <form className="chatbot-form" onSubmit={handleSubmit}>
                        <textarea
                            className="input"
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            placeholder={t("student.chatbot.placeholder")}
                            disabled={loading}
                        />
                        <button type="submit" className="btn btn-primary" disabled={loading || !question.trim()}>
                            {loading ? t("student.chatbot.sending") : t("student.chatbot.send")}
                        </button>
                    </form>
                </section>

                <aside className="chatbot-sources">
                    <div className="chatbot-sources__header">
                        <h3>{t("student.chatbot.sources")}</h3>
                        <span>{latestSources.length}</span>
                    </div>
                    {latestSources.length === 0 ? (
                        <p className="chatbot-source__snippet">{t("student.chatbot.noSources")}</p>
                    ) : (
                        <div className="chatbot-source-list">
                            {latestSources.map((source, index) => (
                                <article className="chatbot-source" key={`${source.kbId}-${source.rank ?? index}`}>
                                    <div className="chatbot-source__title">
                                        <span>{source.rank ?? index + 1}</span>
                                        <strong>{source.kbTitle}</strong>
                                    </div>
                                    <div className="chatbot-source__badges">
                                        <span>{formatKnowledgeScope(source.knowledgeScope)}</span>
                                        {source.approvalStatus && (
                                            <span>{formatApprovalStatus(source.approvalStatus)}</span>
                                        )}
                                        <span>{formatSourceRelevance(source)}</span>
                                    </div>
                                    <dl className="chatbot-source__meta-list">
                                        {source.kbCategory && (
                                            <div>
                                                <dt>{t("student.chatbot.sourceCategory")}</dt>
                                                <dd>{source.kbCategory}</dd>
                                            </div>
                                        )}
                                        {source.kbSource && (
                                            <div>
                                                <dt>{t("student.chatbot.sourceOrigin")}</dt>
                                                <dd>{source.kbSource}</dd>
                                            </div>
                                        )}
                                        {source.contributorDisplayName && (
                                            <div>
                                                <dt>{t("student.chatbot.sourceContributor")}</dt>
                                                <dd>{source.contributorDisplayName}</dd>
                                            </div>
                                        )}
                                    </dl>
                                    <div className="chatbot-source__snippet">{source.snippet}</div>
                                </article>
                            ))}
                        </div>
                    )}
                </aside>
            </div>
        </StudentLayout>
    );
};

export default StudentChatbotPage;
