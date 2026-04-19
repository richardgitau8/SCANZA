import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Upload, LogOut, Layout, CreditCard, ShieldCheck, 
  Download, RefreshCcw, BarChart3, Clock, CheckCircle2,
  Bell, Settings, User, MessageCircle, TrendingUp, X, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import {
  uploadAndScan,
  initiateMpesaStkPush,
  waitForPaymentCompletion,
  normalizeKenyanPhone,
  type PackageId,
} from '../services/scanService';
import {
  subscribeToUserProfile,
  subscribeToScans,
  subscribeToPayment,
  type AIReportData,
  type PlagiarismReportData,
  type ScanRecord,
} from '../services/userService';

interface DocumentRecord {
  id: string;
  name: string;
  date: string;
  plagiarism: number;
  ai: number;
  status: 'Complete' | 'Scanning' | 'Pending' | 'Failed';
  wordCount: number;
  pages: number;
  aiReport?: AIReportData;
  plagiarismReport?: PlagiarismReportData;
}

// Map a Firestore ScanRecord → the UI's DocumentRecord shape used everywhere
// in the existing dashboard markup.
function scanToDoc(s: ScanRecord): DocumentRecord {
  const created = s.createdAt ?? new Date();
  const statusMap: Record<ScanRecord['status'], DocumentRecord['status']> = {
    processing: 'Scanning',
    complete: 'Complete',
    failed: 'Failed',
  };
  return {
    id: s.id,
    name: s.fileName,
    date: created.toISOString().split('T')[0],
    plagiarism: s.plagiarismReport?.score ?? 0,
    ai: s.aiReport?.score ?? 0,
    status: statusMap[s.status],
    wordCount: s.wordCount ?? 0,
    pages: s.pages ?? 0,
    aiReport: s.aiReport,
    plagiarismReport: s.plagiarismReport,
  };
}

const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'doc'];
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

interface TokenPackage {
  packageId: PackageId;
  tokens: number;
  price: number;
  title: string;
  perToken: string;
  popular?: boolean;
}

