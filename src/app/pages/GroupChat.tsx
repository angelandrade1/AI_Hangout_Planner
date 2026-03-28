import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useApp, VOTE_THRESHOLD } from '../context/AppContext';
import { Send, Sparkles, ThumbsUp, Users, Copy, Check, Search, UserPlus, ChevronRight, X } from 'lucide-react';
import { Modal, ModalTitle, ModalFooter, GhostBtn, AccentBtn, Label, ErrorMsg } from './Layout';

const genId = () => Math.random().toString(36).slice(2, 10);
const VIBES = [
  { v:'Fun', e:'🎉' }, { v:'Scary', e:'👻' }, { v:'Romantic', e:'💕' },
  { v:'Active', e:'🏃' }, { v:'Relaxing', e:'😌' }, { v:'Adventurous', e:'🧗' },
  { v:'Cultural', e:'🎭' }, { v:'Foodie', e:'🍽️' },
];

function fmtDT(dt: string) {
  if (!dt) return '';
  return new Date(dt).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
}
function mock(prefs: any[], round: number, changes?: string) {
  const vibes = prefs.map(p => p.vibe);
  const vibe = vibes.sort((a,b) => vibes.filter(v=>v===b).length - vibes.filter(v=>v===a).length)[0] || 'Fun';
  const starts = prefs.map(p => new Date(p.availabilityStart).getTime());
  const ends = prefs.map(p => new Date(p.availabilityEnd).getTime());
  const ls = new Date(Math.max(...starts));
  const ee = new Date(Math.min(...ends));
  const win = ls < ee ? `${fmtDT(ls.toISOString())} → ${fmtDT(ee.toISOString())}` : fmtDT(prefs[0].availabilityStart);
  const suggs = prefs.map(p => p.customSuggestions).filter(Boolean);
  const spots = ['Central Park', 'Ponce City Market', 'Rooftop Bar & Lounge', 'Local Bowling Alley', 'Art Museum'];
  const spot = changes ? 'Rooftop Bar & Lounge (adjusted from feedback)' : spots[Math.floor(Math.random() * spots.length)];
  return `🎉 Round ${round} suggestion based on ${prefs.length} preference${prefs.length>1?'s':''}:\n\n📍 ${spot}\n🕒 ${win}\n✨ Vibe: ${vibe}\n\n${changes ? `Taking your feedback into account: "${changes}"\n\n` : ''}Perfect for a ${vibe.toLowerCase()} LinkedUp — everyone should love it!${suggs.length ? `\n💡 Also considering: ${suggs.join(', ')}` : ''}`;
}

async function getAISuggestion(prefs: any[], round: number, changes?: string) {
  try {
    const res = await fetch('/api/suggest', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ prefs, changes }) });
    if (!res.ok) throw new Error('Server error');
    const data = await res.json();
    if (data.suggestion) return data.suggestion;
  } catch { /* fall through */ }
  return mock(prefs, round, changes);
}

