/**
 * Fetch Invoices
 * 
 * Retrieves invoice history from Stripe for the authenticated user.
 * Returns formatted invoice data including amount, status, date, and download link.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[FETCH-INVOICES] ${step}${detailsStr}`);
};

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  dueDate: number | null;
  pdfUrl: string | null;
  hostedUrl: string | null;
  description: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createOptionsResponse();
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return createErrorResponse('Service configuration error', 500);
    }
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse('Authentication required', 401);
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return createErrorResponse('Unauthorized', 401);
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Get user's Stripe customer ID from private_profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from('private_profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      logStep("No Stripe customer found", { userId: user.id });
      return createSecureResponse({ invoices: [] });
    }
    logStep("Found Stripe customer", { customerId: profile.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Parse query parameters
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const startingAfter = url.searchParams.get('starting_after') || undefined;

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: profile.stripe_customer_id,
      limit,
      starting_after: startingAfter,
    });

    logStep("Fetched invoices", { count: invoices.data.length });

    // Format invoices for frontend
    const formattedInvoices: Invoice[] = invoices.data.map((invoice: any) => ({
      id: invoice.id,
      number: invoice.number || invoice.id,
      amount: invoice.amount_due / 100, // Convert from cents
      currency: invoice.currency.toUpperCase(),
      status: invoice.status || 'unknown',
      created: invoice.created,
      dueDate: invoice.due_date,
      pdfUrl: invoice.invoice_pdf,
      hostedUrl: invoice.hosted_invoice_url,
      description: invoice.description || getInvoiceDescription(invoice)
    }));

    return createSecureResponse({
      invoices: formattedInvoices,
      hasMore: invoices.has_more,
      nextCursor: invoices.data[invoices.data.length - 1]?.id
    });
  } catch (error) {
    logError('FETCH_INVOICES', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});

function getInvoiceDescription(invoice: Stripe.Invoice): string {
  if (invoice.lines.data.length === 0) {
    return 'Invoice';
  }
  
  const firstLine = invoice.lines.data[0];
  if (firstLine.description) {
    return firstLine.description;
  }
  
  if (firstLine.plan?.nickname) {
    return firstLine.plan.nickname;
  }
  
  return 'Subscription Payment';
}
