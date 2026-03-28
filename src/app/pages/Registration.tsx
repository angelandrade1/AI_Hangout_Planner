import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { Sun, Moon } from 'lucide-react';

export function Registration() {
  const { register, login, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = mode === 'register'
      ? register(username, displayName, password)
      : login(username, password);
    if (result.success) navigate('/');
    else setError(result.error || 'Something went wrong.');
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', position:'relative' }}>
      <button onClick={toggleTheme} style={{ position:'absolute', top:20, right:20, width:38, height:38, borderRadius:'50%', border:'1px solid var(--border2)', background:'var(--bg2)', color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:24, padding:'48px 40px', width:420, animation:'fadeUp .4s ease', boxShadow:'var(--shadow-lg)' }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, marginBottom:6 }}>
          LinkedUp<span style={{ color:'var(--accent2)' }}></span>
        </div>
        <p style={{ color:'var(--text2)', fontSize:14, marginBottom:32, lineHeight:1.6 }}>
          {mode === 'register' ? 'Create your account and start planning.' : 'Welcome back!'}
        </p>

        <div style={{ display:'flex', gap:6, background:'var(--bg3)', borderRadius:'var(--radius-sm)', padding:4, marginBottom:24 }}>
          {(['register','login'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{ flex:1, height:34, borderRadius:6, border:'none', background: mode===m ? 'var(--bg2)' : 'transparent', color: mode===m ? 'var(--text)' : 'var(--text3)', fontWeight: mode===m ? 500 : 400, fontSize:14, cursor:'pointer', transition:'all .15s', boxShadow: mode===m ? 'var(--shadow)' : 'none' }}>
              {m === 'register' ? 'Sign Up' : 'Log In'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="e.g. Alex" style={{ width:'100%', height:44, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:14, padding:'0 14px' }} />
            </div>
          )}
          <div>
            <label style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="@username" style={{ width:'100%', height:44, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:14, padding:'0 14px' }} />
          </div>
          <div>
            <label style={{ fontSize:11, color:'var(--text3)', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', display:'block', marginBottom:6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={{ width:'100%', height:44, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:'var(--radius-sm)', color:'var(--text)', fontSize:14, padding:'0 14px' }} />
          </div>
          {error && <p style={{ fontSize:13, color:'var(--red)', background:'var(--red-bg)', border:'1px solid var(--red-border)', borderRadius:'var(--radius-sm)', padding:'10px 14px' }}>{error}</p>}
          <button type="submit" style={{ height:46, background:'var(--accent)', border:'none', borderRadius:'var(--radius-sm)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', marginTop:4 }}>
            {mode === 'register' ? 'Create Account →' : 'Log In →'}
          </button>
        </form>

        {mode === 'login' && (
          <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginTop:16 }}>
            Try: username <strong style={{color:'var(--text2)'}}>sarah</strong>, password <strong style={{color:'var(--text2)'}}>pass</strong>
          </p>
        )}
      </div>
    </div>
  );
}
