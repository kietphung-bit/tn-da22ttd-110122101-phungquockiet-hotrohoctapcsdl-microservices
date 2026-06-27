package com.dbdesignassitant.backend.controllers;

import com.dbdesignassitant.backend.dtos.response.ApiResponse;
import com.dbdesignassitant.backend.dtos.response.StudentSkillStatsResponse;
import com.dbdesignassitant.backend.services.StudentSkillStatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student-skill-stats")
@RequiredArgsConstructor
public class StudentSkillStatsController {

    private final StudentSkillStatsService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentSkillStatsResponse>>> getStats(
            @RequestParam(required = false) Long studentId,
            @RequestParam(required = false) Long skillId) {

        List<StudentSkillStatsResponse> data;
        if (studentId != null) {
            data = service.getStatsByStudentId(studentId);
        } else if (skillId != null) {
            data = service.getStatsBySkillId(skillId);
        } else {
            data = service.getAllStats();
        }

        return ResponseEntity.ok(ApiResponse.<List<StudentSkillStatsResponse>>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<StudentSkillStatsResponse>> getStatById(@PathVariable Long id) {
        StudentSkillStatsResponse data = service.getStatById(id);
        return ResponseEntity.ok(ApiResponse.<StudentSkillStatsResponse>builder()
                .status(HttpStatus.OK.value())
                .message("Success")
                .data(data)
                .build());
    }
}