export function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const { currentUser, groups, messages, addMessage, replaceMessage, LinkedUps, addLinkedUp, addPreferenceToLinkedUp, castVote, startNewVoteRound, updateLinkedUp, addMemberByUsername } = useApp();
  const [msgInput, setMsgInput] = useState('');
  const [showPrefs, setShowPrefs] = useState(false);
  const [showVote, setShowVote] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [activeLinkedUpId, setActiveLinkedUpId] = useState<string|null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const group = groups.find(g => g.id === groupId);
  const groupMsgs = groupId ? (messages[groupId] || []) : [];
  const LinkedUp = LinkedUps.find(h => h.groupId === groupId && h.status !== 'finalized') || LinkedUps.filter(h => h.groupId === groupId).pop();
  const memberCount = group?.members.length || 1;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [groupMsgs]);

  if (!group) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text3)', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:40 }}>💬</div>
      <div>Select a group from the sidebar</div>
    </div>
  );

  const sendMsg = () => {
    if (!msgInput.trim() || !groupId || !currentUser) return;
    addMessage(groupId, { id:genId(), userId:currentUser.id, userName:currentUser.displayName, content:msgInput, type:'user', timestamp:new Date() });
    setMsgInput('');
  };

  const startLinkedUp = () => {
    if (!groupId || !currentUser) return;
    const hid = 'h' + genId();
    addLinkedUp({ id:hid, groupId, preferences:[], voteRounds:[], currentRound:0, status:'collecting' });
    setActiveLinkedUpId(hid);
    addMessage(groupId, { id:genId(), userId:'system', userName:'System', content:'🎉 LinkedUp planning started! Everyone click below to enter your preferences.', type:'system', timestamp:new Date(), LinkedUpId:hid });
  };

  const openPrefs = (hid: string) => { setActiveLinkedUpId(hid); setShowPrefs(true); };
  const openVote = (hid: string) => { setActiveLinkedUpId(hid); setShowVote(true); };

  const currentLinkedUp = activeLinkedUpId ? LinkedUps.find(h => h.id === activeLinkedUpId) : null;
  const currentRound = currentLinkedUp?.voteRounds.find(r => r.roundNumber === currentLinkedUp.currentRound);

  const pill = LinkedUp ? (
    LinkedUp.status === 'collecting' ? <span style={pillStyle('orange')}>Planning Active</span> :
    LinkedUp.status === 'voting' ? <span style={pillStyle('accent')}>Voting · Round {LinkedUp.currentRound}</span> :
    <span style={pillStyle('green')}>Finalized 🎉</span>
  ) : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'13px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12, flexShrink:0, background:'var(--bg2)' }}>
        <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-bg)', color:'var(--accent2)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:12, fontWeight:700 }}>
          {group.name.slice(0,2).toUpperCase()}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600 }}>{group.name}</div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>{memberCount} members</div>
        </div>
        {pill}
        <button onClick={() => setShowMembers(true)} style={iconBtn}><Users size={15} /></button>
        <button onClick={() => setShowInvite(true)} style={iconBtn}><UserPlus size={15} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
        {groupMsgs.map(msg => {
          const h = msg.LinkedUpId ? LinkedUps.find(x => x.id === msg.LinkedUpId) : null;
          const isMe = msg.userId === currentUser?.id;
          if (msg.type === 'system') return <SystemCard key={msg.id} msg={msg} LinkedUp={h} group={group} onOpenPrefs={openPrefs} />;
          if (msg.type === 'ai') return <AiCard key={msg.id} msg={msg} LinkedUp={h} onVote={openVote} />;
          if (msg.content === '__loading__') return (
            <div key={msg.id} style={{ background:'var(--bg2)', border:'1px solid var(--accent-border)', borderRadius:'var(--radius)', padding:'14px 16px', maxWidth:500, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:13, color:'var(--accent2)' }}>AI is thinking</span>
              <span style={{ display:'flex', gap:4 }}>{[0,1,2].map(i => <span key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent2)', display:'inline-block', animation:`pulse 1.2s ease-in-out ${i*.2}s infinite` }} />)}</span>
            </div>
          );
          return (
            <div key={msg.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && <div style={{ fontSize:11, color:'var(--text3)', marginBottom:3, paddingLeft:12 }}>{msg.userName}</div>}
              <div style={{ maxWidth:460, padding:'9px 14px', borderRadius:18, fontSize:14, lineHeight:1.55, background: isMe ? 'var(--accent)' : 'var(--bg3)', color: isMe ? '#fff' : 'var(--text)', border: isMe ? 'none' : '1px solid var(--border)', borderBottomRightRadius: isMe ? 4 : 18, borderBottomLeftRadius: isMe ? 18 : 4 }}>
                {msg.content}
              </div>
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, paddingLeft:12, paddingRight:12 }}>{fmtTime(new Date(msg.timestamp))}</div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input area */}
      <div style={{ padding:'12px 20px 16px', borderTop:'1px solid var(--border)', flexShrink:0, background:'var(--bg2)' }}>
        <div style={{ display:'flex', gap:8, marginBottom:10, flexWrap:'wrap' }}>
          {(!LinkedUp || LinkedUp.status === 'finalized') && (
            <ActionChip onClick={startLinkedUp}><Sparkles size={12} /> Start LinkedUp Planning</ActionChip>
          )}
          {LinkedUp?.status === 'collecting' && (
            <ActionChip onClick={() => openPrefs(LinkedUp.id)} color="orange"><Sparkles size={12} /> My Preferences</ActionChip>
          )}
          {LinkedUp?.status === 'voting' && (
            <ActionChip onClick={() => openVote(LinkedUp.id)} color="accent"><ThumbsUp size={12} /> Open Vote</ActionChip>
          )}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key==='Enter' && sendMsg()} placeholder="Type a message..." style={{ flex:1, height:44, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:14, padding:'0 16px' }} />
          <button onClick={sendMsg} style={{ width:44, height:44, borderRadius:'var(--radius-sm)', background:'var(--accent)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>

      {/* Modals */}
      {showPrefs && activeLinkedUpId && (
        <PrefsModal LinkedUpId={activeLinkedUpId} groupId={groupId!} onClose={() => setShowPrefs(false)}
          onSubmit={async (pref) => {
            addPreferenceToLinkedUp(activeLinkedUpId, pref);
            setShowPrefs(false);
            const loadId = genId();
            addMessage(groupId!, { id:loadId, userId:'ai', userName:'AI', content:'__loading__', type:'user', timestamp:new Date() });
            const h = LinkedUps.find(x => x.id === activeLinkedUpId);
            const allPrefs = h ? [...h.preferences.filter(p => p.userId !== pref.userId), pref] : [pref];
            const nextRound = (h?.currentRound || 0) + 1;
            const suggestion = await getAISuggestion(allPrefs, nextRound);
            replaceMessage(groupId!, loadId, { id:genId(), userId:'ai', userName:'AI', content:suggestion, type:'ai', timestamp:new Date(), LinkedUpId:activeLinkedUpId });
            startNewVoteRound(activeLinkedUpId);
          }}
        />
      )}
      {showVote && activeLinkedUpId && (
        <VoteModal LinkedUpId={activeLinkedUpId} groupId={groupId!} onClose={() => setShowVote(false)}
          onReroll={async (changes) => {
            setShowVote(false);
            const h = LinkedUps.find(x => x.id === activeLinkedUpId);
            if (!h) return;
            const loadId = genId();
            addMessage(groupId!, { id:loadId, userId:'ai', userName:'AI', content:'__loading__', type:'user', timestamp:new Date() });
            const nextRound = h.currentRound + 1;
            const suggestion = await getAISuggestion(h.preferences, nextRound, changes);
            replaceMessage(groupId!, loadId, { id:genId(), userId:'ai', userName:'AI', content:suggestion, type:'ai', timestamp:new Date(), LinkedUpId:activeLinkedUpId });
            startNewVoteRound(activeLinkedUpId);
          }}
          onVote={(vote) => {
            if (!currentUser) return;
            const result = castVote(activeLinkedUpId, currentUser.id, currentUser.displayName, vote, memberCount);
            if (result.status === 'passed') {
              addMessage(groupId!, { id:genId(), userId:'system', userName:'System', content:`🎉 Vote passed! ${Math.round(result.likePercentage*100)}% liked it — above the 60% threshold. LinkedUp is officially on! 🥳`, type:'system', timestamp:new Date() });
            } else if (result.status === 'failed') {
              addMessage(groupId!, { id:genId(), userId:'system', userName:'System', content:`❌ Vote didn't pass (${Math.round(result.likePercentage*100)}% — needed 60%). Submit changes for a new suggestion!`, type:'system', timestamp:new Date() });
            }
          }}
        />
      )}
      {showInvite && groupId && <InviteModal group={group} groupId={groupId} onClose={() => setShowInvite(false)} />}
      {showMembers && <MembersModal group={group} onClose={() => setShowMembers(false)} />}
    </div>
  );
}

// ── System card ──
function SystemCard({ msg, LinkedUp, group, onOpenPrefs }: any) {
  const showBtn = LinkedUp?.status === 'collecting';
  const fin = LinkedUp?.status === 'finalized';
  const prefs = LinkedUp?.preferences || [];
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--orange-border)', borderRadius:'var(--radius)', padding:'14px 16px', maxWidth:520, animation:'fadeUp .3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
        <Users size={14} color="var(--orange)" />
        <span style={{ fontSize:13, fontWeight:600, color:'var(--orange)' }}>LinkedUp Planning</span>
      </div>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom: showBtn ? 12 : 0 }}>{msg.content}</p>
      {showBtn && (
        <>
          <button onClick={() => onOpenPrefs(msg.LinkedUpId)} style={{ width:'100%', height:34, background:'transparent', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Sparkles size={13} /> Enter Your Preferences
          </button>
          {prefs.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:10 }}>
              {prefs.map((p: any, i: number) => (
                <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)' }}>✓ {p.userName}</span>
              ))}
            </div>
          )}
        </>
      )}
      {fin && <div style={{ fontSize:13, color:'var(--green)', fontWeight:500, display:'flex', alignItems:'center', gap:5 }}>✅ LinkedUp finalized!</div>}
    </div>
  );
}

