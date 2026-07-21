package com.dbdesignassitant.backend.utils;

import java.util.Locale;
import java.util.Map;

public final class DiagramCardinalityNormalizer {

    private DiagramCardinalityNormalizer() {
    }

    public static NormalizedRelationshipCardinality normalizeRelationship(Map<String, Object> relationship) {
        String source = normalizeEndpoint(readString(relationship, "sourceCardinality"));
        String target = normalizeEndpoint(readString(relationship, "targetCardinality"));
        if (!source.isBlank() && !target.isBlank()) {
            return new NormalizedRelationshipCardinality(source, target);
        }

        return parseLegacyCardinality(readString(relationship, "cardinality"));
    }

    public static String normalizeEndpoint(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", "");
        return switch (normalized) {
            case "1", "1-1", "1..1" -> "1-1";
            case "0-1", "0..1" -> "0-1";
            case "1-N", "1-M", "1..N", "1..M" -> "1-N";
            case "0-N", "0-M", "0..N", "0..M", "N", "M", "*" -> "0-N";
            default -> "";
        };
    }

    private static NormalizedRelationshipCardinality parseLegacyCardinality(String cardinality) {
        if (cardinality == null || cardinality.isBlank()) {
            return NormalizedRelationshipCardinality.empty();
        }

        String trimmed = cardinality.trim();
        String[] parts = trimmed.matches(".*\\s+-\\s+.*")
                ? trimmed.split("\\s+-\\s+")
                : trimmed.split("-");
        if (parts.length < 2) {
            return NormalizedRelationshipCardinality.empty();
        }

        return new NormalizedRelationshipCardinality(
                normalizeEndpoint(parts[0]),
                normalizeEndpoint(parts[1]));
    }

    private static String readString(Map<String, Object> source, String key) {
        if (source == null) {
            return "";
        }
        Object value = source.get(key);
        return value instanceof String text ? text.trim() : "";
    }

    public record NormalizedRelationshipCardinality(String sourceCardinality, String targetCardinality) {
        public static NormalizedRelationshipCardinality empty() {
            return new NormalizedRelationshipCardinality("", "");
        }

        public boolean hasCardinality() {
            return !sourceCardinality.isBlank() && !targetCardinality.isBlank();
        }

        public boolean isManyToMany() {
            return isManyEndpoint(sourceCardinality) && isManyEndpoint(targetCardinality);
        }

        public String summary() {
            if (!hasCardinality()) {
                return "";
            }
            return sourceCardinality + " - " + targetCardinality;
        }

        private static boolean isManyEndpoint(String value) {
            return "1-N".equals(value) || "0-N".equals(value);
        }
    }
}
