import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="prose lg:prose-lg">
        <h1>Privacy Policy</h1>
        <p className="lead">Last updated: {new Date().toLocaleDateString()}</p>
        
        <p><strong>Disclaimer:</strong> This is a placeholder privacy policy. You should consult with a legal professional to create a policy that is compliant with all applicable laws and regulations for your specific business.</p>

        <h2>1. Introduction</h2>
        <p>Welcome to HaggleHub. We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about our policy, or our practices with regards to your personal information, please contact us.</p>

        <h2>2. Information We Collect</h2>
        <p>We collect personal information that you voluntarily provide to us when you register on the app, express an interest in obtaining information about us or our products and services, when you participate in activities on the app or otherwise when you contact us.</p>
        <p>The personal information that we collect depends on the context of your interactions with us and the app, the choices you make and the products and features you use. The personal information we collect may include the following:</p>
        <ul>
            <li>Full Name</li>
            <li>Email Address</li>
            <li>Information related to vehicle deals and communications</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use personal information collected via our app for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.</p>
        <ul>
            <li>To facilitate account creation and logon process.</li>
            <li>To manage user accounts.</li>
            <li>To send administrative information to you.</li>
            <li>To enable user-to-user communications.</li>
            <li>To provide and manage our services.</li>
        </ul>

        <h2>4. Will Your Information Be Shared With Anyone?</h2>
        <p>We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.</p>

        <h2>5. How Long Do We Keep Your Information?</h2>
        <p>We keep your information for as long as necessary to fulfill the purposes outlined in this privacy policy unless otherwise required by law.</p>
        
        <h2>6. How Do We Keep Your Information Safe?</h2>
        <p>We aim to protect your personal information through a system of organizational and technical security measures.</p>

        <h2>7. What Are Your Privacy Rights?</h2>
        <p>In some regions (like the EEA and UK), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; and (iv) if applicable, to data portability.</p>

        <h2>8. Contact Us</h2>
        <p>If you have questions or comments about this policy, you may contact us by email at [Your Contact Email].</p>
      </div>
    </div>
  );
}