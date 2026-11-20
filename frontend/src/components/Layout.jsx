import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Layers3, LogOut, Shirt, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const links = [
  ['/onboarding', 'Onboarding', UserRound],
  ['/closet', 'My Closet', Shirt],
  ['/recommendations', 'Recommendations', Sparkles],
  ['/shopping', 'Shop the Look', ShoppingBag],
];

export default function Layout() {
  const navigate = useNavigate();
  const { isConfigured, session, supabase } = useAuth();
  const [signOutError, setSignOutError] = useState('');

  const signOut = async () => {
    setSignOutError('');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError(error.message);
        return;
      }
      navigate('/login', { replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('/closet')}>
          <span className="brand-mark">V<span>.</span></span>
          <span>VIRTUAL<br />STYLIST</span>
        </button>
        <div className="side-caption">YOUR STYLE STUDIO</div>
        <nav>
          {links.map(([url, label, Icon]) => (
            <NavLink
              key={url}
              to={url}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="side-bottom">
          <Layers3 size={21} />
          <strong>Curate your look.</strong>
          <p>Discover new ways to wear what you already own.</p>
          <button onClick={() => navigate('/recommendations')}>
            Explore outfits <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="side-footer">ECE364D · TEAM PROJECT</div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>YOUR PERSONAL STYLE SPACE</span>
          <div className="top-actions">
            {isConfigured && session ? (
              <>
                <span className="demo-tag">{session.user.email}</span>
                <button className="auth-signout" onClick={signOut}>
                  <LogOut size={15} /> Sign out
                </button>
              </>
            ) : (
              <>
                <span className="demo-tag">DEMO MODE</span>
                <span className="avatar">VS</span>
              </>
            )}
          </div>
        </header>
        {signOutError && (
          <div className="auth-inline-error" role="alert">
            Could not sign out: {signOutError}
          </div>
        )}
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
