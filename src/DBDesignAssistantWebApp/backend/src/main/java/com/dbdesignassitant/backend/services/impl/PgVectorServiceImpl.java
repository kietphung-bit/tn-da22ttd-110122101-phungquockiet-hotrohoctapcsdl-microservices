package com.dbdesignassitant.backend.services.impl;

import com.dbdesignassitant.backend.config.AiProperties;
import com.dbdesignassitant.backend.services.PgVectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

@Service
@RequiredArgsConstructor
@Slf4j
public class PgVectorServiceImpl implements PgVectorService {
    private static final int KNOWLEDGE_BASE_VECTOR_DIMENSION = 384;
    private static final String KNOWLEDGE_BASE_VECTOR_TYPE = "vector(384)";

    private final JdbcTemplate jdbcTemplate;
    private final DataSource dataSource;
    private final AiProperties aiProperties;

    @Override
    public void ensurePgVectorExtension() {
        if (!aiProperties.getEmbedding().isPgvectorEnabled()) {
            log.info("pgvector initialization is disabled by ai.embedding.pgvector-enabled=false");
            return;
        }
        try {
            String productName = databaseProductName();
            log.info("Database product detected for RAG vector store: {}", productName);
            if (!productName.toLowerCase().contains("postgresql")) {
                log.warn("pgvector requires PostgreSQL. Current database is {}", productName);
                return;
            }
            jdbcTemplate.execute("create extension if not exists vector");
            if (isPgVectorReady()) {
                log.info("pgvector extension is available");
                ensureKnowledgeBaseVectorColumn();
                ensureKnowledgeBaseVectorIndex();
            } else {
                log.warn("pgvector extension was requested but is not available");
            }
        } catch (RuntimeException ex) {
            log.warn("Could not initialize pgvector extension. Vector retrieval will fallback to keyword. Error: {}",
                    ex.getMessage());
        }
    }

    @Override
    public boolean isPgVectorReady() {
        try {
            Boolean ready = jdbcTemplate.queryForObject(
                    "select exists (select 1 from pg_extension where extname = 'vector')",
                    Boolean.class);
            return Boolean.TRUE.equals(ready);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    @Override
    public boolean isKnowledgeBaseVectorColumnReady() {
        try {
            return KNOWLEDGE_BASE_VECTOR_TYPE.equalsIgnoreCase(knowledgeBaseVectorColumnType());
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private void ensureKnowledgeBaseVectorColumn() {
        if (aiProperties.getEmbedding().getDimension() != KNOWLEDGE_BASE_VECTOR_DIMENSION) {
            log.warn("Skipping kb_vector migration because configured embedding dimension is {}, expected {}",
                    aiProperties.getEmbedding().getDimension(),
                    KNOWLEDGE_BASE_VECTOR_DIMENSION);
            return;
        }
        if (!knowledgeBaseTableExists() || !knowledgeBaseVectorColumnExists()) {
            log.info("Skipping kb_vector migration because knowledge_base.kb_vector does not exist yet");
            return;
        }

        String currentType = knowledgeBaseVectorColumnType();
        if (KNOWLEDGE_BASE_VECTOR_TYPE.equalsIgnoreCase(currentType)) {
            log.info("knowledge_base.kb_vector is already {}", KNOWLEDGE_BASE_VECTOR_TYPE);
            return;
        }

        try {
            jdbcTemplate.execute("""
                    alter table knowledge_base
                    alter column kb_vector type vector(384)
                    using case
                        when kb_vector is null or btrim(kb_vector) = '' then null
                        else kb_vector::vector(384)
                    end
                    """);
            log.info("Migrated knowledge_base.kb_vector from {} to {}", currentType, KNOWLEDGE_BASE_VECTOR_TYPE);
        } catch (RuntimeException ex) {
            log.warn("Could not migrate knowledge_base.kb_vector from {} to {}. Existing data was left unchanged. Error: {}",
                    currentType,
                    KNOWLEDGE_BASE_VECTOR_TYPE,
                    ex.getMessage());
        }
    }

    private void ensureKnowledgeBaseVectorIndex() {
        if (!aiProperties.getEmbedding().isVectorIndexEnabled() || !isKnowledgeBaseVectorColumnReady()) {
            return;
        }
        try {
            jdbcTemplate.execute("""
                    create index if not exists idx_knowledge_base_kb_vector_hnsw
                    on knowledge_base
                    using hnsw (kb_vector vector_cosine_ops)
                    where is_active = true
                      and approval_status = 'APPROVED'
                      and kb_vector is not null
                    """);
            log.info("HNSW index idx_knowledge_base_kb_vector_hnsw is available");
        } catch (RuntimeException ex) {
            log.warn("Could not create HNSW index for knowledge_base.kb_vector. Vector retrieval still works without the index. Error: {}",
                    ex.getMessage());
        }
    }

    private boolean knowledgeBaseTableExists() {
        Boolean exists = jdbcTemplate.queryForObject("""
                select exists (
                    select 1
                    from information_schema.tables
                    where table_schema = current_schema()
                      and table_name = 'knowledge_base'
                )
                """, Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    private boolean knowledgeBaseVectorColumnExists() {
        Boolean exists = jdbcTemplate.queryForObject("""
                select exists (
                    select 1
                    from information_schema.columns
                    where table_schema = current_schema()
                      and table_name = 'knowledge_base'
                      and column_name = 'kb_vector'
                )
                """, Boolean.class);
        return Boolean.TRUE.equals(exists);
    }

    private String knowledgeBaseVectorColumnType() {
        String type = jdbcTemplate.queryForObject("""
                select format_type(a.atttypid, a.atttypmod)
                from pg_attribute a
                join pg_class c on c.oid = a.attrelid
                join pg_namespace n on n.oid = c.relnamespace
                where n.nspname = current_schema()
                  and c.relname = 'knowledge_base'
                  and a.attname = 'kb_vector'
                  and a.attnum > 0
                  and not a.attisdropped
                """, String.class);
        return type == null ? "" : type;
    }

    private String databaseProductName() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.getMetaData().getDatabaseProductName();
        } catch (SQLException ex) {
            return "unknown";
        }
    }
}
