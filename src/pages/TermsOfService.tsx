import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 relative">
      <BackButton />
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl font-extrabold mb-4">Terms of Service</h1>
          <p className="text-white/50">Last Updated: June 2024</p>
        </motion.div>

        <div className="space-y-12 text-white/80 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing or using SCANZA AI, you agree to be bound by these Terms of Service and all applicable laws and regulations in Kenya. 
              If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">2. Use of Service</h2>
            <p>
              SCANZA AI provides AI-powered plagiarism and content detection services. 
              Our service is intended for academic and professional verification purposes. 
              You are responsible for ensuring that your use of the service complies with your institution's policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">3. Tokens and Payments</h2>
            <p className="mb-4">Our service operates on a token-based system:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tokens are purchased using M-Pesa or other supported payment methods.</li>
              <li>Purchases are final and non-refundable unless otherwise required by Kenyan law.</li>
              <li>Tokens must be used within the account. We do not offer token transfers between users.</li>
              <li>We reserve the right to adjust pricing and token requirements at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">4. User Conduct</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the service for any illegal or unauthorized purpose.</li>
              <li>Attempt to bypass our security or payment systems.</li>
              <li>Use the service to generate or verify content that violates copyright laws.</li>
              <li>Resell our services without explicit written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">5. Disclaimer of Warranties</h2>
            <p>
              SCANZA AI is provided "as is" and "as available". While we strive for high accuracy, 
              we do not guarantee that the results will be 100% accurate or that our service 
              will be uninterrupted or error-free. Use the results at your own discretion.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">6. Limitation of Liability</h2>
            <p>
              In no event shall SCANZA AI or its owners be liable for any indirect, incidental, 
              special, or consequential damages resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">7. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the Republic of Kenya. 
              Any legal action or proceeding shall be brought in the courts of Kenya.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
