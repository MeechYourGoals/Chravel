import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Mail, 
  Globe, 
  Save,
  AlertCircle,
  CheckCircle,
  User,
  CreditCard,
  Plus
} from 'lucide-react';
import { Advertiser } from '@/types/advertiser';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AdvertiserSettingsProps {
  advertiser: Advertiser;
  onUpdate: (advertiser: Advertiser) => void;
}

export const AdvertiserSettings = ({ advertiser, onUpdate }: AdvertiserSettingsProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: advertiser.company_name,
    company_email: advertiser.company_email,
    website: advertiser.website || ''
  });

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const { data, error } = await supabase
        .from('advertisers')
        .update(formData)
        .eq('id', advertiser.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data as unknown as Advertiser);
      setIsEditing(false);
      toast({
        title: "Settings Updated",
        description: "Your advertiser profile has been updated successfully"
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Active</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500"><AlertCircle className="h-3 w-3 mr-1" /> Suspended</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Account Status */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg text-white">Account Status</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-gray-400">
            Your current advertiser account status and details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-400">Account Status</span>
            </div>
            {getStatusBadge(advertiser.status)}
          </div>
          
          <Separator className="bg-white/10" />
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
            <div>
              <p className="text-gray-400">Account ID</p>
              <p className="font-mono text-xs text-white">{advertiser.id}</p>
            </div>
            <div>
              <p className="text-gray-400">Member Since</p>
              <p className="text-white">{new Date(advertiser.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3 sm:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <div>
              <CardTitle className="text-base sm:text-lg text-white">Company Information</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-gray-400">
                Manage your company details and contact information
              </CardDescription>
            </div>
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="border-white/10 text-gray-300 hover:bg-white/10 w-full sm:w-auto"
              >
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_email">Company Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="company_email"
                    type="email"
                    value={formData.company_email}
                    onChange={(e) => setFormData({ ...formData, company_email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      company_name: advertiser.company_name,
                      company_email: advertiser.company_email,
                      website: advertiser.website || ''
                    });
                  }}
                  className="border-white/10 text-gray-300 hover:bg-white/10 w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Company Name</p>
                  <p className="font-medium text-white">{advertiser.company_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Company Email</p>
                  <p className="font-medium text-white">{advertiser.company_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Website</p>
                  <p className="font-medium text-white">
                    {advertiser.website ? (
                      <a
                        href={advertiser.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:underline"
                      >
                        {advertiser.website}
                      </a>
                    ) : (
                      <span className="text-gray-500">Not provided</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg text-white">Payment Method</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-gray-400">
            Add a company card for advertising billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm text-gray-400">No payment method on file</p>
                <p className="text-xs text-gray-500 mt-1">
                  Add a company card to pay for impressions, clicks, and conversions
                </p>
              </div>
            </div>
          </div>
          
          <Button
            variant="outline"
            className="w-full border-white/10 hover:bg-white/5 text-white"
            onClick={() => {
              toast({
                title: "Payment Methods",
                description: "Payment method setup will be available in a future update."
              });
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};