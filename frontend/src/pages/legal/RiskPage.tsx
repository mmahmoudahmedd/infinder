import LegalPage from '../../components/LegalPage';

export default function RiskPage() {
  return (
    <LegalPage
      title="Risk Disclosure"
      sections={[
        {
          heading: 'Investments Carry Risk',
          body: 'All investments made through INFINDER involve risk, including the possible loss of the principal amount invested. Asset values can go up or down depending on market conditions, economic factors, and geopolitical events. INFINDER does not guarantee any return on investment.',
        },
        {
          heading: 'No Guaranteed Returns',
          body: 'Expected return ranges displayed on investment options are illustrative estimates based on historical data and general market assumptions. They are not a promise or guarantee of future performance. Actual returns may be significantly lower or negative.',
        },
        {
          heading: 'Past Performance',
          body: 'Past performance of any asset class, portfolio, or investment strategy shown on this platform is not indicative of future results. Market conditions change, and strategies that performed well historically may not do so in the future.',
        },
        {
          heading: 'Invest Responsibly',
          body: 'Only invest money you can afford to lose. Do not invest funds required for essential living expenses, emergency savings, or short-term obligations. If you are unsure about an investment decision, consider seeking independent financial advice from a qualified professional before proceeding.',
        },
      ]}
    />
  );
}
