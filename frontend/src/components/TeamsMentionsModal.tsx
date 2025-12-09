import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Filter,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { teamsApi, taskApi } from "../api/client";
import { useUser } from "../contexts/UserContext";
import type { TeamsMention, TeamsMentionsResponse } from "../types";

interface TeamsMentionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksCreated?: () => void;
}

export function TeamsMentionsModal({
  isOpen,
  onClose,
  onTasksCreated,
}: TeamsMentionsModalProps) {
  const { userProfile } = useUser();
  const [loading, setLoading] = useState(false);
  const [mentions, setMentions] = useState<TeamsMention[]>([]);
  const [selectedMentions, setSelectedMentions] = useState<Set<string>>(
    new Set()
  );
  const [error, setError] = useState<string | null>(null);
  const [isMockData, setIsMockData] = useState(false);
  const [mockMessage, setMockMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  const [mentionLimit, setMentionLimit] = useState(25);

  // Filter state
  const [showFilterPopup, setShowFilterPopup] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set());
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [selectedSenders, setSelectedSenders] = useState<Set<string>>(new Set());
  const [selectedGroupChats, setSelectedGroupChats] = useState<Set<string>>(new Set());
  const [selectedMeetingChats, setSelectedMeetingChats] = useState<Set<string>>(new Set());
  const [selectedIndividualChats, setSelectedIndividualChats] = useState<Set<string>>(new Set());
  const [allMentions, setAllMentions] = useState<TeamsMention[]>([]);

  // Sorting state
  const [sortBy, setSortBy] = useState<'created' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchMentions = useCallback(async (limit?: number) => {
    const fetchLimit = limit ?? mentionLimit;
    setLoading(true);
    setError(null);
    setProcessSuccess(false);

    try {
      // Check if we have an access token in localStorage
      const accessToken = localStorage.getItem("teams_access_token");

      if (accessToken) {
        // Use authenticated endpoint
        try {
          const response: TeamsMentionsResponse =
            await teamsApi.getUserMentions(accessToken, fetchLimit);
          setAllMentions(response.mentions);
          setMentions(response.mentions);
          setIsMockData(false);
          setMockMessage(null);
          // Select all by default
          setSelectedMentions(new Set(response.mentions.map((m) => m.id)));
          setLoading(false);
          return;
        } catch (tokenErr) {
          // Token might be expired, clear it and try OAuth again
          console.warn("Access token invalid or expired, initiating OAuth...");
          localStorage.removeItem("teams_access_token");
        }
      }

      // No token or token expired - initiate OAuth flow
      const authData = await teamsApi.getAuthUrl();

      // Store state for verification
      sessionStorage.setItem("teams_oauth_state", authData.state);

      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        authData.auth_url,
        "Microsoft Teams Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for postMessage from OAuth callback
      const handleMessage = (event: MessageEvent) => {
        // Verify origin for security
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "TEAMS_AUTH_SUCCESS") {
          // Token successfully stored, refetch mentions
          window.removeEventListener("message", handleMessage);
          fetchMentions();
        } else if (event.data.type === "TEAMS_AUTH_ERROR") {
          window.removeEventListener("message", handleMessage);
          setError(
            `Authentication failed: ${event.data.error || "Unknown error"}`
          );
          setLoading(false);
        }
      };

      window.addEventListener("message", handleMessage);

      // Fallback: Check for token periodically (in case postMessage fails)
      // Note: We don't check authWindow.closed due to COOP restrictions
      const pollTimer = setInterval(() => {
        const newToken = localStorage.getItem("teams_access_token");
        if (newToken) {
          clearInterval(pollTimer);
          window.removeEventListener("message", handleMessage);
          fetchMentions();
        }
      }, 1000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        window.removeEventListener("message", handleMessage);
        const finalToken = localStorage.getItem("teams_access_token");
        if (!finalToken) {
          setError("Authentication timed out.");
          setLoading(false);
        }
      }, 300000);
    } catch (err) {
      console.error("Failed to fetch Teams mentions:", err);
      setError("Failed to fetch Teams mentions. Please try again.");
      setLoading(false);
    }
  }, [mentionLimit]);

  const loadDemoData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setProcessSuccess(false);

    try {
      const response: TeamsMentionsResponse = await teamsApi.getDemoMentions(mentionLimit);
      setAllMentions(response.mentions);
      setMentions(response.mentions);
      setIsMockData(true);
      setMockMessage(response.message || 'Demo data loaded - no authentication required');
      // Select all by default
      setSelectedMentions(new Set(response.mentions.map((m) => m.id)));
    } catch (err) {
      console.error('Failed to load demo mentions:', err);
      setError('Failed to load demo data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [mentionLimit]);

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
            : `[From: ${m.sender_name} in ${m.chat_name || "Direct Message"}]`;
          return `${source}\n${m.message_text}`;
        })
        .join("\n\n---\n\n");

      // Use the existing message analysis endpoint
      const result = await taskApi.analyzeMessages(
        selectedMessages,
        userProfile
      );

      if (result.tasks && result.tasks.length > 0) {
        // Parse the extracted tasks
        const taskText = result.tasks.map((t) => t.text).join("\n");
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
        setError("No actionable tasks found in the selected messages.");
      }
    } catch (err) {
      console.error("Failed to process mentions with AI:", err);
      setError("Failed to process messages. Please try again.");
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

  // Extract unique teams, channels, chats, and senders from all mentions
  const filterOptions = useMemo(() => {
    const teams = new Set<string>();
    const channels = new Map<string, Set<string>>(); // team -> channels
    const chats = new Set<string>();
    const senders = new Set<string>();
    const groupChats = new Set<string>();
    const meetingChats = new Set<string>();
    const individualChats = new Set<string>();

    allMentions.forEach((mention) => {
      senders.add(mention.sender_name);

      if (mention.is_from_channel) {
        teams.add(mention.team_name);
        if (!channels.has(mention.team_name)) {
          channels.set(mention.team_name, new Set());
        }
        channels.get(mention.team_name)!.add(mention.channel_name);
      } else if (mention.chat_name) {
        chats.add(mention.chat_name);

        // Categorize by chat type
        if (mention.chat_type === 'group') {
          groupChats.add(mention.chat_name);
        } else if (mention.chat_type === 'meeting') {
          meetingChats.add(mention.chat_name);
        } else if (mention.chat_type === 'individual') {
          individualChats.add(mention.chat_name);
        }
      }
    });

    return {
      teams: Array.from(teams).sort(),
      channels,
      chats: Array.from(chats).sort(),
      senders: Array.from(senders).sort(),
      groupChats: Array.from(groupChats).sort(),
      meetingChats: Array.from(meetingChats).sort(),
      individualChats: Array.from(individualChats).sort(),
    };
  }, [allMentions]);

  // Generate AI summary sentence based on active filters
  const filterSummary = useMemo(() => {
    const parts: string[] = [];

    // Count of messages
    const messageCount = mentions.length;
    const totalCount = allMentions.length;

    // Determine if filters are active
    const hasFilters = selectedTeams.size > 0 || selectedChannels.size > 0 || selectedChats.size > 0 ||
                       selectedSenders.size > 0 || selectedGroupChats.size > 0 || selectedMeetingChats.size > 0 ||
                       selectedIndividualChats.size > 0;

    if (!hasFilters) {
      return `Showing all ${messageCount} message${messageCount !== 1 ? 's' : ''}.`;
    }

    // Build description parts
    parts.push(`Showing ${messageCount} of ${totalCount} message${messageCount !== 1 ? 's' : ''}`);

    // Senders
    if (selectedSenders.size > 0) {
      const senderNames = Array.from(selectedSenders).slice(0, 3).join(', ');
      if (selectedSenders.size > 3) {
        parts.push(`from ${senderNames} and ${selectedSenders.size - 3} other${selectedSenders.size - 3 !== 1 ? 's' : ''}`);
      } else if (selectedSenders.size === 1) {
        parts.push(`from ${senderNames}`);
      } else {
        parts.push(`from ${senderNames}`);
      }
    }

    // Chat types
    const chatTypes: string[] = [];
    if (selectedGroupChats.size > 0) {
      chatTypes.push(`${selectedGroupChats.size} group chat${selectedGroupChats.size !== 1 ? 's' : ''}`);
    }
    if (selectedMeetingChats.size > 0) {
      chatTypes.push(`${selectedMeetingChats.size} meeting chat${selectedMeetingChats.size !== 1 ? 's' : ''}`);
    }
    if (selectedIndividualChats.size > 0) {
      chatTypes.push(`${selectedIndividualChats.size} individual chat${selectedIndividualChats.size !== 1 ? 's' : ''}`);
    }

    if (chatTypes.length > 0) {
      parts.push(`in ${chatTypes.join(', ')}`);
    }

    // Teams and channels
    if (selectedTeams.size > 0) {
      const teamNames = Array.from(selectedTeams).slice(0, 2).join(', ');
      if (selectedTeams.size > 2) {
        parts.push(`in teams: ${teamNames} and ${selectedTeams.size - 2} more`);
      } else {
        parts.push(`in team${selectedTeams.size !== 1 ? 's' : ''}: ${teamNames}`);
      }
    }

    if (selectedChannels.size > 0) {
      parts.push(`with ${selectedChannels.size} channel${selectedChannels.size !== 1 ? 's' : ''} selected`);
    }

    return parts.join(' ') + '.';
  }, [mentions, allMentions, selectedTeams, selectedChannels, selectedChats, selectedSenders, selectedGroupChats, selectedMeetingChats, selectedIndividualChats]);

  // Apply filters to mentions
  useEffect(() => {
    let filtered = [...allMentions];

    const hasTeamFilter = selectedTeams.size > 0;
    const hasChannelFilter = selectedChannels.size > 0;
    const hasChatFilter = selectedChats.size > 0;
    const hasSenderFilter = selectedSenders.size > 0;
    const hasGroupChatFilter = selectedGroupChats.size > 0;
    const hasMeetingChatFilter = selectedMeetingChats.size > 0;
    const hasIndividualChatFilter = selectedIndividualChats.size > 0;

    if (hasTeamFilter || hasChannelFilter || hasChatFilter || hasSenderFilter || hasGroupChatFilter || hasMeetingChatFilter || hasIndividualChatFilter) {
      filtered = filtered.filter((mention) => {
        // Filter by sender
        if (hasSenderFilter && !selectedSenders.has(mention.sender_name)) {
          return false;
        }

        // Filter by channel messages
        if (mention.is_from_channel) {
          const matchesTeam = !hasTeamFilter || selectedTeams.has(mention.team_name);
          const matchesChannel = !hasChannelFilter || selectedChannels.has(`${mention.team_name}/${mention.channel_name}`);
          return matchesTeam && matchesChannel;
        }

        // Filter by chat messages with chat type
        if (mention.chat_name) {
          // Check legacy chat filter (if used)
          if (hasChatFilter && !selectedChats.has(mention.chat_name)) {
            return false;
          }

          // Check specific chat type filters
          if (mention.chat_type === 'group' && hasGroupChatFilter) {
            return selectedGroupChats.has(mention.chat_name);
          }
          if (mention.chat_type === 'meeting' && hasMeetingChatFilter) {
            return selectedMeetingChats.has(mention.chat_name);
          }
          if (mention.chat_type === 'individual' && hasIndividualChatFilter) {
            return selectedIndividualChats.has(mention.chat_name);
          }

          // If no specific chat type filter is active for this chat's type, include it
          if (!hasGroupChatFilter && !hasMeetingChatFilter && !hasIndividualChatFilter) {
            return true;
          }

          // If specific filters exist but this chat type doesn't match any, exclude
          return false;
        }

        return true;
      });
    }

    // Apply sorting
    if (sortBy === 'created') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.requested_at || a.timestamp).getTime();
        const dateB = new Date(b.requested_at || b.timestamp).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    setMentions(filtered);
    setSelectedMentions(new Set(filtered.map((m) => m.id)));
  }, [allMentions, selectedTeams, selectedChannels, selectedChats, selectedSenders, selectedGroupChats, selectedMeetingChats, selectedIndividualChats, sortBy, sortOrder]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className='teams-modal-overlay'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className='teams-modal'
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className='teams-modal-header'>
              <div className='teams-modal-title'>
                <MessageSquare size={20} />
                <h3>Teams Mentions</h3>
                {isMockData && <span className='demo-badge'>Demo Data</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Limit input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <label htmlFor="mention-limit" style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>
                    Limit:
                  </label>
                  <input
                    id="mention-limit"
                    type="number"
                    min="1"
                    max="20"
                    value={mentionLimit}
                    onChange={(e) => setMentionLimit(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                    style={{
                      width: '60px',
                      padding: '4px 8px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '13px',
                      textAlign: 'center',
                    }}
                  />
                </div>

                {/* Filter button */}
                <motion.button
                  onClick={() => setShowFilterPopup(!showFilterPopup)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title='Filter by teams, channels, and senders'
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: showFilterPopup ? 'linear-gradient(135deg, #a855f7, #9333ea)' : 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <Filter size={14} />
                  Filter{(selectedTeams.size + selectedChannels.size + selectedChats.size + selectedSenders.size + selectedGroupChats.size + selectedMeetingChats.size + selectedIndividualChats.size) > 0 && ` (${selectedTeams.size + selectedChannels.size + selectedChats.size + selectedSenders.size + selectedGroupChats.size + selectedMeetingChats.size + selectedIndividualChats.size})`}
                </motion.button>

                {/* Refetch button */}
                <motion.button
                  onClick={() => fetchMentions()}
                  disabled={loading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title='Refetch mentions with current limit'
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: loading ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'spinning' : ''} />
                  Refetch
                </motion.button>

                {/* Demo Mode button */}
                <motion.button
                  className='demo-data-btn'
                  onClick={loadDemoData}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title='Load demo data without authentication'
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, #a855f7, #9333ea)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} />
                  Demo
                </motion.button>

                {/* Close button */}
                <motion.button
                  className='close-btn'
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X size={18} />
                </motion.button>
              </div>
            </div>

            {/* Filter Popup */}
            <AnimatePresence>
              {showFilterPopup && (
                <motion.div
                  className='teams-filter-popup'
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                >
                  <div className='teams-filter-header'>
                    <div className='teams-filter-title'>
                      <Filter size={16} />
                      <span>Filter Messages</span>
                    </div>
                    <motion.button
                      onClick={() => setShowFilterPopup(false)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                    >
                      <X size={16} />
                    </motion.button>
                  </div>

                  <div className='teams-filter-content custom-scrollbar'>
                    {/* Teams Filter */}
                    {filterOptions.teams.length > 0 && (
                      <div className='teams-filter-section'>
                        <div className='teams-filter-section-title'>Teams</div>
                        <div className='teams-filter-options custom-scrollbar'>
                          {filterOptions.teams.map((team) => (
                            <div
                              key={team}
                              className={`teams-filter-option ${selectedTeams.has(team) ? 'selected' : ''}`}
                              onClick={() => {
                                const newSet = new Set(selectedTeams);
                                if (newSet.has(team)) {
                                  newSet.delete(team);
                                } else {
                                  newSet.add(team);
                                }
                                setSelectedTeams(newSet);
                              }}
                            >
                              <div className='teams-filter-checkbox'>
                                {selectedTeams.has(team) && <Check size={12} />}
                              </div>
                              <div className='teams-filter-label'>{team}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Channels Filter */}
                    {Array.from(filterOptions.channels.entries()).length > 0 && (
                      <div className='teams-filter-section'>
                        <div className='teams-filter-section-title'>Channels</div>
                        <div className='teams-filter-options custom-scrollbar'>
                          {Array.from(filterOptions.channels.entries()).map(([team, channels]) => (
                            Array.from(channels).map((channel) => {
                              const channelKey = `${team}/${channel}`;
                              return (
                                <div
                                  key={channelKey}
                                  className={`teams-filter-option ${selectedChannels.has(channelKey) ? 'selected' : ''}`}
                                  onClick={() => {
                                    const newSet = new Set(selectedChannels);
                                    if (newSet.has(channelKey)) {
                                      newSet.delete(channelKey);
                                    } else {
                                      newSet.add(channelKey);
                                    }
                                    setSelectedChannels(newSet);
                                  }}
                                >
                                  <div className='teams-filter-checkbox'>
                                    {selectedChannels.has(channelKey) && <Check size={12} />}
                                  </div>
                                  <div className='teams-filter-label'>
                                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{team}</div>
                                    <div>{channel}</div>
                                  </div>
                                </div>
                              );
                            })
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Group Chats Filter */}
                    {filterOptions.groupChats.length > 0 && (
                      <div className='teams-filter-section'>
                        <div className='teams-filter-section-title'>
                          <Users size={14} style={{ marginRight: '4px' }} />
                          Group Chats
                        </div>
                        <div className='teams-filter-options custom-scrollbar'>
                          {filterOptions.groupChats.map((chat) => (
                            <div
                              key={chat}
                              className={`teams-filter-option ${selectedGroupChats.has(chat) ? 'selected' : ''}`}
                              onClick={() => {
                                const newSet = new Set(selectedGroupChats);
                                if (newSet.has(chat)) {
                                  newSet.delete(chat);
                                } else {
                                  newSet.add(chat);
                                }
                                setSelectedGroupChats(newSet);
                              }}
                            >
                              <div className='teams-filter-checkbox'>
                                {selectedGroupChats.has(chat) && <Check size={12} />}
                              </div>
                              <div className='teams-filter-label'>{chat}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meeting Chats Filter */}
                    {filterOptions.meetingChats.length > 0 && (
                      <div className='teams-filter-section'>
                        <div className='teams-filter-section-title'>
                          <MessageSquare size={14} style={{ marginRight: '4px' }} />
                          Meeting Chats
                        </div>
                        <div className='teams-filter-options custom-scrollbar'>
                          {filterOptions.meetingChats.map((chat) => (
                            <div
                              key={chat}
                              className={`teams-filter-option ${selectedMeetingChats.has(chat) ? 'selected' : ''}`}
                              onClick={() => {
                                const newSet = new Set(selectedMeetingChats);
                                if (newSet.has(chat)) {
                                  newSet.delete(chat);
                                } else {
                                  newSet.add(chat);
                                }
                                setSelectedMeetingChats(newSet);
                              }}
                            >
                              <div className='teams-filter-checkbox'>
                                {selectedMeetingChats.has(chat) && <Check size={12} />}
                              </div>
                              <div className='teams-filter-label'>{chat}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Individual Chats Filter */}
                    {filterOptions.individualChats.length > 0 && (
                      <div className='teams-filter-section'>
                        <div className='teams-filter-section-title'>
                          <User size={14} style={{ marginRight: '4px' }} />
                          Individual Chats
                        </div>
                        <div className='teams-filter-options custom-scrollbar'>
                          {filterOptions.individualChats.map((chat) => (
                            <div
                              key={chat}
                              className={`teams-filter-option ${selectedIndividualChats.has(chat) ? 'selected' : ''}`}
                              onClick={() => {
                                const newSet = new Set(selectedIndividualChats);
                                if (newSet.has(chat)) {
                                  newSet.delete(chat);
                                } else {
                                  newSet.add(chat);
                                }
                                setSelectedIndividualChats(newSet);
                              }}
                            >
                              <div className='teams-filter-checkbox'>
                                {selectedIndividualChats.has(chat) && <Check size={12} />}
                              </div>
                              <div className='teams-filter-label'>{chat}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Senders Filter */}
                    {filterOptions.senders.length > 0 && (
                      <div className='teams-filter-section'>
                        <div className='teams-filter-section-title'>Senders</div>
                        <div className='teams-filter-options custom-scrollbar'>
                          {filterOptions.senders.map((sender) => (
                            <div
                              key={sender}
                              className={`teams-filter-option ${selectedSenders.has(sender) ? 'selected' : ''}`}
                              onClick={() => {
                                const newSet = new Set(selectedSenders);
                                if (newSet.has(sender)) {
                                  newSet.delete(sender);
                                } else {
                                  newSet.add(sender);
                                }
                                setSelectedSenders(newSet);
                              }}
                            >
                              <div className='teams-filter-checkbox'>
                                {selectedSenders.has(sender) && <Check size={12} />}
                              </div>
                              <div className='teams-filter-label'>{sender}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className='teams-filter-footer'>
                    <motion.button
                      className='teams-filter-btn teams-filter-btn-clear'
                      onClick={() => {
                        setSelectedTeams(new Set());
                        setSelectedChannels(new Set());
                        setSelectedChats(new Set());
                        setSelectedSenders(new Set());
                        setSelectedGroupChats(new Set());
                        setSelectedMeetingChats(new Set());
                        setSelectedIndividualChats(new Set());
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Clear All
                    </motion.button>
                    <motion.button
                      className='teams-filter-btn teams-filter-btn-apply'
                      onClick={() => setShowFilterPopup(false)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Apply Filters
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Summary */}
            {filterSummary && (
              <div style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
                borderBottom: '1px solid var(--border-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}>
                <Sparkles size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                <span style={{ fontWeight: '500' }}>{filterSummary}</span>
              </div>
            )}

            <div className='teams-modal-content custom-scrollbar'>
              {/* Mock Data Notice */}
              {isMockData && mockMessage && (
                <motion.div
                  className='teams-mock-notice'
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={16} />
                  <span>{mockMessage}</span>
                </motion.div>
              )}

              {/* Loading State */}
              {loading && (
                <div className='teams-loading'>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 size={32} />
                  </motion.div>
                  <p>Fetching your mentions...</p>
                </div>
              )}

              {/* Error State */}
              {error && !loading && (
                <motion.div
                  className='teams-error'
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
                  className='teams-success'
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Check size={32} />
                  <p>Tasks created successfully!</p>
                </motion.div>
              )}

              {/* Empty State */}
              {!loading && !error && mentions.length === 0 && (
                <div className='teams-empty'>
                  <Inbox size={48} />
                  <p>No mentions found</p>
                  <span>You don't have any recent @mentions in Teams</span>
                </div>
              )}

              {/* Mentions List */}
              {!loading && !processSuccess && mentions.length > 0 && (
                <>
                  <div className='teams-selection-controls'>
                    <span className='selection-count'>
                      {selectedMentions.size} of {mentions.length} selected
                    </span>
                    <div className='selection-buttons'>
                      <motion.button
                        onClick={() => {
                          if (sortBy === 'created') {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('created');
                            setSortOrder('desc');
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title="Sort by created date"
                      >
                        {sortBy === 'created' ? (
                          sortOrder === 'desc' ? <ArrowDown size={14} /> : <ArrowUp size={14} />
                        ) : (
                          <Clock size={14} />
                        )}
                        Sort by Date
                      </motion.button>
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

                  <div className='teams-mentions-list'>
                    {mentions.map((mention, idx) => (
                      <motion.div
                        key={mention.id}
                        className={`teams-mention-item ${
                          selectedMentions.has(mention.id) ? "selected" : ""
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => toggleMention(mention.id)}
                      >
                        <div className='mention-checkbox'>
                          <motion.div
                            className={`checkbox ${
                              selectedMentions.has(mention.id) ? "checked" : ""
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {selectedMentions.has(mention.id) && (
                              <Check size={12} />
                            )}
                          </motion.div>
                        </div>

                        <div className='mention-content'>
                          <div className='mention-header'>
                            <div className='mention-sender'>
                              <User size={14} />
                              <span className='sender-name'>
                                {mention.sender_name}
                              </span>
                            </div>
                            <div className='mention-meta'>
                              {mention.is_from_channel ? (
                                <>
                                  <span className='meta-item'>
                                    <Users size={12} />
                                    {mention.team_name}
                                  </span>
                                  <span className='meta-item'>
                                    <Hash size={12} />
                                    {mention.channel_name}
                                  </span>
                                </>
                              ) : (
                                <span className='meta-item'>
                                  <MessageSquare size={12} />
                                  {mention.chat_name || "Direct Message"}
                                </span>
                              )}
                              <span className='meta-item timestamp'>
                                <Clock size={12} />
                                Sent: {formatTimestamp(mention.timestamp)}
                              </span>
                              {mention.requested_at && (
                                <span className='meta-item timestamp'>
                                  <Clock size={12} />
                                  Created: {formatTimestamp(mention.requested_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className='mention-text'>{mention.message_text}</p>

                          {/* Additional metadata row */}
                          <div className='mention-footer'>
                            <span className='meta-item'>
                              <User size={12} />
                              Sent by: {mention.sender_name}
                            </span>
                            {mention.requested_by && (
                              <span className='meta-item'>
                                <User size={12} />
                                Added by: {mention.requested_by}
                              </span>
                            )}
                          </div>

                          {mention.web_url && (
                            <a
                              href={mention.web_url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='mention-link'
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
              <div className='teams-modal-footer'>
                <motion.button
                  className='teams-cancel-btn'
                  onClick={onClose}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cancel
                </motion.button>
                <motion.button
                  className='teams-process-btn'
                  onClick={handleSendToAI}
                  disabled={selectedMentions.size === 0 || isProcessing}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isProcessing ? (
                    <>
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{ display: "flex" }}
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
