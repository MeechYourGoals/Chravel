import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find unsettled payments older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: overduePayments, error } = await supabase
      .from('payment_splits')
      .select(
        `
        id,
        debtor_user_id,
        amount_owed,
        payment_message_id,
        trip_payment_messages (
          trip_id,
          description,
          currency,
          created_by
        )
      `,
      )
      .eq('is_settled', false)
      .lt('created_at', sevenDaysAgo.toISOString());

    if (error) throw error;

    console.log(`Found ${overduePayments?.length || 0} overdue payments`);

    const reminders = [];
    for (const payment of overduePayments || []) {
      // Log reminder sent
      const { error: auditError } = await supabase.from('payment_audit_log').insert({
        payment_message_id: payment.payment_message_id,
        action: 'reminder_sent',
        metadata: {
          debtor_user_id: payment.debtor_user_id,
          amount_owed: payment.amount_owed,
          days_overdue: Math.floor(
            (Date.now() - new Date(sevenDaysAgo).getTime()) / (1000 * 60 * 60 * 24),
          ),
        },
      });

      if (!auditError) {
        reminders.push({
          user_id: payment.debtor_user_id,
          payment_id: payment.payment_message_id,
          amount: payment.amount_owed,
        });
      }
    }

    console.log(`Sent ${reminders.length} payment reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: reminders.length,
        reminders,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error sending payment reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
