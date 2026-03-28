import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  displayName: string;
  password: string;
  avatar: string;
}

export interface Member {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  type: 'user' | 'ai' | 'system';
  timestamp: Date;
  LinkedUpId?: string;
}

export interface LinkedUpPreference {
  userId: string;
  userName: string;
  availabilityStart: string;
  availabilityEnd: string;
  vibe: string;
  location: string;
  customSuggestions: string;
}

export interface Vote {
  userId: string;
  userName: string;
  vote: 'like' | 'nah';
  timestamp: Date;
}

export interface VoteRound {
  roundNumber: number;
  votes: Vote[];
  result: 'passed' | 'failed' | 'pending';
  changes?: string;
}

export interface LinkedUp {
  id: string;
  groupId: string;
  preferences: LinkedUpPreference[];
  voteRounds: VoteRound[];
  currentRound: number;
  status: 'collecting' | 'voting' | 'finalized';
  finalizedAt?: Date;
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  inviteCode: string;
  createdBy: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export const VOTE_THRESHOLD = 0.6;

export interface VoteResult {
  status: 'waiting' | 'passed' | 'failed';
  likeCount: number;
  nahCount: number;
  totalVoted: number;
  totalMembers: number;
  likePercentage: number;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentUser: User | null;
  allUsers: User[];
  register: (username: string, displayName: string, password: string) => { success: boolean; error?: string };
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  groups: Group[];
  createGroup: (name: string) => Group;
  joinGroupByCode: (code: string) => { success: boolean; error?: string };
  addMemberByUsername: (groupId: string, username: string) => { success: boolean; error?: string };
  messages: { [groupId: string]: Message[] };
  addMessage: (groupId: string, message: Message) => void;
  replaceMessage: (groupId: string, id: string, newMsg: Message) => void;
  LinkedUps: LinkedUp[];
  addLinkedUp: (LinkedUp: LinkedUp) => void;
  updateLinkedUp: (LinkedUpId: string, updates: Partial<LinkedUp>) => void;
  addPreferenceToLinkedUp: (LinkedUpId: string, pref: LinkedUpPreference) => void;
  castVote: (LinkedUpId: string, userId: string, userName: string, vote: 'like' | 'nah', memberCount: number) => VoteResult;
  startNewVoteRound: (LinkedUpId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const AVATARS = ['🦊','🐼','🦋','🐬','🦁','🐸','🦄','🐧','🦎','🐙'];
const genId = () => Math.random().toString(36).slice(2, 10);
const genCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const SEED_USERS: User[] = [
  { id: 'u2', username: 'sarah', displayName: 'Sarah', password: 'pass', avatar: '🐼' },
  { id: 'u3', username: 'mike', displayName: 'Mike', password: 'pass', avatar: '🦁' },
  { id: 'u4', username: 'jordan', displayName: 'Jordan', password: 'pass', avatar: '🦋' },
  { id: 'u5', username: 'taylor', displayName: 'Taylor', password: 'pass', avatar: '🐬' },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(SEED_USERS);
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<{ [groupId: string]: Message[] }>({});
  const [LinkedUps, setLinkedUps] = useState<LinkedUp[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const register = (username: string, displayName: string, password: string) => {
    if (!username.trim() || !displayName.trim() || !password.trim())
      return { success: false, error: 'All fields are required.' };
    if (allUsers.find(u => u.username.toLowerCase() === username.toLowerCase()))
      return { success: false, error: 'Username already taken.' };
    const user: User = {
      id: genId(), username: username.toLowerCase(), displayName,
      password, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    };
    setAllUsers(prev => [...prev, user]);
    setCurrentUser(user);
    return { success: true };
  };

  const login = (username: string, password: string) => {
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!user) return { success: false, error: 'Invalid username or password.' };
    setCurrentUser(user);
    return { success: true };
  };

  const logout = () => setCurrentUser(null);

  const createGroup = (name: string): Group => {
    if (!currentUser) throw new Error('Not logged in');
    const group: Group = {
      id: genId(), name, inviteCode: genCode(),
      createdBy: currentUser.id,
      members: [{ id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatar: currentUser.avatar }],
      lastMessage: 'Group created!',
      lastMessageTime: new Date(),
    };
    setGroups(prev => [group, ...prev]);
    setMessages(prev => ({
      ...prev,
      [group.id]: [{ id: genId(), userId: 'system', userName: 'System', content: `${currentUser.displayName} created the group "${name}". Invite friends to get started!`, type: 'system', timestamp: new Date() }]
    }));
    return group;
  };

  const joinGroupByCode = (code: string) => {
    if (!currentUser) return { success: false, error: 'Not logged in' };
    const group = groups.find(g => g.inviteCode === code.toUpperCase());
    if (!group) return { success: false, error: 'Invalid invite code.' };
    if (group.members.find(m => m.id === currentUser.id)) return { success: false, error: 'You are already in this group.' };
    setGroups(prev => prev.map(g => g.id === group.id
      ? { ...g, members: [...g.members, { id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatar: currentUser.avatar }] }
      : g));
    addMessage(group.id, { id: genId(), userId: 'system', userName: 'System', content: `${currentUser.displayName} joined the group!`, type: 'system', timestamp: new Date() });
    return { success: true };
  };

  const addMemberByUsername = (groupId: string, username: string) => {
    const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return { success: false, error: `No user found with username "@${username}".` };
    const group = groups.find(g => g.id === groupId);
    if (!group) return { success: false, error: 'Group not found.' };
    if (group.members.find(m => m.id === user.id)) return { success: false, error: `${user.displayName} is already in this group.` };
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, members: [...g.members, { id: user.id, username: user.username, displayName: user.displayName, avatar: user.avatar }] }
      : g));
    addMessage(groupId, { id: genId(), userId: 'system', userName: 'System', content: `${user.displayName} was added to the group!`, type: 'system', timestamp: new Date() });
    return { success: true };
  };

