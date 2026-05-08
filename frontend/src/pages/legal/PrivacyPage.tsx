import LegalPage from '../../components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      sections={[
        {
          heading: 'Data We Collect',
          body: 'We collect the information you provide during registration: full name, email address, phone number, and Sharia mode preference. During KYC verification we also collect identity documents — National ID (front and back), a selfie holding your ID, and optionally a proof of address. Transaction records including amounts, fees, and timestamps are stored for audit purposes.',
        },
        {
          heading: 'How Your Data Is Used',
          body: 'Your personal information is used solely to operate your account, process transactions, and comply with identity verification requirements. We do not sell, share, or transfer your data to third parties for marketing purposes. KYC documents are stored in a private, encrypted storage bucket and are only accessible to authorised compliance reviewers.',
        },
        {
          heading: 'KYC Document Retention',
          body: 'Identity documents submitted for KYC verification are retained for the duration of your account and for a minimum of five years after account closure to meet legal and regulatory requirements. Documents are never publicly accessible and are protected by service-level access controls.',
        },
        {
          heading: 'Your Rights',
          body: 'You may request correction of inaccurate personal data at any time via the profile page. You may delete your account — which anonymises all identifying information on your user record — provided your wallet balance is zero and you hold no active positions. Transaction records are retained for legal purposes even after deletion.',
        },
      ]}
    />
  );
}
