package com.dbdesignassitant.backend.utils;

import com.dbdesignassitant.backend.entities.Exercise;
import com.dbdesignassitant.backend.entities.KnowledgeBase;
import com.dbdesignassitant.backend.entities.Role;
import com.dbdesignassitant.backend.entities.SampleSolution;
import com.dbdesignassitant.backend.entities.Skill;
import com.dbdesignassitant.backend.entities.User;
import com.dbdesignassitant.backend.enums.ExerciseSource;
import com.dbdesignassitant.backend.enums.KnowledgeApprovalStatus;
import com.dbdesignassitant.backend.enums.KnowledgeScope;
import com.dbdesignassitant.backend.enums.RoleName;
import com.dbdesignassitant.backend.enums.UserGender;
import com.dbdesignassitant.backend.repositories.ExerciseRepository;
import com.dbdesignassitant.backend.repositories.KnowledgeBaseRepository;
import com.dbdesignassitant.backend.repositories.RoleRepository;
import com.dbdesignassitant.backend.repositories.SampleSolutionRepository;
import com.dbdesignassitant.backend.repositories.SkillRepository;
import com.dbdesignassitant.backend.repositories.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.InputStream;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private static final String LOCAL_DEV_DEFAULT_PASSWORD = "Password123!";
    private static final String SEED_SOURCE = "SESSION_70C_DATA_SEEDER";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ExerciseRepository exerciseRepository;
    private final SampleSolutionRepository sampleSolutionRepository;
    private final KnowledgeBaseRepository knowledgeBaseRepository;
    private final SkillRepository skillRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    @Value("${app.seed.enabled:true}")
    private boolean seedEnabled;

    @Value("${app.seed.default-password:Password123!}")
    private String defaultSeedPassword;

    @Value("${app.seed.admin-password:}")
    private String adminSeedPassword;

    @Value("${app.seed.instructor-password:}")
    private String instructorSeedPassword;

    @Value("${app.seed.student-password:}")
    private String studentSeedPassword;

    @Value("${app.seed.reset-existing-passwords:false}")
    private boolean resetExistingPasswords;

    @Override
    public void run(String... args) {
        if (!seedEnabled) {
            return;
        }

        Role adminRole = ensureRole(RoleName.ADMIN);
        Role instructorRole = ensureRole(RoleName.INSTRUCTOR);
        Role studentRole = ensureRole(RoleName.STUDENT);

        User admin = ensureUser(
                "admin@dbdesign.local",
                "Admin Demo",
                UserGender.OTHER,
                LocalDate.of(1995, 1, 12),
                adminRole,
                passwordFor(RoleName.ADMIN));
        User instructor = ensureUser(
                "instructor@dbdesign.local",
                "Instructor Demo",
                UserGender.FEMALE,
                LocalDate.of(1992, 6, 20),
                instructorRole,
                passwordFor(RoleName.INSTRUCTOR));
        ensureUser(
                "student@dbdesign.local",
                "Student Demo",
                UserGender.MALE,
                LocalDate.of(2003, 9, 15),
                studentRole,
                passwordFor(RoleName.STUDENT));

        seedKnowledgeBase(admin);
        seedManualExercises(admin, instructor);
        seedSkills();
        fillMissingExerciseCodes();
    }

    private Role ensureRole(RoleName roleName) {
        return roleRepository.findByRoleName(roleName)
                .orElseGet(() -> roleRepository.save(Role.builder().roleName(roleName).build()));
    }

    private User ensureUser(
            String email,
            String fullName,
            UserGender gender,
            LocalDate dob,
            Role role,
            String rawPassword) {
        Optional<User> existingUser = userRepository.findByUserEmail(email);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (resetExistingPasswords) {
                user.setPasswordHash(passwordEncoder.encode(rawPassword));
                return userRepository.save(user);
            }
            return user;
        }

        return userRepository.save(User.builder()
                .userEmail(email)
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName(fullName)
                .userGender(gender)
                .userDob(dob)
                .userPhone("0900000000")
                .userAddress("Seed demo address")
                .role(role)
                .isActive(true)
                .build());
    }

    private String passwordFor(RoleName roleName) {
        return switch (roleName) {
            case ADMIN -> firstNotBlank(adminSeedPassword, defaultPassword());
            case INSTRUCTOR -> firstNotBlank(instructorSeedPassword, defaultPassword());
            case STUDENT -> firstNotBlank(studentSeedPassword, defaultPassword());
        };
    }

    private String defaultPassword() {
        return firstNotBlank(defaultSeedPassword, LOCAL_DEV_DEFAULT_PASSWORD);
    }

    private String firstNotBlank(String candidate, String fallback) {
        return candidate == null || candidate.isBlank() ? fallback : candidate;
    }

    private Map<String, Exercise> seedManualExercises(User admin, User instructor) {
        Map<String, Exercise> exercises = new LinkedHashMap<>();
        exercises.put("library", ensureManualExercise(
                "MANUAL-000001",
                "Quản lý mượn trả thư viện",
                "Thiết kế ERD cho thư viện quản lý sách, tác giả, độc giả, phiếu mượn và từng cuốn sách trong phiếu mượn.",
                instructor,
                List.of("thư viện", "mượn trả", "quan hệ nhiều-nhiều"),
                List.of(
                        "Quản lý sách với ISBN, tiêu đề, năm xuất bản và thông tin phân loại.",
                        "Theo dõi độc giả và lịch sử mượn trả của từng độc giả.",
                        "Một phiếu mượn có thể gồm nhiều sách, và mỗi sách có thể xuất hiện trong nhiều phiếu mượn theo thời gian."),
                List.of(
                        "Email của độc giả phải duy nhất.",
                        "Mỗi dòng chi tiết phiếu mượn tham chiếu đúng một cuốn sách.",
                        "Ngày trả không được trước ngày mượn."),
                librarySolution()));
        exercises.put("hotel", ensureManualExercise(
                "MANUAL-000002",
                "Quản lý đặt phòng khách sạn",
                "Thiết kế ERD cho khách sạn nhỏ quản lý khách hàng, loại phòng, phòng, đặt phòng và thanh toán.",
                admin,
                List.of("khách sạn", "đặt phòng", "thanh toán"),
                List.of(
                        "Khách hàng có thể tạo đơn đặt cho một hoặc nhiều phòng.",
                        "Mỗi phòng thuộc một loại phòng và có thể được đặt nhiều lần ở các khoảng thời gian khác nhau.",
                        "Một đơn đặt phòng có thể phát sinh một hoặc nhiều khoản thanh toán."),
                List.of(
                        "Số phòng phải duy nhất.",
                        "Cần lưu khoảng ngày nhận phòng và trả phòng của từng đơn đặt.",
                        "Số tiền thanh toán phải lớn hơn 0."),
                hotelSolution()));
        exercises.put("sales", ensureManualExercise(
                "MANUAL-000003",
                "Quản lý đơn hàng bán lẻ",
                "Thiết kế ERD cho hệ thống bán lẻ quản lý khách hàng, sản phẩm, đơn hàng, dòng đơn hàng và thanh toán.",
                admin,
                List.of("bán hàng", "đơn hàng", "tồn kho"),
                List.of(
                        "Khách hàng có thể đặt nhiều đơn hàng.",
                        "Mỗi đơn hàng gồm nhiều dòng chi tiết sản phẩm.",
                        "Sản phẩm có mã SKU, đơn giá hiện tại và số lượng tồn kho."),
                List.of(
                        "Mã SKU phải duy nhất.",
                        "Số lượng trên dòng đơn hàng phải lớn hơn 0.",
                        "Tổng tiền đơn hàng nên suy ra từ các dòng đơn hàng thay vì lưu lặp tùy tiện."),
                salesSolution()));
        exercises.put("course", ensureManualExercise(
                "MANUAL-000004",
                "Quản lý khóa học và lớp học",
                "Thiết kế ERD cho hệ thống quản lý học phần, lớp mở, giảng viên, sinh viên và đăng ký học.",
                instructor,
                List.of("khóa học", "lớp học", "đăng ký học"),
                List.of(
                        "Một học phần có thể mở nhiều lớp học phần.",
                        "Sinh viên đăng ký vào các lớp học phần cụ thể.",
                        "Giảng viên được phân công giảng dạy lớp học phần."),
                List.of(
                        "Mã học phần phải duy nhất.",
                        "Một sinh viên không được đăng ký trùng cùng một lớp học phần.",
                        "Bản ghi đăng ký cần lưu trạng thái và điểm nếu có."),
                courseSolution()));
        exercises.put("clinic", ensureManualExercise(
                "MANUAL-000005",
                "Quản lý lịch hẹn phòng khám",
                "Thiết kế ERD cho phòng khám quản lý bệnh nhân, bác sĩ, lịch hẹn và các dịch vụ y tế trong buổi khám.",
                instructor,
                List.of("phòng khám", "lịch hẹn", "dịch vụ y tế"),
                List.of(
                        "Bệnh nhân đặt lịch hẹn với bác sĩ.",
                        "Một lịch hẹn có thể bao gồm nhiều dịch vụ y tế.",
                        "Bác sĩ phụ trách lịch hẹn và có thể ghi nhận kết quả khám sau buổi hẹn."),
                List.of(
                        "Số chứng chỉ hành nghề của bác sĩ phải duy nhất.",
                        "Cần lưu thời điểm lịch hẹn và trạng thái lịch hẹn.",
                        "Mỗi dịch vụ sử dụng trong lịch hẹn phải tham chiếu đến danh mục dịch vụ y tế."),
                clinicSolution()));
        return exercises;
    }

    private Exercise ensureManualExercise(
            String exerciseCode,
            String title,
            String description,
            User createdBy,
            List<String> tags,
            List<String> functionalRequirements,
            List<String> dataConstraints,
            Map<String, Object> sampleSolution) {
        Exercise exercise = exerciseRepository.findByExerciseCode(exerciseCode)
                .orElseGet(Exercise::new);

        exercise.setExTitle(title);
        exercise.setExDescription(description);
        exercise.setScenarioData(scenarioData(
                title,
                description,
                functionalRequirements,
                dataConstraints,
                tags));
        exercise.setExerciseSource(ExerciseSource.MANUAL);
        exercise.setExerciseCode(exerciseCode);
        exercise.setCreatedBy(createdBy);
        exercise.setOwnerStudent(null);
        exercise.setBaseExercise(null);
        exercise.setIsPublished(true);
        exercise.setStudentArchived(false);
        exercise.setStudentArchivedAt(null);

        Exercise savedExercise = exerciseRepository.save(exercise);
        upsertSampleSolution(savedExercise, sampleSolution);
        return savedExercise;
    }

    private Map<String, Object> scenarioData(
            String title,
            String businessContext,
            List<String> functionalRequirements,
            List<String> dataConstraints,
            List<String> tags) {
        return mapOf(
                "businessContext", businessContext,
                "requirements", List.of(
                        "Xác định các thực thể cốt lõi và thuộc tính của từng thực thể.",
                        "Xác định khóa chính và khóa ngoại phù hợp.",
                        "Mô hình hóa các mối quan hệ kèm bản số ở hai đầu quan hệ.",
                        "Kiểm tra chuẩn hóa cơ bản đến 3NF khi phù hợp."),
                "functionalRequirements", functionalRequirements,
                "dataConstraints", dataConstraints,
                "designScopeHints", List.of(
                        "Tập trung vào thiết kế cơ sở dữ liệu mức khái niệm và logic.",
                        "Không cần mô hình hóa chỉ mục vật lý hoặc chi tiết lưu trữ phụ thuộc triển khai.",
                        "Dùng thực thể kết hợp cho quan hệ nhiều-nhiều, đặc biệt khi quan hệ có thuộc tính riêng."),
                "tags", tags,
                "metadata", mapOf(
                        "seedSource", SEED_SOURCE,
                        "seedTitle", title,
                        "version", 1));
    }

    private void upsertSampleSolution(Exercise exercise, Map<String, Object> solutionData) {
        SampleSolution sampleSolution = sampleSolutionRepository.findByExerciseExerciseId(exercise.getExerciseId())
                .orElseGet(() -> SampleSolution.builder().exercise(exercise).build());
        sampleSolution.setExercise(exercise);
        sampleSolution.setSolutionData(solutionData);
        sampleSolutionRepository.save(sampleSolution);
    }

    private void seedKnowledgeBase(User admin) {
        try {
            ClassPathResource resource = new ClassPathResource("seed/knowledge_base_seed.json");
            try (InputStream inputStream = resource.getInputStream()) {
                List<Map<String, String>> kbList = objectMapper.readValue(inputStream, new TypeReference<>() {});
                for (Map<String, String> item : kbList) {
                    String title = item.get("kbTitle");
                    String source = item.get("kbSource");
                    KnowledgeBase kb = findSeedKnowledgeBase(title, source).orElseGet(KnowledgeBase::new);

                    kb.setKbTitle(title);
                    kb.setKbContent(item.get("kbContent"));
                    kb.setKbCategory(item.get("kbCategory"));
                    kb.setKbSource(source);
                    kb.setIsActive(true);
                    kb.setCreatedBy(admin);
                    kb.setApprovalStatus(KnowledgeApprovalStatus.APPROVED);
                    kb.setKnowledgeScope(KnowledgeScope.SYSTEM);
                    kb.setReviewedBy(admin);
                    kb.setReviewedAt(LocalDateTime.now());
                    kb.setReviewNote("Seeded from docs/DATABASE_KNOWLEDGE.md");

                    knowledgeBaseRepository.save(kb);
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to seed knowledge base: " + e.getMessage());
        }
    }

    private Optional<KnowledgeBase> findSeedKnowledgeBase(String title, String source) {
        List<KnowledgeBase> existingRows = knowledgeBaseRepository.findAll();
        String normalizedTitle = normalizeSeedTitle(title);
        Optional<KnowledgeBase> exactMatch = existingRows.stream()
                .filter(existing -> Objects.equals(normalizedTitle, normalizeSeedTitle(existing.getKbTitle()))
                        && Objects.equals(source, existing.getKbSource()))
                .findFirst();
        if (exactMatch.isPresent()) {
            return exactMatch;
        }
        return existingRows.stream()
                .filter(existing -> Objects.equals(normalizedTitle, normalizeSeedTitle(existing.getKbTitle()))
                        && existing.getKnowledgeScope() == KnowledgeScope.SYSTEM)
                .findFirst();
    }

    private String normalizeSeedTitle(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase(Locale.ROOT);
        return normalized.replaceAll("[^a-z0-9]+", " ").trim();
    }

    private void seedSkills() {
        ensureSkill(
                "Entity modeling",
                "Identify entities from business requirements.",
                "ENTITY_MODELING");
        ensureSkill(
                "Attributes and keys",
                "Assign attributes and primary keys to the correct entities.",
                "ATTRIBUTE_AND_KEY");
        ensureSkill(
                "Relationship modeling",
                "Identify relationships and associative entities.",
                "RELATIONSHIP_MODELING");
        ensureSkill(
                "Cardinality",
                "Choose correct endpoint cardinalities.",
                "CARDINALITY");
        ensureSkill(
                "Normalization",
                "Detect redundancy, partial dependency, transitive dependency, and normal form issues.",
                "NORMALIZATION");
        ensureSkill(
                "Integrity constraints",
                "Use primary keys, foreign keys, and referential integrity constraints correctly.",
                "INTEGRITY_CONSTRAINT");
    }

    private void ensureSkill(String name, String description, String category) {
        Skill skill = skillRepository.findAll().stream()
                .filter(existing -> name.equals(existing.getSkillName()))
                .findFirst()
                .orElseGet(Skill::new);
        skill.setSkillName(name);
        skill.setSkillDescription(description);
        skill.setSkillCategory(category);
        skill.setIsActive(true);
        skillRepository.save(skill);
    }

    private void fillMissingExerciseCodes() {
        for (Exercise exercise : exerciseRepository.findAll()) {
            boolean updated = false;
            if (exercise.getExerciseSource() == null) {
                exercise.setExerciseSource(ExerciseSource.MANUAL);
                updated = true;
            }
            if (exercise.getExerciseCode() == null || exercise.getExerciseCode().isBlank()) {
                String code = String.format("MANUAL-%06d", exercise.getExerciseId());
                if (!exerciseRepository.existsByExerciseCode(code)) {
                    exercise.setExerciseCode(code);
                    updated = true;
                }
            }
            if (updated) {
                exerciseRepository.save(exercise);
            }
        }
    }

    private Map<String, Object> librarySolution() {
        return solutionData(
                List.of(
                        entity("book", "Book", 60, 80,
                                attr("book_id", "book_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("isbn", "isbn", false, "VARCHAR(20)", "ISBN duy nhất của sách"),
                                attr("title", "title", false, "VARCHAR(255)", "Tiêu đề sách"),
                                attr("published_year", "published_year", false, "INTEGER", "Năm xuất bản")),
                        entity("author", "Author", 360, 80,
                                attr("author_id", "author_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên tác giả")),
                        entity("member", "Member", 60, 340,
                                attr("member_id", "member_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên độc giả"),
                                attr("email", "email", false, "VARCHAR(255)", "Email độc giả duy nhất")),
                        entity("loan", "Loan", 360, 340,
                                attr("loan_id", "loan_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("member_id", "member_id", false, "BIGINT", "Khóa ngoại đến Member"),
                                attr("borrowed_at", "borrowed_at", false, "DATE", "Ngày mượn"),
                                attr("returned_at", "returned_at", false, "DATE", "Ngày trả")),
                        entity("loan_item", "LoanItem", 660, 340,
                                attr("loan_item_id", "loan_item_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("loan_id", "loan_id", false, "BIGINT", "Khóa ngoại đến Loan"),
                                attr("book_id", "book_id", false, "BIGINT", "Khóa ngoại đến Book"))),
                List.of(
                        relationship("rel_book_author", "written_by", "book", "author", "0-N", "1-N"),
                        relationship("rel_member_loan", "places", "member", "loan", "1-1", "0-N"),
                        relationship("rel_loan_item", "contains", "loan", "loan_item", "1-1", "1-N"),
                        relationship("rel_book_item", "borrows_book", "book", "loan_item", "1-1", "0-N")));
    }

    private Map<String, Object> hotelSolution() {
        return solutionData(
                List.of(
                        entity("guest", "Guest", 60, 80,
                                attr("guest_id", "guest_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên khách hàng"),
                                attr("phone", "phone", false, "VARCHAR(30)", "Số điện thoại liên hệ")),
                        entity("room_type", "RoomType", 360, 80,
                                attr("room_type_id", "room_type_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("type_name", "type_name", false, "VARCHAR(100)", "Tên loại phòng"),
                                attr("base_price", "base_price", false, "DECIMAL", "Giá mặc định")),
                        entity("room", "Room", 660, 80,
                                attr("room_id", "room_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("room_type_id", "room_type_id", false, "BIGINT", "Khóa ngoại đến RoomType"),
                                attr("room_number", "room_number", false, "VARCHAR(20)", "Số phòng duy nhất")),
                        entity("booking", "Booking", 360, 340,
                                attr("booking_id", "booking_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("guest_id", "guest_id", false, "BIGINT", "Khóa ngoại đến Guest"),
                                attr("check_in_date", "check_in_date", false, "DATE", "Ngày nhận phòng"),
                                attr("check_out_date", "check_out_date", false, "DATE", "Ngày trả phòng"),
                                attr("status", "status", false, "VARCHAR(30)", "Trạng thái đặt phòng")),
                        entity("booking_room", "BookingRoom", 660, 340,
                                attr("booking_room_id", "booking_room_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("booking_id", "booking_id", false, "BIGINT", "Khóa ngoại đến Booking"),
                                attr("room_id", "room_id", false, "BIGINT", "Khóa ngoại đến Room")),
                        entity("payment", "Payment", 60, 340,
                                attr("payment_id", "payment_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("booking_id", "booking_id", false, "BIGINT", "Khóa ngoại đến Booking"),
                                attr("amount", "amount", false, "DECIMAL", "Số tiền thanh toán"))),
                List.of(
                        relationship("rel_guest_booking", "creates", "guest", "booking", "1-1", "0-N"),
                        relationship("rel_type_room", "classifies", "room_type", "room", "1-1", "0-N"),
                        relationship("rel_booking_room", "includes", "booking", "booking_room", "1-1", "1-N"),
                        relationship("rel_room_booking_room", "reserved_room", "room", "booking_room", "1-1", "0-N"),
                        relationship("rel_booking_payment", "paid_by", "booking", "payment", "1-1", "0-N")));
    }

    private Map<String, Object> salesSolution() {
        return solutionData(
                List.of(
                        entity("customer", "Customer", 60, 80,
                                attr("customer_id", "customer_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên khách hàng"),
                                attr("email", "email", false, "VARCHAR(255)", "Email duy nhất")),
                        entity("product", "Product", 660, 80,
                                attr("product_id", "product_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("sku", "sku", false, "VARCHAR(50)", "Mã SKU duy nhất"),
                                attr("product_name", "product_name", false, "VARCHAR(255)", "Tên sản phẩm"),
                                attr("unit_price", "unit_price", false, "DECIMAL", "Đơn giá hiện tại")),
                        entity("sales_order", "SalesOrder", 360, 260,
                                attr("order_id", "order_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("customer_id", "customer_id", false, "BIGINT", "Khóa ngoại đến Customer"),
                                attr("ordered_at", "ordered_at", false, "TIMESTAMP", "Thời điểm đặt hàng"),
                                attr("status", "status", false, "VARCHAR(30)", "Trạng thái đơn hàng")),
                        entity("order_line", "OrderLine", 660, 260,
                                attr("order_line_id", "order_line_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("order_id", "order_id", false, "BIGINT", "Khóa ngoại đến SalesOrder"),
                                attr("product_id", "product_id", false, "BIGINT", "Khóa ngoại đến Product"),
                                attr("quantity", "quantity", false, "INTEGER", "Số lượng đặt"),
                                attr("unit_price", "unit_price", false, "DECIMAL", "Đơn giá tại thời điểm đặt")),
                        entity("payment", "Payment", 60, 420,
                                attr("payment_id", "payment_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("order_id", "order_id", false, "BIGINT", "Khóa ngoại đến SalesOrder"),
                                attr("amount", "amount", false, "DECIMAL", "Số tiền thanh toán"))),
                List.of(
                        relationship("rel_customer_order", "places", "customer", "sales_order", "1-1", "0-N"),
                        relationship("rel_order_line", "contains", "sales_order", "order_line", "1-1", "1-N"),
                        relationship("rel_product_line", "sold_as", "product", "order_line", "1-1", "0-N"),
                        relationship("rel_order_payment", "paid_by", "sales_order", "payment", "1-1", "0-N")));
    }

    private Map<String, Object> courseSolution() {
        return solutionData(
                List.of(
                        entity("course", "Course", 60, 80,
                                attr("course_id", "course_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("course_code", "course_code", false, "VARCHAR(30)", "Mã học phần duy nhất"),
                                attr("course_name", "course_name", false, "VARCHAR(255)", "Tên học phần")),
                        entity("instructor", "Instructor", 360, 80,
                                attr("instructor_id", "instructor_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên giảng viên")),
                        entity("class_section", "ClassSection", 360, 300,
                                attr("class_section_id", "class_section_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("course_id", "course_id", false, "BIGINT", "Khóa ngoại đến Course"),
                                attr("instructor_id", "instructor_id", false, "BIGINT", "Khóa ngoại đến Instructor"),
                                attr("semester", "semester", false, "VARCHAR(30)", "Học kỳ")),
                        entity("student", "Student", 60, 300,
                                attr("student_id", "student_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("student_code", "student_code", false, "VARCHAR(30)", "Mã sinh viên duy nhất"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên sinh viên")),
                        entity("enrollment", "Enrollment", 660, 300,
                                attr("enrollment_id", "enrollment_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("student_id", "student_id", false, "BIGINT", "Khóa ngoại đến Student"),
                                attr("class_section_id", "class_section_id", false, "BIGINT", "Khóa ngoại đến ClassSection"),
                                attr("status", "status", false, "VARCHAR(30)", "Trạng thái đăng ký"),
                                attr("grade", "grade", false, "VARCHAR(10)", "Điểm nếu có"))),
                List.of(
                        relationship("rel_course_section", "opens", "course", "class_section", "1-1", "0-N"),
                        relationship("rel_instructor_section", "teaches", "instructor", "class_section", "1-1", "0-N"),
                        relationship("rel_student_enrollment", "enrolls", "student", "enrollment", "1-1", "0-N"),
                        relationship("rel_section_enrollment", "has", "class_section", "enrollment", "1-1", "0-N")));
    }

    private Map<String, Object> clinicSolution() {
        return solutionData(
                List.of(
                        entity("patient", "Patient", 60, 80,
                                attr("patient_id", "patient_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên bệnh nhân"),
                                attr("phone", "phone", false, "VARCHAR(30)", "Số điện thoại")),
                        entity("doctor", "Doctor", 360, 80,
                                attr("doctor_id", "doctor_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("full_name", "full_name", false, "VARCHAR(255)", "Tên bác sĩ"),
                                attr("license_number", "license_number", false, "VARCHAR(50)", "Số chứng chỉ hành nghề duy nhất")),
                        entity("appointment", "Appointment", 360, 320,
                                attr("appointment_id", "appointment_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("patient_id", "patient_id", false, "BIGINT", "Khóa ngoại đến Patient"),
                                attr("doctor_id", "doctor_id", false, "BIGINT", "Khóa ngoại đến Doctor"),
                                attr("appointment_time", "appointment_time", false, "TIMESTAMP", "Thời điểm hẹn"),
                                attr("status", "status", false, "VARCHAR(30)", "Trạng thái lịch hẹn")),
                        entity("medical_service", "MedicalService", 660, 80,
                                attr("service_id", "service_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("service_name", "service_name", false, "VARCHAR(255)", "Tên dịch vụ"),
                                attr("base_fee", "base_fee", false, "DECIMAL", "Phí mặc định")),
                        entity("appointment_service", "AppointmentService", 660, 320,
                                attr("appointment_service_id", "appointment_service_id", true, "BIGINT", "Khóa chính thay thế"),
                                attr("appointment_id", "appointment_id", false, "BIGINT", "Khóa ngoại đến Appointment"),
                                attr("service_id", "service_id", false, "BIGINT", "Khóa ngoại đến MedicalService"))),
                List.of(
                        relationship("rel_patient_appointment", "books", "patient", "appointment", "1-1", "0-N"),
                        relationship("rel_doctor_appointment", "handles", "doctor", "appointment", "1-1", "0-N"),
                        relationship("rel_appointment_service", "includes", "appointment", "appointment_service", "1-1", "0-N"),
                        relationship("rel_service_item", "uses", "medical_service", "appointment_service", "1-1", "0-N")));
    }

    private Map<String, Object> solutionData(
            List<Map<String, Object>> entities,
            List<Map<String, Object>> relationships) {
        return mapOf(
                "entities", entities,
                "relationships", relationships,
                "metadata", mapOf(
                        "version", 1,
                        "updatedAt", "2026-07-06T00:00:00Z",
                        "seedSource", SEED_SOURCE));
    }

    private Map<String, Object> entity(
            String id,
            String name,
            int x,
            int y,
            Map<String, Object>... attributes) {
        return mapOf(
                "id", id,
                "name", name,
                "attributes", List.of(attributes),
                "position", mapOf("x", x, "y", y));
    }

    private Map<String, Object> attr(
            String id,
            String name,
            boolean primaryKey,
            String dataType,
            String note) {
        return mapOf(
                "id", id,
                "name", name,
                "isPrimaryKey", primaryKey,
                "dataType", dataType,
                "note", note);
    }

    private Map<String, Object> relationship(
            String id,
            String name,
            String fromEntityId,
            String toEntityId,
            String sourceCardinality,
            String targetCardinality) {
        return mapOf(
                "id", id,
                "name", name,
                "fromEntityId", fromEntityId,
                "toEntityId", toEntityId,
                "sourceCardinality", sourceCardinality,
                "targetCardinality", targetCardinality,
                "cardinality", sourceCardinality + " - " + targetCardinality);
    }

    private Map<String, Object> mapOf(Object... keyValues) {
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("mapOf requires key-value pairs");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        for (int index = 0; index < keyValues.length; index += 2) {
            result.put(String.valueOf(keyValues[index]), keyValues[index + 1]);
        }
        return result;
    }

}
