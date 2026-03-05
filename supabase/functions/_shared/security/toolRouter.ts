import { verifyCapabilityToken } from './capabilityTokens.ts';
import { executeFunctionCall } from '../functionExecutor.ts';

export async function executeToolSecurely(
  supabase: any,
  capabilityToken: string,
  toolName: string,
  args: Record<string, any>,
  locationContext?: any
) {
  // 1. Verify capability token signature + TTL
  const cap = await verifyCapabilityToken(capabilityToken);

  // 2. Verify tool is allowed
  if (cap.allowed_tools[0] !== '*' && !cap.allowed_tools.includes(toolName)) {
    throw new Error(`Permission denied: Tool '${toolName}' is not allowed by this capability token.`);
  }

  // 3. Enforce argument constraints (trip_id immutability, IDs belong to trip, etc.)
  // Force the trip_id and user_id to match the capability token, ignoring whatever the model provided.
  const enforcedArgs = { ...args };

  if (enforcedArgs.trip_id && enforcedArgs.trip_id !== cap.trip_id) {
    console.warn(`[Security] LLM attempted to use trip_id ${enforcedArgs.trip_id}, forcing capability trip_id ${cap.trip_id}`);
  }
  enforcedArgs.trip_id = cap.trip_id; // Explicitly override

  // 4. Execute the tool
  const result = await executeFunctionCall(
    supabase,
    toolName,
    enforcedArgs,
    cap.trip_id,
    cap.user_id,
    locationContext
  );

  // 5. Return sanitized output
  return sanitizeToolOutput(toolName, result);
}

function sanitizeToolOutput(toolName: string, result: any): any {
  if (!result) return result;

  if (result.error) {
    // Basic error redaction if necessary
    return { error: result.error };
  }

  // Copy result to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(result));

  // Redact PII or sensitive info based on tool and returned data
  if (sanitized.event) {
    delete sanitized.event.created_by;
    delete sanitized.event.trip_id; // Implicit from context
  }
  if (sanitized.task) {
    delete sanitized.task.creator_id;
    delete sanitized.task.trip_id;
  }
  if (sanitized.poll) {
    delete sanitized.poll.created_by;
    delete sanitized.poll.trip_id;
  }
  if (sanitized.link) {
    delete sanitized.link.added_by;
    delete sanitized.link.trip_id;
  }

  // If a tool returns users/members, strip out emails and phone numbers.
  // This ensures they don't leak into the LLM context.
  if (sanitized.users && Array.isArray(sanitized.users)) {
    sanitized.users = sanitized.users.map((u: any) => ({
      id: u.id,
      display_name: u.display_name || u.first_name,
      role: u.role
      // omitted: email, phone_number, etc.
    }));
  }

  return sanitized;
}
