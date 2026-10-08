Source: https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeIdYear/makeId/441/modelyear/2011?format=json
Title: NHTSA vPIC exact model/year query: Tesla Roadster MY2011
Fetched: 2026-10-08T01:33:45Z
HTTP status: 200

## Cross-check result

- Tesla Roadster MY2011: matching Make_Name and Model_Name found in the response to this year-scoped endpoint.

Current endpoint returned 1 records, scoped by the requested model year 2011. The response does not echo a ModelYear field; the year scope is established by the request URL. Full response captured below for reproducibility.

```json
{
  "Count": 1,
  "Message": "Results returned successfully",
  "SearchCriteria": "Make ID:441 | ModelYear:2011",
  "Results": [
    {
      "Make_ID": 441,
      "Make_Name": "TESLA",
      "Model_ID": 2071,
      "Model_Name": "Roadster"
    }
  ]
}
```
