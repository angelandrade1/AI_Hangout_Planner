import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, Message } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { ArrowLeft, Send, Sparkles, ThumbsUp, Users } from 'lucide-react';
import { HangoutPreferencesModal } from '../components/HangoutPreferencesModal';
import { VotingModal } from '../components/VotingModal';
import { api } from '../services/api';

export function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { currentUser, groups, messages, addMessage, setGroupMessages, hangouts, addHangout } = useApp();
  const [messageInput, setMessageInput] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showVoting, setShowVoting] = useState(false);
  const [activeHangoutId, setActiveHangoutId] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<{ [userId: string]: string }>({});
  const [memberCount, setMemberCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const group = groups.find((g) => g.id === groupId);
  const groupMessages = groupId ? messages[groupId] || [] : [];
  const groupHangouts = hangouts.filter((h) => h.groupId === groupId);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    if (!groupId) return;

    api.openChat(groupId).then((data) => {
      // Build userId -> displayName map from members
      const map: { [userId: string]: string } = {};
      data.members.forEach((m) => {
        map[m.user_id] =
          m.username ||
          `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() ||
          m.email ||
          'Unknown';
      });
      setUserMap(map);
      setMemberCount(data.members.length);

      // Map backend messages to frontend Message format
      const mapped: Message[] = data.messages.map((msg) => ({
        id: msg.message_id,
        userId: msg.user_id,
        userName: map[msg.user_id] || 'Unknown',
        content: msg.content,
        type: 'user',
        timestamp: new Date(msg.created_at),
      }));
      setGroupMessages(groupId, mapped);
    }).catch(console.error);
  }, [groupId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [groupMessages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !groupId || !currentUser) return;

    const content = messageInput;
    setMessageInput('');

    try {
      const res = await api.sendMessage({ chat_id: groupId, user_id: currentUser.id, content });
      addMessage(groupId, {
        id: res.data.message_id,
        userId: currentUser.id,
        userName: currentUser.name,
        content: res.data.content,
        type: 'user',
        timestamp: new Date(res.data.created_at),
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessageInput(content);
    }
  };

  const handleStartHangout = async () => {
    if (!groupId || !currentUser) return;

    try {
      const res = await api.createHangout({ chat_id: groupId });
      const hangoutId = res.hangout.hangout_id;

      addHangout({
        id: hangoutId,
        groupId,
        preferences: [],
        votes: [],
        status: 'collecting',
      });

      addMessage(groupId, {
        id: `sys${Date.now()}`,
        userId: 'system',
        userName: 'System',
        content: '🎉 Hangout planning started! Click below to enter your preferences.',
        type: 'system',
        timestamp: new Date(),
        hangoutId,
      });
    } catch (err) {
      console.error('Failed to create hangout:', err);
    }
  };

  const handleOpenPreferences = (hangoutId: string) => {
    setActiveHangoutId(hangoutId);
    setShowPreferences(true);
  };

  const handleStartVote = (hangoutId: string) => {
    setActiveHangoutId(hangoutId);
    setShowVoting(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getHangoutForMessage = (hangoutId?: string) => {
    if (!hangoutId) return null;
    return hangouts.find((h) => h.id === hangoutId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/chat-hub')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-semibold">{group?.name}</h2>
            <p className="text-xs text-gray-500">{memberCount} members</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {groupMessages.map((message) => {
            const hangout = getHangoutForMessage(message.hangoutId);

            return (
              <div
                key={message.id}
                className={`flex ${message.userId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'system' ? (
                  <Card className="p-4 max-w-2xl bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200">
                    <div className="flex items-start gap-2 mb-2">
                      <Users className="w-5 h-5 text-orange-600" />
                      <p className="font-semibold text-orange-900">Hangout Planning</p>
                    </div>
                    <p className="text-gray-800 mb-3">{message.content}</p>

                    {hangout && hangout.status === 'collecting' && (
                      <div className="space-y-2">
                        <Button
                          onClick={() => handleOpenPreferences(message.hangoutId!)}
                          variant="outline"
                          className="w-full"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Enter Your Preferences
                        </Button>

                        {hangout.preferences.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-orange-200">
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Preferences submitted ({hangout.preferences.length}/{memberCount}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {hangout.preferences.map((pref, idx) => (
                                <span key={idx} className="text-xs bg-white px-2 py-1 rounded-full border border-orange-200">
                                  ✓ {pref.userName}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ) : message.type === 'ai' ? (
                  <Card className="p-4 max-w-2xl bg-gradient-to-br from-purple-100 to-blue-100 border-purple-200">
                    <div className="flex items-start gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <p className="font-semibold text-purple-900">AI Suggestion</p>
                    </div>
                    <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                    {message.hangoutId && (
                      <Button
                        onClick={() => handleStartVote(message.hangoutId!)}
                        className="mt-3"
                        variant="outline"
                      >
                        <ThumbsUp className="w-4 h-4 mr-2" />
                        Start Vote
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className={`max-w-md ${message.userId === currentUser?.id ? 'text-right' : ''}`}>
                    {message.userId !== currentUser?.id && (
                      <p className="text-xs text-gray-500 mb-1 px-3">{message.userName}</p>
                    )}
                    <div
                      className={`inline-block px-4 py-2 rounded-2xl ${
                        message.userId === currentUser?.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <p>{message.content}</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 px-3">{formatTime(message.timestamp)}</p>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2 mb-2">
            <Button onClick={handleStartHangout} className="flex-shrink-0" variant="outline">
              <Sparkles className="w-4 h-4 mr-2" />
              Start Hangout Planning
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeHangoutId && (
        <>
          <HangoutPreferencesModal
            open={showPreferences}
            onClose={() => setShowPreferences(false)}
            hangoutId={activeHangoutId}
            groupId={groupId!}
          />
          <VotingModal
            open={showVoting}
            onClose={() => setShowVoting(false)}
            hangoutId={activeHangoutId}
            groupId={groupId!}
          />
        </>
      )}
    </div>
  );
}
