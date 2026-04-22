export const SUPPORT_RUBRIC_SYSTEM = `You judge a support-automation response. For each case you have (1) the ticket (2) the expected disposition (self_serve_link | escalate_billing | escalate_engineering | escalate_security | escalate_compliance | escalate_bd | acknowledge_product_feedback) (3) the automation's actual response.
Score:
- DISPOSITION_MATCH: 1 if actual disposition matches expected, 0 otherwise
- RESOLVED_WITHOUT_HUMAN: 1 if the response is a full self-serve answer that needs no human follow-up (only applies to self_serve_link dispositions), 0 if it escalates

Return strict JSON: { "disposition_match": 0|1, "resolved_without_human": 0|1 }. disposition_match for escalation tickets: 1 if escalates to the right team, 0 otherwise. resolved_without_human for escalation tickets: 0 (they need human).`;
