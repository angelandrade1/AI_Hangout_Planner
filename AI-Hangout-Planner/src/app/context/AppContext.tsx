import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  hangoutId?: string;
}

export interface HangoutPreference {
  userId: string;
  userName: string;
  time: string;
  vibe: string;
  location: string;
  customSuggestions: string;
}

export interface Hangout {
  id: string;
  groupId: string;
  preferences: HangoutPreference[];
  aiSuggestion?: string;
  votes: { userId: string; vote: 'like' | 'nah' }[];
  userChanges?: string;
  status: 'collecting' | 'voting' | 'finalized';
}

export interface Group {
  id: string;
  name: string;
  members: string[];
  lastMessage?: string;
  timestamp?: Date;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  authToken: string | null;
  setAuthToken: (token: string | null) => void;
  groups: Group[];
  setGroups: (groups: Group[]) => void;
  messages: { [groupId: string]: Message[] };
  addMessage: (groupId: string, message: Message) => void;
  setGroupMessages: (groupId: string, messages: Message[]) => void;
  hangouts: Hangout[];
  addHangout: (hangout: Hangout) => void;
  updateHangout: (hangoutId: string, updates: Partial<Hangout>) => void;
  addPreferenceToHangout: (hangoutId: string, preference: HangoutPreference) => void;
  addVoteToHangout: (hangoutId: string, userId: string, vote: 'like' | 'nah') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<{ [groupId: string]: Message[] }>({});
  const [hangouts, setHangouts] = useState<Hangout[]>([]);

  const addMessage = (groupId: string, message: Message) => {
    setMessages(prev => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), message],
    }));
  };

  const setGroupMessages = (groupId: string, msgs: Message[]) => {
    setMessages(prev => ({ ...prev, [groupId]: msgs }));
  };

  const addHangout = (hangout: Hangout) => {
    setHangouts(prev => [...prev, hangout]);
  };

  const updateHangout = (hangoutId: string, updates: Partial<Hangout>) => {
    setHangouts(prev =>
      prev.map(h => (h.id === hangoutId ? { ...h, ...updates } : h))
    );
  };

  const addPreferenceToHangout = (hangoutId: string, preference: HangoutPreference) => {
    setHangouts(prev =>
      prev.map(h =>
        h.id === hangoutId
          ? {
              ...h,
              preferences: [...h.preferences.filter(p => p.userId !== preference.userId), preference],
            }
          : h
      )
    );
  };

  const addVoteToHangout = (hangoutId: string, userId: string, vote: 'like' | 'nah') => {
    setHangouts(prev =>
      prev.map(h =>
        h.id === hangoutId
          ? {
              ...h,
              votes: [...h.votes.filter(v => v.userId !== userId), { userId, vote }],
            }
          : h
      )
    );
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        authToken,
        setAuthToken,
        groups,
        setGroups,
        messages,
        addMessage,
        setGroupMessages,
        hangouts,
        addHangout,
        updateHangout,
        addPreferenceToHangout,
        addVoteToHangout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
