import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  X,
  User,
  Check,
  Trash2,
  Users,
  Plus,
  Briefcase,
  MessageCircle,
  ChevronDown,
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import type { TonePreference, TeamMember } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const toneOptions: { value: TonePreference; label: string; description: string }[] = [
  { value: 'formal', label: 'Formal', description: 'Professional, structured language' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable tone' },
  { value: 'concise', label: 'Concise', description: 'Brief, to-the-point messages' },
  { value: 'detailed', label: 'Detailed', description: 'Thorough explanations' },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    userName,
    setUserName,
    clearUserName,
    userProfile,
    updateProfile,
    addTeamMember,
    removeTeamMember,
  } = useUser();

  const [newName, setNewName] = useState(userName || '');
  const [nicknames, setNicknames] = useState(userProfile.nicknames.join(', '));
  const [role, setRole] = useState(userProfile.role);
  const [reportsTo, setReportsTo] = useState(userProfile.reportsTo.join(', '));
  const [saved, setSaved] = useState(false);

  // New team member form
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberNicknames, setNewMemberNicknames] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [showAddMember, setShowAddMember] = useState(false);

  const handleSaveProfile = () => {
    updateProfile({
      name: newName.trim(),
      nicknames: nicknames
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
      role: role.trim(),
      reportsTo: reportsTo
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddTeamMember = () => {
    if (newMemberName.trim()) {
      addTeamMember({
        name: newMemberName.trim(),
        nicknames: newMemberNicknames
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean),
        role: newMemberRole.trim() || undefined,
      });
      setNewMemberName('');
      setNewMemberNicknames('');
      setNewMemberRole('');
      setShowAddMember(false);
    }
  };

  const handleReset = () => {
    if (
      confirm(
        "This will reset your profile. You'll need to set up your name again. Continue?"
      )
    ) {
      clearUserName();
      onClose();
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="settings-header">
              <div className="settings-title">
                <Settings size={20} />
                <h3>Settings</h3>
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

            <div className="settings-content">
              {/* Profile Section */}
              <div className="settings-section">
                <h4>Profile</h4>
                <p className="section-description">
                  Personalize how TaskMap understands and addresses you.
                </p>

                <div className="settings-field">
                  <label>Display name</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Your name"
                      maxLength={30}
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>Nicknames (comma-separated)</label>
                  <div className="input-wrapper">
                    <User size={16} className="input-icon" />
                    <input
                      type="text"
                      value={nicknames}
                      onChange={(e) => setNicknames(e.target.value)}
                      placeholder="e.g., John, Johnny, JD"
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>Your role</label>
                  <div className="input-wrapper">
                    <Briefcase size={16} className="input-icon" />
                    <input
                      type="text"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g., Frontend Developer"
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label>Reports to (comma-separated)</label>
                  <div className="input-wrapper">
                    <Users size={16} className="input-icon" />
                    <input
                      type="text"
                      value={reportsTo}
                      onChange={(e) => setReportsTo(e.target.value)}
                      placeholder="e.g., Manager name, Lead name"
                    />
                  </div>
                </div>
              </div>

              {/* Tone Preference */}
              <div className="settings-section">
                <h4>Writing tone</h4>
                <p className="section-description">
                  Choose how AI rewrites your messages.
                </p>
                <div className="tone-options">
                  {toneOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      className={`tone-option ${
                        userProfile.tonePreference === option.value ? 'active' : ''
                      }`}
                      onClick={() => updateProfile({ tonePreference: option.value })}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="tone-label">{option.label}</span>
                      <span className="tone-description">{option.description}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Team Members */}
              <div className="settings-section">
                <div className="section-header-row">
                  <h4>Team members</h4>
                  <motion.button
                    className="add-member-btn"
                    onClick={() => setShowAddMember(!showAddMember)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Plus size={14} />
                    Add
                  </motion.button>
                </div>
                <p className="section-description">
                  Add team members to help AI understand task assignments.
                </p>

                <AnimatePresence>
                  {showAddMember && (
                    <motion.div
                      className="add-member-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="settings-field">
                        <input
                          type="text"
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                      <div className="settings-field">
                        <input
                          type="text"
                          value={newMemberNicknames}
                          onChange={(e) => setNewMemberNicknames(e.target.value)}
                          placeholder="Nicknames (comma-separated)"
                        />
                      </div>
                      <div className="settings-field">
                        <input
                          type="text"
                          value={newMemberRole}
                          onChange={(e) => setNewMemberRole(e.target.value)}
                          placeholder="Role (optional)"
                        />
                      </div>
                      <motion.button
                        className="save-btn"
                        onClick={handleAddTeamMember}
                        disabled={!newMemberName.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus size={14} />
                        Add member
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {userProfile.teamMembers.length > 0 ? (
                  <div className="team-list">
                    {userProfile.teamMembers.map((member, idx) => (
                      <motion.div
                        key={idx}
                        className="team-member"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <div className="member-info">
                          <span className="member-name">{member.name}</span>
                          {member.role && (
                            <span className="member-role">{member.role}</span>
                          )}
                          {member.nicknames.length > 0 && (
                            <span className="member-nicknames">
                              ({member.nicknames.join(', ')})
                            </span>
                          )}
                        </div>
                        <motion.button
                          className="remove-member-btn"
                          onClick={() => removeTeamMember(member.name)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <X size={14} />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="no-members">No team members added yet</p>
                )}
              </div>

              {/* Save Profile Button */}
              <motion.button
                className="save-profile-btn"
                onClick={handleSaveProfile}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {saved ? (
                  <>
                    <Check size={16} />
                    Saved!
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Save profile
                  </>
                )}
              </motion.button>

              {/* Danger Zone */}
              <div className="settings-section danger">
                <h4>Reset profile</h4>
                <p className="section-description">
                  Start fresh with a new onboarding experience.
                </p>
                <motion.button
                  className="reset-btn"
                  onClick={handleReset}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 size={14} />
                  Reset profile
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
