import React from 'react';
import {Outlet} from 'react-router-dom';

import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import {useTheme} from '../theme/ThemeProvider';

const MainLayout = () => {
  const {theme} = useTheme();
  const {colors} = theme;

  return (
    <div className="layout" style={{background: colors.pageBg}}>
      <Sidebar />
      <div className="main" style={{background: colors.pageBg}}>
        <TopBar />
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
