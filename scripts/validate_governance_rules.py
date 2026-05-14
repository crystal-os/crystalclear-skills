def run(data: dict) -> dict:
    """
    Applies governance checks to validated manifests.
    Any manifest that fails a governance rule is moved to failed_manifests.

    Current rules:
        - Skills prefixed with 'http_' or 'web_' are forbidden when
          governance.allow_external_calls is False.
    """
    validated: dict = dict(data.get("validated_manifests", {}))
    failed: dict = dict(data.get("failed_manifests", {}))

    to_fail = {}

    for name, manifest in validated.items():
        gov = manifest.get("governance", {})
        if gov.get("allow_external_calls") is False:
            for skill in manifest.get("skills", []):
                if skill.startswith("http_") or skill.startswith("web_"):
                    to_fail[name] = (
                        f"Skill '{skill}' requires external calls "
                        "but governance forbids them (allow_external_calls: false)"
                    )
                    break

    for name, reason in to_fail.items():
        failed[name] = reason
        del validated[name]

    return {
        **data,
        "validated_manifests": validated,
        "failed_manifests": failed,
    }
