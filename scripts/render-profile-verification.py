"""Generate read-only verification deliverables from the completed profile census."""
import collections
import csv
import html
import json
import pathlib
import re
import urllib.parse

ROOT = pathlib.Path("research")
AUDIT = ROOT / "profile-information-audit"


def rows(name):
    with (AUDIT / name).open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        if not reader.fieldnames or any(not field for field in reader.fieldnames):
            raise ValueError(f"{name}: missing CSV header")
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise ValueError(f"{name}: duplicate CSV header")
        records = []
        for record in reader:
            if None in record or any(value is None for value in record.values()):
                raise ValueError(
                    f"{name}: CSV row ending at line {reader.line_num} "
                    "does not match the header width"
                )
            records.append(record)
        return records


def inline(text):
    value = html.escape(text)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"\[\[(\d+)\]\]\(([^ \t]+)\)", r'<a href="\2">[\1]</a>', value)
    value = re.sub(r"\[([^\]]+)\]\(([^ \t]+)\)", r'<a href="\2">\1</a>', value)
    return value


def make_html(markdown, title):
    blocks, paragraph, list_kind = [], [], None
    source_section = False
    lines = markdown.splitlines()
    index = 0

    def flush():
        nonlocal paragraph, list_kind
        if paragraph:
            blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph = []
        if list_kind:
            blocks.append("</" + list_kind + ">")
            list_kind = None

    while index < len(lines):
        line = lines[index].strip()
        if not line:
            flush()
        elif line.startswith("#"):
            flush()
            heading = re.match(r"^(#{1,6})\s+(.+)$", line)
            level, text = len(heading[1]), heading[2]
            source_section = text == "Sources" or (source_section and level > 2)
            blocks.append(f"<h{level}>{inline(text)}</h{level}>")
        elif line.startswith("|"):
            flush()
            table = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", cell or " ") for cell in cells):
                    table.append(cells)
                index += 1
            blocks.append("<div class='table'><table>")
            for number, cells in enumerate(table):
                tag = "th" if number == 0 else "td"
                blocks.append("<tr>" + "".join(f"<{tag}>{inline(cell)}</{tag}>" for cell in cells) + "</tr>")
            blocks.append("</table></div>")
            continue
        elif re.match(r"^(\d+\.\s+|-\s+)", line):
            if paragraph:
                blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
                paragraph = []
            match = re.match(r"^(\d+)\.\s+(.+)$", line)
            kind = "ol" if match else "ul"
            if list_kind != kind:
                if list_kind:
                    blocks.append("</" + list_kind + ">")
                blocks.append("<" + kind + ">")
                list_kind = kind
            content = match[2] if match else line[2:]
            anchor = f' id="source-{match[1]}"' if source_section and match else ""
            blocks.append(f"<li{anchor}>{inline(content)}</li>")
        else:
            paragraph.append(line)
        index += 1
    flush()
    css = """
    *{box-sizing:border-box}body{margin:0;background:#f3f5f7;color:#17232c;font:16px/1.65 system-ui,sans-serif}
    main{max-width:1080px;margin:36px auto;padding:38px;background:white;border:1px solid #dae1e6}
    h1{font-size:32px;line-height:1.2}h2{margin-top:34px;font-size:24px}h3{font-size:19px}
    a{color:#165a8c;overflow-wrap:anywhere}code{background:#eef2f4;padding:2px 4px;font-size:.9em}
    .table{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}
    th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #d9e0e5}th{background:#edf2f5}
    li{margin:9px 0}@media(max-width:650px){main{margin:0;padding:22px;border:0}h1{font-size:26px}}
    """
    return f"<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>{html.escape(title)}</title><style>{css}</style><main>{''.join(blocks)}</main></html>"


def render_trim_source_ledger(trim_evidence_rows):
    grouped = collections.defaultdict(list)
    for row in trim_evidence_rows:
        grouped[(row.get("source_url") or "").strip()].append(row)

    public_urls = [url for url in grouped if url]
    url_less_rows = grouped.get("", [])
    url_less_source_ids = {
        row["source_id"] for row in url_less_rows if row.get("source_id")
    }
    strength_counts = collections.Counter(
        row["evidence_strength"] for row in trim_evidence_rows
        if row.get("evidence_strength")
    )
    strength_text = ", ".join(
        f"{strength_counts[key]} {key}"
        for key in ("moderate", "strong")
        if strength_counts.get(key)
    )
    source_word = "source record" if len(url_less_source_ids) == 1 else "source records"

    lines = [
        "# Trim-evidence source ledger",
        "",
        f"**Generated from:** `research/catalog-trim-evidence.csv` ({len(trim_evidence_rows)} rows, 2026-10-08 review).",
        "",
        "This ledger establishes which public URLs the development preview claims cite and separately identifies claim rows with no public URL. It is not a full capture of every linked webpage/PDF, is not a license, and does not independently clear access, storage, attribution, or public-display rights. See the row-level CSV for source locators and claim IDs.",
        "",
        (
            f"**Distinct public URLs:** {len(public_urls)} · "
            f"**Profiles:** {len({row['profile_id'] for row in trim_evidence_rows})} · "
            f"**Claim rows:** {len(trim_evidence_rows)} · "
            f"**URL-less claim rows:** {len(url_less_rows)} "
            f"({len(url_less_source_ids)} internal {source_word}) · "
            f"**Strength:** {strength_text}."
        ),
        "",
        "| URL or source note | Profiles | Claim rows | Claim strength | Document identifiers |",
        "|---|---:|---:|---|---|",
    ]

    for url in sorted(grouped, key=lambda value: (bool(value), value)):
        records = grouped[url]
        counts = collections.Counter(
            row["evidence_strength"] for row in records
            if row.get("evidence_strength")
        )
        claim_strength = "; ".join(
            f"{strength}={counts[strength]}" for strength in sorted(counts)
        )
        documents = "; ".join(sorted({
            row["document_identifier"] for row in records
            if row.get("document_identifier")
        }))
        url_label = (
            f"`{url}`" if url
            else "No public URL (internal research review)"
        )
        lines.append(
            f"| {url_label} | {len({row['profile_id'] for row in records})} "
            f"| {len(records)} | {claim_strength} | {documents} |"
        )

    return "\n".join(lines) + "\n"