const tokenPackages: TokenPackage[] = [
  { packageId: 'starter',     tokens: 1,   price: 130,  title: 'Starter',     perToken: '130',    popular: false },
  { packageId: 'bronze',      tokens: 5,   price: 585,  title: 'Bronze',      perToken: '117',    popular: true  },
  { packageId: 'silver',      tokens: 10,  price: 1157, title: 'Silver',      perToken: '115.70', popular: false },
  { packageId: 'gold',        tokens: 20,  price: 2288, title: 'Gold',        perToken: '114.40', popular: false },
  { packageId: 'institution', tokens: 100, price: 7800, title: 'Institution', perToken: '78',     popular: false },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<number>(0);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [showMpesaModal, setShowMpesaModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [paying, setPaying] = useState(false);
  const [paymentStage, setPaymentStage] = useState<
    'idle' | 'initiating' | 'awaiting_pin' | 'completed' | 'failed'
  >('idle');
  const [paymentMessage, setPaymentMessage] = useState<string>('');
  const paymentUnsubRef = useRef<(() => void) | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'purchase' | 'history' | 'settings'>('overview');
  const [notification, setNotification] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for Firebase auth to resolve before deciding what to do.
    if (authLoading) return;

    if (!user) {
      navigate('/login');
      return;
    }

    // Block unverified users — they must verify their email before
    // accessing the dashboard.
    if (!user.emailVerified) {
      const pendingEmail = user.email || '';
      signOut(auth).finally(() => {
        navigate('/verify-email', { state: { email: pendingEmail } });
      });
      return;
    }

    // Live subscriptions: tokens come from Firestore, scans come from
    // /users/{uid}/scans. Both update in real-time as Cloud Functions
    // write to the database.
    const unsubProfile = subscribeToUserProfile(user.uid, (profile) => {
      setTokens(profile?.tokens ?? 0);
    });
    const unsubScans = subscribeToScans(user.uid, (scans) => {
      setDocuments(scans.map(scanToDoc));
    });

    return () => {
      unsubProfile();
      unsubScans();
    };
  }, [navigate, user, authLoading]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase sign-out error:', err);
    }
    navigate('/login');
  };

  const downloadReport = (doc: DocumentRecord, reportType: 'ai' | 'plagiarism') => {
    const docPdf = new jsPDF();
    const isAiReport = reportType === 'ai';
    const score = isAiReport ? doc.ai : doc.plagiarism;
    const accent = isAiReport ? [147, 51, 234] : [16, 185, 129];
    const title = isAiReport ? 'SCANZA AI — AI DETECTION REPORT' : 'SCANZA AI — PLAGIARISM REPORT';
    const subtitle = isAiReport
      ? 'Turnitin AI writing probability assessment'
      : 'Turnitin similarity and originality assessment';

    // Header
    docPdf.setFontSize(20);
    docPdf.setTextColor(accent[0], accent[1], accent[2]);
    docPdf.text(title, 105, 28, { align: 'center' });

    docPdf.setFontSize(10);
    docPdf.setTextColor(110);
    docPdf.text(subtitle, 105, 36, { align: 'center' });

    docPdf.setDrawColor(accent[0], accent[1], accent[2]);
    docPdf.setLineWidth(0.6);
    docPdf.line(20, 42, 190, 42);

    // Document details
    docPdf.setTextColor(20);
    docPdf.setFontSize(13);
    docPdf.text('Document Details', 20, 56);
    docPdf.setFontSize(10);
    docPdf.setTextColor(60);
    docPdf.text(`Document Name : ${doc.name}`, 20, 65);
    docPdf.text(`Scan Date     : ${doc.date}`, 20, 72);
    docPdf.text(`Word Count    : ${doc.wordCount.toLocaleString()} words`, 20, 79);
    docPdf.text(`Page Count    : ${doc.pages} pages`, 20, 86);

    // Score box
    docPdf.setDrawColor(accent[0], accent[1], accent[2]);
    docPdf.setFillColor(245, 245, 250);
    docPdf.roundedRect(20, 96, 170, 28, 3, 3, 'FD');
    docPdf.setTextColor(80);
    docPdf.setFontSize(10);
    docPdf.text(isAiReport ? 'AI DETECTION SCORE' : 'SIMILARITY INDEX', 28, 106);
    docPdf.setFontSize(28);
    docPdf.setTextColor(accent[0], accent[1], accent[2]);
    docPdf.text(`${score}%`, 28, 119);

    // Assessment
    docPdf.setFontSize(12);
    docPdf.setTextColor(20);
    docPdf.text('Assessment', 20, 138);
    docPdf.setFontSize(10);
    docPdf.setTextColor(60);

    let cursorY = 146;

    if (isAiReport) {
      const aiVerdict =
        doc.ai <= 10
          ? 'Likely human-written content. AI indicators are minimal.'
          : doc.ai <= 25
          ? 'Mixed indicators detected. Some sections may be AI-assisted.'
          : 'Strong AI indicators detected across multiple sections.';
      docPdf.text(`AI Probability Score : ${doc.ai}%`, 20, cursorY); cursorY += 7;
      const confidence = doc.aiReport?.confidence ?? (doc.ai > 25 ? 'high' : doc.ai > 12 ? 'medium' : 'low');
      docPdf.text(`Confidence Level     : ${confidence.toUpperCase()}`, 20, cursorY); cursorY += 7;
      docPdf.text(`Verdict              : ${aiVerdict}`, 20, cursorY, { maxWidth: 170 });
      cursorY += 14;

      // Detected models
      if (doc.aiReport?.detectedModels?.length) {
        docPdf.setFontSize(12);
        docPdf.setTextColor(20);
        docPdf.text('Detected Model Signatures', 20, cursorY); cursorY += 7;
        docPdf.setFontSize(10);
        docPdf.setTextColor(60);
        doc.aiReport.detectedModels.forEach((m) => {
          docPdf.text(`• ${m}`, 24, cursorY);
          cursorY += 6;
        });
        cursorY += 4;
      }

      // Highlighted segments
      if (doc.aiReport?.highlightedSegments?.length) {
        docPdf.setFontSize(12);
        docPdf.setTextColor(20);
        docPdf.text('Flagged Segments', 20, cursorY); cursorY += 7;
        docPdf.setFontSize(10);
        docPdf.setTextColor(60);
        doc.aiReport.highlightedSegments.forEach((s) => {
          const pct = Math.round(s.probability * 100);
          docPdf.text(`• ${s.text} — ${pct}% probability`, 24, cursorY, { maxWidth: 165 });
          cursorY += 6;
        });
        cursorY += 4;
      }

      docPdf.setFontSize(9);
      docPdf.setTextColor(120);
      docPdf.text(
        'This report summarises the AI-writing probability signal for the uploaded document.',
        20,
        cursorY,
        { maxWidth: 170 }
      );
    } else {
      const plagiarismVerdict =
        doc.plagiarism <= 5
          ? 'Very low similarity. Document appears highly original.'
          : doc.plagiarism <= 15
          ? 'Moderate similarity detected. Review citations recommended.'
          : 'High similarity detected. Significant overlap with existing sources.';
      docPdf.text(`Similarity Score   : ${doc.plagiarism}%`, 20, cursorY); cursorY += 7;
      const sourcesScanned = doc.plagiarismReport?.totalSourcesScanned ?? 70_000_000_000;
      docPdf.text(`Sources Scanned    : ${sourcesScanned.toLocaleString()}+`, 20, cursorY); cursorY += 7;
      docPdf.text(`Verdict            : ${plagiarismVerdict}`, 20, cursorY, { maxWidth: 170 });
      cursorY += 14;

      // Matched sources
      if (doc.plagiarismReport?.matches?.length) {
        docPdf.setFontSize(12);
        docPdf.setTextColor(20);
        docPdf.text('Top Matching Sources', 20, cursorY); cursorY += 7;
        docPdf.setFontSize(10);
        docPdf.setTextColor(60);
        doc.plagiarismReport.matches.forEach((m) => {
          docPdf.text(`• ${m.source} — ${m.percentage}% match`, 24, cursorY, { maxWidth: 165 });
          cursorY += 6;
        });
        cursorY += 4;
      }

      docPdf.setFontSize(9);
      docPdf.setTextColor(120);
      docPdf.text(
        'This report summarises similarity findings and overall originality risk for the uploaded document.',
        20,
        cursorY,
        { maxWidth: 170 }
      );
    }

    // Footer
    docPdf.setFontSize(9);
    docPdf.setTextColor(120);
    docPdf.text('Generated by SCANZA AI — Academic Integrity Platform', 105, 285, { align: 'center' });
    docPdf.text(`Report ID: ${doc.id}`, 105, 290, { align: 'center' });

    const baseName = doc.name.replace(/\.[^/.]+$/, '');
    const fileName = isAiReport
      ? `SCANZA-AI-Report-${baseName}.pdf`
      : `SCANZA-Plagiarism-Report-${baseName}.pdf`;
    docPdf.save(fileName);
    showToast(`${isAiReport ? 'AI' : 'Plagiarism'} report downloaded successfully!`);
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // 1. Validate file type by extension AND mime type
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const validExt = ACCEPTED_EXTENSIONS.includes(ext);
    const validMime = ACCEPTED_MIME_TYPES.includes(file.type) || file.type === '';
    if (!validExt || !validMime) {
      showToast('Invalid file. Please upload a PDF or Word (.docx/.doc) document.');
      resetFileInput();
      return;
    }

    // 2. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showToast('File too large. Maximum allowed size is 25 MB.');
      resetFileInput();
      return;
    }

    // 3. Ensure user has tokens
    if (tokens < 1) {
      showToast('Insufficient tokens. Please buy tokens first!');
      resetFileInput();
      setActiveTab('purchase');
      return;
    }

    setIsUploading(true);

    const stages = [
      'Uploading document securely...',
      'Submitting to Turnitin index...',
      'Running AI detection analysis...',
      'Running plagiarism similarity check...',
    ];

    let stageIdx = 0;
    setUploadProgress(stages[0]);
    const interval = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, stages.length - 1);
      setUploadProgress(stages[stageIdx]);
    }, 1200);

    try {
      // Calls Cloud Function via scanService.uploadAndScan:
      //   1. Uploads to Cloud Storage under uploads/{uid}/{scanId}/...
      //   2. Invokes processScan callable, which decrements 1 token,
      //      runs Turnitin server-side, and writes results to Firestore.
      // The onSnapshot subscription updates `documents` + `tokens`
      // automatically once the Cloud Function commits.
      await uploadAndScan(file);
      showToast('Scan complete! AI & Plagiarism reports are ready.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed. Please try again.';
      showToast(message);
    } finally {
      clearInterval(interval);
      setIsUploading(false);
      setUploadProgress('');
      resetFileInput();
    }
  };

  const executeMpesaPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackage || !user) return;

    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) {
      showToast('Enter a valid Safaricom number (e.g. 0712345678).');
      return;
    }

    setPaying(true);
    setPaymentStage('initiating');
    setPaymentMessage('Sending request to M-Pesa...');

    // Cleanup any previous subscription
    paymentUnsubRef.current?.();
    paymentUnsubRef.current = null;

    try {
      // 1. Initiate STK Push (server validates price + phone + writes pending payment doc)
      const stk = await initiateMpesaStkPush(selectedPackage.packageId, normalized);

      setPaymentStage('awaiting_pin');
      setPaymentMessage(
        `M-Pesa prompt sent to ${stk.phone}. Enter your PIN on your phone to complete payment.`
      );

      // 2. Subscribe to the payment doc — webhook flips it to "completed" the
      //    moment IntaSend confirms.
      paymentUnsubRef.current = subscribeToPayment(user.uid, stk.apiRef, (p) => {
        if (!p) return;
        if (p.status === 'completed') {
          setPaymentStage('completed');
          setPaymentMessage(`Payment received! ${selectedPackage.tokens} tokens credited.`);
          showToast(`Payment successful — ${selectedPackage.tokens} tokens added.`);
          setTimeout(() => {
            setShowMpesaModal(false);
            setActiveTab('overview');
            setPaying(false);
            setPaymentStage('idle');
            setPaymentMessage('');
            setPhone('');
          }, 1800);
        } else if (p.status === 'failed') {
          setPaymentStage('failed');
          setPaymentMessage(p.failedReason ?? 'Payment failed. Please try again.');
          setPaying(false);
        }
      });

      // 3. Polling fallback (in case the webhook is unconfigured / delayed)
      const final = await waitForPaymentCompletion(stk.invoiceId, stk.apiRef);
      if (final.status === 'pending') {
        setPaymentStage('failed');
        setPaymentMessage(
          'Timed out waiting for confirmation. If you completed the payment, your tokens will appear shortly.'
        );
        setPaying(false);
      }
      // completed/failed states are already handled by the subscription above.
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      setPaymentStage('failed');
      setPaymentMessage(message);
      showToast(message);
      setPaying(false);
    }
  };

  // Cleanup payment subscription when modal closes / component unmounts
  useEffect(() => {
    if (!showMpesaModal && paymentUnsubRef.current) {
      paymentUnsubRef.current();
      paymentUnsubRef.current = null;
      setPaymentStage('idle');
      setPaymentMessage('');
    }
    return () => {
      paymentUnsubRef.current?.();
      paymentUnsubRef.current = null;
    };
  }, [showMpesaModal]);

  const getScoreColor = (score: number, type: 'plagiarism' | 'ai') => {
    if (type === 'plagiarism') {
      if (score <= 5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (score <= 15) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      return 'text-red-400 bg-red-500/10 border-red-500/20';
    }
    if (score <= 10) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score <= 25) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
  };

  const avgPlag = documents.length ? Math.round(documents.reduce((a, d) => a + d.plagiarism, 0) / documents.length) : 0;
  const weekCount = documents.filter(d => new Date(d.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;

  const stats = [
    { label: 'Total Scans', value: documents.length, icon: FileText, color: 'text-emerald-400' },
    { label: 'Avg. Plagiarism', value: avgPlag + '%', icon: BarChart3, color: 'text-purple-400' },
    { label: 'This Week', value: weekCount, icon: Clock, color: 'text-cyan-400' },
    { label: 'Tokens Left', value: tokens, icon: ShieldCheck, color: 'text-emerald-500' }
  ];

  return (
    <div className="min-h-screen bg-[#020204] text-white flex select-none antialiased relative overflow-hidden">
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-emerald-500/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/8 blur-[120px] rounded-full pointer-events-none" />

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-[100] bg-gradient-to-r from-emerald-500 to-purple-600 px-6 py-3 rounded-xl shadow-2xl text-sm font-bold text-white flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <aside className="w-72 border-r border-zinc-900 bg-black/40 backdrop-blur-3xl hidden md:flex flex-col justify-between p-6 z-20">
        <div className="space-y-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-purple-600 shadow-xl shadow-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2} />
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              SCANZA <span className="text-emerald-400 font-bold text-base">AI</span>
            </span>
          </div>

          <nav className="flex flex-col gap-1.5">
            {[
              { id: 'overview', icon: Layout, label: 'Overview' },
              { id: 'purchase', icon: CreditCard, label: 'Buy Tokens' },
              { id: 'history', icon: Clock, label: 'Scan History' },
              { id: 'settings', icon: Settings, label: 'Settings' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-emerald-500/15 to-purple-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/10'
                    : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-purple-500/5 border border-emerald-500/15">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-2">Current Balance</div>
            <div className="text-2xl font-black text-white">{tokens} <span className="text-sm font-normal text-zinc-400">Tokens</span></div>
            <button
              onClick={() => setActiveTab('purchase')}
              className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-xs font-bold text-white hover:brightness-110 transition-all duration-300 shadow-lg shadow-emerald-500/20"
            >
              Buy More Tokens
            </button>
          </div>

          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3.5 px-4 py-3 text-sm font-bold text-zinc-500 hover:text-red-400 transition"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col z-10 overflow-auto">
        <header className="border-b border-zinc-900 bg-black/20 backdrop-blur-md px-8 py-4 flex justify-between items-center sticky top-0 z-30">
          <div className="md:hidden flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-purple-600 shadow-md">
              <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-md font-extrabold tracking-tight">SCANZA AI</span>
          </div>
          
          <div className="hidden md:block">
            <h2 className="text-lg font-bold tracking-tight capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white transition">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400"></span>
            </button>
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-purple-600 flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold hidden sm:block">User</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 md:p-10">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 max-w-6xl mx-auto"
            >
              <div>
                <h3 className="text-2xl font-extrabold text-white">Welcome back!</h3>
                <p className="text-zinc-400 font-medium text-sm mt-1">Monitor your academic document integrity dashboard</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all duration-300 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 flex items-center justify-center mb-3">
                      <stat.icon size={20} className={stat.color} />
                    </div>
                    <div className="text-2xl font-black text-white">{stat.value}</div>
                    <div className="text-xs text-zinc-500 font-medium mt-1">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 relative group bg-zinc-900/40 border-2 border-dashed border-zinc-800 hover:border-emerald-500/40 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[220px]">
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    id="docUpload" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept=".pdf,.docx,.doc,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    disabled={isUploading}
                    onChange={handleFileUpload}
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <RefreshCcw className="h-12 w-12 text-emerald-400 animate-spin" />
                      <div className="text-sm font-semibold text-emerald-400">{uploadProgress}</div>
                      <p className="text-xs text-zinc-500 font-light">Hold steady. Analyzing integrity signatures securely.</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition duration-300">
                        <Upload className="h-7 w-7 text-emerald-400" />
                      </div>
                      <h4 className="text-lg font-bold mb-2">Upload Document</h4>
                      <p className="text-xs text-zinc-400 max-w-xs leading-5">Supports <span className="text-emerald-400 font-semibold">PDF, DOC, DOCX</span> up to 25 MB. Generates AI &amp; Plagiarism reports. 1 token per scan.</p>
                      <label htmlFor="docUpload" className="mt-4 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-xs font-bold text-white cursor-pointer hover:brightness-110 transition-all duration-300 shadow-lg shadow-emerald-500/20">
                        Select File
                      </label>
                    </>
                  )}
                </div>

                <div className="bg-gradient-to-br from-zinc-900/40 to-black/30 border border-zinc-800/80 p-6 rounded-2xl flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-zinc-400 text-xs font-semibold tracking-wide uppercase">Quick Stats</h4>
                    <TrendingUp size={16} className="text-emerald-400" />
                  </div>
                  
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Tokens Left</span>
                      <span className="text-xl font-black text-white">{tokens}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Documents Scanned</span>
                      <span className="text-xl font-black text-white">{documents.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Avg Originality</span>
                      <span className="text-xl font-black text-emerald-400">
                        {documents.length ? `${100 - Math.round(documents.reduce((a, d) => a + d.plagiarism, 0) / documents.length)}%` : '100%'}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setActiveTab('purchase')}
                    className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-purple-600 text-xs font-bold text-white hover:brightness-110 transition-all duration-300 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    Buy Tokens Now
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold tracking-wider text-zinc-300 uppercase">Recent Scans</h4>
                  <button onClick={() => setActiveTab('history')} className="text-xs text-emerald-400 font-bold hover:underline">View All</button>
                </div>
                
                <div className="overflow-hidden border border-zinc-900/80 rounded-2xl bg-zinc-950/20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] uppercase font-bold text-zinc-400 tracking-wider bg-zinc-900/20">
                        <th className="px-6 py-4">Document</th>
                        <th className="px-6 py-4 hidden md:table-cell">Date</th>
                        <th className="px-6 py-4 text-center">Plagiarism</th>
                        <th className="px-6 py-4 text-center hidden sm:table-cell">AI</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 font-medium text-sm">
                      {documents.slice(0, 5).map((doc) => (
                        <tr key={doc.id} className="hover:bg-zinc-900/10 text-zinc-200 transition-all duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-purple-400" />
                              </div>
                              <div>
                                <span className="font-bold text-white block truncate max-w-[180px]">{doc.name}</span>
                                <span className="text-[10px] text-zinc-500 hidden md:block">{doc.wordCount.toLocaleString()} words</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-zinc-400 hidden md:table-cell">{doc.date}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getScoreColor(doc.plagiarism, 'plagiarism')}`}>
                              {doc.plagiarism}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center hidden sm:table-cell">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getScoreColor(doc.ai, 'ai')}`}>
                              {doc.ai}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all duration-200" title="View Details">
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => downloadReport(doc, 'ai')}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-500/10 px-2.5 py-2 text-[11px] font-bold text-purple-300 transition-all duration-200 hover:bg-purple-500/20"
                                title="Download AI Report"
                              >
                                <Download size={12} />
                                AI
                              </button>
                              <button
                                onClick={() => downloadReport(doc, 'plagiarism')}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-[11px] font-bold text-emerald-400 transition-all duration-200 hover:bg-emerald-500/20"
                                title="Download Plagiarism Report"
                              >
                                <Download size={12} />
                                Plag
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'purchase' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 max-w-6xl mx-auto"
            >
              <div>
                <h3 className="text-2xl font-black text-white">Purchase Check Tokens</h3>
                <p className="text-zinc-400 font-medium text-sm">The more you buy, the more you save! Volume discounts automatically applied.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {tokenPackages.map((pkg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative bg-zinc-950/60 border rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300 group ${
                      pkg.popular ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-500/5 to-transparent' : 'border-zinc-900'
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500 to-purple-600 text-[9px] font-black text-white uppercase">
                        Best Value
                      </div>
                    )}
                    <div className="text-xs text-emerald-400 font-bold uppercase tracking-wide mb-2">{pkg.title}</div>
                    <div className="text-3xl font-black text-white mb-1">{pkg.tokens} <span className="text-sm text-zinc-500 font-normal">Tokens</span></div>
                    <div className="text-sm font-semibold text-zinc-400">KES {pkg.price}</div>
                    <div className="text-[10px] text-emerald-400 font-bold mt-1">@ KES {pkg.perToken} each</div>
                    <button 
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowMpesaModal(true);
                      }}
                      className="w-full mt-5 py-3 rounded-xl text-xs font-bold transition-all duration-300 bg-gradient-to-r from-emerald-500 to-purple-600 text-white hover:brightness-110 shadow-lg shadow-emerald-500/10"
                    >
                      Buy Now
                    </button>
                  </motion.div>
                ))}
              </div>

              <div className="grid md:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: ShieldCheck, title: 'Secure Payment', desc: 'M-Pesa STK push secured transactions' },
                  { icon: Clock, title: 'Instant Delivery', desc: 'Tokens credited immediately after payment' },
                  { icon: CheckCircle2, title: 'No Expiry', desc: 'Tokens never expire, use anytime' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/30 border border-zinc-900">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <item.icon size={18} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-6xl mx-auto"
            >
              <div>
                <h3 className="text-2xl font-black text-white">Scan History</h3>
                <p className="text-zinc-400 font-medium text-sm">Complete archive of all your scanned documents</p>
              </div>

              <div className="overflow-hidden border border-zinc-900/80 rounded-2xl bg-zinc-950/20">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] uppercase font-bold text-zinc-400 tracking-wider bg-zinc-900/20">
                      <th className="px-6 py-4">Document Name</th>
                      <th className="px-6 py-4 hidden md:table-cell">Date</th>
                      <th className="px-6 py-4 text-center">Plagiarism</th>
                      <th className="px-6 py-4 text-center">AI</th>
                      <th className="px-6 py-4 text-center hidden sm:table-cell">Words</th>
                      <th className="px-6 py-4 text-right">Reports</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60 font-medium text-sm">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-900/10 text-zinc-200 transition-all duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-purple-400" />
                            <span className="truncate max-w-[200px] text-white font-bold">{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-400 hidden md:table-cell">{doc.date}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getScoreColor(doc.plagiarism, 'plagiarism')}`}>
                            {doc.plagiarism}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${getScoreColor(doc.ai, 'ai')}`}>
                            {doc.ai}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-xs text-zinc-400 hidden sm:table-cell">{doc.wordCount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              onClick={() => downloadReport(doc, 'ai')}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-300 transition-all duration-200 hover:bg-purple-500/20"
                            >
                              <Download size={12} /> AI Report
                            </button>
                            <button
                              onClick={() => downloadReport(doc, 'plagiarism')}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-all duration-200 hover:bg-emerald-500/20"
                            >
                              <Download size={12} /> Plagiarism Report
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 max-w-3xl mx-auto"
            >
              <div>
                <h3 className="text-2xl font-black text-white">Account Settings</h3>
                <p className="text-zinc-400 font-medium text-sm">Manage your SCANZA AI account</p>
              </div>

              <div className="space-y-4">
                <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-white mb-4">Profile Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Email Address</label>
                      <div className="mt-1 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300">
                        user@example.com
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Account Created</label>
                      <div className="mt-1 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-300">
                        February 14, 2026
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-white mb-4">Danger Zone</h4>
                  <button 
                    onClick={handleSignOut}
                    className="px-6 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/10 transition-all duration-300"
                  >
                    Sign Out
                  </button>
                </div>

                <div className="bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/20 rounded-2xl p-6">
                  <h4 className="text-sm font-bold text-white mb-2">Google Cloud Integration</h4>
                  <p className="text-xs text-zinc-400 mb-4">Authentication powered by Google Cloud Console. Add your OAuth credentials in the environment configuration.</p>
                  <div className="text-[10px] font-mono text-zinc-500 bg-zinc-950 p-3 rounded-lg">
                    # .env - GOOGLE_CLIENT_ID=your_id_here
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <a
        href="https://wa.me/254727028535?text=Hello%20SCANZA%20AI%20Support"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          e.preventDefault();
          const url = 'https://wa.me/254727028535?text=Hello%20SCANZA%20AI%20Support';
          const w = window.open(url, '_blank', 'noopener,noreferrer');
          if (!w) window.top!.location.href = url;
        }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-[#25D366]/30 hover:scale-110 transition-all duration-300 group"
      >
        <MessageCircle size={26} className="text-white" />
        <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-zinc-900 text-xs font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Chat on WhatsApp
        </span>
      </a>

      <AnimatePresence>
        {showMpesaModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMpesaModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 rounded-3xl relative shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/1/15/M-PESA_LOGO-01.svg" alt="Mpesa" className="h-6" />
                  <span className="text-sm font-black text-emerald-400 uppercase tracking-widest">Payment</span>
                </div>
                <button 
                  onClick={() => setShowMpesaModal(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedPackage && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border border-emerald-500/20">
                  <div className="text-xs text-zinc-400 font-bold uppercase">Package</div>
                  <div className="text-xl font-black text-white mt-1">{selectedPackage.tokens} Tokens - {selectedPackage.title}</div>
                  <div className="text-emerald-400 font-bold mt-1">KES {selectedPackage.price}</div>
                </div>
              )}

              <form onSubmit={executeMpesaPay} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">M-Pesa Number</label>
                  <input 
                    type="tel"
                    required
                    disabled={paying}
                    placeholder="0712345678 or 254712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 px-4 py-3.5 rounded-xl text-sm focus:outline-none focus:border-emerald-500 text-white transition disabled:opacity-60"
                  />
                </div>

                {paymentMessage && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                      paymentStage === 'completed'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : paymentStage === 'failed'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                        : 'bg-purple-500/10 border border-purple-500/30 text-purple-200'
                    }`}
                  >
                    {paymentStage === 'completed' ? (
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                    ) : paymentStage === 'failed' ? (
                      <X size={14} className="shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCcw size={14} className="shrink-0 mt-0.5 animate-spin" />
                    )}
                    <span className="leading-relaxed">{paymentMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={paying}
                  className="w-full bg-gradient-to-r from-emerald-500 to-purple-600 text-white py-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:brightness-110 transition-all duration-300 disabled:opacity-70"
                >
                  {paying ? (
                    <div className="flex items-center gap-2">
                      <RefreshCcw className="h-4 w-4 animate-spin" />
                      <span>
                        {paymentStage === 'initiating' && 'Sending STK push...'}
                        {paymentStage === 'awaiting_pin' && 'Waiting for PIN...'}
                        {paymentStage === 'completed' && 'Payment confirmed'}
                        {(paymentStage === 'idle' || paymentStage === 'failed') && 'Processing...'}
                      </span>
                    </div>
                  ) : (
                    <span>Pay KES {selectedPackage?.price} via M-Pesa</span>
                  )}
                </button>

                <p className="text-[10px] text-center text-zinc-500">
                  Powered by IntaSend · Safaricom M-Pesa STK Push · Secured payment
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
