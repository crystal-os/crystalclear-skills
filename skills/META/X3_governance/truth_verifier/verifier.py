class TruthVerifier:
    def __init__(self, oracle_client, graph_rag, reputation_db, zk_engine):
        self.oracle = oracle_client
        self.graph = graph_rag
        self.reputation = reputation_db
        self.zk = zk_engine

    def verify(self, claim, context=None, required_sources=None):
        sources = required_sources or []

        oracle_results = self.oracle.query(claim)
        graph_results = self.graph.search(claim, context)
        reputations = self.reputation.score_sources(sources)

        aggregated = self._aggregate(oracle_results, graph_results, reputations)

        trust_score, verdict, confidence = self._score(aggregated)
        provenance = self._build_provenance(aggregated)
        zk_proof = self.zk.generate_proof(aggregated)

        hitl_required = trust_score < 75 or aggregated.get("conflict", False)
        audit_hash = self._audit_hash(aggregated)

        return {
            "trust_score": trust_score,
            "verdict": verdict,
            "confidence": confidence,
            "provenance": provenance,
            "hitl_required": hitl_required,
            "audit_log_hash": audit_hash
        }

    def _aggregate(self, oracle, graph, reputations):
        return {
            "oracle": oracle,
            "graph": graph,
            "reputations": reputations,
            "conflict": self._detect_conflict(oracle, graph)
        }

    def _score(self, aggregated):
        trust = 0.92 * aggregated["reputations"]["avg"]
        verdict = "verified" if trust > 85 else "partially_verified"
        confidence = trust / 100
        return trust, verdict, confidence

    def _detect_conflict(self, oracle, graph):
        return oracle.get("value") != graph.get("value")

    def _build_provenance(self, aggregated):
        return [
            {
                "source": "oracle",
                "timestamp": aggregated["oracle"].get("timestamp"),
                "data": str(aggregated["oracle"]),
                "zk_proof": "pending"
            },
            {
                "source": "graph_rag",
                "timestamp": aggregated["graph"].get("timestamp"),
                "data": str(aggregated["graph"]),
                "zk_proof": "pending"
            }
        ]

    def _audit_hash(self, aggregated):
        import hashlib, json
        return hashlib.sha256(json.dumps(aggregated).encode()).hexdigest()