import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 relative">
      <BackButton />
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-white/50">Effective Date: June 2024</p>
        </motion.div>

        <div className="space-y-12 text-white/80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">1. Introduction</h2>
            <p>
              Welcome to SCANZA AI. We are committed to protecting your personal information and your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
              you use our platform, in compliance with the Kenya Data Protection Act, 2019.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">2. Information We Collect</h2>
            <p className="mb-4">We collect information that you provide directly to us, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Personal Identifiers:</strong> Name, email address, and phone number during registration.</li>
              <li><strong>Payment Information:</strong> Transaction details processed through M-Pesa. We do not store your full M-Pesa PIN.</li>
              <li><strong>Usage Data:</strong> Information about how you use our platform, such as scanned documents and scan history.</li>
              <li><strong>Uploaded Content:</strong> The documents you upload for scanning. These are processed securely.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">3. How We Use Your Information</h2>
            <p className="mb-4">We use the collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide, maintain, and improve our scanning services.</li>
              <li>Process your payments and manage your token balance.</li>
              <li>Communicate with you regarding your account or service updates.</li>
              <li>Prevent fraudulent activities and ensure security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data. Your uploaded documents are 
              encrypted and processed for analysis. We take reasonable steps to prevent the loss, theft, or 
              unauthorized access of your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">5. Your Rights (Kenyan Data Protection Act)</h2>
            <p className="mb-4">Under the Kenya Data Protection Act, 2019, you have the following rights:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>The right to be informed of how your data is being used.</li>
              <li>The right to access your personal data held by us.</li>
              <li>The right to object to processing or request deletion of your data.</li>
              <li>The right to correct inaccurate or incomplete information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-emerald-400 mb-4">6. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us via WhatsApp or email 
              as provided on our Contact page.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
