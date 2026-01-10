/**
 * Vercel Edge Function for Invite Link OG Previews
 * 
 * Routes /join/:code to Supabase generate-invite-preview edge function
 * to serve Open Graph meta tags for iMessage, Slack, Twitter, etc.
 * 
 * Bots do NOT execute JavaScript, so this returns static HTML with OG tags.
 */

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Invalid Invite - Chravel</title>
  <meta property="og:title" content="Invalid Invite Link" />
  <meta property="og:description" content="This invite link is missing or invalid." />
  <meta property="og:site_name" content="ChravelApp" />
</head>
<body>
  <h1>Invalid Invite Link</h1>
  <p>The invite code is missing from this URL.</p>
</body>
</html>`,
      {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  try {
    // Proxy to Supabase generate-invite-preview edge function
    const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF || 'jmjiyekmxwsxkfnqwyaa';
    const supabaseUrl = `https://${supabaseProjectRef}.supabase.co/functions/v1/generate-invite-preview?code=${encodeURIComponent(code)}`;
    
    const upstream = await fetch(supabaseUrl, {
      method: 'GET',
      headers: {
        'User-Agent': request.headers.get('User-Agent') || 'Vercel Edge Function',
        'Accept': 'text/html',
      },
    });

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch (error) {
    console.error('Error fetching invite preview:', error);
    
    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Trip Invite - ChravelApp</title>
  <meta property="og:title" content="You're Invited!" />
  <meta property="og:description" content="Join this trip on ChravelApp - The Group Chat Travel App" />
  <meta property="og:site_name" content="ChravelApp" />
  <meta property="og:image" content="https://chravel.app/chravel-logo.png" />
</head>
<body>
  <h1>You're Invited to a Trip!</h1>
  <p>Open this link in the Chravel app to join.</p>
  <a href="https://chravel.app/join/${code}">Join Trip</a>
</body>
</html>`,
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}
