import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

          <p className="text-muted-foreground mb-6">
            <strong>Last Updated:</strong>{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-foreground/90 mb-4">
              By accessing or using Chravel ("Service"), you agree to be bound by these Terms of
              Service ("Terms"). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-foreground/90 mb-4">
              Chravel is a collaborative platform for planning and managing group trips, events, and
              activities. Our services include:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>Group messaging and communication tools</li>
              <li>Shared calendars and itinerary planning</li>
              <li>Photo and media storage</li>
              <li>Payment splitting and expense tracking</li>
              <li>AI-powered travel recommendations</li>
              <li>Team and organization management features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <h3 className="text-xl font-medium mb-3">3.1 Registration</h3>
            <p className="text-foreground/90 mb-4">
              To use certain features, you must create an account. You agree to provide accurate,
              current, and complete information during registration and keep your account
              information updated.
            </p>

            <h3 className="text-xl font-medium mb-3">3.2 Account Security</h3>
            <p className="text-foreground/90 mb-4">
              You are responsible for maintaining the confidentiality of your account credentials.
              You agree to notify us immediately of any unauthorized access to your account.
            </p>

            <h3 className="text-xl font-medium mb-3">3.3 Account Termination</h3>
            <p className="text-foreground/90 mb-4">
              We reserve the right to suspend or terminate your account if you violate these Terms
              or engage in fraudulent, illegal, or harmful activities.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p className="text-foreground/90 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-4 space-y-2 text-foreground/90">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Post or transmit harmful, threatening, abusive, or offensive content</li>
              <li>Harass, intimidate, or harm other users</li>
              <li>Impersonate any person or entity</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots, scrapers) without permission</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Violate any intellectual property rights</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Content and Intellectual Property</h2>
            <h3 className="text-xl font-medium mb-3">5.1 Your Content</h3>
            <p className="text-foreground/90 mb-4">
              You retain ownership of all content you post on Chravel. By posting content, you grant
              us a non-exclusive, worldwide, royalty-free license to use, store, and display your
              content solely to provide and improve the Service.
            </p>

            <h3 className="text-xl font-medium mb-3">5.2 Our Content</h3>
            <p className="text-foreground/90 mb-4">
              The Service, including all text, graphics, logos, icons, images, and software, is
              owned by Chravel or its licensors and is protected by copyright, trademark, and other
              intellectual property laws.
            </p>

            <h3 className="text-xl font-medium mb-3">5.3 Content Responsibility</h3>
            <p className="text-foreground/90 mb-4">
              You are solely responsible for content you post. We do not endorse or guarantee the
              accuracy of user-generated content. We reserve the right to remove content that
              violates these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Payments and Subscriptions</h2>
            <h3 className="text-xl font-medium mb-3">6.1 Pricing</h3>
            <p className="text-foreground/90 mb-4">
              Certain features require a paid subscription. Subscription fees are charged in advance
              on a recurring basis. All fees are non-refundable except as required by law.
            </p>

            <h3 className="text-xl font-medium mb-3">6.2 Payment Processing</h3>
            <p className="text-foreground/90 mb-4">
              Payments are processed by third-party payment processors. You agree to their terms and
              conditions. We do not store your credit card information.
            </p>

            <h3 className="text-xl font-medium mb-3">6.3 Cancellation</h3>
            <p className="text-foreground/90 mb-4">
              You may cancel your subscription at any time. Cancellation takes effect at the end of
              the current billing period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Privacy</h2>
            <p className="text-foreground/90 mb-4">
              Your privacy is important to us. Please review our{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{' '}
              to understand how we collect, use, and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimers</h2>
            <p className="text-foreground/90 mb-4">
              THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR
              IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR
              ERROR-FREE. YOUR USE OF THE SERVICE IS AT YOUR OWN RISK.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-foreground/90 mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHRAVEL SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
              LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-foreground/90 mb-4">
              You agree to indemnify and hold harmless Chravel and its affiliates from any claims,
              damages, losses, and expenses (including legal fees) arising from your use of the
              Service or violation of these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Third-Party Services</h2>
            <p className="text-foreground/90 mb-4">
              The Service may contain links to third-party websites or services. We are not
              responsible for the content, privacy policies, or practices of third-party sites. Your
              use of third-party services is at your own risk.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Modifications to the Service</h2>
            <p className="text-foreground/90 mb-4">
              We reserve the right to modify, suspend, or discontinue the Service (or any part
              thereof) at any time without notice. We are not liable for any modification,
              suspension, or discontinuation.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-foreground/90 mb-4">
              We may update these Terms from time to time. We will notify you of material changes by
              posting the new Terms on this page and updating the "Last Updated" date. Your
              continued use of the Service constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Governing Law</h2>
            <p className="text-foreground/90 mb-4">
              These Terms are governed by the laws of Delaware without regard to conflict of law
              principles. Any disputes shall be resolved in the courts of Delaware.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="text-foreground/90 mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="list-none space-y-2 text-foreground/90">
              <li>
                <strong>Email:</strong> support@chravelapp.com
              </li>
              <li>
                <strong>Mail:</strong> Chravel Legal Department, 130 N Broadway STE 32415, Los
                Angeles, CA 90012
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">16. Entire Agreement</h2>
            <p className="text-foreground/90 mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between
              you and Chravel regarding the Service and supersede all prior agreements.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
