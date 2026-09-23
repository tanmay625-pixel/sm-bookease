import type { Metadata } from "next";
import LegalLayout from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms & Conditions — BookMi & Sable Mesa",
  description:
    "The terms and conditions governing your use of Sable Mesa products and services, including BookMi.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      updated="June 16, 2026"
      intro="These Terms & Conditions govern your access to and use of the websites, products, and services provided by Sable Mesa, including BookMi. By using our services, you agree to these terms."
      sections={[
        {
          heading: "Acceptance of terms",
          body: (
            <p>
              By accessing or using any Sable Mesa service, including the
              BookMi appointment booking platform, you agree to be bound by
              these Terms & Conditions and our Privacy Policy. If you do not
              agree, you must not use our services.
            </p>
          ),
        },
        {
          heading: "Use of the service",
          body: (
            <>
              <p>
                BookMi is provided to help service businesses manage
                appointments, clients, and staff. You agree to use the service
                only for lawful purposes and in compliance with all applicable
                laws and regulations of India.
              </p>
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and for all activity that occurs under your
                account.
              </p>
            </>
          ),
        },
        {
          heading: "Pilot program",
          body: (
            <p>
              Our free pilot program is offered to a limited number of
              businesses for a fixed period of four weeks. Pilot terms,
              including feature availability and duration, may be adjusted as
              the product evolves. Continued use after the pilot period may
              require a paid subscription.
            </p>
          ),
        },
        {
          heading: "Subscriptions and payment",
          body: (
            <p>
              Paid plans are billed in Indian Rupees (₹) on a recurring basis.
              Fees are non-refundable except where required by law. We reserve
              the right to change pricing with reasonable notice to active
              subscribers.
            </p>
          ),
        },
        {
          heading: "Customer data",
          body: (
            <p>
              You retain ownership of the data you and your clients submit
              through BookMi. You are responsible for ensuring you have the
              necessary rights and consents to collect and process client data
              through the service. Our handling of data is described in our
              Privacy Policy.
            </p>
          ),
        },
        {
          heading: "Intellectual property",
          body: (
            <p>
              All software, branding, and content provided by Sable Mesa remain
              the exclusive property of Sable Mesa. You may not copy, modify,
              distribute, or reverse-engineer any part of the service without
              prior written consent.
            </p>
          ),
        },
        {
          heading: "Limitation of liability",
          body: (
            <p>
              The service is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis. To the maximum extent permitted by law,
              Sable Mesa shall not be liable for any indirect, incidental, or
              consequential damages arising from your use of the service.
            </p>
          ),
        },
        {
          heading: "Governing law",
          body: (
            <p>
              These Terms & Conditions are governed by and construed in
              accordance with the laws of India. Any disputes shall be subject
              to the exclusive jurisdiction of the courts located in India.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              For any questions about these terms, contact us at{" "}
              <a
                href="mailto:hello@sablemesa.in"
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                hello@sablemesa.in
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
