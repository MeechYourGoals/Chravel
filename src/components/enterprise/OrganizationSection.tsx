import React, { useState, useEffect } from 'react';
import { Building, Camera, Upload, Plus, AlertCircle, Check, Loader2 } from 'lucide-react';

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
                  aria-label="Create a new organization"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 bg-glass-orange hover:bg-glass-orange/80 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm text-center min-h-[44px]"
                >
                  <Plus size={16} className="flex-shrink-0" />
                  Create Organization
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 min-w-0">
          <h4 className="text-base font-semibold text-white mb-3 text-center">Organization Logo</h4>
          <div className="flex flex-col items-center gap-4 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-r from-glass-orange to-glass-yellow rounded-xl flex items-center justify-center">
                <Building size={32} className="text-white" />
              </div>
              <button
                type="button"
                aria-label="Change organization logo"
                className="absolute -bottom-2 -right-2 bg-glass-orange hover:bg-glass-orange/80 text-white p-2 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Camera size={16} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Upload organization logo"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-lg transition-colors min-h-[44px]"
            >
              <Upload size={16} className="flex-shrink-0" />
              Upload Logo
            </button>
            <p className="text-sm text-gray-400 text-center break-words">
              PNG, SVG or JPG. Max 2MB.
            </p>
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

/** Simple email validation */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

  // Validation and save state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setContactName(organization.contactName || '');
    setContactEmail(organization.contactEmail || '');
    setContactPhone(organization.contactPhone || '');
    setContactJobTitle(organization.contactJobTitle || '');
    setOrgName(organization.name || '');
    setDisplayName(organization.displayName || '');
    setBillingEmail(organization.billingEmail || '');
  }, [organization]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!orgName.trim()) {
      errors.orgName = 'Organization name is required';
    }

    if (!billingEmail.trim()) {
      errors.billingEmail = 'Billing email is required';
    } else if (!isValidEmail(billingEmail.trim())) {
      errors.billingEmail = 'Please enter a valid email address';
    }

    if (contactEmail.trim() && !isValidEmail(contactEmail.trim())) {
      errors.contactEmail = 'Please enter a valid contact email';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!onSave) return;
    if (!validate()) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        name: orgName.trim(),
        displayName: displayName.trim() || orgName.trim(),
        billingEmail: billingEmail.trim(),
        contactName: contactName.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        contactJobTitle: contactJobTitle.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (_saveError) {
      // Save error handled by parent via toast
    } finally {
      setIsSaving(false);
    }
  };

  // Clear validation error on field change
  const clearError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

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
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`org-name-${organization.id}`}
            >
              Organization Name <span className="text-red-400">*</span>
            </label>
            <input
              id={`org-name-${organization.id}`}
              type="text"
              value={orgName}
              onChange={e => {
                setOrgName(e.target.value);
                clearError('orgName');
              }}
              placeholder="Enter organization name"
              aria-required="true"
              aria-invalid={!!validationErrors.orgName}
              aria-describedby={
                validationErrors.orgName ? `org-name-error-${organization.id}` : undefined
              }
              className={`w-full bg-gray-800/50 border ${validationErrors.orgName ? 'border-red-500' : 'border-gray-600'} text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]`}
            />
            {validationErrors.orgName && (
              <p
                id={`org-name-error-${organization.id}`}
                className="text-xs text-red-400 mt-1"
                role="alert"
              >
                {validationErrors.orgName}
              </p>
            )}
          </div>
          <div>
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`display-name-${organization.id}`}
            >
              Display Name
            </label>
            <input
              id={`display-name-${organization.id}`}
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Enter display name"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]"
            />
          </div>
          <div className="md:col-span-2">
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`billing-email-${organization.id}`}
            >
              Billing Email <span className="text-red-400">*</span>
            </label>
            <input
              id={`billing-email-${organization.id}`}
              type="email"
              value={billingEmail}
              onChange={e => {
                setBillingEmail(e.target.value);
                clearError('billingEmail');
              }}
              placeholder="Enter billing email"
              aria-required="true"
              aria-invalid={!!validationErrors.billingEmail}
              aria-describedby={
                validationErrors.billingEmail ? `billing-email-error-${organization.id}` : undefined
              }
              className={`w-full bg-gray-800/50 border ${validationErrors.billingEmail ? 'border-red-500' : 'border-gray-600'} text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]`}
            />
            {validationErrors.billingEmail && (
              <p
                id={`billing-email-error-${organization.id}`}
                className="text-xs text-red-400 mt-1"
                role="alert"
              >
                {validationErrors.billingEmail}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3">
          <label
            className="block text-sm text-gray-300 mb-1"
            htmlFor={`description-${organization.id}`}
          >
            Organization Description
          </label>
          <textarea
            id={`description-${organization.id}`}
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
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`contact-name-${organization.id}`}
            >
              Contact Name
            </label>
            <input
              id={`contact-name-${organization.id}`}
              type="text"
              value={contactName}
              onChange={e => setContactName(e.target.value)}
              placeholder="John Smith"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]"
            />
          </div>
          <div>
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`contact-email-${organization.id}`}
            >
              Contact Email
            </label>
            <input
              id={`contact-email-${organization.id}`}
              type="email"
              value={contactEmail}
              onChange={e => {
                setContactEmail(e.target.value);
                clearError('contactEmail');
              }}
              placeholder="john@company.com"
              aria-invalid={!!validationErrors.contactEmail}
              aria-describedby={
                validationErrors.contactEmail ? `contact-email-error-${organization.id}` : undefined
              }
              className={`w-full bg-gray-800/50 border ${validationErrors.contactEmail ? 'border-red-500' : 'border-gray-600'} text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]`}
            />
            {validationErrors.contactEmail && (
              <p
                id={`contact-email-error-${organization.id}`}
                className="text-xs text-red-400 mt-1"
                role="alert"
              >
                {validationErrors.contactEmail}
              </p>
            )}
          </div>
          <div>
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`job-title-${organization.id}`}
            >
              Job Title
            </label>
            <input
              id={`job-title-${organization.id}`}
              type="text"
              value={contactJobTitle}
              onChange={e => setContactJobTitle(e.target.value)}
              placeholder="e.g. Travel Coordinator"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]"
            />
          </div>
          <div>
            <label
              className="block text-sm text-gray-300 mb-2"
              htmlFor={`contact-phone-${organization.id}`}
            >
              Contact Phone (Optional)
            </label>
            <input
              id={`contact-phone-${organization.id}`}
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full bg-gray-800/50 border border-gray-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-glass-orange/50 min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {onSave && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label={isSaving ? 'Saving organization settings' : 'Save organization settings'}
          className={`flex items-center gap-2 ${
            saveSuccess
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-glass-orange hover:bg-glass-orange/80'
          } text-white px-6 py-2 rounded-lg font-medium transition-colors min-h-[44px] disabled:opacity-50`}
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      )}
    </div>
  );
};
