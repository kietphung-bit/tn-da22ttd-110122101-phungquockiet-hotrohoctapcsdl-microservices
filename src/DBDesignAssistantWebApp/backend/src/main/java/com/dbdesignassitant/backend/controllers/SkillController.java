package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.request.SkillRequest;
import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.SkillResponse;
import com.dbdesignassitant.backend.services.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
public class SkillController {

    private final SkillService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SkillResponse>>> getAllSkills() {
        List<SkillResponse> data = service.getAllSkills();
        return ResponseEntity.ok(ApiResponse.<List<SkillResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SkillResponse>> getSkillById(@PathVariable Long id) {
        SkillResponse data = service.getSkillById(id);
        return ResponseEntity.ok(ApiResponse.<SkillResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SkillResponse>> createSkill(@Valid @RequestBody SkillRequest request) {
        SkillResponse data = service.createSkill(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<SkillResponse>builder()
                .status(HttpStatus.CREATED.value())
                .message("Created successfully")
                .data(data)
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SkillResponse>> updateSkill(
            @PathVariable Long id, @Valid @RequestBody SkillRequest request) {
        SkillResponse data = service.updateSkill(id, request);
        return ResponseEntity.ok(ApiResponse.<SkillResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Updated successfully")
                .data(data)
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSkill(@PathVariable Long id) {
        service.deleteSkill(id);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .status(HttpStatus.OK.value())
                .message("Deleted successfully")
                .build());
    }
}