  const addMessage = (groupId: string, message: Message) => {
    setMessages(prev => ({ ...prev, [groupId]: [...(prev[groupId] || []), message] }));
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, lastMessage: message.content.slice(0, 60), lastMessageTime: message.timestamp }
      : g));
  };

  const replaceMessage = (groupId: string, id: string, newMsg: Message) => {
    setMessages(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || []).map(m => m.id === id ? newMsg : m)
    }));
  };

  const addLinkedUp = (LinkedUp: LinkedUp) => setLinkedUps(prev => [...prev, LinkedUp]);

  const updateLinkedUp = (LinkedUpId: string, updates: Partial<LinkedUp>) =>
    setLinkedUps(prev => prev.map(h => h.id === LinkedUpId ? { ...h, ...updates } : h));

  const addPreferenceToLinkedUp = (LinkedUpId: string, pref: LinkedUpPreference) =>
    setLinkedUps(prev => prev.map(h => h.id === LinkedUpId
      ? { ...h, preferences: [...h.preferences.filter(p => p.userId !== pref.userId), pref] }
      : h));

  const startNewVoteRound = (LinkedUpId: string) =>
    setLinkedUps(prev => prev.map(h => h.id !== LinkedUpId ? h : {
      ...h,
      currentRound: h.currentRound + 1,
      voteRounds: [...h.voteRounds, { roundNumber: h.currentRound + 1, votes: [], result: 'pending' }],
      status: 'voting',
    }));

  const castVote = (LinkedUpId: string, userId: string, userName: string, vote: 'like' | 'nah', memberCount: number): VoteResult => {
    let result: VoteResult = { status: 'waiting', likeCount: 0, nahCount: 0, totalVoted: 0, totalMembers: memberCount, likePercentage: 0 };
    setLinkedUps(prev => prev.map(h => {
      if (h.id !== LinkedUpId) return h;
      const ri = h.voteRounds.findIndex(r => r.roundNumber === h.currentRound);
      if (ri === -1) return h;
      const round = h.voteRounds[ri];
      const updatedVotes: Vote[] = [...round.votes.filter(v => v.userId !== userId), { userId, userName, vote, timestamp: new Date() }];
      const likes = updatedVotes.filter(v => v.vote === 'like').length;
      const nahs = updatedVotes.filter(v => v.vote === 'nah').length;
      const total = updatedVotes.length;
      const likePct = likes / memberCount;
      const remaining = memberCount - total;
      const maxPossible = (likes + remaining) / memberCount;
      const passed = likePct >= VOTE_THRESHOLD;
      const failed = !passed && maxPossible < VOTE_THRESHOLD;
      result = { status: passed ? 'passed' : failed ? 'failed' : 'waiting', likeCount: likes, nahCount: nahs, totalVoted: total, totalMembers: memberCount, likePercentage: likePct };
      const roundResult: 'passed' | 'failed' | 'pending' = passed ? 'passed' : failed ? 'failed' : 'pending';
      const updatedRounds = h.voteRounds.map((r, i) => i === ri ? { ...r, votes: updatedVotes, result: roundResult } : r);
      return { ...h, voteRounds: updatedRounds, status: passed ? 'finalized' : h.status, finalizedAt: passed ? new Date() : undefined };
    }));
    return result;
  };

  return (
    <AppContext.Provider value={{ theme, toggleTheme, currentUser, allUsers, register, login, logout, groups, createGroup, joinGroupByCode, addMemberByUsername, messages, addMessage, replaceMessage, LinkedUps, addLinkedUp, updateLinkedUp, addPreferenceToLinkedUp, castVote, startNewVoteRound }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
