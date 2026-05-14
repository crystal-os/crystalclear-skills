def run(data: dict) -> dict:
    """
    Summarizes validation results into a clean final structure.
    Passes all upstream data through so the output artifact is self-contained.
    """
    validated = data.get("validated_manifests", {})
    failed = data.get("failed_manifests", {})

    summary = {
        "total_manifests": len(validated) + len(failed),
        "valid_count": len(validated),
        "invalid_count": len(failed),
        "valid_manifests": sorted(validated.keys()),
        "invalid_manifests": sorted(failed.keys()),
    }

    return {
        **data,
        "summary": summary,
    }