// ── AI card ──
function AiCard({ msg, LinkedUp, onVote }: any) {
  const fin = LinkedUp?.status === 'finalized';
  return (
    <div style={{ background:'var(--bg2)', border:'1px solid var(--accent-border)', borderRadius:'var(--radius)', padding:'14px 16px', maxWidth:580, animation:'fadeUp .3s ease' }}>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
        <Sparkles size={14} color="var(--accent2)" />
        <span style={{ fontSize:13, fontWeight:600, color:'var(--accent2)' }}>AI Suggestion</span>
        {LinkedUp?.currentRound > 1 && <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text3)', background:'var(--bg3)', border:'1px solid var(--border)', padding:'2px 8px', borderRadius:20 }}>Round {LinkedUp.currentRound}</span>}
      </div>
      <div style={{ fontSize:13, lineHeight:1.7, whiteSpace:'pre-line', color:'var(--text)' }}>{msg.content}</div>
      {!fin && msg.LinkedUpId && (
        <button onClick={() => onVote(msg.LinkedUpId)} style={{ marginTop:12, height:32, padding:'0 14px', background:'transparent', border:'1px solid var(--accent-border)', borderRadius:'var(--radius-sm)', color:'var(--accent2)', fontSize:12, fontWeight:500, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:6 }}>
          <ThumbsUp size={13} /> Vote on This
        </button>
      )}
      {fin && <div style={{ fontSize:12, color:'var(--green)', marginTop:10, display:'flex', alignItems:'center', gap:5 }}>✅ This plan was approved!</div>}
    </div>
  );
}

