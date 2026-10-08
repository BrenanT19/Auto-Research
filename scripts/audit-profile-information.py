"""Read-only census of every development profile and its populated information.

This checks API consistency and evidence linkage, NOT truth or source-use rights.
It never changes data, release manifests, or publication status.
"""
import argparse
import collections
import concurrent.futures
import csv
import json
import pathlib
import urllib.parse
import urllib.request


def get_json(base, path):
    with urllib.request.urlopen(base + path, timeout=45) as response:
        return json.load(response)


def populated(value):
    if isinstance(value, dict):
        return any(populated(item) for item in value.values())
    if isinstance(value, list):
        return any(populated(item) for item in value)
    return value is not None and value != ""


def write_csv(path, rows, fields):
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://localhost:8080/api")
    parser.add_argument("--output", default="research/profile-information-audit")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--resume", action="store_true", help="Reuse snapshots from an interrupted inventory; default is a fresh fetch.")
    args = parser.parse_args()
    # This utility deliberately cannot target a published host.
    parsed = urllib.parse.urlparse(args.base)
    if parsed.hostname not in {"localhost", "127.0.0.1"}:
        parser.error("Only the local development API is permitted.")
    output = pathlib.Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    cached = {}
    if args.resume and (output / "profile-snapshots.jsonl").exists():
        with (output / "profile-snapshots.jsonl").open(encoding="utf-8") as file:
            for line in file:
                data = json.loads(line)
                cached[data["id"]] = data
    options = get_json(args.base, "/catalog/options")
    by_id = collections.defaultdict(list)
    for option in options:
        by_id[option["profileId"]].append(option)
    if not by_id:
        raise RuntimeError("Development catalog returned no profiles.")
    profile_rows, field_rows, claim_rows, errors = [], [], [], []
    state_counts, source_counts = collections.Counter(), collections.Counter()
    sections = collections.Counter()
    # Include identity, named scalar facts, and every information-bearing array.
    excluded = {
        "id", "makeSlug", "modelSlug", "imageKey", "profileKind", "isDemo",
        "publicationStatus", "identityLevel", "canonicalConfigurationId",
        "fieldStates", "sectionStates", "claims", "researchRank",
    }

    def retrieve(profile_id):
        try:
            if profile_id in cached:
                return profile_id, cached[profile_id], None
            data = get_json(args.base, "/vehicles/" + urllib.parse.quote(profile_id, safe=""))
            return profile_id, data, None
        except Exception as error:
            return profile_id, None, str(error)

    with (output / "profile-snapshots.jsonl").open("w", encoding="utf-8") as snapshots:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            for count, (profile_id, data, error) in enumerate(pool.map(retrieve, sorted(by_id)), 1):
                if error:
                    errors.append({"profile_id": profile_id, "issue": "request_failed", "detail": error})
                    continue
                snapshots.write(json.dumps(data, ensure_ascii=False) + "\n")
                expected = by_id[profile_id][0]
                if data.get("id") != profile_id:
                    errors.append({"profile_id": profile_id, "issue": "wrong_profile_id", "detail": str(data.get("id"))})
                for key in ["make", "model", "year", "trim"]:
                    if data.get(key) != expected.get(key):
                        errors.append({"profile_id": profile_id, "issue": "browse_detail_mismatch", "detail": key})
                states = data.get("fieldStates", {})
                claims = {str(claim["id"]): claim for claim in data.get("claims", [])}
                for field, state in states.items():
                    state_counts[state.get("state", "missing")] += 1
                    for claim_id in state.get("claimIds", []):
                        if str(claim_id) not in claims:
                            errors.append({"profile_id": profile_id, "issue": "missing_referenced_claim", "detail": f"{field}:{claim_id};state={state.get('state')}"})
                    if state.get("state") == "known" and not state.get("claimIds"):
                        errors.append({"profile_id": profile_id, "issue": "known_without_claim_link", "detail": field})
                for claim_id, claim in claims.items():
                    urls = [source.get("url") or "" for source in claim.get("sources", [])]
                    if not urls or any(not url.startswith(("https://", "http://")) for url in urls):
                        errors.append({"profile_id": profile_id, "issue": "claim_missing_source_url", "detail": claim_id})
                    if claim.get("reviewStatus") != "accepted" or claim.get("applicability") != "applies":
                        errors.append({"profile_id": profile_id, "issue": "claim_review_or_applicability", "detail": claim_id})
                    for source in claim.get("sources", []):
                        source_counts[source.get("url", "")] += 1
                        claim_rows.append({
                            "profile_id": profile_id, "claim_id": claim_id, "content_class": claim.get("contentClass"),
                            "review_status": claim.get("reviewStatus"),
                            "applicability": claim.get("applicability"),
                            "scope_description": claim.get("scopeDescription"),
                            "source_url": source.get("url"), "source_id": source.get("sourceId"),
                            "revision_id": source.get("revisionId"), "source_version": source.get("sourceVersion"),
                            "source_locator": source.get("locator"), "retrieved_at": source.get("retrievedAt"),
                            "verification": "NOT FACT-CHECKED BY THIS INVENTORY",
                        })
                fields = 0
                for field, value in data.items():
                    if field in excluded or not populated(value):
                        continue
                    fields += 1
                    state = states.get(field, {})
                    if field in {"make", "model", "year", "trim", "generation"} and not state:
                        state = states.get(field, states.get("identity", {}))
                    ids = [str(x) for x in state.get("claimIds", [])]
                    urls = sorted({source.get("url") or "" for cid in ids for source in claims.get(cid, {}).get("sources", [])})
                    field_rows.append({
                        "profile_id": profile_id, "field": field,
                        "value_json": json.dumps(value, ensure_ascii=False),
                        "api_field_state": state.get("state", "NO DIRECT FIELD STATE"),
                        "claim_ids": json.dumps(ids), "source_urls": json.dumps(urls),
                        "verification": "PENDING CONTENT/APPLICABILITY/SOURCE-USE REVIEW",
                    })
                    if isinstance(value, list):
                        sections[field] += len(value)
                profile_rows.append({
                    "profile_id": profile_id, "make": data.get("make"),
                    "model": data.get("model"), "year": data.get("year"), "trim": data.get("trim"),
                    "identity_level": data.get("identityLevel"), "publication_status": data.get("publicationStatus"),
                    "populated_information_fields": fields, "claim_count": len(claims),
                    "factually_verified_by_inventory": "No", "release_ready": "No",
                })
                if count % 250 == 0:
                    print(f"Retrieved {count}/{len(by_id)} profiles", flush=True)
    write_csv(output / "profiles.csv", profile_rows, [
        "profile_id", "make", "model", "year", "trim", "identity_level", "publication_status",
        "populated_information_fields", "claim_count", "factually_verified_by_inventory", "release_ready",
    ])
    write_csv(output / "populated-information.csv", field_rows, [
        "profile_id", "field", "value_json", "api_field_state", "claim_ids", "source_urls", "verification",
    ])
    write_csv(output / "claim-sources.csv", claim_rows, [
        "profile_id", "claim_id", "content_class", "review_status", "applicability", "scope_description",
        "source_url", "source_id", "revision_id", "source_version", "source_locator", "retrieved_at", "verification",
    ])
    write_csv(output / "structural-issues.csv", errors, ["profile_id", "issue", "detail"])
    summary = {
        "purpose": "Structural inventory only; not factual verification or release approval",
        "browse_option_count": len(options), "distinct_profile_count": len(by_id),
        "retrieved_profile_count": len(profile_rows), "populated_information_rows": len(field_rows),
        "claim_source_rows": len(claim_rows), "distinct_source_urls": len([url for url in source_counts if url]),
        "field_state_counts": dict(state_counts), "nonempty_array_item_counts": dict(sections),
        "structural_issue_count": len(errors), "all_release_ready": False,
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2), flush=True)
    if len(profile_rows) != len(by_id):
        raise SystemExit("INCOMPLETE: one or more profile requests failed; see structural-issues.csv")


if __name__ == "__main__":
    main()
