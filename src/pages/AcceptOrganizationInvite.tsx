import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Building, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InviteDetails {
  organization_id: string;
  organization_name: string;
  invited_by_name: string;
  role: 'owner' | 'admin' | 'member';
  email: string;
}

export const AcceptOrganizationInvite = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const tokenFromQuery = searchParams.get('token');
  const inviteToken = token || tokenFromQuery;

  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!inviteToken) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    // Check if user is logged in
    if (!user) {
      // Redirect to auth with return URL
      const returnUrl = `/accept-invite/${inviteToken}`;
      navigate(`/auth?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    fetchInviteDetails();
  }, [inviteToken, user]);

  const fetchInviteDetails = async () => {
    try {
      setLoading(true);

      // Fetch invite details
      const { data: invite, error: inviteError } = await supabase
        .from('organization_invites')
        .select(
          `
          organization_id,
          email,
          role,
          status,
          expires_at,
          organizations:organization_id (
            display_name
          ),
          invited_by_profile:invited_by (
            id
          )
        `,
        )
        .eq('token', inviteToken)
        .single();

      if (inviteError || !invite) {
        setError('Invitation not found or has expired');
        setLoading(false);
        return;
      }

      // Check if invite is still valid
      if (invite.status !== 'pending') {
        setError('This invitation has already been used');
        setLoading(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      // Check if user's email matches invite
      if (user?.email !== invite.email) {
        setError(
          `This invitation was sent to ${invite.email}. Please log in with that email address.`,
        );
        setLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', invite.organization_id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        setError('You are already a member of this organization');
        setTimeout(() => {
          navigate(`/organization/${invite.organization_id}`);
        }, 2000);
        setLoading(false);
        return;
      }

      setInviteDetails({
        organization_id: invite.organization_id,
        organization_name: (invite.organizations as any)?.display_name || 'Unknown Organization',
        invited_by_name: 'Team Admin',
        role: invite.role,
        email: invite.email,
      });
    } catch (error) {
      console.error('Error fetching invite details:', error);
      setError('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!inviteToken || !user) return;

    try {
      setAccepting(true);

      // Call accept-organization-invite edge function
      const { data, error } = await supabase.functions.invoke('accept-organization-invite', {
        body: { token: inviteToken },
      });

      if (error) throw error;

      if (data.error) {
        setError(data.error);
        return;
      }

      setSuccess(true);

      // Redirect to organization dashboard after 2 seconds
      setTimeout(() => {
        navigate(`/organization/${inviteDetails?.organization_id}`);
      }, 2000);
    } catch (error) {
      console.error('Error accepting invite:', error);
      setError('Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-glass-orange animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-white/5 border-white/10 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Invalid Invitation</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={() => navigate('/organizations')}>View My Organizations</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <Card className="bg-white/5 border-white/10 max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome Aboard!</h2>
            <p className="text-gray-400 mb-4">
              You've successfully joined {inviteDetails?.organization_name}
            </p>
            <p className="text-sm text-gray-500">Redirecting to organization...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="bg-white/5 border-white/10 max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
              <Building size={32} className="text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Organization Invitation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-400 mb-2">You've been invited to join</p>
            <h3 className="text-xl font-bold text-white mb-4">
              {inviteDetails?.organization_name}
            </h3>
            <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Role:</span>
                <span className="text-white font-medium capitalize">{inviteDetails?.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Invited by:</span>
                <span className="text-white font-medium">{inviteDetails?.invited_by_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Email:</span>
                <span className="text-white font-medium">{inviteDetails?.email}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full bg-glass-orange hover:bg-glass-orange/80"
            >
              {accepting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Accepting...
                </>
              ) : (
                'Accept Invitation'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Decline
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
