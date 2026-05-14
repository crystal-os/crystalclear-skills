class CostOptimizer:
    def __init__(self, cache):
        self.cache = cache

    def optimize(self, execution_graph, context=None):
        # 1. Deduplicate repeated skills
        deduped = self._dedupe(execution_graph)

        # 2. Apply caching
        optimized, cache_hits = self._apply_cache(deduped)

        # 3. Estimate cost + latency
        cost, latency = self._estimate(optimized)

        return {
            "optimized_graph": optimized,
            "estimated_cost": cost,
            "estimated_latency_ms": latency,
            "cache_hits": cache_hits
        }

    def _dedupe(self, graph):
        seen = set()
        new_graph = []
        for step in graph:
            key = step["skill"]
            if key not in seen:
                new_graph.append(step)
                seen.add(key)
        return new_graph

    def _apply_cache(self, graph):
        hits = 0
        new_graph = []
        for step in graph:
            cache_key = step["skill"]
            if self.cache.exists(cache_key):
                hits += 1
                continue
            new_graph.append(step)
        return new_graph, hits

    def _estimate(self, graph):
        cost = len(graph) * 0.0004
        latency = len(graph) * 250
        return cost, latency