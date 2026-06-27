import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
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
    const [error, setError] = useState<string | null>(null);
    const [historyError, setHistoryError] = useState<string | null>(null);

    const handleSignOut = () => {
        logout();
        navigate("/login");
    };

    const loadConversations = useCallback(async () => {
        try {
            const data = await chatbotApi.listConversations();
            setConversations(data);
            setHistoryError(null);
        } catch {
            setHistoryError(t("student.chatbot.historyError"));
        } finally {
            setHistoryLoading(false);
        }
    }, [t]);

    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            try {
                const data = await chatbotApi.listConversations();
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
    }, [t]);

    const handleNewChat = () => {
        setMessages([]);
        setQuestion("");
        setConversationId(undefined);
        setLatestSources([]);
        setError(null);
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

    const formatProviderMeta = (provider?: string, model?: string) => {
        if (!provider && !model) {
            return t("student.chatbot.providerUnknown");
        }
        return [provider, model].filter(Boolean).join(" / ");
    };

    const formatConversationTime = (value?: string) => {
        if (!value) {
            return "";
        }
        return new Date(value).toLocaleString();
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

    return (
        <StudentLayout title={t("student.chatbot.title")} onSignOut={handleSignOut}>
            <div className="chatbot-toolbar">
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <div>
                        <h2>{t("student.chatbot.title")}</h2>
                        <p>{t("student.chatbot.subtitle")}</p>
                    </div>
                </div>
                <button type="button" className="btn btn-outline" onClick={handleNewChat}>
                    {t("student.chatbot.newChat")}
                </button>
            </div>

            <div className="chatbot-page">
                <aside className="chatbot-history" aria-label={t("student.chatbot.history")}>
                    <div className="chatbot-history__header">
                        <h3>{t("student.chatbot.history")}</h3>
                        <button type="button" className="btn btn-outline" onClick={handleNewChat}>
                            {t("student.chatbot.newChat")}
                        </button>
                    </div>
                    {historyLoading ? (
                        <p className="chatbot-history__state">{t("student.chatbot.historyLoading")}</p>
                    ) : historyError ? (
                        <p className="chatbot-history__error">{historyError}</p>
                    ) : conversations.length === 0 ? (
                        <p className="chatbot-history__state">{t("student.chatbot.noHistory")}</p>
                    ) : (
                        <div className="chatbot-history__list">
                            {conversations.map((conversation) => (
                                <button
                                    key={conversation.conversationId}
                                    type="button"
                                    className={`chatbot-history__item${
                                        conversation.conversationId === conversationId
                                            ? " chatbot-history__item--active"
                                            : ""
                                    }`}
                                    onClick={() => handleOpenConversation(conversation.conversationId)}
                                    disabled={conversationLoading}
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
                                    {message.role === "assistant" && (
                                        <div className="chatbot-message__meta">
                                            <span>
                                                {t("student.chatbot.providerLabel")}:{" "}
                                                {formatProviderMeta(message.provider, message.model)}
                                            </span>
                                            <span>
                                                {t("student.chatbot.sourcesLabel")}:{" "}
                                                {message.sources?.length ?? 0}
                                            </span>
                                            {message.retrievalMode && (
                                                <span>Retrieval: {message.retrievalMode}</span>
                                            )}
                                        </div>
                                    )}
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
                                <article className="chatbot-source" key={source.kbId}>
                                    <div className="chatbot-source__title">
                                        <span>{index + 1}</span>
                                        {source.kbTitle}
                                    </div>
                                    <div className="chatbot-source__meta">
                                        {[source.kbCategory, source.kbSource].filter(Boolean).join(" - ")}
                                    </div>
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
