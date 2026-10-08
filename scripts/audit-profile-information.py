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


def revision_key_interpretation(source_version):
    version = (source_version or "").lower()
    if "normalized factual review" in version:
        return "LOCAL NORMALIZED FACTUAL REVIEW HASH; NOT A PUBLISHER REVISION"
    if "normalized identity review" in version:
        return "LOCAL NORMALIZED IDENTITY REVIEW; NOT A PUBLISHER REVISION"
    if "normalized metadata checksum" in version:
        return "LOCAL NORMALIZED METADATA CHECKSUM; NOT THE ORIGINAL DOCUMENT REVISION"
    return "RAW API REVISION KEY; PUBLISHER-REVISION MEANING NOT ESTABLISHED"


def write_csv(path, rows, fields):
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields, lineterminator="\n")
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
    claim_review_counts, claim_applicability_counts = collections.Counter(), collections.Counter()
    section_state_counts = collections.Counter()
    sections = collections.Counter()
    sibling_trim_item_count = 0
    sibling_trim_items_linked = 0
    sibling_trim_claim_id_count = 0
    snapshots_by_id = {}
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
                snapshots_by_id[profile_id] = data
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
                            errors.append({"profile_id": profile_id, "issue": "field_state_claim_not_returned", "detail": f"{field}:{claim_id};state={state.get('state')}"})
                    if state.get("state") == "known" and not state.get("claimIds"):
                        errors.append({"profile_id": profile_id, "issue": "known_without_claim_link", "detail": field})
                for claim_id, claim in claims.items():
                    urls = [source.get("url") or "" for source in claim.get("sources", [])]
                    public_urls = [
                        url for url in urls
                        if url.startswith(("https://", "http://"))
                    ]
                    missing_url_sources = [
                        source for source in claim.get("sources", [])
                        if not (source.get("url") or "").startswith(("https://", "http://"))
                    ]
                    if not public_urls:
                        errors.append({
                            "profile_id": profile_id,
                            "issue": "claim_no_public_source_url",
                            "detail": claim_id,
                        })
                    elif missing_url_sources:
                        errors.append({
                            "profile_id": profile_id,
                            "issue": "claim_source_record_without_url",
                            "detail": claim_id,
                        })
                    review_status = claim.get("reviewStatus", "missing")
                    applicability = claim.get("applicability", "missing")
                    claim_review_counts[review_status] += 1
                    claim_applicability_counts[applicability] += 1
                    if review_status != "accepted":
                        errors.append({
                            "profile_id": profile_id,
                            "issue": "claim_not_accepted",
                            "detail": f"{claim_id}:{review_status}",
                        })
                    if applicability not in {"applies", "unknown"}:
                        errors.append({
                            "profile_id": profile_id,
                            "issue": "invalid_claim_applicability",
                            "detail": f"{claim_id}:{applicability}",
                        })
                    for source in claim.get("sources", []):
                        source_counts[source.get("url", "")] += 1
                        source_version = source.get("sourceVersion") or ""
                        claim_rows.append({
                            "profile_id": profile_id, "claim_id": claim_id, "content_class": claim.get("contentClass"),
                            "review_status": claim.get("reviewStatus"),
                            "applicability": claim.get("applicability"),
                            "scope_description": claim.get("scopeDescription"),
                            "source_url": source.get("url"), "source_id": source.get("sourceId"),
                            "stored_revision_key": source.get("revisionId"),
                            "revision_key_interpretation": revision_key_interpretation(source_version),
                            "source_version": source_version,
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
                        "related_profile_ids": json.dumps([]),
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
    profile_ids_by_trim_key = collections.defaultdict(list)
    for profile_id, data in snapshots_by_id.items():
        if data.get("trim"):
            trim_key = (
                str(data.get("make")), str(data.get("model")),
                str(data.get("year")), str(data.get("trim")),
            )
            profile_ids_by_trim_key[trim_key].append(profile_id)

    field_rows_by_key = {
        (row["profile_id"], row["field"]): row for row in field_rows
    }
    for profile_id, data in snapshots_by_id.items():
        for state in data.get("sectionStates", {}).values():
            section_state_counts[state.get("state", "missing")] += 1
        sibling_names = data.get("siblingTrims") or []
        if not sibling_names:
            continue
        sibling_trim_item_count += len(sibling_names)
        sibling_ids = []
        for sibling_name in sibling_names:
            trim_key = (
                str(data.get("make")), str(data.get("model")),
                str(data.get("year")), str(sibling_name),
            )
            candidates = [
                candidate_id
                for candidate_id in profile_ids_by_trim_key.get(trim_key, [])
                if candidate_id != profile_id
            ]
            if len(candidates) == 1:
                sibling_ids.append(candidates[0])
                sibling_trim_items_linked += 1
            else:
                sibling_ids.append("")
                errors.append({
                    "profile_id": profile_id,
                    "issue": "sibling_trim_profile_mismatch",
                    "detail": f"{sibling_name}: {candidates}",
                })
        nonempty_sibling_ids = [sibling_id for sibling_id in sibling_ids if sibling_id]
        if len(nonempty_sibling_ids) != len(set(nonempty_sibling_ids)):
            errors.append({
                "profile_id": profile_id,
                "issue": "duplicate_sibling_trim_profile",
                "detail": json.dumps(sibling_ids),
            })

        section_state = data.get("sectionStates", {}).get("siblingTrims", {})
        claim_ids = [str(claim_id) for claim_id in section_state.get("claimIds", [])]
        related_claim_counts = collections.Counter()
        source_urls = set()
        for sibling_id in nonempty_sibling_ids:
            sibling_data = snapshots_by_id.get(sibling_id)
            if sibling_data is None:
                continue
            for claim in sibling_data.get("claims", []):
                claim_id = str(claim.get("id"))
                related_claim_counts[claim_id] += 1
                if claim_id in claim_ids:
                    source_urls.update(
                        source.get("url") or ""
                        for source in claim.get("sources", [])
                    )
        missing_claims = collections.Counter(claim_ids) - related_claim_counts
        if missing_claims:
            errors.append({
                "profile_id": profile_id,
                "issue": "missing_sibling_claim_reference",
                "detail": json.dumps(dict(missing_claims)),
            })
        if section_state.get("state") == "known" and not claim_ids:
            errors.append({
                "profile_id": profile_id,
                "issue": "known_sibling_trims_without_claim_link",
                "detail": "sectionStates.siblingTrims is known but has no claim IDs",
            })

        sibling_trim_claim_id_count += len(claim_ids) - sum(missing_claims.values())
        field_row = field_rows_by_key.get((profile_id, "siblingTrims"))
        if field_row is None:
            errors.append({
                "profile_id": profile_id,
                "issue": "sibling_trim_field_missing_from_inventory",
                "detail": "siblingTrims is populated but has no field inventory row",
            })
            continue
        field_row["api_field_state"] = section_state.get("state", "NO SECTION STATE")
        field_row["claim_ids"] = json.dumps(claim_ids)
        field_row["source_urls"] = json.dumps(sorted(url for url in source_urls if url))
        field_row["related_profile_ids"] = json.dumps(sibling_ids)

    write_csv(output / "profiles.csv", profile_rows, [
        "profile_id", "make", "model", "year", "trim", "identity_level", "publication_status",
        "populated_information_fields", "claim_count", "factually_verified_by_inventory", "release_ready",
    ])
    write_csv(output / "populated-information.csv", field_rows, [
        "profile_id", "field", "value_json", "api_field_state", "claim_ids", "source_urls",
        "related_profile_ids", "verification",
    ])
    write_csv(output / "claim-sources.csv", claim_rows, [
        "profile_id", "claim_id", "content_class", "review_status", "applicability", "scope_description",
        "source_url", "source_id", "stored_revision_key", "revision_key_interpretation",
        "source_version", "source_locator", "retrieved_at", "verification",
    ])
    write_csv(output / "structural-issues.csv", errors, ["profile_id", "issue", "detail"])
    wikipedia_rows = [
        row for row in claim_rows
        if "wikipedia.org" in (row["source_url"] or "").lower()
        or "wikimedia.org" in (row["source_url"] or "").lower()
    ]
    wikipedia_rows_with_oldid = []
    for row in wikipedia_rows:
        query = urllib.parse.parse_qs(urllib.parse.urlparse(row["source_url"]).query)
        if any(value.isdigit() for value in query.get("oldid", [])):
            wikipedia_rows_with_oldid.append(row)
    historical_review_hash_profiles = {
        row["profile_id"]
        for row in wikipedia_rows
        if "normalized factual review" in (row["source_version"] or "").lower()
        and len(row["stored_revision_key"] or "") == 64
        and all(character in "0123456789abcdef" for character in row["stored_revision_key"].lower())
    }
    wikipedia_version_categories = collections.Counter()
    for row in wikipedia_rows:
        version = (row["source_version"] or "").lower()
        if "normalized factual review" in version:
            category = "normalized_factual_review"
        elif "normalized identity review" in version:
            category = "normalized_identity_review"
        elif "normalized metadata checksum" in version:
            category = "normalized_metadata_checksum"
        else:
            category = "other_or_unspecified"
        wikipedia_version_categories[category] += 1
    summary = {
        "purpose": "Structural inventory only; not factual verification or release approval",
        "browse_option_count": len(options), "distinct_profile_count": len(by_id),
        "retrieved_profile_count": len(profile_rows), "populated_information_rows": len(field_rows),
        "claim_source_rows": len(claim_rows), "distinct_source_urls": len([url for url in source_counts if url]),
        "field_state_counts": dict(state_counts), "nonempty_array_item_counts": dict(sections),
        "section_state_counts": dict(section_state_counts),
        "claim_review_status_counts": dict(claim_review_counts),
        "claim_applicability_counts": dict(claim_applicability_counts),
        "claims_with_unresolved_applicability": claim_applicability_counts["unknown"],
        "sibling_trim_item_lineage": {
            "populated_arrays": sum(1 for data in snapshots_by_id.values() if data.get("siblingTrims")),
            "listed_items": sibling_trim_item_count,
            "items_with_profile_links": sibling_trim_items_linked,
            "claim_ids_resolved": sibling_trim_claim_id_count,
        },
        "source_revision_provenance": {
            "wikipedia_claim_source_rows": len(wikipedia_rows),
            "wikipedia_distinct_profiles": len({row["profile_id"] for row in wikipedia_rows}),
            "wikipedia_urls_with_explicit_oldid": len(wikipedia_rows_with_oldid),
            "wikipedia_profiles_with_local_normalized_fact_hash": len(historical_review_hash_profiles),
            "wikipedia_source_version_categories": dict(wikipedia_version_categories),
        },
        "structural_issue_count": len(errors), "all_release_ready": False,
    }
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2), flush=True)
    if len(profile_rows) != len(by_id):
        raise SystemExit("INCOMPLETE: one or more profile requests failed; see structural-issues.csv")


if __name__ == "__main__":
    main()
