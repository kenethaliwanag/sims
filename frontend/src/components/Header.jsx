import React from 'react';
import { Bell, Settings, LogOut, Menu } from 'lucide-react';
import './Header.css';

function Header({ user, onLogout, onMenuClick }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button className="menu-toggle" onClick={onMenuClick}>
            <Menu size={24} />
          </button>
          <h1>Welcome back, {user.fullName}</h1>
        </div>
        <div className="header-right">
          <button className="header-icon-btn">
            <Bell size={20} />
          </button>
          <button className="header-icon-btn">
            <Settings size={20} />
          </button>
          <button className="header-icon-btn logout" onClick={onLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;