// ── Preferences Modal ──
function PrefsModal({ LinkedUpId, groupId, onClose, onSubmit }: any) {
  const { LinkedUps } = useApp();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [vibe, setVibe] = useState('');
  const [location, setLocation] = useState('');
  const [sugg, setSugg] = useState('');
  const [timeErr, setTimeErr] = useState('');
  const { currentUser } = useApp();
  const LinkedUp = LinkedUps.find(h => h.id === LinkedUpId);

  const validate = () => {
    if (!start || !end) { setTimeErr('Both times required.'); return false; }
    if (new Date(end) <= new Date(start)) { setTimeErr('End must be after start.'); return false; }
    setTimeErr(''); return true;
  };

  const handleSubmit = () => {
    if (!validate() || !vibe) { if (!vibe) alert('Please select a vibe.'); return; }
    if (!location.trim()) { alert('Please enter your location.'); return; }
    onSubmit({ userId: currentUser!.id, userName: currentUser!.displayName, availabilityStart: start, availabilityEnd: end, vibe, location, customSuggestions: sugg });
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitle>LinkedUp Preferences</ModalTitle>
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20, lineHeight:1.6 }}>Set your availability, vibe, and location so the AI can find the best plan.</p>

      <div style={{ marginBottom:18 }}>
        <Label>Availability Window</Label>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>Start</div>
            <input type="datetime-local" value={start} onChange={e => { setStart(e.target.value); setTimeErr(''); }} style={minputStyle} />
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>End</div>
            <input type="datetime-local" value={end} min={start} onChange={e => { setEnd(e.target.value); setTimeErr(''); }} style={minputStyle} />
          </div>
        </div>
        {timeErr && <p style={{ fontSize:12, color:'var(--red)', marginTop:6 }}>{timeErr}</p>}
        {start && end && !timeErr && (
          <div style={{ fontSize:12, color:'var(--accent2)', background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:'var(--radius-sm)', padding:'8px 12px', marginTop:8 }}>
            ⏰ {fmtDT(start)} → {fmtDT(end)}
          </div>
        )}
      </div>

      <div style={{ marginBottom:18 }}>
        <Label>Vibe</Label>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
          {VIBES.map(({ v, e }) => (
            <button key={v} onClick={() => setVibe(v)} style={{ height:52, background: vibe===v ? 'var(--accent-bg)' : 'var(--bg3)', border: vibe===v ? '1px solid var(--accent-border)' : '1px solid var(--border)', borderRadius:'var(--radius-sm)', cursor:'pointer', color: vibe===v ? 'var(--accent2)' : 'var(--text2)', fontSize:11, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
              <span style={{ fontSize:18 }}>{e}</span>{v}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:18 }}>
        <Label>Your Location</Label>
        <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Midtown Atlanta" style={minputStyle} />
      </div>

      <div style={{ marginBottom:18 }}>
        <Label>Place Suggestions <span style={{ color:'var(--text3)', fontWeight:400, textTransform:'none', letterSpacing:0 }}>(optional)</span></Label>
        <textarea value={sugg} onChange={e => setSugg(e.target.value)} placeholder="Any specific spots or activities?" style={{ ...minputStyle, height:68, padding:'10px 12px', resize:'none' as const }} />
      </div>

      {LinkedUp && LinkedUp.preferences.length > 0 && (
        <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'12px 14px', marginBottom:4 }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, marginBottom:8 }}>Already submitted:</div>
          {LinkedUp.preferences.map((p, i) => (
            <div key={i} style={{ fontSize:12, color:'var(--text2)', marginBottom:5 }}>✓ <strong>{p.userName}</strong> — {p.vibe} · {fmtDT(p.availabilityStart)}</div>
          ))}
        </div>
      )}

      <ModalFooter>
        <GhostBtn onClick={onClose}>Back to Chat</GhostBtn>
        <AccentBtn onClick={handleSubmit}>Submit &amp; Get AI Plan</AccentBtn>
      </ModalFooter>
    </Modal>
  );
}

