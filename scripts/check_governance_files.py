from pathlib import Path

_REQUIRED_GOVERNANCE_FILES = [
    "governance/safety-rules.md",
    "governance/execution-contract.md",
    "governance/agent-charter.md",
    "governance/forbidden_paths.json",
    "governance/schemas/manifest.schema.json",
    "governance/schemas/agent.schema.json",
]


def run(data: dict) -> dict:
    """
    Checks that all required governance files exist and are non-empty.
    Returns:
        present_files:  list of paths confirmed present and non-empty
        missing_files:  list of paths absent or empty
        validated_manifests: {} (neutral — no manifest-level pass/fail here)
        failed_manifests:    {} (same)
    """
    present = []
    missing = []

    for path_str in _REQUIRED_GOVERNANCE_FILES:
        p = Path(path_str)
        if p.exists() and p.stat().st_size > 0:
            present.append(path_str)
        else:
            missing.append(path_str)

    return {
        **data,
        "present_files": present,
        "missing_files": missing,
        # neutral keys so summarize_validation_results has what it expects
        "validated_manifests": {},
        "failed_manifests": {},
    }
