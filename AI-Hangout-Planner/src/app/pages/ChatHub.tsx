import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { MessageCircle, LogOut } from 'lucide-react';

export function ChatHub() {
  const navigate = useNavigate();
  const { currentUser, groups, setCurrentUser } = useApp();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl mb-1">Chat Hub</h1>
            <p className="text-gray-600">Welcome, {currentUser?.name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="space-y-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/group/${group.id}`)}
            >
              <div className="flex items-start gap-3">
                <div className="bg-gradient-to-br from-purple-400 to-blue-400 rounded-full p-3">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold truncate">{group.name}</h3>
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      {formatTimestamp(group.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm truncate">{group.lastMessage}</p>
                  <p className="text-xs text-gray-400 mt-1">{group.members.length} members</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
