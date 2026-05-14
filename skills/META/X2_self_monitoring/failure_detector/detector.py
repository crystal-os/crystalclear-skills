class FailureDetector:
    def __init__(self, truth_verifier):
        self.truth_verifier = truth_verifier

    def detect(self, skill_output, expected_schema, context=None):
        issues = []

        # 1. Schema validation
        if not self._validate_schema(skill_output, expected_schema):
            issues.append("schema_violation")

        # 2. Contradiction detection
        if self._detect_contradiction(skill_output):
            issues.append("contradiction")

        # 3. Hallucination detection (placeholder)
        if self._detect_hallucination(skill_output):
            issues.append("hallucination")

        # 4. Loop detection
        if self._detect_loop(skill_output):
            issues.append("loop_detected")

        # 5. Truth verification (optional)
        if "claim" in skill_output:
            tv = self.truth_verifier.verify(skill_output["claim"])
            if tv["trust_score"] < 75:
                issues.append("low_trust_score")

        valid = len(issues) == 0
        requires_fallback = not valid
        requires_hitl = "low_trust_score" in issues

        return {
            "valid": valid,
            "issues": issues,
            "requires_fallback": requires_fallback,
            "requires_hitl": requires_hitl
        }

    def _validate_schema(self, output, schema):
        # placeholder: always true
        return True

    def _detect_contradiction(self, output):
        return False

    def _detect_hallucination(self, output):
        return False

    def _detect_loop(self, output):
        return False