from engine.runtime.manifest.validator import validate_manifest
from engine.runtime.errors import SkillError


def run(data: dict) -> dict:
    """
    Validates each manifest in data["manifests"] against the runtime JSON Schema.
    Returns:
        validated_manifests: {name: manifest}  — passed schema validation
        failed_manifests:    {name: error_msg} — failed
    """
    manifests = data.get("manifests", {})
    if not isinstance(manifests, dict):
        raise SkillError("validate_manifest_schema", "Expected 'manifests' dict in input data")

    validated = {}
    failed = {}

    for name, manifest in manifests.items():
        try:
            validate_manifest(manifest)
            validated[name] = manifest
        except Exception as e:
            failed[name] = str(e)

    return {
        **data,
        "validated_manifests": validated,
        "failed_manifests": failed,
    }
