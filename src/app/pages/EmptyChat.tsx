export function EmptyChat() {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:12, color:'var(--text3)' }}>
      <div style={{ fontSize:48, opacity:0.3 }}>💬</div>
      <div style={{ fontSize:15 }}>Select a group to start chatting</div>
      <div style={{ fontSize:13, color:'var(--text3)' }}>or create a new one from the sidebar</div>
    </div>
  );
}
