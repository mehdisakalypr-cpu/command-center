export const ACQUISITION_RUBRIC_SYSTEM = `Judge a lead-qualification automation. For each case, you have the profile, expected_qualify, expected_hook, and the actual (qualified: bool, hook: string, message: string).
Score JSON: { "qualify_match": 0|1, "hook_match": 0|1, "message_quality": 0..5 }. hook_match: 1 if hook matches or is a close synonym of expected_hook.`;
