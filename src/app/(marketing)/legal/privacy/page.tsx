import type { Metadata } from "next";
import LegalLayout from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy — BookMi & Sable Mesa",
  description:
    "Learn how Sable Mesa and BookMi collect, use, and protect your personal and booking data in compliance with GDPR and Indian IT laws.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="June 16, 2026"
      intro="Sable Mesa is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. We aim to comply with the EU General Data Protection Regulation (GDPR) and the Information Technology Act, 2000 of India and its associated rules."
      sections={[
        {
          heading: "Data we collect",
          body: (
            <>
              <p>
                When you use our website or BookMi, we may collect the following
                personal data:
              </p>
              <ul>
                <li>Name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>
                  Booking data, including appointment details and client records
                  you enter into the service
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "How we use your data",
          body: (
            <>
              <p>We process your personal data to:</p>
              <ul>
                <li>Provide, operate, and improve our services</li>
                <li>Manage your account and process bookings</li>
                <li>Respond to your inquiries and provide support</li>
                <li>
                  Send service-related communications and, with consent,
                  occasional updates
                </li>
              </ul>
            </>
          ),
        },
        {
          heading: "Legal basis for processing",
          body: (
            <p>
              Where GDPR applies, we process personal data on the basis of your
              consent, the performance of a contract with you, compliance with
              legal obligations, and our legitimate interests in operating and
              improving our services.
            </p>
          ),
        },
        {
          heading: "Data sharing",
          body: (
            <p>
              We do not sell your personal data. We may share data with trusted
              service providers who help us operate the service (for example,
              hosting and SMS delivery), strictly under confidentiality
              obligations, and where required by law.
            </p>
          ),
        },
        {
          heading: "Data retention",
          body: (
            <p>
              We retain personal data only for as long as necessary to provide
              the service and fulfil the purposes described in this policy, or
              as required by applicable law. You may request deletion of your
              data at any time.
            </p>
          ),
        },
        {
          heading: "Your rights",
          body: (
            <p>
              Subject to applicable law, you have the right to access, correct,
              delete, or restrict the processing of your personal data, and to
              withdraw consent where processing is based on consent. To exercise
              these rights, contact us using the details below.
            </p>
          ),
        },
        {
          heading: "Data security",
          body: (
            <p>
              We implement reasonable technical and organisational measures to
              protect your data against unauthorised access, alteration, or
              disclosure. However, no method of transmission or storage is
              completely secure.
            </p>
          ),
        },
        {
          heading: "Changes to this policy",
          body: (
            <p>
              We may update this Privacy Policy from time to time. Material
              changes will be communicated through our website or by email
              where appropriate.
            </p>
          ),
        },
        {
          heading: "Contact",
          body: (
            <p>
              For privacy-related questions or to exercise your rights, contact
              us at{" "}
              <a
                href="mailto:privacy@sablemesa.in"
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                privacy@sablemesa.in
              </a>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