// ── Vote Modal ──
function VoteModal({ LinkedUpId, groupId, onClose, onVote, onReroll }: any) {
  const { LinkedUps, groups, currentUser } = useApp();
  const [changes, setChanges] = useState('');
  const LinkedUp = LinkedUps.find(h => h.id === LinkedUpId);
  const group = groups.find(g => g.id === groupId);
  const memberCount = group?.members.length || 1;
  const round = LinkedUp?.voteRounds.find(r => r.roundNumber === LinkedUp.currentRound);
  const myVote = round?.votes.find(v => v.userId === currentUser?.id);
  const likes = round?.votes.filter(v => v.vote === 'like').length || 0;
  const nahs = round?.votes.filter(v => v.vote === 'nah').length || 0;
  const total = round?.votes.length || 0;
  const likePct = Math.round((likes / memberCount) * 100);
  const barW = Math.min(Math.round((likes / (memberCount * VOTE_THRESHOLD)) * 100), 100);
  const remaining = memberCount - total;
  const roundResult = round?.result;
  const isFinalized = LinkedUp?.status === 'finalized';

  return (
    <Modal onClose={onClose}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <ModalTitle>Vote on LinkedUp</ModalTitle>
        <span style={pillStyle('accent')}>Round {LinkedUp?.currentRound || 1}</span>
      </div>
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:18, lineHeight:1.6 }}>60% of the group must Like to finalize the plan.</p>

      {isFinalized && (
        <div style={{ background:'var(--green-bg)', border:'1px solid var(--green-border)', borderRadius:'var(--radius-sm)', padding:'12px 16px', marginBottom:16, display:'flex', gap:10 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--green)' }}>LinkedUp finalized! 🎉</div>
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{likePct}% liked it — above the 60% threshold.</div>
          </div>
        </div>
      )}
      {roundResult === 'failed' && !isFinalized && (
        <div style={{ background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:'var(--radius-sm)', padding:'12px 16px', marginBottom:16 }}>
          <div style={{ fontSize:14, fontWeight:600, color:'var(--red)' }}>Vote didn't pass ({likePct}% — needed 60%)</div>
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>Submit changes below for a new AI suggestion.</div>
        </div>
      )}

      {!isFinalized && roundResult === 'pending' && (
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          {(['like','nah'] as const).map(v => (
            <button key={v} onClick={() => !myVote && onVote(v)} disabled={!!myVote}
              style={{ flex:1, height:50, borderRadius:'var(--radius-sm)', border:'1px solid var(--border2)', cursor: myVote ? 'not-allowed' : 'pointer', fontSize:15, fontWeight:600, transition:'all .2s', background: myVote?.vote===v ? (v==='like'?'var(--green-bg)':'var(--red-bg)') : 'var(--bg3)', borderColor: myVote?.vote===v ? (v==='like'?'var(--green-border)':'var(--red-border)') : 'var(--border2)', color: myVote?.vote===v ? (v==='like'?'var(--green)':'var(--red)') : 'var(--text)', opacity: myVote && myVote.vote!==v ? 0.4 : 1 }}>
              {v === 'like' ? '👍 Like' : '👎 Nah'}
            </button>
          ))}
        </div>
      )}
      {myVote && roundResult === 'pending' && <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginBottom:14 }}>You voted {myVote.vote === 'like' ? '👍 Like' : '👎 Nah'}. Waiting for others...</p>}

      {total > 0 && (
        <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'14px 16px', marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500 }}>Live tally</span>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{total}/{memberCount} voted</span>
          </div>
          <div style={{ height:8, background:'var(--bg)', borderRadius:4, overflow:'hidden', marginBottom:5 }}>
            <div style={{ height:'100%', borderRadius:4, background: likePct>=60 ? 'var(--green)' : 'var(--accent)', width:`${barW}%`, transition:'width .5s' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)', marginBottom:10 }}>
            <span>Likes toward 60% threshold</span><span>{likePct}%</span>
          </div>
          <div style={{ display:'flex', gap:14, fontSize:13, marginBottom:10 }}>
            <span style={{ color:'var(--green)', fontWeight:500 }}>👍 {likes} Like{likes!==1?'s':''}</span>
            <span style={{ color:'var(--red)', fontWeight:500 }}>👎 {nahs} Nah</span>
            {remaining > 0 && roundResult === 'pending' && <span style={{ color:'var(--text3)' }}>{remaining} pending</span>}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {round?.votes.map((v, i) => (
              <span key={i} style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: v.vote==='like' ? 'var(--green-bg)' : 'var(--red-bg)', border:`1px solid ${v.vote==='like' ? 'var(--green-border)' : 'var(--red-border)'}`, color: v.vote==='like' ? 'var(--green)' : 'var(--red)' }}>
                {v.vote==='like'?'👍':'👎'} {v.userName}
              </span>
            ))}
          </div>
        </div>
      )}

      {!isFinalized && (roundResult === 'failed' || myVote?.vote === 'nah' || roundResult === 'pending') && (
        <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginBottom:4 }}>
          <Label>Request Changes for New AI Suggestion</Label>
          <textarea value={changes} onChange={e => setChanges(e.target.value)} placeholder="What should be different? (location, time, vibe...)" style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13, padding:'10px 12px', resize:'none' as const, height:72, marginBottom:10 }} />
          <button onClick={() => onReroll(changes)} style={{ width:'100%', height:42, background:'var(--accent)', border:'none', borderRadius:'var(--radius-sm)', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <Sparkles size={14} /> Re-roll AI Suggestion
          </button>
        </div>
      )}

      {LinkedUp && LinkedUp.voteRounds.length > 1 && (
        <div style={{ marginTop:16, borderTop:'1px solid var(--border)', paddingTop:14 }}>
          <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:8 }}>Round History</div>
          {LinkedUp.voteRounds.map(r => (
            <div key={r.roundNumber} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text3)', marginBottom:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, background: r.result==='passed' ? 'var(--green)' : r.result==='failed' ? 'var(--red)' : 'var(--orange)' }} />
              Round {r.roundNumber}: {r.result==='passed' ? '✅ Passed' : r.result==='failed' ? '❌ Failed' : '⏳ In Progress'}
              {r.changes && <span style={{ color:'var(--text3)' }}>· "{r.changes.slice(0,35)}..."</span>}
            </div>
          ))}
        </div>
      )}

      <ModalFooter>
        <GhostBtn onClick={onClose}>Back to Chat</GhostBtn>
      </ModalFooter>
    </Modal>
  );
}

