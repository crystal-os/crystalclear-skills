class PlanGenerator:
    def __init__(self, registry, truth_verifier):
        self.registry = registry
        self.truth_verifier = truth_verifier

    def generate(self, goal, context=None, constraints=None):
        constraints = constraints or {}

        # 1. Interpret goal
        intent = self._interpret_goal(goal)

        # 2. Select skills
        skills = self._select_skills(intent)

        # 3. Build execution graph
        graph = self._build_graph(skills)

        # 4. Apply constraints
        graph = self._apply_constraints(graph, constraints)

        # 5. Estimate cost + latency
        cost, latency = self._estimate(graph)

        return {
            "execution_graph": graph,
            "estimated_cost": cost,
            "estimated_latency_ms": latency
        }

    def _interpret_goal(self, goal):
        # placeholder: simple keyword mapping
        if "summarize" in goal.lower():
            return "summarization"
        if "analyze" in goal.lower():
            return "analysis"
        return "generic"

    def _select_skills(self, intent):
        mapping = {
            "summarization": ["A1_text/summarize"],
            "analysis": ["M3_reasoning/multi_step_planner"],
            "generic": ["A1_text/rewrite"]
        }
        return mapping.get(intent, mapping["generic"])

    def _build_graph(self, skills):
        graph = []
        for skill in skills:
            graph.append({
                "skill": skill,
                "inputs": {},
                "requires_truth_verification": True,
                "fallback": "A1_text/rewrite"
            })
        return graph

    def _apply_constraints(self, graph, constraints):
        # placeholder: no-op
        return graph

    def _estimate(self, graph):
        cost = len(graph) * 0.0005
        latency = len(graph) * 300
        return cost, latency