"""
Validates all agent manifests in agents/core/ against governance/schemas/agent.schema.json.
Also enforces the tool non-overlap rule: a tool may not appear in both allowed_tools and denied_tools.
Outputs validated_manifests / failed_manifests using the same keys as validate_manifest_schema
so summarize_validation_results works unchanged.
"""
import json
from pathlib import Path

from engine.runtime.errors import GovernanceError

_AGENTS_DIR = Path("agents/core")
_SCHEMA_PATH = Path("governance/schemas/agent.schema.json")


def run(data: dict) -> dict:
    """
    Validates every agents/core/*.json against agent.schema.json.
    Returns:
        validated_manifests: {stem: manifest} — passed schema + overlap check
        failed_manifests:    {stem: error}    — failed either check
    """
    try:
        import jsonschema
    except ImportError:
        raise GovernanceError(
            "jsonschema is not installed. Run: pip install jsonschema",
            context={"required_by": "validate_agent_manifests"},
        )

    if not _SCHEMA_PATH.exists():
        raise GovernanceError(
            f"Agent schema not found: {_SCHEMA_PATH}",
            context={"path": str(_SCHEMA_PATH)},
        )

    schema = json.loads(_SCHEMA_PATH.read_text())
    validated = {}
    failed = {}

    for agent_file in sorted(_AGENTS_DIR.glob("*.json")):
        name = agent_file.stem
        try:
            manifest = json.loads(agent_file.read_text())
            jsonschema.validate(instance=manifest, schema=schema)

            # Tool non-overlap check
            tc = manifest.get("tool_constraints", {})
            allowed = set(tc.get("allowed_tools", []))
            denied  = set(tc.get("denied_tools", []))
            overlap = allowed & denied
            if overlap:
                raise ValueError(
                    f"Tools appear in both allowed_tools and denied_tools: {sorted(overlap)}"
                )

            validated[name] = manifest

        except Exception as e:
            failed[name] = str(e)

    return {
        **data,
        "validated_manifests": validated,
        "failed_manifests": failed,
    }
