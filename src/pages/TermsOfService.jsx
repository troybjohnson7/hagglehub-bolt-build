import React from 'react';

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="prose lg:prose-lg">
        <h1>Terms of Service</h1>
        <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>

        <p><strong>Disclaimer:</strong> This is a placeholder Terms of Service. You should consult with a legal professional to create terms that are appropriate for your specific business and jurisdiction.</p>

        <h2>1. Agreement to Terms</h2>
        <p>By using our application, HaggleHub ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.</p>

        <h2>2. Our Services</h2>
        <p>HaggleHub provides a platform to assist users in managing and negotiating vehicle purchases. The services include, but are not limited to, deal tracking, AI-powered communication assistance, and message organization. Our services may rely on third-party information and integrations, and we do not guarantee the accuracy or availability of such third-party services.</p>

        <h2>3. User Accounts</h2>
        <p>When you create an account with us, you must provide us with information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our service.</p>

        <h2>4. Subscriptions</h2>
        <p>Some parts of the service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis ("Billing Cycle"). Billing cycles are set either on a monthly or annual basis, depending on the type of subscription plan you select when purchasing a subscription.</p>

        <h2>5. Content</h2>
        <p>Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material ("Content"). You are responsible for the Content that you post on or through the service, including its legality, reliability, and appropriateness.</p>
        
        <h2>6. Prohibited Uses</h2>
        <p>You may use the App only for lawful purposes. You may not use the App in any way that violates any applicable national or international law or regulation.</p>

        <h2>7. Limitation of Liability</h2>
        <p>In no event shall HaggleHub, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.</p>
        
        <h2>8. Changes</h2>
        <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms of Service on this page.</p>

        <h2>9. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us at [Your Contact Email].</p>
      </div>
    </div>
  );
}