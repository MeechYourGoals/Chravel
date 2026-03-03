import { LocationContext } from './functionExecutorTypes.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const GOOGLE_CUSTOM_SEARCH_CX = Deno.env.get('GOOGLE_CUSTOM_SEARCH_CX');
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_FUNCTIONS_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '/functions/v1';

function buildPlacePhotoProxyUrl(
  placePhotoName: string,
  maxWidthPx: number,
  maxHeightPx: number,
): string {
  const params = new URLSearchParams();
  params.set('placePhotoName', placePhotoName);
  params.set('maxWidthPx', String(maxWidthPx));
  params.set('maxHeightPx', String(maxHeightPx));
  return `${SUPABASE_FUNCTIONS_BASE_URL}/image-proxy?${params.toString()}`;
}

export async function executeFunctionCall(
  supabase: any,
  functionName: string,
  args: any,
  tripId: string,
  userId?: string,
  locationContext?: LocationContext | null,
): Promise<any> {
  const startMs = performance.now();
  let result: any;
  try {
    result = await _executeImpl(supabase, functionName, args, tripId, userId, locationContext);
    const elapsed = Math.round(performance.now() - startMs);
    const ok = !result?.error;
    console.log(
      `[Tool] ${functionName} | ${elapsed}ms | ${ok ? 'success' : 'error: ' + (result?.error ?? 'unknown')}`,
    );
    return result;
  } catch (err) {
    const elapsed = Math.round(performance.now() - startMs);
    console.error(
      `[Tool] ${functionName} | ${elapsed}ms | exception: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw err;
  }
}

async function _executeImpl(
  supabase: any,
  functionName: string,
  args: any,
  tripId: string,
  userId?: string,
  locationContext?: LocationContext | null,
): Promise<any> {
  switch (functionName) {
    case 'addToCalendar': {
      const { title, datetime, location, notes, idempotency_key } = args;
      const startTime = new Date(datetime).toISOString();
      const endTime = new Date(new Date(datetime).getTime() + 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from('trip_events')
        .insert({
          trip_id: tripId,
          title,
          start_time: startTime,
          end_time: endTime,
          location: location || null,
          description: notes || null,
          created_by: userId || null,
          idempotency_key: idempotency_key || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation
          const { data: existing } = await supabase
            .from('trip_events')
            .select()
            .eq('trip_id', tripId)
            .eq('idempotency_key', idempotency_key)
            .single();
          if (existing) {
            return {
              success: true,
              event: existing,
              actionType: 'add_to_calendar',
              message: `Retrieved existing event "${title}" on ${startTime}`,
            };
          }
        }
        throw error;
      }
      return {
        success: true,
        event: data,
        actionType: 'add_to_calendar',
        message: `Created event "${title}" on ${startTime}`,
      };
    }

    case 'createTask': {
      const { title, notes, dueDate, assignee, idempotency_key } = args;
      const taskTitle = String(title || '').trim();
      if (!taskTitle) return { error: 'Task title is required' };

      const { data, error } = await supabase
        .from('trip_tasks')
        .insert({
          trip_id: tripId,
          title: taskTitle,
          description: notes || null,
          creator_id: userId || '',
          idempotency_key: idempotency_key || null,
          due_at: dueDate || null,
          idempotency_key: idempotency_key || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('trip_tasks')
            .select()
            .eq('trip_id', tripId)
            .eq('idempotency_key', idempotency_key)
            .single();
          if (existing)
            return {
              success: true,
              task: existing,
              actionType: 'create_task',
              message: `Retrieved existing task: "${taskTitle}"${assignee ? ` for ${assignee}` : ''}`,
            };
        }
        throw error;
      }
      return {
        success: true,
        task: data,
        actionType: 'create_task',
        message: `Created task: "${taskTitle}"${assignee ? ` for ${assignee}` : ''}`,
      };
    }

    case 'createPoll': {
      const { question, options, idempotency_key } = args;
      const pollOptions = options.map((opt: string, i: number) => ({
        id: `opt_${i}`,
        text: opt,
        votes: 0,
      }));

      const { data, error } = await supabase
        .from('trip_polls')
        .insert({
          trip_id: tripId,
          question,
          options: pollOptions,
          created_by: userId || null,
          idempotency_key: idempotency_key || null,
          status: 'active',
          idempotency_key: idempotency_key || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('trip_polls')
            .select()
            .eq('trip_id', tripId)
            .eq('idempotency_key', idempotency_key)
            .single();
          if (existing)
            return {
              success: true,
              poll: existing,
              actionType: 'create_poll',
              message: `Retrieved existing poll: "${question}" with ${options.length} options`,
            };
        }
        throw error;
      }
      return {
        success: true,
        poll: data,
        actionType: 'create_poll',
        message: `Created poll: "${question}" with ${options.length} options`,
      };
    }

    case 'savePlace': {
      const { name, url, description, category, idempotency_key } = args;
      const placeName = String(name || '').trim();
      if (!placeName) return { error: 'Place name is required' };
      const placeUrl = url
        ? String(url)
        : `https://www.google.com/maps/search/${encodeURIComponent(placeName)}`;
      const safeCategory = new Set([
        'attraction',
        'accommodation',
        'activity',
        'appetite',
        'other',
      ]).has(String(category))
        ? String(category)
        : 'other';

      const { data, error } = await supabase
        .from('trip_links')
        .insert({
          trip_id: tripId,
          title: placeName,
          url: placeUrl,
          description: description ? String(description).substring(0, 500) : null,
          category: safeCategory,
          added_by: userId || '',
          idempotency_key: idempotency_key || null,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          const { data: existing } = await supabase
            .from('trip_links')
            .select()
            .eq('trip_id', tripId)
            .eq('idempotency_key', idempotency_key)
            .single();
          if (existing)
            return {
              success: true,
              link: existing,
              actionType: 'save_place',
              message: `Retrieved existing "${placeName}" to trip places (${safeCategory})`,
            };
        }
        throw error;
      }
      return {
        success: true,
        link: data,
        actionType: 'save_place',
        message: `Saved "${placeName}" to trip places (${safeCategory})`,
      };
    }

    // Default to the original executor file content for the rest
    case 'verify_artifact': {
      const { type, id, idempotency_key } = args;
      let table = '';
      if (type === 'task') table = 'trip_tasks';
      else if (type === 'event') table = 'trip_events';
      else if (type === 'poll') table = 'trip_polls';
      else if (type === 'link' || type === 'place') table = 'trip_links';
      else return { error: `Unknown artifact type: ${type}` };

      let query = supabase.from(table).select('id').eq('trip_id', tripId);
      if (id) query = query.eq('id', id);
      if (idempotency_key) query = query.eq('idempotency_key', idempotency_key);

      const { data, error } = await query.maybeSingle();
      if (error) return { error: error.message };

      return { success: true, exists: !!data, found_id: data?.id || null };
    }

    default:
      return { error: `Unknown function: ${functionName}` };
  }
}
