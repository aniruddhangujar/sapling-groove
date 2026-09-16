import React, { useState, useEffect } from 'react';
import { FeedbackCategory, FieldReportInput } from '../types';
import { 
  submitFieldReport, 
  extractClientDiagnostics, 
  getFeedbackCooldownRemaining, 
  getSavedFeedbackDraft, 
  saveFeedbackDraft, 
  clearSavedFeedbackDraft,
  ClientDiagnostics
} from '../services/feedbackService';
import { SUPPORT_TIERS, openExternalSupport } from '../services/supportService';

export type CommunityTab = 'feedback' | 'support' | 'contact';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: CommunityTab;
  currentRoute?: string;
  user?: { uid: string; isAnonymous?: boolean; email?: string | null } | null;
}

const CATEGORIES: { id: FeedbackCategory; label: string; icon: string }[] = [
  { id: 'bug', label: 'BUG / PROBLEM', icon: '⚠' },
  { id: 'feature', label: 'FEATURE IDEA', icon: '✦' },
  { id: 'ux', label: 'UX / DESIGN', icon: '◈' },
  { id: 'appreciation', label: 'SOMETHING I LIKE', icon: '♥' },
  { id: 'other', label: 'OTHER', icon: '•' }
];

export const CommunityModal: React.FC<CommunityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'feedback',
  currentRoute = '/app',
  user
}) => {
  const [activeTab, setActiveTab] = useState<CommunityTab>(initialTab);
  
  // Feedback form state
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [message, setMessage] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [botTrap, setBotTrap] = useState(''); // Honeypot
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [diagnostics, setDiagnostics] = useState<ClientDiagnostics | null>(null);

  // Sync initial tab when modal opens or prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setDiagnostics(extractClientDiagnostics());
      setCooldownRemaining(getFeedbackCooldownRemaining());

      // Restore unsent draft if available
      const saved = getSavedFeedbackDraft();
      if (saved) {
        if (saved.category) setCategory(saved.category);
        if (saved.message && !message) setMessage(saved.message);
        if (saved.contactEmail && !contactEmail) setContactEmail(saved.contactEmail);
      }
    }
  }, [isOpen, initialTab]);

  // Cooldown countdown tick
  useEffect(() => {
    if (!isOpen || cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      const remaining = getFeedbackCooldownRemaining();
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, cooldownRemaining]);

  // Escape key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-save draft on changes (if not successfully sent)
  useEffect(() => {
    if (!isOpen || submitSuccess) return;
    if (message.trim().length > 0) {
      saveFeedbackDraft({
        category,
        message,
        contactEmail: contactEmail.trim() || undefined
      });
    }
  }, [isOpen, category, message, contactEmail, submitSuccess]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validate bounds
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3) {
      setSubmitError('Message must be at least 3 characters.');
      return;
    }
    if (trimmedMessage.length > 2000) {
      setSubmitError('Message cannot exceed 2,000 characters.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const isGuest = !user || !!user.isAnonymous;
    const userId = (!isGuest && user?.uid) ? user.uid : undefined;

    const payload: FieldReportInput = {
      category,
      message: trimmedMessage,
      contactEmail: contactEmail.trim() || undefined,
      hp_bot_trap: botTrap,
      currentRoute,
      userId,
      isGuest
    };

    const res = await submitFieldReport(payload);
    setIsSubmitting(false);

    if (res.success) {
      setSubmitSuccess(res.reportId || 'RECEIVED');
      setCooldownRemaining(getFeedbackCooldownRemaining());
      clearSavedFeedbackDraft();
      setMessage('');
    } else {
      setSubmitError(res.error || 'Failed to submit report.');
    }
  };

  const handleResetForm = () => {
    setSubmitSuccess(null);
    setSubmitError(null);
    setMessage('');
    setCategory('bug');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center p-2 sm:p-4 z-[200] animate-in fade-in duration-200 backdrop-blur-sm pb-safe pt-safe"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-modal-title"
    >
      <div 
        className="bg-[#0c0e0c] w-full max-w-xl max-h-[92vh] border-2 border-emerald-900/50 flex flex-col relative shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-hidden rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-4 sm:px-6 py-3.5 border-b-2 border-emerald-950/60 flex justify-between items-center bg-[#070a07] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <h2 id="community-modal-title" className="pixel-font text-xs sm:text-sm text-zinc-100 uppercase tracking-widest">
              SAPLING // COMMUNITY & SUPPORT
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-emerald-400 text-2xl font-light transition-colors active:scale-95"
            aria-label="Close community modal"
          >
            ×
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="flex border-b border-emerald-950/40 bg-[#090d09] px-2 sm:px-4 shrink-0 overflow-x-auto scrollbar-none" aria-label="Community navigation">
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 px-3 sm:px-4 pixel-font text-[10px] sm:text-[11px] uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'feedback'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>📝</span>
            <span>FIELD REPORT</span>
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`py-3 px-3 sm:px-4 pixel-font text-[10px] sm:text-[11px] uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'support'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>🌱</span>
            <span>SUPPORT THE GROVE</span>
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`py-3 px-3 sm:px-4 pixel-font text-[10px] sm:text-[11px] uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
              activeTab === 'contact'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>✉</span>
            <span>CONTACT & LINKS</span>
          </button>
        </nav>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-zinc-300 scrollbar-thin scrollbar-thumb-emerald-950 scrollbar-track-transparent">

          {/* TAB 1: FEEDBACK / FIELD REPORT */}
          {activeTab === 'feedback' && (
            <div className="space-y-5">
              {submitSuccess ? (
                <div className="bg-emerald-950/30 border border-emerald-500/40 p-5 rounded-lg text-center space-y-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 text-2xl">
                    ✓
                  </div>
                  <div>
                    <h3 className="pixel-font text-xs sm:text-sm text-emerald-400 uppercase tracking-widest">
                      FIELD REPORT RECEIVED
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Your observation has been received and added to our triage queue. Thank you for helping the Grove flourish.
                    </p>
                    <div className="mt-3 inline-block bg-black/60 border border-emerald-900/50 px-3 py-1 rounded text-[10px] font-mono text-zinc-400 tabular-nums">
                      REFERENCE ID: {submitSuccess}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 justify-center">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-4 py-2 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-600/40 rounded text-[11px] pixel-font text-emerald-300 uppercase tracking-wider transition-all active:scale-95"
                    >
                      Send Another Report
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-[11px] pixel-font text-zinc-300 uppercase tracking-wider transition-all active:scale-95"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <label className="block pixel-font text-[9px] sm:text-[10px] text-emerald-400 uppercase tracking-[0.18em] font-bold">
                      OBSERVATION CATEGORY
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setCategory(cat.id)}
                          className={`p-2 rounded border text-left flex items-center gap-2 transition-all text-[11px] ${
                            category === cat.id
                              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                              : 'bg-black/40 border-emerald-950/50 text-zinc-400 hover:text-zinc-200 hover:border-emerald-900/60'
                          }`}
                        >
                          <span className="text-xs opacity-75">{cat.icon}</span>
                          <span className="pixel-font text-[9px] truncate">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label htmlFor="field-report-message" className="block pixel-font text-[9px] sm:text-[10px] text-emerald-400 uppercase tracking-[0.18em] font-bold">
                        OBSERVATION DETAILS
                      </label>
                      <span className={`text-[10px] font-mono tabular-nums ${
                        message.length > 1900 ? 'text-amber-400' : 'text-zinc-500'
                      }`}>
                        {message.length} / 2000
                      </span>
                    </div>
                    <textarea
                      id="field-report-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe the bug, your feature idea, or what you felt during your focus ritual..."
                      rows={4}
                      maxLength={2000}
                      className="w-full bg-black/60 border-2 border-emerald-950/60 rounded-lg p-3 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors resize-y min-h-[100px]"
                      required
                    />
                  </div>

                  {/* Optional Email Contact */}
                  <div className="space-y-1.5">
                    <label htmlFor="field-report-email" className="block pixel-font text-[9px] sm:text-[10px] text-emerald-400 uppercase tracking-[0.18em] font-bold">
                      RETURN FREQUENCY (EMAIL — OPTIONAL)
                    </label>
                    <input
                      id="field-report-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Optional — if you would like a reply or follow-up"
                      maxLength={100}
                      className="w-full bg-black/60 border-2 border-emerald-950/60 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>

                  {/* Honeypot Field (Invisible to real users, catches spam bots) */}
                  <div style={{ display: 'none' }} aria-hidden="true">
                    <label htmlFor="hp_bot_trap">Do not fill this field</label>
                    <input
                      id="hp_bot_trap"
                      type="text"
                      name="hp_bot_trap"
                      value={botTrap}
                      onChange={(e) => setBotTrap(e.target.value)}
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </div>

                  {/* Non-Sensitive Environment Badge */}
                  {diagnostics && (
                    <div className="bg-black/40 border border-emerald-950/40 rounded px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-500 font-mono">
                      <span className="text-emerald-500/80">🌱 DIAGNOSTICS:</span>
                      <span>v{diagnostics.appVersion}</span>
                      <span>•</span>
                      <span>{diagnostics.browser}</span>
                      <span>•</span>
                      <span className="capitalize">{diagnostics.deviceCategory}</span>
                      <span>•</span>
                      <span className="truncate max-w-[140px]">{currentRoute}</span>
                      {user && !user.isAnonymous && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Authenticated</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Error Notification */}
                  {submitError && (
                    <div className="bg-red-950/30 border border-red-500/40 p-3 rounded text-xs text-red-300 flex items-start gap-2">
                      <span className="text-red-400 font-bold">!</span>
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Submission Action */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <div className="text-[10px] text-zinc-500">
                      {cooldownRemaining > 0 ? (
                        <span className="text-amber-400 font-mono tabular-nums">
                          Cooldown: {cooldownRemaining}s
                        </span>
                      ) : (
                        <span>Encrypted transit • No ads or tracking</span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || message.trim().length < 3 || cooldownRemaining > 0}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-semibold pixel-font text-[11px] uppercase tracking-wider rounded transition-all active:scale-[0.98] flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>TRANSMITTING...</span>
                        </>
                      ) : (
                        <span>TRANSMIT REPORT</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: SUPPORT THE GROVE */}
          {activeTab === 'support' && (
            <div className="space-y-6">
              {/* Product Philosophy Notice Banner */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">✦</span>
                  <h3 className="pixel-font text-xs sm:text-sm text-emerald-300 uppercase tracking-wider font-bold">
                    Sapling's core experience is free to use.
                  </h3>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Sapling Groove is created as a calm, distraction-free sanctuary for focused work, student rituals, and mindful progress. 
                  Voluntary contributions sustain serverless compute, soundscape synthesis, and continuous maintenance without ads, trackers, or paywalls.
                </p>
              </div>

              {/* Tiers Overview */}
              <div className="space-y-3">
                <h4 className="pixel-font text-[9px] sm:text-[10px] text-zinc-400 uppercase tracking-[0.18em]">
                  VOLUNTARY CARETAKER TIERS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SUPPORT_TIERS.map((tier) => (
                    <div 
                      key={tier.id}
                      className="bg-black/50 border border-emerald-950/60 p-3.5 rounded-lg flex flex-col justify-between hover:border-emerald-700/50 transition-colors group"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="pixel-font text-[9px] text-emerald-400 uppercase tracking-wider">
                            {tier.botanicalArchetype}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-300 tabular-nums font-semibold">
                            {tier.amountLabel}
                          </span>
                        </div>
                        <h5 className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-300 transition-colors">
                          {tier.name}
                        </h5>
                        <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">
                          {tier.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* External Provider Button & Reassurance */}
              <div className="bg-black/40 border border-emerald-950/40 p-4 rounded-lg space-y-3">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-zinc-400">
                    <p className="font-semibold text-zinc-200">Zero Payment Credentials Stored</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      All checkouts are securely hosted on GitHub Sponsors. Supporting never gates or locks any features.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openExternalSupport()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-semibold pixel-font text-[11px] uppercase tracking-wider rounded transition-all active:scale-[0.98] whitespace-nowrap shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2"
                  >
                    <span>OPEN GITHUB SPONSORS</span>
                    <span className="text-xs">↗</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT & DIRECT LINKS */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="pixel-font text-xs sm:text-sm text-emerald-300 uppercase tracking-widest">
                  STEWARDSHIP & DIRECT CHANNELS
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sapling Groove is open and actively maintained. Connect directly for technical inquiries, contributions, or questions.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* GitHub Repository */}
                <a
                  href="https://github.com/aniruddhangujar/sapling-groove"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-black/50 border border-emerald-950/60 hover:border-emerald-500/50 p-3.5 rounded-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-emerald-400 text-base">⌥</span>
                      <div>
                        <div className="pixel-font text-[10px] text-zinc-200 group-hover:text-emerald-300 transition-colors uppercase tracking-wider">
                          GITHUB REPOSITORY
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          github.com/aniruddhangujar/sapling-groove
                        </div>
                      </div>
                    </div>
                    <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors text-sm">↗</span>
                  </div>
                </a>

                {/* GitHub Issues */}
                <a
                  href="https://github.com/aniruddhangujar/sapling-groove/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-black/50 border border-emerald-950/60 hover:border-emerald-500/50 p-3.5 rounded-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-emerald-400 text-base">⚠</span>
                      <div>
                        <div className="pixel-font text-[10px] text-zinc-200 group-hover:text-emerald-300 transition-colors uppercase tracking-wider">
                          ISSUE TRACKER & BUGS
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Track open defects, regression reports, and roadmap proposals
                        </div>
                      </div>
                    </div>
                    <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors text-sm">↗</span>
                  </div>
                </a>

                {/* Email Channel */}
                <a
                  href="mailto:aniruddhagujar@gmail.com"
                  className="block bg-black/50 border border-emerald-950/60 hover:border-emerald-500/50 p-3.5 rounded-lg transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-emerald-400 text-base">✉</span>
                      <div>
                        <div className="pixel-font text-[10px] text-zinc-200 group-hover:text-emerald-300 transition-colors uppercase tracking-wider">
                          CREATOR DIRECT MAIL
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          aniruddhagujar@gmail.com
                        </div>
                      </div>
                    </div>
                    <span className="text-zinc-600 group-hover:text-emerald-400 transition-colors text-sm">↗</span>
                  </div>
                </a>
              </div>

              <div className="pt-2 text-[10px] text-zinc-500 border-t border-emerald-950/40 flex justify-between items-center">
                <span>Direct replies typically within 24–48 hours.</span>
                <span className="font-mono">Sapling v1.1.0</span>
              </div>
            </div>
          )}

        </div>

        {/* Footer info strip */}
        <footer className="px-4 sm:px-6 py-2.5 border-t border-emerald-950/40 bg-[#070a07] text-[10px] text-zinc-600 flex justify-between items-center shrink-0">
          <span className="pixel-font uppercase tracking-widest text-zinc-500">
            MINDFUL FOCUS ARCHITECTURE
          </span>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 pixel-font text-[9px] uppercase tracking-wider transition-colors"
          >
            [ ESC TO CLOSE ]
          </button>
        </footer>
      </div>
    </div>
  );
};
