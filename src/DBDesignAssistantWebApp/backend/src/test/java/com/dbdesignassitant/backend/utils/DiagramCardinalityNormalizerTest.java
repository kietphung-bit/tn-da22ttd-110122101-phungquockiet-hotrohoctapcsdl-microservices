package com.dbdesignassitant.backend.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import org.junit.jupiter.api.Test;

class DiagramCardinalityNormalizerTest {

    @Test
    void normalizesNewPerEndCardinalityFields() {
        var cardinality = DiagramCardinalityNormalizer.normalizeRelationship(Map.of(
                "sourceCardinality", "1-1",
                "targetCardinality", "0-N",
                "cardinality", "1-1 - 0-N"));

        assertTrue(cardinality.hasCardinality());
        assertEquals("1-1", cardinality.sourceCardinality());
        assertEquals("0-N", cardinality.targetCardinality());
        assertEquals("1-1 - 0-N", cardinality.summary());
        assertFalse(cardinality.isManyToMany());
    }

    @Test
    void parsesNewLegacyPerEndSummaryWithoutTreatingItAsManyToMany() {
        var cardinality = DiagramCardinalityNormalizer.normalizeRelationship(Map.of(
                "cardinality", "1-1 - 0-N"));

        assertTrue(cardinality.hasCardinality());
        assertEquals("1-1", cardinality.sourceCardinality());
        assertEquals("0-N", cardinality.targetCardinality());
        assertFalse(cardinality.isManyToMany());
    }

    @Test
    void keepsOldCombinedCardinalityCompatibility() {
        var oneToMany = DiagramCardinalityNormalizer.normalizeRelationship(Map.of(
                "cardinality", "1 - N"));
        var manyToMany = DiagramCardinalityNormalizer.normalizeRelationship(Map.of(
                "cardinality", "N-N"));

        assertEquals("1-1", oneToMany.sourceCardinality());
        assertEquals("0-N", oneToMany.targetCardinality());
        assertFalse(oneToMany.isManyToMany());
        assertEquals("0-N", manyToMany.sourceCardinality());
        assertEquals("0-N", manyToMany.targetCardinality());
        assertTrue(manyToMany.isManyToMany());
    }

    @Test
    void reportsMissingWhenNoReadableCardinalityExists() {
        var cardinality = DiagramCardinalityNormalizer.normalizeRelationship(Map.of(
                "cardinality", "unknown"));

        assertFalse(cardinality.hasCardinality());
        assertEquals("", cardinality.summary());
    }
}
