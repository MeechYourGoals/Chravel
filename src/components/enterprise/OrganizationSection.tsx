import React, { useState } from 'react';
import { Building, Camera, Upload, Plus, AlertCircle } from 'lucide-react';

interface OrganizationData {
  id: string;
  name: string;
  displayName: string;
  billingEmail: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactJobTitle?: string;
}

interface OrganizationSectionProps {
  organization: OrganizationData | null;
  onCreateOrganization?: () => void;
  onSave?: (data: {
    name: string;
    displayName: string;
    billingEmail: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    contactJobTitle: string;
  }) => Promise<void>;
}

export const OrganizationSection = ({
  organization,
  onCreateOrganization,
  onSave,
}: OrganizationSectionProps) => {
  const [contactName, setContactName] = useState(organization?.contactName || '');
  const [contactEmail, setContactEmail] = useState(organization?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(organization?.contactPhone || '');
  const [contactJobTitle, setContactJobTitle] = useState(organization?.contactJobTitle || '');
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [displayName, setDisplayName] = useState(organization?.displayName || '');
  const [billingEmail, setBillingEmail] = useState(organization?.billingEmail || '');
  const [description, setDescription] = useState('');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
          <Building size={24} className="text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-white">Organization Settings</h3>
          <p className="text-gray-400">Manage your organization profile and details</p>
        </div>
      </div>

      {/* CTA Banner when no organization */}
      {!organization && (
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-base font-semibold text-white mb-1">
                Add Your Organization Profile
              </h4>
              <p className="text-sm text-gray-300 mb-3">
                Fill out the form below to create your organization and unlock Enterprise features.
              </p>
              {onCreateOrganization && (
                <button
                  onClick={onCreateOrganization}
                  className="inline-flex items-center gap-2 bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  <Plus size={16} />
                  Create Organization
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Organization Logo */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Organization Logo</h4>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
              <Building size={32} className="text-white" />
            </div>
            <button className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors">
              <Camera size={16} />
            </button>
          </div>
          <div>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg transition-colors">
              <Upload size={16} />
              Upload Logo
            </button>
            <p className="text-sm text-gray-400 mt-2">PNG, SVG or JPG. Max size 2MB.</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Organization Details</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-300 mb-2">Billing Email</label>
            <input
              type="email"
              value={billingEmail}
              onChange={e => setBillingEmail(e.target.value)}
              placeholder="Enter billing email"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm text-gray-300 mb-1">Organization Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe your organization's mission and focus..."
            className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Primary Contact Section - symmetrical 2x2 grid */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Primary Contact</h4>
        <p className="text-sm text-gray-400 mb-4">
          The main point of contact for your organization
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Contact Name</label>
            <input
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="John Smith"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              placeholder="john@company.com"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Job Title</label>
            <input
              type="text"
              value={contactJobTitle}
              onChange={e => setContactJobTitle(e.target.value)}
              placeholder="e.g. Travel Coordinator"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Contact Phone (Optional)</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          if (organization && onSave) {
            await onSave({
              name: orgName,
              displayName,
              billingEmail: billingEmail,
              contactName,
              contactEmail,
              contactPhone,
              contactJobTitle,
            });
          } else if (!organization && onCreateOrganization) {
            onCreateOrganization();
          }
        }}
        className="mt-4 bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        {organization ? 'Save Changes' : 'Create Organization'}
      </button>
    </div>
  );
};
