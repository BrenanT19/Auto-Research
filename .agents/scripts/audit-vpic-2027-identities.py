"""Reconcile all populated MY2027 profile identities with NHTSA vPIC output."""
import csv
import json
import pathlib
import re
import unicodedata

ROOT = pathlib.Path("research")
AUDIT = ROOT / "profile-information-audit"
SOURCES = ROOT / "sources"
MAKE_SLUGS = {
    "Buick": "buick", "Cadillac": "cadillac", "Chevrolet": "chevrolet",
    "Chrysler": "chrysler", "Dodge": "dodge", "Ford": "ford", "GMC": "gmc",
    "Jeep": "jeep", "Lincoln": "lincoln", "Lucid": "lucid", "Ram": "ram",
    "Rivian": "rivian", "Tesla": "tesla",
}


def norm(value):
    return unicodedata.normalize("NFKC", value.strip()).casefold()


def main():
    with (AUDIT / "profiles.csv").open(newline="", encoding="utf-8") as file:
        profiles = list(csv.DictReader(file))
    targets = [row for row in profiles if row["year"] == "2027"]
    assert len(targets) == 34
    target_ids = {row["profile_id"] for row in targets}
    with (AUDIT / "populated-information.csv").open(newline="", encoding="utf-8") as file:
        populated = list(csv.DictReader(file))
    additional_facts = [
        row for row in populated
        if row["profile_id"] in target_ids and row["field"] not in {"make", "model", "year"}
    ]
    matched = []
    sources = []
    results_by_make = {}
    for make, slug in MAKE_SLUGS.items():
        path = SOURCES / f"profile-batch-vpic-2027-{slug}.md"
        text = path.read_text(encoding="utf-8")
        header = re.search(r"^Source: (.+)$", text, re.M)
        block = re.search(r"^```json\s*(.*?)^```", text, re.M | re.S)
        assert header and block, f"Missing saved source response for {make}"
        expected_url = f"https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/{make}/modelyear/2027?format=json"
        assert header[1] == expected_url, f"Wrong source URL for {make}"
        response = json.loads(block[1])
        assert "2027" in response.get("SearchCriteria", "") and "returned successfully" in response.get("Message", "")
        returned = [
            item["Model_Name"] for item in response.get("Results", [])
            if norm(item["Make_Name"]) == norm(make)
        ]
        assert response.get("Count") == len(response.get("Results", [])), make
        results_by_make[make] = {"url": expected_url, "path": str(path), "models": sorted(set(returned))}
        expected_rows = [row for row in targets if norm(row["make"]) == norm(make)]
        assert expected_rows, f"Make absent from the target catalog: {make}"
        for row in expected_rows:
            candidates = [name for name in returned if norm(name) == norm(row["model"])]
            assert candidates, f"No vPIC model/year match: {row['profile_id']} — {row['model']}"
            name = candidates[0]
            matched.append({
                "profile_id": row["profile_id"], "make": row["make"],
                "catalog_model": row["model"], "year": row["year"],
                "vpic_model": name,
                "model_name_match": "Exact" if name == row["model"] else "Case-only difference",
                "identity_verdict": "Make/model/year present in vPIC 2027 make-year listing",
                "sales_or_final_lineup_verified": "No",
                "nhtsa_source_url": expected_url, "saved_evidence": str(path),
            })
        key = f"profile-batch-vpic-2027-{slug}"
        sources.append({
            "key": key,
            "title": f"NHTSA vPIC, 2027 model-year listing — {make}",
            "url": expected_url,
            "publicationDate": None,
            "accessedDate": "2026-10-08",
            "tier": "Tier 1",
            "savedEvidencePath": str(path),
        })

    assert len(matched) == 34 and len({row["profile_id"] for row in matched}) == 34
    registry_path = ROOT / "sources.json"
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    existing_keys = {entry["key"] for entry in registry}
    existing_urls = {entry["url"] for entry in registry}
    for source in sources:
        assert source["key"] not in existing_keys or source["url"] == next(s["url"] for s in registry if s["key"] == source["key"])
        if source["url"] not in existing_urls:
            registry.append(source)
    registry_path.write_text(json.dumps(registry, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    output = AUDIT / "my2027-identity-crosscheck.csv"
    with output.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=list(matched[0]))
        writer.writeheader()
        writer.writerows(sorted(matched, key=lambda row: (row["make"], row["catalog_model"])))

    appendix = ["", "## Follow-up: independent MY2027 vPIC identity cross-check", "",
        "**Result: 34/34** catalog make/model/year identities are present in their corresponding official NHTSA vPIC 2027 make/year listings. Case-insensitive model-name matching resolves every record; 30 labels are text-identical and four differ only in capitalization (Cadillac LYRIQ/Lyriq, OPTIQ/Optiq, VISTIQ/Vistiq; Chevrolet BOLT/Bolt). This independently corroborates the already-rechecked EPA all-years rows. Neither result claims a retail-sale count, delivery, or final national lineup. The separate preliminary workbook still lacks an exact ID join, but it is not the sole evidence for these profile identities.", "",
        "| Make | MY2027 catalog models present in vPIC | Source response |",
        "|---|---|---|"]
    for make, data in MAKE_SLUGS.items():
        requested = [row["model"] for row in targets if norm(row["make"]) == norm(make)]
        names = results_by_make[make]["models"]
        labels = [next(name for name in names if norm(name) == norm(model)) for model in requested]
        appendix.append(f"| {make} | {', '.join(labels)} | `{results_by_make[make]['path']}` |")
    appendix.extend([
        "",
        "This cross-check verifies make/model/year identity only. It does not certify other populated profile fields; the separate MY2027 Chrysler Pacifica generation field is assessed in `research/profile-information-verification.md`.",
    ])
    findings_path = AUDIT / "my2027-findings.md"
    findings_text = findings_path.read_text(encoding="utf-8")
    marker = "\n## Follow-up: independent MY2027 vPIC identity cross-check"
    if marker in findings_text:
        findings_text = findings_text.split(marker, 1)[0].rstrip()
    findings_path.write_text(findings_text + "\n" + "\n".join(appendix) + "\n", encoding="utf-8")

    by_id = {row["profile_id"]: row for row in matched}
    dispositions_path = AUDIT / "profile-dispositions.csv"
    with dispositions_path.open(newline="", encoding="utf-8") as file:
        dispositions = list(csv.DictReader(file))
    base_fields = list(dispositions[0])
    for extra in ["my2027_nhtsa_identity_status", "my2027_nhtsa_model_label", "my2027_nhtsa_source_url"]:
        if extra not in base_fields:
            base_fields.append(extra)
    for row in dispositions:
        evidence = by_id.get(row["profile_id"])
        if evidence:
            row["my2027_nhtsa_identity_status"] = evidence["identity_verdict"]
            row["my2027_nhtsa_model_label"] = evidence["vpic_model"]
            row["my2027_nhtsa_source_url"] = evidence["nhtsa_source_url"]
        else:
            row.setdefault("my2027_nhtsa_identity_status", "")
            row.setdefault("my2027_nhtsa_model_label", "")
            row.setdefault("my2027_nhtsa_source_url", "")
    with dispositions_path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=base_fields)
        writer.writeheader()
        writer.writerows(dispositions)

    summary = {
        "catalog_profiles": 34, "nhtsa_make_year_records": len(matched),
        "make_groups": len(MAKE_SLUGS),
        "case_sensitive_matches": sum(row["model_name_match"] == "Exact" for row in matched),
        "case_only_matches": sum(row["model_name_match"] != "Exact" for row in matched),
        "missing_make_model_year_matches": 0,
        "verified_identity_fields_per_profile": ["make", "model", "model year"],
        "additional_populated_fields_not_checked": [
            {"profile_id": row["profile_id"], "field": row["field"], "claim_ids": json.loads(row["claim_ids"])}
            for row in additional_facts
        ],
        "not_verified": [
            "actual sale/delivery", "final retail lineup", "all configuration details",
            "crosswalk to preliminary EPA workbook", "any additional populated fact listed above",
        ],
        "all_profiles_release_ready": False,
    }
    (AUDIT / "my2027-identity-crosscheck-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
