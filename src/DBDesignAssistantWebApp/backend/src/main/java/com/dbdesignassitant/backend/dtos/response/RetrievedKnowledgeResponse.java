package com.dbdesignassitant.backend.dtos.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RetrievedKnowledgeResponse {
    private Long kbId;
    private String kbTitle;
    private String kbCategory;
    private String kbSource;
    private String snippet;
}