// ── Invite Modal ──
function InviteModal({ group, groupId, onClose }: any) {
  const { addMemberByUsername } = useApp();
  const [copied, setCopied] = useState(false);
  const [usernameSearch, setUsernameSearch] = useState('');
  const [addResult, setAddResult] = useState<{success:boolean;msg:string}|null>(null);

  const inviteLink = `${window.location.origin}/?join=${group.inviteCode}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAdd = () => {
    if (!usernameSearch.trim()) return;
    const res = addMemberByUsername(groupId, usernameSearch.trim().replace('@',''));
    setAddResult({ success: res.success, msg: res.success ? `Added!` : (res.error || 'Error') });
    if (res.success) setUsernameSearch('');
    setTimeout(() => setAddResult(null), 3000);
  };

  return (
    <Modal onClose={onClose}>
      <ModalTitle>Invite to {group.name}</ModalTitle>
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:22, lineHeight:1.6 }}>Share a link or add friends by username.</p>

      <div style={{ marginBottom:20 }}>
        <Label>Invite Link</Label>
        <div style={{ display:'flex', gap:8 }}>
          <input readOnly value={inviteLink} style={{ ...minputStyle, flex:1, color:'var(--text2)', fontSize:12 }} />
          <button onClick={() => copy(inviteLink)} style={{ height:40, padding:'0 14px', background:'var(--accent-bg)', border:'1px solid var(--accent-border)', borderRadius:'var(--radius-sm)', color:'var(--accent2)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
      </div>

      <div style={{ marginBottom:20 }}>
        <Label>Invite Code</Label>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ flex:1, height:40, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:20, fontWeight:700, letterSpacing:'.15em', color:'var(--accent2)' }}>
            {group.inviteCode}
          </div>
          <button onClick={() => copy(group.inviteCode)} style={{ height:40, padding:'0 14px', background:'transparent', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text2)', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      <div>
        <Label>Add by Username</Label>
        <div style={{ display:'flex', gap:8 }}>
          <input value={usernameSearch} onChange={e => setUsernameSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAdd()} placeholder="@username" style={{ ...minputStyle, flex:1 }} />
          <button onClick={handleAdd} style={{ height:40, padding:'0 14px', background:'var(--accent)', border:'none', borderRadius:'var(--radius-sm)', color:'#fff', fontSize:13, cursor:'pointer', flexShrink:0 }}>Add</button>
        </div>
        {addResult && (
          <p style={{ fontSize:13, marginTop:8, color: addResult.success ? 'var(--green)' : 'var(--red)', background: addResult.success ? 'var(--green-bg)' : 'var(--red-bg)', border:`1px solid ${addResult.success ? 'var(--green-border)' : 'var(--red-border)'}`, borderRadius:'var(--radius-sm)', padding:'8px 12px' }}>
            {addResult.msg}
          </p>
        )}
        <p style={{ fontSize:11, color:'var(--text3)', marginTop:8 }}>Try adding: sarah, mike, jordan, taylor</p>
      </div>

      <ModalFooter>
        <GhostBtn onClick={onClose}>Done</GhostBtn>
      </ModalFooter>
    </Modal>
  );
}

// ── Members Modal ──
function MembersModal({ group, onClose }: any) {
  return (
    <Modal onClose={onClose}>
      <ModalTitle>Members · {group.name}</ModalTitle>
      <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>{group.members.length} member{group.members.length!==1?'s':''}</p>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {group.members.map((m: any) => (
          <div key={m.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'var(--bg3)', borderRadius:'var(--radius-sm)', border:'1px solid var(--border)' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'var(--accent-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>{m.avatar}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:500 }}>{m.displayName}</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>@{m.username}</div>
            </div>
            {m.id === group.createdBy && <span style={{ marginLeft:'auto', fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--accent-bg)', color:'var(--accent2)', border:'1px solid var(--accent-border)' }}>Owner</span>}
          </div>
        ))}
      </div>
      <ModalFooter>
        <GhostBtn onClick={onClose}>Close</GhostBtn>
      </ModalFooter>
    </Modal>
  );
}

// ── Shared styles ──
const minputStyle: React.CSSProperties = { width:'100%', height:40, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:13, padding:'0 12px' };
const iconBtn: React.CSSProperties = { width:34, height:34, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' };
function pillStyle(color: 'orange'|'accent'|'green'): React.CSSProperties {
  const map = { orange:['var(--orange-bg)','var(--orange)','var(--orange-border)'], accent:['var(--accent-bg)','var(--accent2)','var(--accent-border)'], green:['var(--green-bg)','var(--green)','var(--green-border)'] };
  const [bg,c,border] = map[color];
  return { padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:500, background:bg, color:c, border:`1px solid ${border}` };
}
function ActionChip({ children, onClick, color }: { children: React.ReactNode; onClick: () => void; color?: 'orange'|'accent' }) {
  const styles = color === 'orange' ? { color:'var(--orange)', borderColor:'var(--orange-border)', bg:'var(--orange-bg)' } : color === 'accent' ? { color:'var(--accent2)', borderColor:'var(--accent-border)', bg:'var(--accent-bg)' } : { color:'var(--text2)', borderColor:'var(--border2)', bg:'transparent' };
  return (
    <button onClick={onClick} style={{ height:30, padding:'0 12px', borderRadius:20, border:`1px solid ${styles.borderColor}`, background:styles.bg, color:styles.color, fontSize:12, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
      {children}
    </button>
  );
}
