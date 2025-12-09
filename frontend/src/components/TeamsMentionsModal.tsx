import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Loader2,
  MessageSquare,
  Users,
  Hash,
  Clock,
  AlertCircle,
  Check,
  Sparkles,
  ExternalLink,
  Inbox,
  RefreshCw,
  User,
} from 'lucide-react';
import { teamsApi, taskApi } from '../api/client';
import { useUser } from '../contexts/UserContext';
import type { TeamsMention, TeamsMentionsResponse } from '../types';

interface TeamsMentionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCreated?: () => void;
}

export function TeamsMentionsModal({ isOpen, onClose, onTasksCreated }: TeamsMentionsModalProps) {
  const { userProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [mentions, setMentions] = useState<TeamsMention[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  const [mockMessage, setMockMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);

  const fetchMentions = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProcessSuccess(false);

    try {
      // Check if we have an access token in localStorage
      const accessToken = localStorage.getItem('teams_access_token');

      if (accessToken) {
        // Use authenticated endpoint
        try {
          const response: TeamsMentionsResponse = await teamsApi.getUserMentions(accessToken, 5);
          setMentions(response.mentions);
          setIsMockData(false);
          setMockMessage(null);
          // Select all by default
          setSelectedMentions(new Set(response.mentions.map((m) => m.id)));
          setLoading(false);
          return;
        } catch (tokenErr) {
          // Token might be expired, clear it and try OAuth again
          console.warn('Access token invalid or expired, initiating OAuth...');
          localStorage.removeItem('teams_access_token');
        }
      }

      // No token or token expired - initiate OAuth flow
      const authData = await teamsApi.getAuthUrl();

      // Store state for verification
      sessionStorage.setItem('teams_oauth_state', authData.state);

      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        authData.auth_url,
        'Microsoft Teams Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for postMessage from OAuth callback
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'TEAMS_AUTH_SUCCESS') {
          // Token successfully stored, refetch mentions
          window.removeEventListener('message', handleMessage);
          fetchMentions();
        } else if (event.data.type === 'TEAMS_AUTH_ERROR') {
          window.removeEventListener('message', handleMessage);
          setError(`Authentication failed: ${event.data.error || 'Unknown error'}`);
          setLoading(false);
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: Check for token periodically (in case postMessage fails)
      // Note: We don't check authWindow.closed due to COOP restrictions
      const pollTimer = setInterval(() => {
        const newToken = localStorage.getItem('teams_access_token');
        if (newToken) {
          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          fetchMentions();
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        window.removeEventListener('message', handleMessage);
        const finalToken = localStorage.getItem('teams_access_token');
        if (!finalToken) {
          setError('Authentication timed out.');
          setLoading(false);
        }
      }, 300000);

    } catch (err) {
      console.error('Failed to fetch Teams mentions:', err);
      setError('Failed to fetch Teams mentions. Please try again.');
      setLoading(false);
    }
  }, []);

  // Fetch mentions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMentions();
    } else {
      // Reset state when closing
      setMentions([]);
      setSelectedMentions(new Set());
      setError(null);
      setProcessSuccess(false);
    }
  }, [isOpen, fetchMentions]);

  const toggleMention = useCallback((id: string) => {
    setSelectedMentions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedMentions(new Set(mentions.map((m) => m.id)));
  }, [mentions]);

  const deselectAll = useCallback(() => {
    setSelectedMentions(new Set());
  }, []);

  const handleSendToAI = useCallback(async () => {
    if (selectedMentions.size === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Combine selected mentions into text for AI analysis
      const selectedMessages = mentions
        .filter((m) => selectedMentions.has(m.id))
        .map((m) => {
          const source = m.is_from_channel
            ? `[From: ${m.sender_name} in ${m.team_name}/${m.channel_name}]`
            : `[From: ${m.sender_name} in ${m.chat_name || 'Direct Message'}]`;
          return `${source}\n${m.message_text}`;
        })
        .join('\n\n---\n\n');

      // Use the existing message analysis endpoint
      const result = await taskApi.analyzeMessages(selectedMessages, userProfile);

      if (result.tasks && result.tasks.length > 0) {
        // Parse the extracted tasks
        const taskText = result.tasks.map((t) => t.text).join('\n');
        await taskApi.parse(taskText);
        setProcessSuccess(true);

        // Notify parent to refresh tasks
        if (onTasksCreated) {
          onTasksCreated();
        }

        // Close modal after short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('No actionable tasks found in the selected messages.');
      }
    } catch (err) {
      console.error('Failed to process mentions with AI:', err);
      setError('Failed to process messages. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedMentions, mentions, userProfile, onTasksCreated, onClose]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="teams-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="teams-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="teams-modal-header">
              <div className="teams-modal-title">
                <MessageSquare size={20} />
                <h3>Teams Mentions</h3>
                {isMockData && <span className="demo-badge">Demo Data</span>}
              </div>
              <motion.button
                className="close-btn"
                onClick={onClose}
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </div>

            <div className="teams-modal-content custom-scrollbar">
              {/* Mock Data Notice */}
              {isMockData && mockMessage && (
                <motion.div
                  className="teams-mock-notice"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={16} />
                  <span>{mockMessage}</span>
                </motion.div>
              )}

              {/* Loading State */}
              {loading && (
                <div className="teams-loading">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={32} />
                  </motion.div>
                  <p>Fetching your mentions...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <motion.div
                  className="teams-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                  <motion.button
                    onClick={fetchMentions}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <RefreshCw size={14} />
                    Retry
                  </motion.button>
                </motion.div>
              )}

              {/* Success State */}
              {processSuccess && (
                <motion.div
                  className="teams-success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Check size={32} />
                  <p>Tasks created successfully!</p>
                </motion.div>
              )}

              {/* Empty State */}
              {!loading && !error && mentions.length === 0 && (
                <div className="teams-empty">
                  <Inbox size={48} />
                  <p>No mentions found</p>
                  <span>You don't have any recent @mentions in Teams</span>
                </div>
              )}

              {/* Mentions List */}
              {!loading && !processSuccess && mentions.length > 0 && (
                <>
                  <div className="teams-selection-controls">
                    <span className="selection-count">
                      {selectedMentions.size} of {mentions.length} selected
                    </span>
                    <div className="selection-buttons">
                      <motion.button
                        onClick={selectAll}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={selectedMentions.size === mentions.length}
                      >
                        Select All
                      </motion.button>
                      <motion.button
                        onClick={deselectAll}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={selectedMentions.size === 0}
                      >
                        Deselect All
                      </motion.button>
                    </div>
                  </div>

                  <div className="teams-mentions-list">
                    {mentions.map((mention, idx) => (
                      <motion.div
                        key={mention.id}
                        className={`teams-mention-item ${selectedMentions.has(mention.id) ? 'selected' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => toggleMention(mention.id)}
                      >
                        <div className="mention-checkbox">
                          <motion.div
                            className={`checkbox ${selectedMentions.has(mention.id) ? 'checked' : ''}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {selectedMentions.has(mention.id) && <Check size={12} />}
                          </motion.div>
                        </div>

                        <div className="mention-content">
                          <div className="mention-header">
                            <div className="mention-sender">
                              <User size={14} />
                              <span className="sender-name">{mention.sender_name}</span>
                            </div>
                            <div className="mention-meta">
                              {mention.is_from_channel ? (
                                <>
                                  <span className="meta-item">
                                    <Users size={12} />
                                    {mention.team_name}
                                  </span>
                                  <span className="meta-item">
                                    <Hash size={12} />
                                    {mention.channel_name}
                                  </span>
                                </>
                              ) : (
                                <span className="meta-item">
                                  <MessageSquare size={12} />
                                  {mention.chat_name || 'Direct Message'}
                                </span>
                              )}
                              <span className="meta-item timestamp">
                                <Clock size={12} />
                                {formatTimestamp(mention.timestamp)}
                              </span>
                            </div>
                          </div>

                          <p className="mention-text">{mention.message_text}</p>

                          {mention.web_url && (
                            <a
                              href={mention.web_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mention-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink size={12} />
                              Open in Teams
                            </a>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            {!loading && !processSuccess && mentions.length > 0 && (
              <div className="teams-modal-footer">
                <motion.button
                  className="teams-cancel-btn"
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className="teams-process-btn"
                  onClick={handleSendToAI}
                  disabled={selectedMentions.size === 0 || isProcessing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProcessing ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ display: 'flex' }}
                      >
                        <Loader2 size={16} />
                      </motion.span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Send to AI for Cleaning ({selectedMentions.size})
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
