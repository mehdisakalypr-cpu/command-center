export const FULFILLMENT_RUBRIC_SYSTEM = `Judge a fulfillment automation. For each order you have the expected_artifact (e.g. download_link | access_credential | confirmation_email) and the actual (artifact_type, artifact_value, elapsed_seconds).
Score JSON: { "artifact_match": 0|1, "within_sla": 0|1 }. artifact_match: 1 if types align.`;
