export type DemoExercise = {
    title: string;
    overview: string;
    requirements: string[];
    constraints: string[];
    difficulty: string;
    estimatedTime: string;
};

export type DemoProblem = {
    source: "manual" | "generated";
    title: string;
    overview: string;
    requirements: string[];
    constraints: string[];
    meta?: {
        topic?: string;
        difficulty?: string;
        notes?: string;
        keywords?: string;
        context?: string;
        estimatedTime?: string;
        sourceLabel?: string;
    };
};

export const demoExercise: DemoExercise = {
    title: "Thiết kế cơ sở dữ liệu quản lý thư viện",
    overview:
        "Một thư viện muốn quản lý sách, thành viên, danh mục và quá trình mượn trả. Hãy thiết kế ERD ở mức khái niệm và logic.",
    requirements: [
        "Quản lý sách, tác giả và danh mục sách.",
        "Theo dõi thông tin thành viên (họ tên, liên hệ, ngày đăng ký).",
        "Ghi nhận từng giao dịch mượn/trả theo ngày mượn và ngày trả.",
        "Một giao dịch mượn có thể bao gồm nhiều cuốn sách.",
        "Lưu trạng thái mượn/trả (đang mượn, đã trả).",
    ],
    constraints: [
        "ISBN là duy nhất cho mỗi cuốn sách.",
        "Mỗi sách thuộc một danh mục chính.",
        "Một thành viên có thể mượn nhiều lần và mỗi lần mượn có nhiều sách.",
        "Tránh thuộc tính đa trị; ưu tiên chuẩn hóa dữ liệu.",
    ],
    difficulty: "Trung bình",
    estimatedTime: "30-45 phút",
};

export type DemoEntity = {
    id: string;
    name: string;
    attributes: string[];
    note?: string;
};

export type DemoRelationship = {
    id: string;
    name: string;
    from: string;
    to: string;
    cardinality: string;
    note?: string;
};

export const demoEntityPool: DemoEntity[] = [
    {
        id: "book",
        name: "Book",
        attributes: ["BookId (PK)", "Title", "ISBN", "PublishedYear", "CategoryId (FK)"],
    },
    {
        id: "member",
        name: "Member",
        attributes: ["MemberId (PK)", "FullName", "Email", "Phone", "JoinDate", "Status"],
    },
    {
        id: "borrowing",
        name: "Borrowing",
        attributes: ["BorrowingId (PK)", "BorrowDate", "ReturnDate", "MemberId (FK)", "Status"],
    },
    {
        id: "category",
        name: "Category",
        attributes: ["CategoryId (PK)", "Name", "Description"],
    },
    {
        id: "author",
        name: "Author",
        attributes: ["AuthorId (PK)", "FullName", "Nationality"],
    },
];

export const demoRelationshipPool: DemoRelationship[] = [
    {
        id: "member-borrowing",
        name: "Member borrows",
        from: "Member",
        to: "Borrowing",
        cardinality: "1 - N",
        note: "Một thành viên có thể mượn nhiều lần.",
    },
    {
        id: "borrowing-book",
        name: "Borrowing includes Book",
        from: "Borrowing",
        to: "Book",
        cardinality: "N - N",
        note: "Cần bảng trung gian để tách chi tiết mượn.",
    },
    {
        id: "book-category",
        name: "Book belongs to Category",
        from: "Book",
        to: "Category",
        cardinality: "N - 1",
        note: "Một danh mục chứa nhiều sách.",
    },
    {
        id: "book-author",
        name: "Book written by Author",
        from: "Book",
        to: "Author",
        cardinality: "N - N",
        note: "Một sách có thể có nhiều tác giả.",
    },
];

export const demoFeedbackRounds: string[][] = [
    [
        "Thiếu thực thể Loan/Borrowing để biểu diễn giao dịch mượn sách.",
        "Quan hệ Book - Member chưa thể hiện đúng cardinality.",
        "Một số thuộc tính đa trị cần tách ra.",
    ],
    [
        "Đã cải thiện thực thể giao dịch mượn.",
        "Cần bổ sung khóa ngoại giữa Borrowing và Member.",
        "Cần xác định rõ ngày mượn/ngày trả.",
    ],
    [
        "Sơ đồ đã hợp lý hơn ở mức khái niệm.",
        "Cần kiểm tra lại chuẩn hóa 1NF cho thuộc tính danh sách.",
        "Nên rà soát toàn vẹn tham chiếu trước khi chuyển sang mô hình logic.",
    ],
];

export const demoChatSource = "Nguồn: KnowledgeBase seed demo";

export type DemoChatResponse = {
    answer: string;
    source: string;
};

const normalizeQuestion = (value: string) => {
    const lower = value.toLowerCase();
    const ascii = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return { lower, ascii };
};

export const getDemoChatResponse = (question: string): DemoChatResponse => {
    const { lower, ascii } = normalizeQuestion(question);

    const has = (keyword: string) => lower.includes(keyword) || ascii.includes(keyword);

    if (has("erd")) {
        return {
            answer:
                "ERD (Entity Relationship Diagram) mô tả các thực thể, thuộc tính và mối quan hệ giữa chúng. ERD giúp chuyển yêu cầu nghiệp vụ thành mô hình dữ liệu rõ ràng.",
            source: demoChatSource,
        };
    }

    if (has("cardinality") || has("ban so") || has("bản số")) {
        return {
            answer:
                "Cardinality (bản số) cho biết mỗi bản ghi liên quan bao nhiêu bản ghi ở phía kia. Thường gặp là 1-1, 1-N và N-N, giúp xác định quan hệ chính xác.",
            source: demoChatSource,
        };
    }

    if (has("1nf")) {
        return {
            answer:
                "1NF yêu cầu mỗi thuộc tính là atomic (không chứa danh sách), mỗi ô chỉ chứa 1 giá trị và không có nhóm lặp.",
            source: demoChatSource,
        };
    }

    if (has("2nf")) {
        return {
            answer:
                "2NF yêu cầu thỏa 1NF và mọi thuộc tính không khóa phụ thuộc đầy đủ vào khóa chính (không có phụ thuộc từng phần).",
            source: demoChatSource,
        };
    }

    if (has("3nf")) {
        return {
            answer:
                "3NF yêu cầu thỏa 2NF và không có phụ thuộc bắc cầu giữa các thuộc tính không khóa.",
            source: demoChatSource,
        };
    }

    if (has("khóa ngoại") || has("khoa ngoai") || has("foreign key")) {
        return {
            answer:
                "Khóa ngoại (foreign key) là thuộc tính liên kết giữa các bảng, đảm bảo toàn vẹn tham chiếu: giá trị phải tồn tại ở bảng cha.",
            source: demoChatSource,
        };
    }

    return {
        answer:
            "Đây là demo UI, chưa gọi LLM thật. Bạn có thể hỏi về ERD, 1NF, 2NF, 3NF, cardinality hoặc khóa ngoại để xem câu trả lời mẫu.",
        source: demoChatSource,
    };
};
