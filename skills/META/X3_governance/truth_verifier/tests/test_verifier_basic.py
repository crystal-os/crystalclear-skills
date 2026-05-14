# Test basic verification functionality

def test_basic_verification():
    # Mock dependencies
    verifier = TruthVerifier(mock_oracle, mock_graph, mock_reputation, mock_zk)
    result = verifier.verify("test claim")
    assert "trust_score" in result