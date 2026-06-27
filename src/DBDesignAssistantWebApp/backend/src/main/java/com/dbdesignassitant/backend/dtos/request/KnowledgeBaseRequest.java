package com.dbdesignassitant.backend.dtos.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeBaseRequest {

    @NotBlank(message = "Title is required")
    private String kbTitle;

    @NotBlank(message = "Content is required")
    private String kbContent;

    private String kbSource;

    private String kbCategory;

    private String kbVector;

    private Boolean isActive;
}
