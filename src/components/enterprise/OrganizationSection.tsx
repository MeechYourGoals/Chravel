import React, { useState, useEffect } from 'react';
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
  organizations: OrganizationData[];
  onCreateOrganization?: () => void;
  onSave?: (
    orgId: string,
    data: {
      name: string;
      displayName: string;
      billingEmail: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      contactJobTitle: string;
    },
  ) => Promise<void>;
}

export const OrganizationSection = ({
  organizations,
  onCreateOrganization,
  onSave,
}: OrganizationSectionProps) => {
  const hasOrgs = organizations.length > 0;

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      <div className="flex items-center gap-3 mb-3 min-w-0">
        <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
          <Building size={24} className="text-white" />
        </div>
        <div className="min-w-0">
          <h3 className="text-2xl font-bold text-white break-words">Organization Settings</h3>
          <p className="text-gray-400 break-words">Manage your organization profile and details</p>
        </div>
      </div>

      {/* Add Organization CTA + Logo - stack on mobile, side-by-side on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4 min-w-0">
          <div className="flex flex-col gap-3 min-w-0">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div className="min-w-0">
              <h4 className="text-base font-semibold text-white mb-1 break-words">
                {hasOrgs ? 'Add an additional organization' : 'Add Your Organization Profile'}
              </h4>
              <p className="text-sm text-gray-300 mb-3 break-words">
                {hasOrgs
                  ? 'Fill out the form below to create an additional organization.'
                  : 'Fill out the form below to create your organization.'}
              </p>
              {onCreateOrganization && (
                <button
                  type="button"
                  onClick={onCreateOrganization}
                  className="inline-flex items-center gap-2 flex-shrink-0 bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm whitespace-nowrap"
                >
                  <Plus size={16} className="flex-shrink-0" />
                  Create Organization
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-0">
          <h4 className="text-base font-semibold text-white mb-3 break-words">Organization Logo</h4>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
                <Building size={32} className="text-white" />
              </div>
              <button
                type="button"
                className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors"
              >
                <Camera size={16} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
              >
                <Upload size={16} className="flex-shrink-0" />
                Upload Logo
              </button>
              <p className="text-sm text-gray-400 mt-2 break-words">
                PNG, SVG or JPG. Max size 2MB.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Organization cards - one per org, with badge for 2nd, 3rd, etc. */}
      {organizations.map((org, index) => (
        <OrganizationCard
          key={org.id}
          organization={org}
          badge={index >= 1 ? index + 1 : undefined}
          onSave={onSave ? data => onSave(org.id, data) : undefined}
        />
      ))}
    </div>
  );
};

interface OrganizationCardProps {
  organization: OrganizationData;
  badge?: number;
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

const OrganizationCard = ({ organization, badge, onSave }: OrganizationCardProps) => {
  const [contactName, setContactName] = useState(organization.contactName || '');
  const [contactEmail, setContactEmail] = useState(organization.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(organization.contactPhone || '');
  const [contactJobTitle, setContactJobTitle] = useState(organization.contactJobTitle || '');
  const [orgName, setOrgName] = useState(organization.name || '');
  const [displayName, setDisplayName] = useState(organization.displayName || '');
  const [billingEmail, setBillingEmail] = useState(organization.billingEmail || '');
  const [description, setDescription] = useState('');

  useEffect(() => {
    setContactName(organization.contactName || '');
    setContactEmail(organization.contactEmail || '');
    setContactPhone(organization.contactPhone || '');
    setContactJobTitle(organization.contactJobTitle || '');
    setOrgName(organization.name || '');
    setDisplayName(organization.displayName || '');
    setBillingEmail(organization.billingEmail || '');
  }, [organization]);

  return (
    <div className="relative bg-white/5 border border-white/10 rounded-xl p-4 space-y-4 min-w-0">
      {badge !== undefined && (
        <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-glass-orange/30 flex items-center justify-center text-sm font-semibold text-glass-orange">
          {badge}
        </div>
      )}

      <div className="min-w-0">
        <h4 className="text-base font-semibold text-white mb-3">Organization Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
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

      {/* Primary Contact Section */}
      <div>
        <h4 className="text-base font-semibold text-white mb-3">Primary Contact</h4>
        <p className="text-sm text-gray-400 mb-4 break-words">
          The main point of contact for your organization
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
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

      {onSave && (
        <button
          type="button"
          onClick={() =>
            onSave({
              name: orgName,
              displayName,
              billingEmail,
              contactName,
              contactEmail,
              contactPhone,
              contactJobTitle,
            })
          }
          className="bg-glass-orange hover:bg-glass-orange/80 text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Save Changes
        </button>
      )}
    </div>
  );
};
