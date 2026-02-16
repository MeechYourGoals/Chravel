import { ArrowLeft, Mail, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>

        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-8">Support</h1>
          <p className="text-muted-foreground mb-8">
            We're here to help. Get in touch with our team for assistance with your trips, account,
            or any questions.
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <div className="space-y-4">
              <a
                href="mailto:support@chravel.app"
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors no-underline text-foreground"
              >
                <Mail className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@chravel.app</p>
                </div>
              </a>
              <a
                href="mailto:privacy@chravel.app"
                className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors no-underline text-foreground"
              >
                <HelpCircle className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Privacy & Data</p>
                  <p className="text-sm text-muted-foreground">privacy@chravel.app</p>
                </div>
              </a>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Helpful Resources</h2>
            <ul className="space-y-2">
              <li>
                <Link to="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Response Time</h2>
            <p className="text-foreground/90">
              We typically respond within 4 hours during US business hours (9am–6pm ET, Monday–Friday).
              For urgent issues, please include "Urgent" in your subject line.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
