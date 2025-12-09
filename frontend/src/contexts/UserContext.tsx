import { createContext, useContext, useState, ReactNode } from 'react';
import type { UserProfile, TonePreference, TeamMember } from '../types';

interface UserContextType {
  userName: string | null;
  setUserName: (name: string) => void;
  clearUserName: () => void;
  isOnboarded: boolean;
  greeting: string;
  userProfile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addTeamMember: (member: TeamMember) => void;
  removeTeamMember: (name: string) => void;
  resetProfile: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const NAME_STORAGE_KEY = 'taskmap-user-name';
const PROFILE_STORAGE_KEY = 'taskmap-user-profile';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const defaultProfile: UserProfile = {
  name: '',
  nicknames: [],
  role: '',
  teamMembers: [],
  reportsTo: [],
  tonePreference: 'friendly',
};

function loadProfile(): UserProfile {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored) {
      return { ...defaultProfile, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return defaultProfile;
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userName, setUserNameState] = useState<string | null>(() => {
    return localStorage.getItem(NAME_STORAGE_KEY);
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const profile = loadProfile();
    // Sync name from old storage if needed
    const storedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (storedName && !profile.name) {
      profile.name = storedName;
    }
    return profile;
  });

  const setUserName = (name: string) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      localStorage.setItem(NAME_STORAGE_KEY, trimmedName);
      setUserNameState(trimmedName);
      // Also update profile
      setUserProfile((prev) => {
        const updated = { ...prev, name: trimmedName };
        saveProfile(updated);
        return updated;
      });
    }
  };

  const clearUserName = () => {
    localStorage.removeItem(NAME_STORAGE_KEY);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setUserNameState(null);
    setUserProfile(defaultProfile);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => {
      const updated = { ...prev, ...updates };
      saveProfile(updated);
      // Sync userName if name changed
      if (updates.name && updates.name !== prev.name) {
        localStorage.setItem(NAME_STORAGE_KEY, updates.name);
        setUserNameState(updates.name);
      }
      return updated;
    });
  };

  const addTeamMember = (member: TeamMember) => {
    setUserProfile((prev) => {
      const updated = {
        ...prev,
        teamMembers: [...prev.teamMembers, member],
      };
      saveProfile(updated);
      return updated;
    });
  };

  const removeTeamMember = (name: string) => {
    setUserProfile((prev) => {
      const updated = {
        ...prev,
        teamMembers: prev.teamMembers.filter((m) => m.name !== name),
      };
      saveProfile(updated);
      return updated;
    });
  };

  const resetProfile = () => {
    const name = userProfile.name;
    const reset = { ...defaultProfile, name };
    setUserProfile(reset);
    saveProfile(reset);
  };

  const isOnboarded = userName !== null && userName.length > 0;
  const greeting = getGreeting();

  return (
    <UserContext.Provider
      value={{
        userName,
        setUserName,
        clearUserName,
        isOnboarded,
        greeting,
        userProfile,
        updateProfile,
        addTeamMember,
        removeTeamMember,
        resetProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
