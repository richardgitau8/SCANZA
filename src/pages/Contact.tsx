import { motion } from 'framer-motion';
import { MessageCircle, Mail, MapPin } from 'lucide-react';
import BackButton from '../components/BackButton';

const Contact = () => {
  const whatsappNumber = "254727028535";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hello%20SCANZA%20AI%20Support,%20I%20have%20a%20question.`;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <BackButton />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-emerald-400 to-purple-500 bg-clip-text text-transparent">
            Get in Touch
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto">
            Have questions about our reports or subscription? We're here to help you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center"
          >
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">WhatsApp</h3>
            <p className="text-white/50 text-sm mb-4">Instant Support</p>
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                const w = window.open(whatsappLink, '_blank', 'noopener,noreferrer');
                if (!w) window.top!.location.href = whatsappLink;
              }}
              className="inline-flex items-center gap-2 text-emerald-400 font-semibold hover:text-emerald-300 transition"
            >
              Chat Now <MessageCircle size={16} />
            </a>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center"
          >
            <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Mail className="text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Email</h3>
            <p className="text-white/50 text-sm mb-4">Official Inquiry</p>
            <a 
              href="mailto:support@scanza.ai"
              className="inline-flex items-center gap-2 text-purple-400 font-semibold hover:text-purple-300 transition"
            >
              Email Us <Mail size={16} />
            </a>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center"
          >
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Location</h3>
            <p className="text-white/50 text-sm mb-4">Kenya Based</p>
            <p className="text-white/80 font-medium">Nairobi, Kenya</p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-white/10 rounded-3xl p-8 md:p-12 text-center"
        >
          <h2 className="text-2xl font-bold mb-4">Need something custom?</h2>
          <p className="text-white/60 mb-8 max-w-lg mx-auto">
            If you are a research institution or a university looking for bulk scan enterprise solutions, contact us for a custom quote.
          </p>
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              const w = window.open(whatsappLink, '_blank', 'noopener,noreferrer');
              if (!w) window.top!.location.href = whatsappLink;
            }}
            className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-xl hover:bg-emerald-400 hover:text-black transition-all duration-300"
          >
            Contact Sales via WhatsApp
          </a>
        </motion.div>
      </div>
    </div>
  );
};

export default Contact;
