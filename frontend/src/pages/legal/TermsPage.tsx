import LegalPage from '../../components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      sections={[
        {
          heading: 'Acceptance of Terms',
          body: 'By creating an account on INFINDER you agree to these terms. INFINDER is a demonstration investment platform built as a graduation project. You must be at least 18 years old and provide accurate information during registration. Accounts found to contain false information may be suspended.',
        },
        {
          heading: 'Platform Use',
          body: 'INFINDER allows verified users to allocate funds across asset classes including stocks, bonds, gold, and baskets. You are responsible for your investment decisions. The platform does not provide personalised financial advice. Use of automated tools such as the Smart Assistant is advisory only.',
        },
        {
          heading: 'Fees',
          body: 'A platform fee of 0.25% (minimum EGP 1.00) applies to investments and withdrawals. Card deposits carry a 2% processing fee deducted from the deposited amount. All fees are shown to you before confirmation and are non-refundable once a transaction is completed.',
        },
        {
          heading: 'Termination',
          body: 'You may delete your account at any time from your profile page provided your wallet balance is zero and you hold no active investment positions. INFINDER reserves the right to suspend or terminate accounts that violate these terms, abuse the platform, or engage in fraudulent activity.',
        },
      ]}
    />
  );
}