def main():
    summary = json.loads((AUDIT / "summary.json").read_text())
    epa = json.loads((AUDIT / "epa-live-recheck.json").read_text())
    profiles, fields = rows("profiles.csv"), rows("populated-information.csv")
    sibling_lineage = summary.get("sibling_trim_item_lineage", {})
    source_revision_provenance = summary.get("source_revision_provenance", {})
    if sibling_lineage:
        assert sibling_lineage["listed_items"] == sibling_lineage["items_with_profile_links"]
        assert sibling_lineage["claim_ids_resolved"] > 0
    claim_sources = rows("claim-sources.csv")
    if source_revision_provenance:
        assert claim_sources and "stored_revision_key" in claim_sources[0]
        assert "revision_id" not in claim_sources[0]
        wikipedia_rows = [
            row for row in claim_sources
            if "wikipedia.org" in (row["source_url"] or "").lower()
            or "wikimedia.org" in (row["source_url"] or "").lower()
        ]
        wikipedia_oldid_rows = [
            row for row in wikipedia_rows
            if any(
                value.isdigit()
                for value in urllib.parse.parse_qs(
                    urllib.parse.urlparse(row["source_url"]).query
                ).get("oldid", [])
            )
        ]
        historical_review_hash_profiles = {
            row["profile_id"]
            for row in wikipedia_rows
            if "normalized factual review" in (row["source_version"] or "").lower()
            and len(row["stored_revision_key"] or "") == 64
            and all(
                character in "0123456789abcdef"
                for character in row["stored_revision_key"].lower()
            )
        }
        assert len(wikipedia_rows) == source_revision_provenance["wikipedia_claim_source_rows"]
        assert len(wikipedia_oldid_rows) == source_revision_provenance["wikipedia_urls_with_explicit_oldid"]
        assert len(historical_review_hash_profiles) == source_revision_provenance[
            "wikipedia_profiles_with_local_normalized_fact_hash"
        ]
    with (ROOT / "catalog-trim-evidence.csv").open(newline="", encoding="utf-8") as file:
        trim_evidence_rows = list(csv.DictReader(file))
    trim_profile_ids = {row["profile_id"] for row in trim_evidence_rows}
    trim_public_urls = {
        (row.get("source_url") or "").strip()
        for row in trim_evidence_rows
        if (row.get("source_url") or "").strip()
    }
    trim_url_less_rows = [
        row for row in trim_evidence_rows
        if not (row.get("source_url") or "").strip()
    ]
    trim_url_less_source_ids = {
        row["source_id"] for row in trim_url_less_rows if row.get("source_id")
    }
    trim_strength_counts = collections.Counter(
        row["evidence_strength"] for row in trim_evidence_rows
        if row.get("evidence_strength")
    )
    trim_url_less_row_word = "row" if len(trim_url_less_rows) == 1 else "rows"
    trim_url_less_source_word = (
        "source record" if len(trim_url_less_source_ids) == 1 else "source records"
    )
    trim_scope_summary = (
        f"{len(trim_evidence_rows)} accepted internal claim-source rows link to "
        f"{len(trim_public_urls)} distinct public URLs; {len(trim_url_less_rows)} "
        f"{trim_url_less_row_word} point to {len(trim_url_less_source_ids)} "
        f"URL-less internal research-review {trim_url_less_source_word}. "
        f"Evidence strength: {trim_strength_counts.get('moderate', 0)} moderate, "
        f"{trim_strength_counts.get('strong', 0)} strong. Accepted is an internal "
        "status, not independent release clearance."
    )
    (ROOT / "sources/release-review-trim-source-ledger.md").write_text(
        render_trim_source_ledger(trim_evidence_rows)
    )
    incomplete_gm_trim_profiles = {
        row["profile_id"]
        for row in trim_evidence_rows
        if (row["make"], row["model"], row["year"]) in {
            ("Chevrolet", "Silverado 1500", "2024"),
            ("GMC", "Sierra 1500", "2024"),
        }
        and "available in ... trims list" in row["source_locator"].lower()
    }
    assert len(profiles) == summary["distinct_profile_count"] == 4715
    assert len({row["profile_id"] for row in profiles}) == len(profiles)
    assert epa["same_hashed_payload"] and not epa["mismatches"]
    issues = rows("structural-issues.csv")
    assert len(issues) == summary["structural_issue_count"]
    issue_counts = collections.Counter(row["issue"] for row in issues)
    assert not any(row["issue"] in {"request_failed", "wrong_profile_id", "browse_detail_mismatch"} for row in issues)
    generations = {row["profile_id"] for row in fields if row["field"] == "generation"}
    identity_rows = rows("my2027-identity-crosscheck.csv") if (AUDIT / "my2027-identity-crosscheck.csv").exists() else []
    vpic_by_id = {row["profile_id"]: row for row in identity_rows}
    my2027_ids = set(vpic_by_id)
    my2027_vpic_urls = {
        row["nhtsa_source_url"].strip()
        for row in identity_rows
        if row.get("nhtsa_source_url", "").strip()
    }
    my2027_profile_claim_source_urls = {
        row["source_url"].strip()
        for row in claim_sources
        if row["profile_id"] in my2027_ids and row.get("source_url", "").strip()
    }
    claim_source_url_count = len({
        row["source_url"].strip()
        for row in claim_sources
        if row.get("source_url", "").strip()
    })
    vpic_crosscheck_unlinked_url_count = len(
        my2027_vpic_urls - my2027_profile_claim_source_urls
    )
    vpic_supplement_ids = {
        row["profile_id"]
        for row in claim_sources
        if row["source_id"].startswith(("nhtsa-vpic-", "nhtsa-tesla-roadster-"))
    }
    cohort_sets = {
        "EPA-linked": {
            row["profile_id"] for row in claim_sources
            if row["source_id"] == "epa-1984-present"
        },
        "annual-guide": {
            row["profile_id"] for row in claim_sources
            if row["source_id"].startswith("epa-guide-")
        },
        "selected historical": {
            row["profile_id"] for row in claim_sources
            if row["source_id"].startswith("classic-")
        },
        "vPIC-only supplement": vpic_supplement_ids,
        "trim": {row["profile_id"] for row in fields if row["field"] == "trim"},
    }
    all_profile_ids = {row["profile_id"] for row in profiles}
    cohort_union = set().union(*cohort_sets.values())
    assert cohort_union == all_profile_ids
    assert sum(map(len, cohort_sets.values())) == len(cohort_union)
    cohort_reconciliation_note = (
        "**Profile-cohort reconciliation:** The 4,715 IDs partition into "
        f"{len(cohort_sets['EPA-linked'])} EPA-linked profiles, "
        f"{len(cohort_sets['annual-guide'])} annual-guide profiles, "
        f"{len(cohort_sets['selected historical'])} selected historical profiles, "
        f"{len(cohort_sets['vPIC-only supplement'])} vPIC-only supplements, and "
        f"{len(cohort_sets['trim'])} trim profiles. These counts are inventory coverage, "
        "not fact approval. The 34 MY2027 profiles are included in the EPA-linked count "
        "and separately cross-checked against vPIC; the EPA dataset's published scope "
        "and retail-market completeness remain distinct questions."
    )
    my2027_additional_facts = [
        row for row in fields
        if row["profile_id"] in my2027_ids and row["field"] not in {"make", "model", "year"}
    ]
    with (ROOT / "catalog-release-readiness.csv").open(newline="", encoding="utf-8") as file:
        prior = list(csv.DictReader(file))
    assert {row["profile_id"] for row in prior} == {row["profile_id"] for row in profiles}
    registry = json.loads((ROOT / "sources.json").read_text())
    by_key = {source["key"]: source for source in registry}
    fact_checks = {}
    for matrix_name in (
        "f150-profile-fact-check.csv",
        "gm-profile-fact-check.csv",
        "model-a-profile-fact-check.csv",
        "mustang-profile-fact-check.csv",
        "camaro-profile-fact-check.csv",
        "chevelle-profile-fact-check.csv",
        "corvette-profile-fact-check.csv",
        "corvette-generation-fact-check.csv",
        "thunderbird-profile-fact-check.csv",
        "charger-profile-fact-check.csv",
        "gmc-ck-profile-fact-check.csv",
        "chrysler-new-yorker-profile-fact-check.csv",
        "chrysler-newport-profile-fact-check.csv",
    ):
        for check in rows(matrix_name):
            assert check["profile_id"] not in fact_checks, (
                f"Duplicate targeted fact-check row: {check['profile_id']}"
            )
            check["_matrix_file"] = matrix_name
            fact_checks[check["profile_id"]] = check
    with (ROOT / "catalog-source-inventory.csv").open(
        newline="", encoding="utf-8"
    ) as file:
        source_inventory = list(csv.DictReader(file))
    catalog_rights_by_url = collections.defaultdict(list)
    for record in source_inventory:
        if record.get("url"):
            catalog_rights_by_url[record["url"]].append(record)
    claim_sources_by_url = collections.defaultdict(list)
    for record in claim_sources:
        if record.get("source_url"):
            claim_sources_by_url[record["source_url"]].append(record)
    source_rights_coverage = []
    for url, records in sorted(claim_sources_by_url.items()):
        rights_records = catalog_rights_by_url.get(url, [])
        source_rights_coverage.append({
            "source_url": url,
            "claim_source_rows": len(records),
            "distinct_profiles": len({record["profile_id"] for record in records}),
            "source_ids": ";".join(sorted({
                record["source_id"] for record in records if record.get("source_id")
            })),
            "catalog_ledger_records": len(rights_records),
            "catalog_ledger_publishers": ";".join(sorted({
                record["publisher"] for record in rights_records if record.get("publisher")
            })),
            "catalog_ledger_rights_status": ";".join(sorted({
                record["rights_status"] for record in rights_records if record.get("rights_status")
            })) if rights_records else "not listed",
            "catalog_ledger_rights_urls": ";".join(sorted({
                record["rights_url"] for record in rights_records if record.get("rights_url")
            })),
        })
    assert len(source_rights_coverage) == summary["distinct_source_urls"]
    with (AUDIT / "source-rights-coverage.csv").open(
        "w", newline="", encoding="utf-8"
    ) as file:
        writer = csv.DictWriter(file, fieldnames=list(source_rights_coverage[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(source_rights_coverage)
    catalog_ledger_match_count = sum(
        row["catalog_ledger_records"] > 0 for row in source_rights_coverage
    )
    catalog_ledger_outside_count = len(source_rights_coverage) - catalog_ledger_match_count
    unlinked_source_record_count = sum(
        not (record.get("source_url") or "").strip() for record in claim_sources
    )
    historical_source_ids = {
        row["source_id"]
        for row in source_inventory
        if row["publisher"] == "Wikipedia contributors"
    }
    historical_profile_ids = {
        row["profile_id"]
        for row in prior
        if row["source_id"] in historical_source_ids
    }
    checked_historical_ids = set(fact_checks) & historical_profile_ids
    checked_historical_fact_count = sum(
        1 for row in fields if row["profile_id"] in checked_historical_ids
    )
    unchecked_historical_count = len(historical_profile_ids) - len(checked_historical_ids)
    excluded_source_keys = {
        source["key"] for source in registry
        if source.get("citationEligible") is False
    }
    excluded_source_urls = {
        by_key[key]["url"] for key in excluded_source_keys if key in by_key
    }
    for override in rows("publisher-exclusion-overrides.csv"):
        check = fact_checks[override["profile_id"]]
        field = override["field"]
        assert field in {"identity", "generation"}
        assert override["status_override"] == "UNVERIFIED"
        assert override["excluded_source_key"] in excluded_source_keys
        check[f"{field}_content_status"] = override["status_override"]
        check[f"{field}_evidence"] = ""
        check.setdefault("_excluded_source_keys", []).append(override["excluded_source_key"])
        check.setdefault("_exclusion_reasons", []).append(override["reason"])
    for check in fact_checks.values():
        removed_keys = list(check.get("_excluded_source_keys", []))
        for column in ("identity_evidence", "generation_evidence"):
            keys = [key for key in check[column].split(";") if key]
            removed_keys.extend(key for key in keys if key in excluded_source_keys)
            check[column] = ";".join(key for key in keys if key not in excluded_source_keys)
        if removed_keys:
            check["_excluded_source_keys"] = list(dict.fromkeys(removed_keys))
        status = check["source_use_status"]
        status = status.replace(
            "Car and Driver terms were not reviewed.",
            "Car and Driver evidence is excluded after the Hearst terms review.",
        )
        status = status.replace(
            "Car and Driver editorial reuse terms were not reviewed.",
            "Car and Driver evidence is excluded after the Hearst terms review.",
        )
        status = status.replace(
            "Car and Driver access and reuse terms remain unreviewed.",
            "Car and Driver evidence is excluded after the Hearst terms review.",
        )
        status = status.replace(
            "Car and Driver reuse terms also remain unreviewed.",
            "Car and Driver evidence is excluded after the Hearst terms review.",
        )
        status = status.replace(
            "Car and Driver, and Motor1 reuse terms were not reviewed.",
            "Car and Driver evidence is excluded after the Hearst terms review; Chevrolet and Motor1 reuse terms remain open.",
        )
        status = status.replace(
            "Car and Driver, Motor1, and NCRS reuse terms were not reviewed.",
            "Car and Driver evidence is excluded after the Hearst terms review; Motor1 and NCRS reuse terms remain open.",
        )
        status = status.replace(
            "Source-use terms for Wikipedia/Wikimedia, Hagerty, Ford, and Car and Driver remain unreviewed;",
            "Source-use terms for Wikipedia/Wikimedia, Hagerty, and Ford remain unreviewed; Car and Driver evidence is excluded;",
        )
        check["source_use_status"] = status
        matrix = check["_matrix_file"]
        year = int(check["year"])
        if matrix == "mustang-profile-fact-check.csv":
            if year == 1965:
                check["applicability_status"] = (
                    "Ford and Smithsonian identify MY1965; the 1964 launch/manufacture date is not treated as a separate model year. "
                    "The stored generation label remains unverified."
                )
            elif 1966 <= year <= 1973:
                check["applicability_status"] = (
                    "The Henry Ford records production-guide coverage for this model year, supporting bounded identity scope; "
                    "it does not establish the stored generation label or a complete U.S. sales census."
                )
            elif 1974 <= year <= 1977:
                check["applicability_status"] = (
                    "No currently eligible source establishes this profile's U.S. make/model/year identity or generation label."
                )
            elif 1979 <= year <= 1993:
                check["applicability_status"] = (
                    "EPA annual-guide or all-years records support make/model/year identity; the stored generation label remains unverified. "
                    "This does not establish a complete U.S. sales roster."
                )
        elif matrix == "camaro-profile-fact-check.csv":
            if year == 1967:
                check["applicability_status"] = (
                    "GM's archive lists a year-specific kit and GM Heritage identifies MY1967 as the new Camaro year; "
                    "this supports a bounded year label, not exact configuration or a complete U.S. sales roster."
                )
            elif year == 1970:
                check["applicability_status"] = (
                    "GM's archive lists a MY1970 Camaro kit; the mid-year introduction is not treated as a separate model year."
                )
            else:
                check["applicability_status"] = (
                    f"GM's archive lists a MY{year} Chevrolet Camaro kit; this supports a bounded year label, "
                    "not exact configuration or a complete U.S. sales roster."
                )
        elif matrix in {"corvette-profile-fact-check.csv", "gm-profile-fact-check.csv"}:
            scope = check["applicability_status"]
            scope = scope.replace("cross-checked by Car and Driver and Motor1", "cross-checked by Motor1")
            scope = scope.replace("Car and Driver identifies the MY1968 transition from C2 to C3.", "")
            scope = scope.replace("Car and Driver's Corvette history supports the first-generation interval.", "")
            scope = scope.replace("Car and Driver describes the 1963–1967 Corvette as second-generation.", "")
            scope = re.sub(r"\s+", " ", scope).replace(" .", ".").strip()
            check["applicability_status"] = scope
    counts = {row["profile_id"]: row for row in profiles}
    for row in prior:
        if row["source_id"] == "epa-1984-present":
            row["profile_audit_status"] = "All referenced identity fields match; extracted CSV SHA256 matches catalog source hash; ZIP and CSV hashes are different payloads."
            if int(row["year"]) == 2027:
                row["evidence_and_scope"] = "EPA all-years identity rows and source CSV checksum match; an independent current NHTSA vPIC make/year listing matches the displayed model name. Neither listing establishes a final retail-sales count or complete lineup; the separate workbook join is not the only identity evidence."
            else:
                row["evidence_and_scope"] = "All referenced EPA identity rows and the extracted CSV checksum match. Dataset identity support is not proof of an exhaustive retail-sales catalog."
        fact_check = fact_checks.get(row["profile_id"])
        if fact_check:
            identity_status = fact_check["identity_content_status"]
            assert identity_status in {"SUPPORTED", "UNVERIFIED"}
            generation_status = fact_check["generation_content_status"]
            assert generation_status in {"SUPPORTED", "UNVERIFIED", "NOT_PRESENT"}
            profile_values = {
                item["field"]: json.loads(item["value_json"])
                for item in fields if item["profile_id"] == row["profile_id"]
            }
            expected_values = {
                "make": fact_check["make"],
                "model": fact_check["model"],
                "year": int(fact_check["year"]),
            }
            if generation_status == "NOT_PRESENT":
                assert not fact_check["generation_value"]
                assert "generation" not in profile_values
            else:
                expected_values["generation"] = fact_check["generation_value"]
            assert profile_values == expected_values, (
                f"Targeted fact-check matrix values do not match {row['profile_id']}: "
                f"{profile_values} != {expected_values}"
            )
            source_keys = list(dict.fromkeys(
                key
                for column in ("identity_evidence", "generation_evidence")
                for key in fact_check[column].split(";")
                if key
            ))
            missing_keys = [key for key in source_keys if key not in by_key]
            assert not missing_keys, f"Missing source registry keys for {row['profile_id']}: {missing_keys}"
            added_urls = [by_key[key]["url"] for key in source_keys]
            existing_urls = [
                url.strip() for url in (row.get("all_evidence_urls") or "").split(";")
                if url.strip() and url.strip() not in excluded_source_urls
            ]
            row["all_evidence_urls"] = ";".join(dict.fromkeys(existing_urls + added_urls))
            all_values_supported = (
                identity_status == "SUPPORTED"
                and generation_status in {"SUPPORTED", "NOT_PRESENT"}
            )
            row["profile_audit_status"] = (
                f"Targeted fact check supports all {len(profile_values)} populated values; "
                "original-source provenance and source-use review remain open."
                if all_values_supported
                else (
                    (
                        "Targeted fact check leaves make/model/year identity unverified; "
                        "no generation field is populated."
                        if generation_status == "NOT_PRESENT"
                        else "Targeted fact check leaves make/model/year identity and generation unverified."
                    )
                    if identity_status == "UNVERIFIED"
                    else "Targeted fact check supports make/model/year; generation value remains unverified."
                )
            )
            row["rights_review"] = fact_check["source_use_status"]
            scope_text = fact_check["applicability_status"].rstrip(".")
            row["evidence_and_scope"] = (
                f"{'All' if all_values_supported else ('No' if identity_status == 'UNVERIFIED' else 'Identity')} "
                f"populated facts have scoped factual support. "
                f"{scope_text}. "
                f"See research/profile-information-audit/{fact_check['_matrix_file']}; "
                "this is not exhaustive-sales evidence or release approval."
            )
            unverified_fields = []
            if identity_status == "UNVERIFIED":
                unverified_fields.append("make/model/year identity")
            if generation_status == "UNVERIFIED":
                unverified_fields.append("generation")
            if unverified_fields:
                reason = (
                    "after restricted-source exclusion"
                    if fact_check.get("_excluded_source_keys")
                    else "with current evidence"
                )
                row["review_disposition"] = (
                    f"HOLD — {' and '.join(unverified_fields)} unverified {reason}; "
                    "provenance and source-use gates remain open."
                )
            else:
                row["review_disposition"] = fact_check["release_disposition"]
        if row["profile_id"] in trim_profile_ids:
            row["evidence_and_scope"] = trim_scope_summary
        row["api_profile_retrieved"] = "Yes"
        row["browse_identity_matches_detail"] = "Yes"
        row["populated_top_level_information_fields"] = counts[row["profile_id"]]["populated_information_fields"]
        row["has_populated_generation_information"] = "Yes" if row["profile_id"] in generations else "No"
        row["full_factual_verification_complete"] = "No"
        row["release_ready_now"] = "No"
        row["owner_release_approval"] = "Conditional instruction: verify every profile and its information, then prepare publication; not approval for unresolved data."
        identity = vpic_by_id.get(row["profile_id"])
        row["my2027_nhtsa_identity_status"] = identity["identity_verdict"] if identity else ""
        row["my2027_nhtsa_model_label"] = identity["vpic_model"] if identity else ""
        row["my2027_nhtsa_source_url"] = identity["nhtsa_source_url"] if identity else ""
    disposition_fields = list(prior[0])
    for field in ["my2027_nhtsa_identity_status", "my2027_nhtsa_model_label", "my2027_nhtsa_source_url"]:
        if field not in disposition_fields:
            disposition_fields.append(field)
    for destination in [AUDIT / "profile-dispositions.csv", ROOT / "catalog-release-readiness.csv"]:
        with destination.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=disposition_fields, lineterminator="\n")
            writer.writeheader()
            writer.writerows(prior)

    by_url = {source["url"]: source for source in registry}

    def cite(url):
        source = by_url[url]
        assert source.get("citationEligible", True), url
        evidence = [source["savedEvidencePath"], *source.get("additionalEvidencePaths", [])]
        assert any(pathlib.Path(path).exists() for path in evidence), url
        return "[@" + source["key"] + "]"

    vpic_table = ""
    vpic_additional_note = ""
    vpic_verdict = "The supplementary 2027 make/year comparison has not yet been run."
    if identity_rows:
        assert len(identity_rows) == 34 and len(vpic_by_id) == 34
        grouped = collections.defaultdict(list)
        for item in identity_rows:
            grouped[item["make"]].append(item)
        make_slugs = {
            "Buick": "buick", "Cadillac": "cadillac", "Chevrolet": "chevrolet",
            "Chrysler": "chrysler", "Dodge": "dodge", "Ford": "ford", "GMC": "gmc",
            "Jeep": "jeep", "Lincoln": "lincoln", "Lucid": "lucid", "Ram": "ram",
            "Rivian": "rivian", "Tesla": "tesla",
        }
        table_rows = ["| Make | MY2027 model labels matched | NHTSA source |", "|---|---|---|"]
        for make in make_slugs:
            items = sorted(grouped[make], key=lambda item: item["catalog_model"].casefold())
            labels = ", ".join(
                item["vpic_model"] + (" (case only)" if item["model_name_match"] != "Exact" else "")
                for item in items
            )
            table_rows.append(f"| {make} | {labels} | {cite(items[0]['nhtsa_source_url'])} |")
        vpic_table = "\n".join(table_rows)
        exact = sum(item["model_name_match"] == "Exact" for item in identity_rows)
        case_only = len(identity_rows) - exact
        vpic_verdict = (
            f"All **{len(identity_rows)}/34 MY2027 make/model/year identities** were independently matched "
            f"to current NHTSA vPIC make/year listings; {exact} names match text-and-case exactly and "
            f"{case_only} differ only in capitalization. The separate preliminary workbook still has no "
            "exact vehicle-ID join, but it is not the only identity evidence. These database listings do "
            "not establish a retail-sales count, delivery, or every final trim/configuration. The row-level "
            f"crosscheck is audit-only: {len(identity_rows)} rows across {len(my2027_vpic_urls)} make/year "
            f"URLs. None of those URLs appears in the profiles' field-level claim-source rows, and they are "
            f"outside the {claim_source_url_count}-URL claim-source rights crosswalk; this identity check "
            "does not support other populated facts."
        )
        if my2027_additional_facts:
            details = "; ".join(
                f"{item['profile_id']} has a separate populated {item['field']} field"
                for item in my2027_additional_facts
            )
            vpic_additional_note = (
                f"\n\n**Separate populated information not covered by the identity match:** {details}. "
                "See the Pacifica fact-level review below."
            )

    eldorado_unverified_years = sorted({
        int(check["year"])
        for check in fact_checks.values()
        if check["make"] == "Cadillac"
        and check["model"] == "Eldorado"
        and check["identity_content_status"] == "UNVERIFIED"
    })
    eldorado_unverified_summary = (
        f"{len(eldorado_unverified_years)} additional selected Eldorado "
        "model-year identities remain unverified: "
        + ", ".join(f"MY{year}" for year in eldorado_unverified_years)
        + "."
        if eldorado_unverified_years
        else "No additional selected Eldorado model-year identity remains unverified."
    )
    inventory_notes = []
    if sibling_lineage:
        inventory_notes.append(
            f"**Derived sibling-trim links:** {sibling_lineage['listed_items']} labels across "
            f"{sibling_lineage['populated_arrays']} populated arrays resolve to same-year sibling "
            f"profile IDs, with {sibling_lineage['claim_ids_resolved']} linked claim references "
            "and source URLs. This derived lineage does not independently verify trim facts or "
            "clear source-use rights; it is not release approval."
        )
    if incomplete_gm_trim_profiles:
        inventory_notes.append(
            f"**Incomplete GM trim locators:** {len(incomplete_gm_trim_profiles)} MY2024 "
            "Silverado 1500/Sierra 1500 trim profiles have saved source locators that say "
            "“Available in ... trims list” without preserving the exact name list or page locator. "
            "Those values are not independently reproducible from the saved locator. See the "
            "[trim-evidence ledger](catalog-trim-evidence.csv)."
        )
    sibling_and_trim_note = "\n\n".join(inventory_notes)
    revision_provenance_note = ""
    if source_revision_provenance:
        revision_provenance_note = (
            f"**Source-revision pinning:** The export labels the API's raw value as "
            f"`stored_revision_key` because it is not consistently a publisher revision. Across "
            f"{source_revision_provenance['wikipedia_claim_source_rows']:,} Wikipedia/Wikimedia "
            f"claim-source rows, {source_revision_provenance['wikipedia_urls_with_explicit_oldid']:,} "
            f"saved URLs include a numeric `oldid`. The {source_revision_provenance['wikipedia_profiles_with_local_normalized_fact_hash']:,} "
            "selected historical profiles use a SHA-256 digest of a local normalized factual review "
            "as the stored key; it does not identify the original Wikipedia revision. Exact source "
            "revisions remain unpinned. See the [claim/source inventory](profile-information-audit/claim-sources.csv)."
        )
    rights_coverage_note = (
        f"**Rights-ledger scope:** The catalog identity-source ledger has exact URL matches for "
        f"{catalog_ledger_match_count} of {len(source_rights_coverage)} profile claim-source URLs; "
        f"{catalog_ledger_outside_count} are outside that ledger. Its `allowed` status is not blanket "
        "clearance for every profile fact or source use, as the [catalog verification report](catalog-source-verification.md) "
        f"states. The unmatched URLs are not automatically prohibited; check their source-specific records. "
        f"{unlinked_source_record_count} claim-source records have no URL and are not in the URL crosswalk. "
        "See the [URL crosswalk](profile-information-audit/source-rights-coverage.csv) and "
        "[structural findings](profile-information-audit/structural-issues.csv)."
    )
    claim_integrity_parts = []
    missing_claim_links = issue_counts["field_state_claim_not_returned"]
    if missing_claim_links:
        claim_integrity_parts.append(
            f"**Claim projection gaps:** {missing_claim_links} field-state references point to claim IDs "
            "omitted from the profile's returned claim list. Their source details are therefore unavailable "
            "to this inventory. See the [structural findings](profile-information-audit/structural-issues.csv)."
        )
    missing_url_records = issue_counts["claim_source_record_without_url"]
    claims_without_public_urls = issue_counts["claim_no_public_source_url"]
    if missing_url_records or claims_without_public_urls:
        claim_integrity_parts.append(
            f"**Public source URL gaps:** {missing_url_records} source records lack a public URL, "
            f"and {claims_without_public_urls} claims have no public source URL. "
            "Internal review notes do not replace reproducible external evidence."
        )
    unresolved_applicability = summary.get("claims_with_unresolved_applicability", 0)
    if unresolved_applicability:
        claim_integrity_parts.append(
            f"**Unresolved applicability:** {unresolved_applicability} claims are explicitly marked "
            "`unknown`; they are not treated as verified facts or malformed records."
        )
    claim_integrity_note = "\n\n".join(claim_integrity_parts)
    release_ready_count = sum(
        row.get("release_ready_now") == "Yes"
        for row in prior
    )
    pending_review_count = sum(
        row.get("verification") == "PENDING CONTENT/APPLICABILITY/SOURCE-USE REVIEW"
        for row in fields
    )

    draft = f"""# All-profile information verification — current results

**Checked:** 2026-10-08 UTC / 2026-10-07 Pacific<br>
**Status:** Full factual verification is incomplete; **{release_ready_count} of {len(profiles)} profiles are release-ready**, and **{pending_review_count} of {len(fields)} populated fields remain flagged `PENDING CONTENT/APPLICABILITY/SOURCE-USE REVIEW`**. No public release was prepared or published.

## What was checked

Every one of the **4,715 distinct development profiles** was retrieved, not just sampled. All profile IDs and make/model/year/trim values matched their Browse records. The census found **14,936 nonempty top-level information fields**, **5,668 claim/source associations**, and **{claim_source_url_count} distinct external URLs in the profile claim-source export**. Empty reliability objects with null values were excluded from populated research. These are reproducible local inventory results, not a claim that all facts are verified.

{cohort_reconciliation_note}

{sibling_and_trim_note}

[Inventory summary](profile-information-audit/summary.json) · [Field-by-field inventory](profile-information-audit/populated-information.csv)

{revision_provenance_note}

{rights_coverage_note}

{claim_integrity_note}

The request is to verify existing information before publication. Missing research may remain clearly labeled missing; it need not be invented. A model-year identity does not require a complete retail build sheet, and a trim-name preview does not require an exhaustive option matrix unless it claims such facts. Conversely, a populated generation label, fuel specification, or factual overview needs evidence for the actual value and scope displayed.

## Corrected EPA checksum finding

The earlier audit incorrectly compared the ZIP archive checksum with the catalog's extracted-CSV checksum. A fresh download's extracted **vehicles.csv exactly matches the catalog hash**. All **18,764 referenced vehicle rows across 3,639 profiles** were rechecked, with zero ID/make/model/year/base-model mismatches. The source-version discrepancy is therefore resolved, not an outstanding release blocker. [Recheck evidence](profile-information-audit/epa-live-recheck.json) The official dataset page defines its fuel-economy scope; EPA's annual-guide archive and web-services documentation provide their respective file and identifier contexts. {cite('https://www.fueleconomy.gov/feg/download.shtml')} {cite('https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide')} {cite('https://www.fueleconomy.gov/feg/ws/index.shtml')}

EPA's default public-domain statement is favorable for EPA-produced data, subject to stated exceptions and dataset metadata. It does not create a blanket requirement for manufacturer permission merely because facts concern their products. Copyright limitations on factual material and source-specific contractual restrictions are different questions. {cite('https://edg.epa.gov/EPA_Data_License.htm')} {cite('https://www.copyright.gov/circs/circ33.pdf')} vPIC's public-use FAQ and API documentation support a narrow agency-query use, not a complete national retail-sales census. {cite('https://vpic.nhtsa.dot.gov/api/home/index/faq')} {cite('https://vpic.nhtsa.dot.gov/api')}

## Remaining factual checks

| Information | Exact result | Remaining issue |
|---|---|---|
| EPA identities | 3,639 profiles / 18,764 reference rows match and CSV hash matches | Record support is scoped to EPA's dataset, not every retail offering |
| Annual-guide identities | Prior check: 488 profiles / 908 locators and six file hashes match | Preserve guide scope and source-specific conditions |
| NHTSA vPIC supplements | 6 profiles across five year-scoped queries (two Ram MY2024 and four Tesla Roadster MY2008–2011) match the returned make/model relation in the requested year | Each profile has a matching year-scoped query and only make/model/year fields; vPIC is not a U.S. retail-sales census. All six remain not release-ready |
| Historical identities | {len(checked_historical_ids)} of {len(historical_profile_ids)} selected historical profiles now have targeted field-level matrices covering {checked_historical_fact_count} populated values; bounded evidence strength varies by source and field | {unchecked_historical_count} remain unchecked. Exact configurations remain unverified; original Wikipedia revisions and source-use terms remain open. The Charger batch uses candidate secondary guides, some of which cite the imported Wikipedia article |
| MY2027 | The 34 displayed make/model/year identities also match NHTSA's 2027 make/year records | The separate preliminary guide has no exact vehicle-ID join; it is not evidence for retail-sales coverage |
| Trim names | Fresh document support for 17 Chevrolet/GMC, 12 Ram and four Lucid labels | Ten other previews lack new original-document checks; exact claimed market scope and source-use conditions remain open |
| Generation information | 699 profiles contain it; 142 bundled era rows were inventoried | All 70 populated Corvette generation values from MY1953–2026 fit Chevrolet's official C1–C8 timeline; 45 additional rows for MY1981–1982 and MY1984–2026 are checked in the new matrix. All 28 Mustang generation values previously tied to Car and Driver are now unverified; 15 MY1979–1993 model-year identities remain supported by EPA records, while the four MY1974–1977 identity labels also lack currently eligible evidence. Three F-150 intervals (MY1975–1979 generation, MY1976–1977 grille change, and MY1978–1979 front-end update) remain supported by Ford and Hagerty across five generation fields; the same five profiles' make/model/year facts are also supported. Wikipedia revision/license and source-use terms remain unresolved; the “split-grille” locator detail remains uncorroborated; the MY2027 Pacifica field is partial because RU-code coverage stops at MY2025. Most generation fields and intervals remain unverified |
| Mustang specifications | Final-year EPA evidence supports RWD and 10-speed automatic in its own record scope | Fastback applicability/EcoBoost naming remain partial; exact octane wording and 15.9 U.S. gallons unresolved |

### GMC C/K model-year checks: MY1960–1977

All 18 selected GMC C/K profile rows were checked. Period brochure evidence supports broad GMC pickup/truck-family year labels for MY1966, MY1967, and MY1973–1977, but not exact C/K retail wording, a complete U.S. sales roster, or body/trim/configuration applicability. Eleven years remain unverified: MY1960–1961 retain an unresolved family-versus-GMC-badge naming conflict; the extracted MY1962–1963 brochure text does not establish its year; MY1964–1965 Suburban/panel leads do not establish the selected profile; the surfaced MY1969 brochure is Canadian; and available MY1968 and MY1970–1972 leads do not establish the selected U.S. light-duty profile. Holley's truck-history articles were excluded after its terms review; no Holley claims were used. XR793 scan authenticity and reuse rights, and the imported Wikipedia revision provenance, remain open. All 18 rows stay on hold. See the [GMC fact-check matrix](profile-information-audit/gmc-ck-profile-fact-check.csv), [year-by-year source review](sources/gmc-c-k-brochure-review.md), and [Holley exclusion record](sources/holley-automated-collection-exclusion.md). {cite('https://carmodelhistory.com/gmc/c-k')} {cite('https://xr793.com/wp-content/uploads/2025/02/1966-GMC-Light-Trucks.pdf')} {cite('https://xr793.com/wp-content/uploads/2024/09/1967-GMC-Pickup.pdf')} {cite('https://xr793.com/wp-content/uploads/2017/07/1973-GMC-Pickups-and-Suburbans.pdf')} {cite('https://xr793.com/wp-content/uploads/2017/08/1974-GMC-PIckups.pdf')} {cite('https://xr793.com/wp-content/uploads/2017/08/1975-GMC-Pickups.pdf')} {cite('https://xr793.com/wp-content/uploads/2017/08/1976-GMC-Pickups.pdf')} {cite('https://xr793.com/wp-content/uploads/2017/07/1977-GMC-Trucks.pdf')}

### Chrysler Newport model-year checks: MY1961–1977

All 17 selected profile rows were checked. Year-specific brochure evidence supports the Newport name/year identities for MY1961–1966 and MY1977, but does not establish exact configurations or a complete U.S. sales roster. The 1961, 1962, and 1977 page locators are preserved; the prior 1963–1966 scan observations lack exact page locators and must be restored before independent reproduction. Ten years remain unverified: MY1967–1976. The pages inspected in the 1967 brochure show other Chrysler material and do not establish Newport; those partial pages do not prove the nameplate was absent. Further 1967 screenshots and the 1972 Auto-Brochures PDF failed with HTTP 402/429 and were not retried. Year-folder titles and brochure listings were not treated as evidence. See the [Newport fact-check matrix](profile-information-audit/chrysler-newport-profile-fact-check.csv) and [brochure evidence review](sources/chrysler-newport-brochure-review.md). {cite('https://oldcarbrochures.org/United%20States/Chrysler_and_Imperial/1961_Chrysler/1961%20Chrysler%20Brochure/slides/1961%20Chrysler-02-03.html')} {cite('https://oldcarbrochures.org/United%20States/Chrysler_and_Imperial/1962_Chrysler/1962%20Chrysler%20Prestige/slides/1962%20Chrysler%20Prestige-02-03.html')} {cite('https://oldcarbrochures.org/United%20States/Chrysler_and_Imperial/index.html')} {cite('https://oldcarbrochures.org/United%20States/Chrysler_and_Imperial/1967_Chrysler/1967%20Chrysler%20Prestige/slides/1967%20Chrysler%20Prestige-10-11.html')} {cite('https://oldcarbrochures.org/United%20States/Chrysler_and_Imperial/1977_Chrysler/1977_Chrysler_Brochure/slides/1977%20Chrysler%20Brochure-06.html')} {cite('https://oldcarbrochures.org/')}

The Old Car Manual Project's general research/public-domain statements do not grant rights in individual scans. Scan provenance and reuse terms for fact retention/derivation, commercial storage, automated access, attribution, and public display remain unresolved. The exact imported Wikipedia revisions and attribution/license basis are also unknown; all 17 Newport rows remain on HOLD. {cite('https://oldcarbrochures.org/')}

### Chrysler New Yorker model-year checks: MY1940–1977

All 35 selected Chrysler New Yorker rows were checked. Period-brochure text supports the MY1952 and MY1956 name/year identities, and Savoy Automobile Museum's vehicle record supports the broad MY1977 New Yorker identity. This evidence does not establish a complete U.S. sales roster, exact retail configurations, or generation values. Thirty-two selected years remain unverified; the 1950 archive viewer title is only a lead, and the Chrysler.com MY1963 history page was excluded after FCA terms prohibited automated extraction. The 1943–1945 gap is not independently resolved by this cohort check. Auto-Brochures' checked pages did not establish a reuse license for hosted scans; the Old Car Manual Project's general public-domain/fair-use statements are not item-specific permission; Savoy restricts photo publication and no image was used. The imported Wikipedia revision, attribution, and source-use status remain open. All 35 rows remain on hold. See the [New Yorker matrix](profile-information-audit/chrysler-new-yorker-profile-fact-check.csv) and [source-rights review](sources/chrysler-new-yorker-source-rights-review.md). {cite('https://www.auto-brochures.com/makes/Chrysler/New%20Yorker/Chrysler_US%20NewYorker_1952.pdf')} {cite('https://www.auto-brochures.com/makes/Chrysler/New%20Yorker/Chrysler_US%20NewYorker_1956.pdf')} {cite('https://savoymuseum.org/portfolio-items/1977-chrysler-new-yorker-4-door-sedan')} {cite('https://savoymuseum.org/faq')} {cite('https://www.auto-brochures.com/_about.html')} {cite('https://oldcarbrochures.org/')} {cite('https://oldcarbrochures.org/December%202023/1950%20Chrysler%20Saratoga%20and%20New%20Yorker/slides/1950%20Chrysler%20Saratoga%20and%20New%20Yorker%20%28TP%29.pdf-2023-11-26%2012.2.19_Page_01.html')} {cite('https://www.chrysler.com/crossbrand_us/terms-of-use')}

The seven original GM profiles have support from the relevant extracted identity sections of their year-specific vehicle-information kits. Five long PDF extractions stopped at 50,000 characters after those identity sections; remaining pages were not reviewed. The five Corvette generation values in that original batch match Chevrolet's official C1 (1953–1962) and C2 (1963–1967) ranges. The row-level evidence and limits are in the [GM profile fact-check matrix](profile-information-audit/gm-profile-fact-check.csv). {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1953-Chevrolet-Corvette.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1954-Chevrolet-Corvette.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1955-Chevrolet-Corvette.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1964-Chevrolet-Chevelle.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1964-Chevrolet-Corvette.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1965-Chevrolet-Chevelle.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1965-Chevrolet-Corvette.pdf')} {cite('https://www.chevrolet.com/legacy/corvette')}

GM's published copyright notice prohibits reproducing or reposting its website materials without express written permission. It does not resolve rights for retaining or deriving factual data for this catalog; no source-use clearance is inferred. Source prose, tables, and images have not been copied. GM's archive and The Henry Ford's bounded production-record holdings do not establish every historical year/nameplate claim. {cite('https://www.gm.com/copyright-trademark')} {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')} {cite('https://www.thehenryford.org/collections/explore/popular-research-topics/vehicle-production-records')} Wikimedia reuse guidance explains attribution duties but does not identify the revisions used by this catalog. {cite('https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse')} {cite('https://creativecommons.org/licenses/by-sa/4.0/legalcode.en')}

The five Ford F-150 profiles now have factual support for make/model/year identity: Ford dates the nameplate's launch to MY1975, and Hagerty's model-year pages identify MY1975–1979. These valuation pages support the named years, not a complete U.S. sales census. The imported Wikipedia revision remains unpinned, and source-use terms remain open. The row-level field checks are in [the F-150 fact-check matrix](profile-information-audit/f150-profile-fact-check.csv). {cite('https://www.fromtheroad.ford.com/us/en/articles/2025/f-150-50th-anniversary')} {cite('https://www.hagerty.com/valuation-tools/Ford/F~150/1975/1975-Ford-F~150')} {cite('https://www.hagerty.com/valuation-tools/ford/f~150/1976/1976-ford-f~150-1!2_ton')} {cite('https://www.hagerty.com/valuation-tools/ford/f~150/1977/1977-ford-f~150-1!2_ton')} {cite('https://www.hagerty.com/valuation-tools/ford/f~150/1978/1978-ford-f~150-1!2_ton')} {cite('https://www.hagerty.com/valuation-tools/ford/f~150/1979/1979-ford-f~150-1!2_ton')}

Four Ford Model A profiles now have scoped support for their MY1928–1931 make/model/year identities. Ford's history and the Smithsonian account distinguish the 1927 introduction from the 1928 model year; The Henry Ford identifies 1929 as the second Model A model year; Hagerty and Hemmings describe the 1928–1931 model-year run and year-specific changes. The 1930 Henry Ford artifact record is snippet-only, and its “Date Made” value is not itself a model-year definition. This evidence does not establish complete U.S. availability or exact body/trim configurations. The current indexed Wikipedia claim says 1928–1932, but it is not the pinned revision imported into the catalog. Sources also disagree on calendar production-end timing (Ford's archived page says August 1931; the Museum of American Speed says March 1932); those dates do not determine model-year identity. The row-level checks are in the [Ford Model A fact-check matrix](profile-information-audit/model-a-profile-fact-check.csv). {cite('https://corporate.ford.com/articles/history/the-1928-ford-model-a.html')} {cite('https://www.si.edu/collections/snapshot/ford-model-automobile')} {cite('https://www.thehenryford.org/collections/explore/artifact/64736?AssetId=THF3222')} {cite('https://www.thehenryford.org/collections/explore/artifact/171189')} {cite('https://www.thehenryford.org/collections/explore/artifact/142721')} {cite('https://www.hagerty.com/media/buying-and-selling/your-handy-1928-31-ford-model-a-buyers-guide')} {cite('https://www.hemmings.com/stories/1928-31-ford-model-a-2')} {cite('https://www.si.edu/object/1931-ford-model-roadster:nmah_843058')} {cite('https://www.museumofamericanspeed.org/1931modela.html')} {cite('https://ophelia.sdsu.edu:8443/ford/07-24-2008/about-ford/heritage/vehicles/1928modela/671-model-a-1928.html')} {cite('https://en.wikipedia.org/wiki/Ford_Model_A_(1927%E2%80%9331)')}

Source-use review is a separate gate: Ford's terms restrict copying and automated access to its site; Hagerty's retrieved terms do not grant reuse rights; the retrieved Hemmings agreement is marketplace-specific and does not establish editorial reuse rights; The Henry Ford's rights information is limited to its stated media/copyright scope. The Smithsonian's CC0 label applies to the cited 1931 object's metadata, not to the other publishers or the imported Wikipedia revision. No source prose or media was copied, and no reuse clearance is inferred. {cite('https://corporate.ford.com/help/terms')} {cite('https://www.hagerty.com/media/terms')} {cite('https://www.hemmings.com/auctions/user-agreement')} {cite('https://www.thehenryford.org/copyright-policy')} {cite('https://www.si.edu/object/1931-ford-model-roadster:nmah_843058')}

Nine Ford Mustang profiles for MY1965–1973 retain bounded make/model/year support. Ford documents the 1964 World's Fair introduction and labels the displayed car a 1965 Mustang; the Smithsonian catalogs a 1965 Mustang manufactured in October 1964, and The Henry Ford describes production-guide coverage through MY1973. The 1964 launch/production date is not treated as a 1964 model year. Their stored generation labels remain unverified after excluding the Car and Driver capture. The MY1974–1977 identity and generation labels are also unverified because no currently eligible source is recorded. The original Wikipedia revision, complete U.S. sales coverage, exact configurations, and source-use terms remain unresolved. Current source-exclusion status is in [the override ledger](profile-information-audit/publisher-exclusion-overrides.csv); the prior matrix is retained for traceability. {cite('https://corporate.ford.com/articles/history/mustang-worlds-fair.html')} {cite('https://americanhistory.si.edu/collections/object/nmah_1293207')} {cite('https://www.thehenryford.org/collections/explore/articles/finding-the-history-of-your-mustang')}

The fifteen Ford Mustang profiles for MY1979–1993 retain bounded make/model/year support from the five annual EPA guides (MY1979–1983) and the verified all-years EPA dataset (MY1984–1993). Their generation fields are unverified after excluding the Car and Driver capture. EPA source scope does not establish every retail configuration or a complete sales roster, and the imported Wikipedia revision remains unidentified. See the [Mustang fact-check matrix](profile-information-audit/mustang-profile-fact-check.csv) and the current [source-exclusion override ledger](profile-information-audit/publisher-exclusion-overrides.csv). {cite('https://www.fueleconomy.gov/feg/epadata/79guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/80guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/81guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/82guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/83guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip')}

For Mustang evidence, Ford's site terms restrict use and automated access; Smithsonian marks the 1965 record's metadata CC0 while separately restricting image reuse; The Henry Ford article does not establish a reuse grant; EPA's standard license defaults EPA-produced data to public domain unless otherwise specified but directs users to dataset metadata. The Car and Driver capture is excluded after the Hearst terms review. No rights clearance is inferred, and all Mustang rows remain HOLD. {cite('https://corporate.ford.com/help/terms')} {cite('https://americanhistory.si.edu/collections/object/nmah_1293207')} {cite('https://www.thehenryford.org/copyright-policy')} {cite('https://edg.epa.gov/EPA_Data_License.htm')}

Eleven Chevrolet Camaro profiles for MY1967–1977 retain bounded make/model/year support from GM's year-specific archive index titles; GM Heritage identifies MY1967 as the new Camaro year. For MY1970, the archive title is treated as a model-year label, not a separate 1970 1/2 profile. The individual kit PDFs were not reviewed for detailed features. This does not establish a complete U.S. sales roster or exact configurations, and no generation value is populated on these profiles. The original Wikipedia revisions and GM source-use terms remain unresolved. Car and Driver captures are excluded after the Hearst terms review. See the [Camaro fact-check matrix](profile-information-audit/camaro-profile-fact-check.csv) and [publisher access-terms review](sources/publisher-access-terms-review.md). {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')} {cite('https://www.gm.com/heritage/collection/chevrolet/1967-chevrolet-camaro-pace-car')}

GM's site notice restricts reproduction and reposting; factual-data retention/derivation and automated-access conditions remain unresolved. Car and Driver captures are excluded after the Hearst terms review. No use permission is inferred. {cite('https://www.gm.com/copyright-trademark')}

Twelve Chevrolet Chevelle profiles for MY1966–1977 now have bounded identity-label support. GM's archive index lists a year-specific Chevrolet Chevelle information-kit title for each year; the individual kit PDFs were not reviewed. Hagerty's secondary 1968–1972 guide covers the Chevelle SS subset only, so it does not establish the complete line or all market offerings. A Volo history candidate was excluded because its page links terms prohibiting automated retrieval, indexing, and data mining; no Volo article text or media was retained. Row-level checks are in the [Chevelle fact-check matrix](profile-information-audit/chevelle-profile-fact-check.csv). GM and Hagerty reuse rights remain unresolved; the original Wikipedia revisions also remain unidentified. {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')} {cite('https://www.hagerty.com/media/buying-and-selling/definitive-1968-72-chevelle-ss-buyers-guide')} {cite('https://www.hagerty.com/media/terms')} {cite('https://speeddigital.com/terms-and-conditions')}

Twenty additional Chevrolet Corvette profiles for MY1956–1963 and MY1966–1977 retain bounded support for all four populated identity/generation values. GM's archive index lists a year-specific Corvette kit title for each year, but the twenty individual PDFs were not reviewed. Chevrolet's official timeline supports C1 and C2; Chevrolet's timeline, Motor1, and the NCRS guide listing support the C3 interval. Car and Driver evidence is excluded after the Hearst terms review. This supports generation labels, not exact configurations or a complete sales roster. The original Wikipedia revisions and source-use terms for GM, Chevrolet, Motor1, and NCRS remain unresolved; every row stays HOLD. See the [Corvette fact-check matrix](profile-information-audit/corvette-profile-fact-check.csv) and [publisher access-terms review](sources/publisher-access-terms-review.md). {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')} {cite('https://www.chevrolet.com/legacy/corvette')} {cite('https://www.motor1.com/features/794843/chevy-corvette-generations/')} {cite('https://www.ncrs.org/shop/index.php?cPath=1&main_page=index')} {cite('https://www.gm.com/copyright-trademark')}

The Chevrolet timeline also supplies explicit intervals for C3 (MY1968–1982), C4 (MY1984–1996), C5 (MY1997–2004), C6 (MY2005–2013), C7 (MY2014–2019), and C8 (MY2020–2027), completing the range check for all 70 populated Corvette generation values through MY2026. The additional 45 rows cover the two EPA annual-guide identities for MY1981–1982 and 43 identities from the current EPA vehicle dataset for MY1984–2026; the dataset check matched 3,639 profiles and 18,764 locators. These EPA sources support the listed identity/model-year scope, not every U.S. retail offering, and do not supply the generation field. The original generation claims still point to an unpinned Wikipedia revision. The EPA source inventory marks its data allowed, while its standard license directs users to dataset metadata; Chevrolet's site notice restricts reproduction/reposting. Rights for retained facts, derived use, and automated access remain unresolved. The MY2027 profile has no populated generation field in this snapshot. All 45 new rows remain HOLD; see the [Corvette generation matrix](profile-information-audit/corvette-generation-fact-check.csv). {cite('https://www.chevrolet.com/legacy/corvette')} {cite('https://www.fueleconomy.gov/feg/epadata/81guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/82guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip')} {cite('https://edg.epa.gov/EPA_Data_License.htm')} {cite('https://www.gm.com/copyright-trademark')}

The separate 2027 workbook remains preliminary-source evidence. Name matching does not establish an exact identifier join, and absence from that workbook cannot prove no U.S. offering. {cite('https://www.fueleconomy.gov/feg/epadata/27data.zip')} The all-years row checks remain valid; the unresolved question is what the profile can truthfully claim about status and scope.

{vpic_verdict}

{vpic_table}

{vpic_additional_note}

See the [profile-by-profile model/year reconciliation](profile-information-audit/my2027-identity-crosscheck.csv) for all 34 records. It distinguishes the three identity facts from unclaimed retail-volume and final-lineup questions.

## Trim-source evidence and limits

| Source inspected | What it supports in this pass |
|---|---|
| 2024 Chevrolet Silverado PDF | Nine named trim labels and model year; not an exhaustive configuration matrix {cite('https://media.chevrolet.com/content/dam/Media/images/US/Vehicles/Chevrolet/Trucks/Silverado/2024/2024-Chevrolet-Silverado-033023.pdf')} |
| 2024 GMC Sierra PDF | Eight named trim labels and model year; not every compatible option combination {cite('https://media.gmc.com/content/dam/Media/images/US/Vehicles/GMC/Sierra/2024/2024-GMC-Sierra-1500.pdf')} |
| Ram Heavy Duty press kit and off-road announcement | Seven 2500 / five 3500 grade identities in stated North American scope {cite('https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&mid=69')} {cite('https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&fIId=25845&mid=69')} |
| Ram availability matrix | Combined 2500/3500 cab/bed evidence, not a model-separated U.S. build-sheet matrix {cite('https://s3.amazonaws.com/chryslermedia.iconicweb.com/mediasite/specs/2024_RAM_2500_3500_HD_FA.pdf')} |
| Lucid announcement | Four named Air variants and North American context, with model-year limitations {cite('https://ir.lucidmotors.com/news-releases/news-release-details/lucid-air-model-line-updates-offer-customers-more-freedom-power')} |
| Four EPA Lucid examples | MY2024 Pure RWD, Touring AWD, G Touring XR AWD, Sapphire AWD examples—not every build {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47454')} {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47839')} {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47836')} {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47456')} |

Source-host conditions must be applied to the actual site and intended use, not transferred indiscriminately between sibling hosts. The inspected Stellantis North America media terms restrict copying for commercial distribution and distinguish editorial access. {cite('https://media.stellantisnorthamerica.com/page.do?file=legal')} The inspected From The Road terms address that Ford site. {cite('https://www.fromtheroad.ford.com/us/en/terms-and-conditions')} The Lucid IR homepage did not establish a reuse grant; absence of visible terms is not permission. {cite('https://ir.lucidmotors.com/')} These observations do not prove that ordinary normalized vehicle facts need a blanket brand license.

## Generation and Mustang information

Limited independent corroboration supports three refresh onsets: Model S in 2016, U.S. Model 3 Highland in 2024, and Pacifica in MY2021. It does **not** verify their complete end dates or all 142 era intervals. {cite('https://www.consumerreports.org/hybrids-evs/tesla-model-s-gets-facelift-upgraded-equipment')} {cite('https://www.theverge.com/2024/1/10/24032562/tesla-model-3-2024-refresh-us-available-highland')} {cite('https://www.motor1.com/news/397218/2021-chrysler-pacifica-facelift-debut')} Tesla's Model 3 manual selector supports a 2024+ U.S. manual grouping, not every transition detail. {cite('https://www.tesla.com/ownersmanual/index-model-3.html')} Calendar announcement/production dates must not be substituted for model years. {cite('https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X/section-85.2302')} A prohibited PR Newswire capture and a failed fleet-page retrieval were excluded from evidence.

### Ford F-150 generation and refresh intervals: MY1975–1979

Ford's official history dates the F-150 launch to MY1975. Ford and Hagerty support the F-150 introduction within the sixth F-Series generation, MY1973–1979; the base F-150 interval is MY1975–1979 (era `8001611`). Hagerty's 2025 guide and 1977 model history support the MY1976 grille revision carrying into 1977 (era `8001612`), followed by a 1978 redesign through the generation's 1979 endpoint (era `8001613`). The narrower “split-grille” locator detail and the 1978/1979 headlamp transition are not currently corroborated. These sources support the three displayed intervals across five 1975–1979 F-150 generation fields; separate model-year pages support the same profiles' make/model/year facts. The restricted Car and Driver capture is excluded. Factual support does not clear remaining source-use rights, which remain open. {cite('https://www.fromtheroad.ford.com/us/en/articles/2025/f-150-50th-anniversary')} {cite('https://www.hagerty.com/media/market-trends/hagerty-insider/73-79-f-series-values-are-built-ford-tough')} {cite('https://www.hagerty.com/media/buying-and-selling/your-handy-1973-79-ford-f-series-buyers-guide')} {cite('https://www.hagerty.com/valuation-tools/ford/f~150/1977/1977-ford-f~150-1!2_ton')}

### Ford F-150 generation and refresh intervals: MY1980–1983

The MY1980–1983 EPA annual guides list Ford F100/F150 2WD and F150 4WD publisher groupings; these are EPA-record identities, not an exhaustive retail-sales census or exact build configurations. Hagerty classifies MY1980–1986 as one Ford F-Series generation and describes the styling changes introduced for MY1982, supporting the stored seventh-generation and 1982 refresh labels at series level. This covers four historical F150 profiles and six additional EPA guide profiles for MY1981–1983. The imported Wikipedia revision provenance and Hagerty reuse rights remain open, so all ten profiles stay on hold. {cite('https://www.fueleconomy.gov/feg/epadata/80guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/81guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/82guide.txt')} {cite('https://www.fueleconomy.gov/feg/epadata/83guide.txt')} {cite('https://www.hagerty.com/valuation-tools/ford/f~100/1983/1983-ford-f~100-1!2_ton')} {cite('https://www.hagerty.com/media/terms')}

### Chevrolet Chevy II/Nova model-year identities: MY1962–1977

The GM Heritage archive index lists a year-specific Chevrolet Nova vehicle-information kit for every model year from 1962 through 1977; for MY1968 it lists separate Coupe and Sedan kits. This supports the Chevrolet/Nova family and model-year grouping, not an exhaustive U.S. sales roster, exact trim/body applicability, or the exact retail name across the early Chevy II/Nova transition. The profile label is a combined lineage name, not a claim that each year was marketed under both names. No kit PDF content was reviewed. Imported Wikipedia revision provenance and GM source-use rights remain open, so all sixteen profiles stay on hold. {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')}

### Other GM archive model-year identity checks

The GM Heritage index has exact year-specific titles for a 1953 Cadillac Eldorado and a 1957 Cadillac Eldorado Brougham. The latter supports an Eldorado-family member for MY1957, not every variant or an exhaustive roster. Only index titles were checked, not kit contents. Imported revision provenance and GM source-use rights remain open, so both profiles stay on hold. {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')}

### Cadillac Series 62, Eldorado, and DeVille: year-specific kit text

Targeted text from 22 year-specific GM Cadillac kits supports make/model/year for 13 Series 62 profiles, 16 Eldorado profiles, and 13 DeVille profiles. The relevant name reference appeared in the first retrieved text segment for each kit; the complete PDFs were not reviewed. This does not establish a complete U.S. sales roster or exact variant, body, trim, or configuration applicability. Text retrieval failed for seven other indexed kit PDFs, and no profile was inferred from those files. The 42 kit-supported profiles remain on hold because imported Wikipedia revision provenance and GM source-use rights remain open. {eldorado_unverified_summary} GM kit texts for MY1958, MY1963, MY1964, and MY1969 were unavailable; no general kit is indexed for MY1975–1977. These gaps do not establish that Eldorado was absent. See the [year-by-year Cadillac source review](sources/full-verification-gm-cadillac-1941-74.md) and [fact-check rows](profile-information-audit/gm-profile-fact-check.csv). {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1941_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1942_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1947_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1949_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1951_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1952_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1954_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1955_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1956_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1959_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1960_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1961_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1962_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1965_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1966_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1967_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1968_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1970_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1971_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1972_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1973_Cadillac_VVI.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/cadillac/1974_Cadillac_VVI.pdf')}

### Ford Thunderbird model-year identities: MY1955–1977

Car Model History has an exact-year guide for every Thunderbird model year from 1955 through 1977. Each guide labels its review as verified from cited period Ford materials, but those underlying documents were not independently retrieved or reviewed; the site also disclaims accuracy. This batch is bounded secondary support for make/model/year only, not a complete U.S. roster or exact variant/configuration check. The site's robots.txt permits crawlers, while its terms restrict uses beyond link sharing and do not resolve use rights for the underlying documents. No guide prose or images were copied. The imported Wikipedia revision provenance and broader use rights remain unresolved, so all 23 profiles stay on hold. See the [year-by-year evidence and cited records](sources/full-verification-ford-thunderbird-1955-77.md) and [fact-check rows](profile-information-audit/thunderbird-profile-fact-check.csv). {cite('https://carmodelhistory.com/ford/thunderbird')} {cite('https://carmodelhistory.com/ford/thunderbird/1955/')} {cite('https://carmodelhistory.com/ford/thunderbird/1956/')} {cite('https://carmodelhistory.com/ford/thunderbird/1957/')} {cite('https://carmodelhistory.com/ford/thunderbird/1958/')} {cite('https://carmodelhistory.com/ford/thunderbird/1959/')} {cite('https://carmodelhistory.com/ford/thunderbird/1960/')} {cite('https://carmodelhistory.com/ford/thunderbird/1961/')} {cite('https://carmodelhistory.com/ford/thunderbird/1962/')} {cite('https://carmodelhistory.com/ford/thunderbird/1963/')} {cite('https://carmodelhistory.com/ford/thunderbird/1964/')} {cite('https://carmodelhistory.com/ford/thunderbird/1965/')} {cite('https://carmodelhistory.com/ford/thunderbird/1966/')} {cite('https://carmodelhistory.com/ford/thunderbird/1967/')} {cite('https://carmodelhistory.com/ford/thunderbird/1968/')} {cite('https://carmodelhistory.com/ford/thunderbird/1969/')} {cite('https://carmodelhistory.com/ford/thunderbird/1970/')} {cite('https://carmodelhistory.com/ford/thunderbird/1971/')} {cite('https://carmodelhistory.com/ford/thunderbird/1972/')} {cite('https://carmodelhistory.com/ford/thunderbird/1973/')} {cite('https://carmodelhistory.com/ford/thunderbird/1974/')} {cite('https://carmodelhistory.com/ford/thunderbird/1975/')} {cite('https://carmodelhistory.com/ford/thunderbird/1976/')} {cite('https://carmodelhistory.com/ford/thunderbird/1977/')} {cite('https://carmodelhistory.com/legal/terms')} {cite('https://carmodelhistory.com/robots.txt')}

### Dodge Charger model-year identities: MY1966–1977

Car Model History's archive links exact-year guides for all 12 selected Dodge Charger profiles. Their model-year headings and Charger descriptions provide candidate bounded secondary support for make/model/year only; this is not independent confirmation of a complete U.S. roster or exact trim/body/configuration. The pages' source lists vary: the MY1966 and MY1968 guides name only the Dodge Charger Wikipedia article, and the MY1969 guide names Wikipedia articles for Charger and Charger Daytona. Other guides name period brochures, data books, specifications, and secondary sources, but these were not independently retrieved or reviewed. Some guides also cite Wikipedia, so their citations do not establish provenance for the imported claim. Car Model History disclaims accuracy; its terms limit use beyond link sharing and do not resolve rights for underlying sources or derived data. No source text, images, tables, or document contents were copied. All 12 profiles remain on hold. See the [year-by-year evidence and citation limitations](sources/full-verification-dodge-charger-1966-77.md) and [Charger fact-check rows](profile-information-audit/charger-profile-fact-check.csv). {cite('https://carmodelhistory.com/dodge/charger')} {cite('https://carmodelhistory.com/dodge/charger/1966/')} {cite('https://carmodelhistory.com/dodge/charger/1967/')} {cite('https://carmodelhistory.com/dodge/charger/1968/')} {cite('https://carmodelhistory.com/dodge/charger/1969/')} {cite('https://carmodelhistory.com/dodge/charger/1970/')} {cite('https://carmodelhistory.com/dodge/charger/1971/')} {cite('https://carmodelhistory.com/dodge/charger/1972/')} {cite('https://carmodelhistory.com/dodge/charger/1973/')} {cite('https://carmodelhistory.com/dodge/charger/1974/')} {cite('https://carmodelhistory.com/dodge/charger/1975/')} {cite('https://carmodelhistory.com/dodge/charger/1976/')} {cite('https://carmodelhistory.com/dodge/charger/1977/')} {cite('https://carmodelhistory.com/legal/terms')} {cite('https://carmodelhistory.com/robots.txt')}

### Chevrolet Impala and C/K continuity checks: MY1976–1977

The MY1976 and MY1977 Chevrolet passenger-car kits list Impala in model/series/body-style text, while the same years' Chevrolet Truck kits contain C- and K-designated model references. This extends the selected historical checks to 20 Impala profiles for MY1958–1977 and 18 broad C/K-family profiles for MY1960–1977. The combined C/K label does not establish exact retail wording or body/trim applicability. Only relevant extracted text was checked, not the complete PDFs. Imported Wikipedia revision provenance and GM source-use rights remain open, so all four profiles stay on hold. See the [1976–1977 evidence review](sources/full-verification-gm-chevrolet-1976-77.md). {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1976-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1977-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1976-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1977-Chevrolet-Truck.pdf')}

### Chevrolet C/K truck model-year checks: MY1960–1975

The year-specific Chevrolet Truck kits for MY1960–1975 each contain C- and K-designated Chevrolet truck model references. This supports the broad C/K family and model year for all 16 historical profiles. The profile's slash label is a combined family shorthand; these checks do not establish exact retail wording, body/trim availability, or configuration applicability. Only relevant extracted model/series text was checked, not the complete PDFs. Imported Wikipedia revision provenance and GM source-use rights remain open, so all 16 profiles stay on hold. See the [C/K fact-check rows](profile-information-audit/gm-profile-fact-check.csv) and [year-by-year source review](sources/full-verification-gm-chevrolet-trucks-1960-75.md). {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1960-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1961-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1962-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1963-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1964-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1965-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1966-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1967-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1968-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1969-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1970-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1971-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1972-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1973-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1974-Chevrolet-Truck.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet-trucks/1975-Chevrolet-Truck.pdf')}

### Chevrolet Impala model-year checks: MY1958–1975

The text of GM's year-specific Chevrolet vehicle-information kits for every model year from 1958 through 1975 lists Impala in a model/series/body-style context. This supports all 18 historical Impala profiles' make, nameplate, and model year, not a complete U.S. sales roster or exact trim/body configuration. The relevant match appeared in the first retrieved text segment for all 18 kits; the full PDFs were not reviewed. The direct kit evidence replaces the earlier index-title-only checks for MY1967–1968. Imported Wikipedia revision provenance and GM source-use rights remain open, so all 18 profiles stay on hold. See the [Impala fact-check rows](profile-information-audit/gm-profile-fact-check.csv) and [year-by-year source review](sources/full-verification-gm-chevrolet-impala-1958-75.md). {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1958-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1959-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1960-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1961-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1962-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1963-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1964-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1965-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1966-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1967-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1968-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1969-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1970-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1971-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1972-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1973-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1974-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1975-Chevrolet.pdf')}

### Chevrolet Bel Air model-year checks: MY1950–1975

The text of GM's year-specific Chevrolet vehicle-information kits for every model year from 1950 through 1975 lists Bel Air in a model/series/body-style context. This supports the profile's make, nameplate, and year, not a complete U.S. sales roster or exact trim/body configuration. Only the relevant extracted text was checked; for MY1950–1954, MY1960, and MY1962 the relevant match appeared in the next retrieved text segment. The original imported Wikipedia revisions and GM source-use rights remain open, so all 26 profiles stay on hold. See the [Bel Air fact-check rows](profile-information-audit/gm-profile-fact-check.csv) and [year-by-year source review](sources/gm-chevrolet-bel-air-1950-75-review.md). {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1950-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1951-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1952-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1953-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1954-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1955-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1956-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1957-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1958-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1959-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1960-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1961-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1962-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1963-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1964-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1965-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1966-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1967-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1968-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1969-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1970-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1971-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1972-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1973-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1974-Chevrolet.pdf')} {cite('https://www.gm.com/content/dam/company/no_search/heritage-archive-docs/vehicle-information-kits/chevrolet/1975-Chevrolet.pdf')}

### MY2027 Chrysler Pacifica generation field

The populated field groups a minivan line beginning with MY2017, an RU code, and a MY2027 front-fascia refresh. Stellantis' plant history dates 2017 Pacifica production to February 29, 2016. Mopar's code table maps RU to Chrysler Pacifica but expressly covers model years only through 2025. Motor1 independently dates the earlier Pacifica fascia facelift to MY2021, and Stellantis' order release specifies a refreshed front fascia for MY2027. Together these corroborate the 2017 identity and the 2021/2027 refresh sequence, but they do **not** establish that RU remains the applicable body code in MY2026 or MY2027. {cite('https://media.stellantisnorthamerica.com/newsrelease.do?id=344&mid=105')} {cite('https://www.moparrepairconnect.com/dA/c53af470f9/vehicle-model-codes.pdf')} {cite('https://www.motor1.com/news/397218/2021-chrysler-pacifica-facelift-debut')} {cite('https://www.media.stellantisnorthamerica.com/newsrelease.do?id=27519&mid=1')}

**Disposition:** The make/model/year identity is verified; the extra generation field is only partially verified until a current source establishes the RU-code applicability. Source-use review remains separate, and no profile has been marked release-ready.

The final-year EPA Mustang record supports the 2.3L/four-cylinder engine, 10-speed automatic, and rear-wheel drive, but not the retail Fastback-versus-convertible mapping, turbo/EcoBoost branding, or minimum AKI. {cite('https://fueleconomy.gov/feg/noframes/46646.shtml')} A search-index excerpt for Ford's official 2024 U.S. owner-manual HTML page lists **15.9 gal (60.2 L)** for the 2.3L EcoBoost, matching the profile value. A direct fetch returned navigation instead of the section table, so treat this as partial support, not an inspected table. {cite('https://www.fordservicecontent.com/Ford_Content/vdirsnet/OwnerManual/Home/Content?ProcUid=G2301085&buildtype=web&countryCode=USA&div=f&languageCode=en&moidRef=G2133836&userMarket=usa&vFilteringEnabled=False&variantid=9122')} The minimum-octane wording remains unresolved. The separate 2024 owner-manual PDF returned HTTP 403 despite successful HEAD metadata; its pages were not inspected, the PDF was not retried, and no access-control bypass was attempted. [Retrieval result](profile-information-audit/mustang-manual-inspection.json) {cite('https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf')}

The Mustang overview is an authored historical research snapshot. Current government requests again returned **12 recall campaigns**, but now **82 complaints**, compared with its October 3 snapshot's 81. NCAP still returns five-star overall and InvestigationCount 0 for the two-door RWD family. These are not exact-configuration recalls, defect rates, VIN-open status, or a transferred EcoBoost safety rating. A visible snapshot date must accompany the older total. [Saved current responses](profile-information-audit/mustang-complaints-live.json) · [Recall response](profile-information-audit/mustang-recalls-live.json) · [NCAP response](profile-information-audit/mustang-safety-live.json)

## Flag triage and release decision

The 19 automated flags all concern the private Mustang: five unknown-field references whose claims are not exposed, twelve claims with unresolved applicability, and two internally authored notes without external URLs. There are **zero missing claim references on known fields**. Unknown recall/safety/MPG values remain withheld; these flags are not 19 incorrect displayed facts. [Raw flags](profile-information-audit/structural-issues.csv)

Full factual verification remains incomplete, particularly for existing generation information, historical identities, claimed market scope and Mustang details. Missing research and lack of an exhaustive national sales census are **not**, by themselves, reasons to reject a correctly scoped identity profile. The problem is unresolved support for information actually present and its usable provenance. No profile was removed, no optional fact invented, no production data changed, and no publication attempted.

The per-profile output keeps factual-verification completion and release readiness at **No** until the required checks are complete. It records the owner's conditional verification-then-publication instruction rather than an approval to publish unresolved rows. Publishing the current development-preview build would not make these profiles a verified production catalog. [All 4,715 profile dispositions](profile-information-audit/profile-dispositions.csv)
"""
    ordered_keys = list(dict.fromkeys(re.findall(r"\[@([^\]]+)\]", draft)))
    numbers = {key: number for number, key in enumerate(ordered_keys, 1)}
    rendered = re.sub(r"\[@([^\]]+)\]", lambda match: f"[[{numbers[match[1]]}]]({by_key[match[1]]['url']})", draft)
    rendered += "\n## Sources\n\n"
    for key in ordered_keys:
        source = by_key[key]
        paths = [source["savedEvidencePath"], *source.get("additionalEvidencePaths", [])]
        evidence = next((p for p in paths if "full-verification-" in p and pathlib.Path(p).exists()), source["savedEvidencePath"])
        rendered += f"{numbers[key]}. [{source['title'] or key}]({source['url']}) — Published: {source.get('publicationDate') or 'not surfaced'}; {source['tier']}; evidence: `{evidence}`.\n"
    rendered = rendered.replace("**Status:**", f"**Sources cited:** {len(ordered_keys)}<br>\n**Status:**", 1)
    (ROOT / "profile-information-verification.md").write_text(rendered)
    (ROOT / "profile-information-verification.html").write_text(make_html(rendered, "All-profile information verification"))
    # Rebuild derived reports so their HTML no longer repeats the false checksum claim.
    for name in ["catalog-coverage-report", "catalog-release-readiness"]:
        markdown = (ROOT / (name + ".md")).read_text()
        (ROOT / (name + ".html")).write_text(make_html(markdown, name.replace("-", " ").title()))
    print(json.dumps({"profiles": len(prior), "populated_fields": len(fields), "profiles_with_generation": len(generations), "cited_sources": len(ordered_keys), "release_ready": 0}, indent=2))


if __name__ == "__main__":
    main()
