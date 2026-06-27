import { useState } from "react";
import { demoChatSource, getDemoChatResponse } from "../services/demoAiResponses";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    source?: string;
};

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const initialMessages: ChatMessage[] = [
    {
        id: "welcome",
        role: "assistant",
        content: "Xin chào! Đây là demo chat hỏi đáp kiến thức CSDL. Hãy hỏi về ERD, 1NF, 2NF, 3NF, cardinality hoặc khóa ngoại.",
        source: demoChatSource,
    },
];

const DemoChatBox = () => {
    // TODO(i18n): Demo UI đang dùng text tiếng Việt hardcode.
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState("");

    const handleSend = () => {
        const trimmed = input.trim();
        if (!trimmed) return;

        const response = getDemoChatResponse(trimmed);
        setMessages((prev) => [
            ...prev,
            { id: createMessageId(), role: "user", content: trimmed },
            { id: createMessageId(), role: "assistant", content: response.answer, source: response.source },
        ]);
        setInput("");
    };

    const handleClear = () => {
        setMessages(initialMessages);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    return (
        <section className="section-card demo-section">
            <div className="demo-section__header">
                <div>
                    <h3 className="demo-section__title">Chat hỏi đáp kiến thức</h3>
                    <p className="demo-section__subtitle">
                        Trả lời cố định theo keyword, không gọi LLM thật.
                    </p>
                </div>
                <span className="demo-badge demo-badge--info">Demo - chưa gọi LLM thật</span>
            </div>
            <div className="demo-chat">
                <div className="demo-chat__messages">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`demo-chat__bubble demo-chat__bubble--${message.role}`}
                        >
                            <div>{message.content}</div>
                            {message.source && <div className="demo-chat__meta">{message.source}</div>}
                        </div>
                    ))}
                </div>
                <div className="demo-chat__input">
                    <textarea
                        className="textarea"
                        rows={2}
                        placeholder="Nhập câu hỏi về ERD, 1NF, 2NF, 3NF, cardinality, khóa ngoại..."
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="demo-chat__actions">
                        <button type="button" className="btn btn-primary" onClick={handleSend}>
                            Gửi
                        </button>
                        <button type="button" className="btn btn-outline" onClick={handleClear}>
                            Xóa hội thoại
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default DemoChatBox;
