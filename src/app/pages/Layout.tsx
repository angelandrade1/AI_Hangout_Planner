import { useState } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router';
import { useApp } from '../context/AppContext';
import { Sun, Moon, Plus, LogOut, Copy, Check, Search, X, Link } from 'lucide-react';

const genId = () => Math.random().toString(36).slice(2, 10);

export function Layout() {
  const { currentUser, groups, createGroup, joinGroupByCode, theme, toggleTheme, logout } = useApp();
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createError, setCreateError] = useState('');

  const handleCreate = () => {
    if (!newGroupName.trim()) { setCreateError('Please enter a group name.'); return; }
    const g = createGroup(newGroupName.trim());
    setShowCreateModal(false);
    setNewGroupName('');
    setCreateError('');
    navigate(`/group/${g.id}`);
  };

  const handleJoin = () => {
    const result = joinGroupByCode(joinCode.trim());
    if (!result.success) { setJoinError(result.error || 'Error'); return; }
    const g = groups.find(x => x.inviteCode === joinCode.toUpperCase());
    setShowJoinModal(false);
    setJoinCode('');
    setJoinError('');
    if (g) navigate(`/group/${g.id}`);
  };

  const userGroups = groups.filter(g => g.members.find(m => m.id === currentUser?.id));

  const formatTime = (d?: Date) => {
    if (!d) return '';
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (hrs < 1) return 'now';
    if (hrs < 24) return `${hrs}h`;
    if (days === 1) return 'Yesterday';
    return `${days}d`;
  };

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
      {/* Sidebar */}
      <div style={{ width:280, flexShrink:0, background:'var(--bg2)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div style={{ padding:'18px 16px 14px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--text)' }}>
              LinkedUp<span style={{ color:'var(--accent2)' }}>.</span>
            </div>
            <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
              {currentUser?.avatar} @{currentUser?.username}
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={toggleTheme} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border2)', background:'transparent', color:'var(--text3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--border2)', background:'transparent', color:'var(--text3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <LogOut size={14} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding:'10px 10px 4px', display:'flex', gap:6 }}>
          <button onClick={() => setShowCreateModal(true)} style={{ flex:1, height:32, borderRadius:8, border:'1px solid var(--border2)', background:'var(--accent-bg)', color:'var(--accent2)', fontSize:12, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Plus size={13} /> New Group
          </button>
          <button onClick={() => setShowJoinModal(true)} style={{ flex:1, height:32, borderRadius:8, border:'1px solid var(--border2)', background:'transparent', color:'var(--text2)', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
            <Link size={13} /> Join
          </button>
        </div>

        {/* Group list */}
        <div style={{ flex:1, overflowY:'auto', padding:'4px 8px 8px' }}>
          {userGroups.length === 0 && (
            <div style={{ padding:'32px 16px', textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>💬</div>
              Create or join a group to get started
            </div>
          )}
          {userGroups.map(g => {
            const h = useApp().LinkedUps.find(x => x.groupId === g.id && x.status !== 'finalized');
            const isActive = g.id === groupId;
            return (
              <div key={g.id} onClick={() => navigate(`/group/${g.id}`)}
                style={{ padding:'10px 11px', borderRadius:'var(--radius-sm)', cursor:'pointer', display:'flex', alignItems:'center', gap:11, transition:'background .15s', marginBottom:2, background: isActive ? 'var(--accent-bg)' : 'transparent', border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent', position:'relative' }}>
                <div style={{ width:38, height:38, borderRadius:10, background:'var(--accent-bg)', color:'var(--accent2)', border:'1px solid var(--accent-border)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, flexShrink:0 }}>
                  {g.name.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'var(--text)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.lastMessage || 'No messages yet'}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                  <span style={{ fontSize:10, color:'var(--text3)' }}>{formatTime(g.lastMessageTime)}</span>
                  {h && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)' }} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <Outlet />
      </div>

      {/* Create group modal */}
      {showCreateModal && (
        <Modal onClose={() => { setShowCreateModal(false); setCreateError(''); setNewGroupName(''); }}>
          <ModalTitle>Create a Group</ModalTitle>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Give your LinkedUp crew a name.</p>
          <Label>Group Name</Label>
          <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key==='Enter' && handleCreate()} placeholder="e.g. Weekend Crew" style={inputStyle} autoFocus />
          {createError && <ErrorMsg>{createError}</ErrorMsg>}
          <ModalFooter>
            <GhostBtn onClick={() => { setShowCreateModal(false); setCreateError(''); setNewGroupName(''); }}>Cancel</GhostBtn>
            <AccentBtn onClick={handleCreate}>Create Group</AccentBtn>
          </ModalFooter>
        </Modal>
      )}

      {/* Join group modal */}
      {showJoinModal && (
        <Modal onClose={() => { setShowJoinModal(false); setJoinError(''); setJoinCode(''); }}>
          <ModalTitle>Join a Group</ModalTitle>
          <p style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>Enter an invite code from a friend.</p>
          <Label>Invite Code</Label>
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter' && handleJoin()} placeholder="e.g. ABC123" style={{ ...inputStyle, textTransform:'uppercase', letterSpacing:'.1em', fontWeight:600 }} autoFocus />
          {joinError && <ErrorMsg>{joinError}</ErrorMsg>}
          <ModalFooter>
            <GhostBtn onClick={() => { setShowJoinModal(false); setJoinError(''); setJoinCode(''); }}>Cancel</GhostBtn>
            <AccentBtn onClick={handleJoin}>Join Group</AccentBtn>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}

// ── Shared modal primitives ──
const inputStyle: React.CSSProperties = { width:'100%', height:42, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:14, padding:'0 12px', marginBottom:4 };

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, backdropFilter:'blur(3px)', animation:'fadeIn .2s ease' }}>
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:'var(--radius-lg)', padding:'28px 28px 24px', width:460, maxHeight:'85vh', overflowY:'auto', animation:'scaleIn .2s ease', boxShadow:'var(--shadow-lg)', position:'relative' }}>
        <button onClick={onClose} style={{ position:'absolute', top:16, right:16, width:28, height:28, borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text3)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <X size={14} />
        </button>
        {children}
      </div>
    </div>
  );
}
export function ModalTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:6 }}>{children}</div>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:7 }}>{children}</div>;
}
export function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div style={{ display:'flex', gap:10, marginTop:22 }}>{children}</div>;
}
export function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} style={{ flex:1, height:42, background:'transparent', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text2)', fontSize:14, cursor:'pointer' }}>{children}</button>;
}
export function AccentBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return <button onClick={onClick} disabled={disabled} style={{ flex:1, height:42, background:'var(--accent)', border:'none', borderRadius:'var(--radius-sm)', color:'#fff', fontSize:14, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>{children}</button>;
}
export function ErrorMsg({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize:13, color:'var(--red)', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:'var(--radius-sm)', padding:'9px 12px', marginTop:6, marginBottom:4 }}>{children}</p>;
}
