import json
import os
from pathlib import Path

from engine.runtime.errors import SkillError

_MANIFESTS_DIR = Path("manifests/workflows")


def run(data: dict) -> dict:
    """
    Loads all manifests from manifests/.
    Returns:
        {
            "manifests": {"<name>": <manifest_dict>, ...},
            ...passthrough data
        }
    """
    if not _MANIFESTS_DIR.exists():
        raise SkillError("load_all_manifests", f"Manifests directory not found: {_MANIFESTS_DIR}")

    manifests = {}

    for file in os.listdir(_MANIFESTS_DIR):
        if not file.endswith(".json"):
            continue

        name = file[:-5]  # strip .json
        path = _MANIFESTS_DIR / file

        try:
            with open(path, "r") as f:
                manifests[name] = json.load(f)
        except Exception as e:
            raise SkillError(name, f"Failed to load manifest file '{file}': {e}")

    return {"manifests": manifests, **data}
