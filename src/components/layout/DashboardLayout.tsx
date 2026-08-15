import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="app relative flex h-screen">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <main className="main-content min-w-0 flex-1 overflow-y-auto p-[30px_35px_30px_10px]">
                <Topbar />
                <Outlet />
            </main>
        </div>
    );
}
