import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </Link>

        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

          <p className="text-muted-foreground mb-6">
            <strong>Last Updated:</strong>{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-foreground/90 mb-4">
              Welcome to Chravel ("we," "our," or "us"). We respect your privacy and are committed
              to protecting your personal data. This privacy policy explains how we collect, use,
              disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>Account information (name, email, phone number)</li>
              <li>Profile information (avatar, bio, timezone)</li>
              <li>Trip information (destinations, dates, itineraries)</li>
              <li>Messages, photos, and media you share</li>
              <li>Payment information processed securely through our payment partners</li>
            </ul>

            <h3 className="text-xl font-medium mb-3">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>Device information (type, operating system, browser)</li>
              <li>Usage data (features used, time spent)</li>
              <li>Location data (with your permission)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative messages and updates</li>
              <li>Respond to your comments and questions</li>
              <li>Provide customer support</li>
              <li>Personalize your experience with AI-powered features</li>
              <li>Monitor and analyze usage patterns</li>
              <li>Detect, prevent, and address technical issues and fraud</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
            <p className="text-foreground/90 mb-4">
              We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>
                <strong>With Trip Members:</strong> Information you share within a trip is visible
                to other trip members
              </li>
              <li>
                <strong>With Service Providers:</strong> Third-party vendors who assist in operating
                our platform
              </li>
              <li>
                <strong>For Legal Reasons:</strong> When required by law or to protect our rights
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
                sale of assets
              </li>
              <li>
                <strong>With Your Consent:</strong> When you explicitly agree to share information
              </li>
            </ul>
            <p className="text-foreground/90">
              <strong>We never sell your personal information to third parties.</strong>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-foreground/90 mb-4">
              We implement appropriate technical and organizational measures to protect your
              personal information, including:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments</li>
              <li>Access controls and authentication</li>
              <li>Secure data centers with physical security</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights and Choices</h2>
            <p className="text-foreground/90 mb-4">
              You have the following rights regarding your personal information:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update or correct inaccurate information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your personal data
              </li>
              <li>
                <strong>Export:</strong> Receive your data in a portable format
              </li>
              <li>
                <strong>Opt-out:</strong> Unsubscribe from marketing communications
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Revoke previously given consent
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-foreground/90">
              We retain your information for as long as necessary to provide our services and comply
              with legal obligations. When you delete your account, we will delete or anonymize your
              personal information within 30 days, except where we are required to retain it for
              legal purposes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="text-foreground/90">
              Our services are not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you believe we have collected
              information from a child under 13, please contact us immediately.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="text-foreground/90">
              Your information may be transferred to and processed in countries other than your
              country of residence. We ensure appropriate safeguards are in place to protect your
              data in accordance with this privacy policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-foreground/90">
              We may update this privacy policy from time to time. We will notify you of any
              material changes by posting the new policy on this page and updating the "Last
              Updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-foreground/90 mb-4">
              If you have any questions about this privacy policy or our practices, please contact
              us at:
            </p>
            <ul className="list-none space-y-2 text-foreground/90">
              <li>
                <strong>Email:</strong> privacy@chravel.com
              </li>
              <li>
                <strong>Mail:</strong> Chravel Privacy Team, [Company Address]
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
