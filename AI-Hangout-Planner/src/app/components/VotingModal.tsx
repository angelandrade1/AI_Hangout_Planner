import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { ThumbsUp, ThumbsDown, Sparkles } from 'lucide-react';

interface VotingModalProps {
  open: boolean;
  onClose: () => void;
  hangoutId: string;
  groupId: string;
}

export function VotingModal({ open, onClose, hangoutId, groupId }: VotingModalProps) {
  const { currentUser, hangouts, addVoteToHangout, updateHangout, addMessage } = useApp();
  const [userChanges, setUserChanges] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  const hangout = hangouts.find((h) => h.id === hangoutId);
  const currentUserVote = hangout?.votes.find((v) => v.userId === currentUser?.id);

  const handleVote = (vote: 'like' | 'nah') => {
    if (!currentUser) return;

    addVoteToHangout(hangoutId, currentUser.id, vote);
    setHasVoted(true);

    // Check if voting is complete (simple majority for demo)
    const updatedHangout = hangouts.find((h) => h.id === hangoutId);
    if (updatedHangout) {
      const totalVotes = updatedHangout.votes.length + 1;
      const likeVotes = updatedHangout.votes.filter((v) => v.vote === 'like').length + (vote === 'like' ? 1 : 0);
      
      if (totalVotes >= 2 && likeVotes / totalVotes >= 0.5) {
        // Finalize hangout
        updateHangout(hangoutId, { status: 'finalized' });
        
        addMessage(groupId, {
          id: `sys${Date.now()}`,
          userId: 'system',
          userName: 'System',
          content: '🎉 Hangout finalized! The group has agreed on the AI suggestion.',
          type: 'system',
          timestamp: new Date(),
        });
      }
    }
  };

  const handleSubmitChanges = () => {
    if (!userChanges.trim()) return;

    updateHangout(hangoutId, { userChanges });

    // Generate new AI suggestion based on changes
    const newSuggestion = `🔄 Updated Suggestion:\n\nBased on your feedback: "${userChanges}"\n\nI've adjusted the plan:\n\n📍 Location: Rooftop Bar & Lounge\n🕒 Time: Evening (7 PM)\n✨ Vibe: Fun & Relaxing\n\nActivity: Sunset happy hour with games and music! Perfect blend of your requested changes with the original fun vibe.`;

    addMessage(groupId, {
      id: `ai${Date.now()}`,
      userId: 'ai',
      userName: 'AI',
      content: newSuggestion,
      type: 'ai',
      timestamp: new Date(),
      hangoutId,
    });

    setUserChanges('');
    setHasVoted(false);
    onClose();
  };

  const voteStats = hangout ? {
    likes: hangout.votes.filter((v) => v.vote === 'like').length,
    nahs: hangout.votes.filter((v) => v.vote === 'nah').length,
    total: hangout.votes.length,
  } : { likes: 0, nahs: 0, total: 0 };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsUp className="w-5 h-5 text-green-600" />
            Vote on Hangout
          </DialogTitle>
          <DialogDescription>
            Vote on the AI's suggestion or request changes for a new suggestion.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Voting Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => handleVote('like')}
              className={`flex-1 ${currentUserVote?.vote === 'like' ? 'bg-green-500 hover:bg-green-600' : ''}`}
              variant={currentUserVote?.vote === 'like' ? 'default' : 'outline'}
            >
              <ThumbsUp className="w-4 h-4 mr-2" />
              Like
            </Button>
            <Button
              onClick={() => handleVote('nah')}
              className={`flex-1 ${currentUserVote?.vote === 'nah' ? 'bg-red-500 hover:bg-red-600' : ''}`}
              variant={currentUserVote?.vote === 'nah' ? 'default' : 'outline'}
            >
              <ThumbsDown className="w-4 h-4 mr-2" />
              Nah
            </Button>
          </div>

          {/* Vote Stats */}
          {hangout && hangout.votes.length > 0 && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-semibold mb-2">Current Votes:</p>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">👍 {voteStats.likes} Like</span>
                <span className="text-red-600">👎 {voteStats.nahs} Nah</span>
              </div>
            </div>
          )}

          {/* User Changes Section */}
          <div className="border-t pt-4 space-y-3">
            <Label htmlFor="changes" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Request Changes (Optional)
            </Label>
            <Textarea
              id="changes"
              placeholder="Suggest modifications to the AI's proposal..."
              value={userChanges}
              onChange={(e) => setUserChanges(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleSubmitChanges}
              variant="secondary"
              className="w-full"
              disabled={!userChanges.trim()}
            >
              Submit Changes & Get New Suggestion
            </Button>
          </div>

          {hangout?.status === 'finalized' && (
            <div className="border rounded-lg p-3 bg-green-50 border-green-200">
              <p className="text-sm font-semibold text-green-800">
                ✅ This hangout has been finalized!
              </p>
            </div>
          )}
        </div>

        <Button variant="outline" onClick={onClose} className="w-full">
          Back to Chat
        </Button>
      </DialogContent>
    </Dialog>
  );
}
