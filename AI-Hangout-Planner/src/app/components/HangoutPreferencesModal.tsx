import { useState, useEffect } from 'react';
import { useApp, HangoutPreference } from '../context/AppContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Sparkles } from 'lucide-react';

interface HangoutPreferencesModalProps {
  open: boolean;
  onClose: () => void;
  hangoutId: string;
  groupId: string;
}

const VIBES = [
  'Fun',
  'Scary',
  'Romantic',
  'Active',
  'Relaxing',
  'Adventurous',
  'Cultural',
  'Foodie',
];

export function HangoutPreferencesModal({
  open,
  onClose,
  hangoutId,
  groupId,
}: HangoutPreferencesModalProps) {
  const { currentUser, addHangout, hangouts, addPreferenceToHangout, addMessage } = useApp();
  const [time, setTime] = useState('');
  const [vibe, setVibe] = useState('');
  const [location, setLocation] = useState('');
  const [customSuggestions, setCustomSuggestions] = useState('');

  const hangout = hangouts.find((h) => h.id === hangoutId);

  useEffect(() => {
    // Create hangout if it doesn't exist
    if (open && !hangout && currentUser) {
      addHangout({
        id: hangoutId,
        groupId,
        preferences: [],
        votes: [],
        status: 'collecting',
      });
    }
  }, [open, hangout, hangoutId, groupId, currentUser, addHangout]);

  const handleSubmit = () => {
    if (!currentUser || !time || !vibe || !location) return;

    const preference: HangoutPreference = {
      userId: currentUser.id,
      userName: currentUser.name,
      time,
      vibe,
      location,
      customSuggestions,
    };

    addPreferenceToHangout(hangoutId, preference);

    // Get updated hangout to check how many preferences we have
    const updatedHangout = hangouts.find((h) => h.id === hangoutId);
    const totalPreferences = (updatedHangout?.preferences.length || 0) + 1;

    // Only generate AI suggestion if this is the first preference or when multiple people have submitted
    // For demo purposes, we'll generate after each submission, but in production you might want to wait
    setTimeout(() => {
      const allPreferences = updatedHangout 
        ? [...updatedHangout.preferences.filter(p => p.userId !== currentUser.id), preference]
        : [preference];
      
      const mockAISuggestion = generateMockAISuggestion(allPreferences);
      
      // Update the status to indicate AI has generated a suggestion
      if (updatedHangout) {
        addMessage(groupId, {
          id: `ai${Date.now()}`,
          userId: 'ai',
          userName: 'AI',
          content: mockAISuggestion,
          type: 'ai',
          timestamp: new Date(),
          hangoutId,
        });
      }
    }, 1000);

    // Reset form
    setTime('');
    setVibe('');
    setLocation('');
    setCustomSuggestions('');
    onClose();
  };

  const generateMockAISuggestion = (preferences: HangoutPreference[]) => {
    if (preferences.length === 0) return '';
    
    // Aggregate all preferences
    const vibes = preferences.map(p => p.vibe);
    const locations = preferences.map(p => p.location);
    const times = preferences.map(p => p.time);
    const suggestions = preferences.map(p => p.customSuggestions).filter(s => s);
    
    const mostCommonVibe = vibes[0]; // Simplified - could calculate most common
    const avgTime = times[0]; // Simplified - could calculate average
    
    return `🎉 Based on ${preferences.length} user preference${preferences.length > 1 ? 's' : ''}, I suggest:\n\n📍 Location: Central Park (convenient for all)\n🕒 Time: ${new Date(avgTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}\n✨ Vibe: ${mostCommonVibe}\n\nActivity: Outdoor picnic with fun games and activities! Bring your favorite snacks and we'll have a great time enjoying the ${mostCommonVibe.toLowerCase()} atmosphere.\n\n${suggestions.length > 0 ? `Also considering: ${suggestions.join(', ')}` : ''}\n\nPreferences from: ${preferences.map(p => p.userName).join(', ')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Hangout Preferences
          </DialogTitle>
          <DialogDescription>
            Enter your preferences for the hangout. The AI will optimize suggestions based on everyone's input.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="time">Preferred Time</Label>
            <Input
              id="time"
              type="datetime-local"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vibe">Desired Vibe</Label>
            <Select value={vibe} onValueChange={setVibe}>
              <SelectTrigger>
                <SelectValue placeholder="Select a vibe" />
              </SelectTrigger>
              <SelectContent>
                {VIBES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Your Location</Label>
            <Input
              id="location"
              placeholder="e.g., Downtown, 123 Main St"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suggestions">Custom Suggestions (Optional)</Label>
            <Textarea
              id="suggestions"
              placeholder="Any specific places or activities you'd like to suggest?"
              value={customSuggestions}
              onChange={(e) => setCustomSuggestions(e.target.value)}
              rows={3}
            />
          </div>

          {hangout && hangout.preferences.length > 0 && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-semibold mb-2">Submitted Preferences:</p>
              {hangout.preferences.map((pref, idx) => (
                <div key={idx} className="text-xs text-gray-600 mb-1">
                  • {pref.userName} - {pref.vibe} vibe at {pref.location}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Back to Chat
          </Button>
          <Button onClick={handleSubmit} className="flex-1" disabled={!time || !vibe || !location}>
            Submit Preferences
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}