'use client';

import { useState, useMemo, useEffect } from 'react';

const clientLog = async (level: string, pkg: string, message: string) => {
    try {
        await fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level, package: pkg, message })
        });
    } catch (e) {}
};

interface Notification {
    ID: string;
    Type: string;
    Message: string;
    Timestamp: string;
}

const getWeight = (type: string): number => {
    switch (type.toLowerCase()) {
        case 'placement': return 3;
        case 'result': return 2;
        case 'event': return 1;
        default: return 0;
    }
};

const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
};

export default function NotificationDashboard({ initialNotifications }: { initialNotifications: Notification[] }) {
    const [viewMode, setViewMode] = useState<'all' | 'priority'>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [topN, setTopN] = useState<number>(10);

    useEffect(() => {
        clientLog("info", "component", "NotificationDashboard mounted");
    }, []);

    const processedNotifications = useMemo(() => {
        let filtered = initialNotifications || [];
        if (filterType !== 'all') {
            filtered = filtered.filter(n => n.Type.toLowerCase() === filterType.toLowerCase());
        }

        if (viewMode === 'priority') {
            return [...filtered].sort((a, b) => {
                const weightA = getWeight(a.Type);
                const weightB = getWeight(b.Type);
                if (weightA !== weightB) return weightB - weightA;
                return new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime();
            }).slice(0, topN);
        }

        return filtered.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
    }, [initialNotifications, viewMode, filterType, topN]);

    const handleViewChange = (mode: 'all' | 'priority') => {
        setViewMode(mode);
        setFilterType('all');
        clientLog("info", "state", `View mode changed to ${mode}`);
    };

    const handleFilterChange = (type: string) => {
        setFilterType(type);
        clientLog("info", "state", `Filter changed to ${type}`);
    };

    const getBorderColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'placement': return 'border-green-600';
            case 'result': return 'border-blue-500';
            case 'event': return 'border-red-500';
            default: return 'border-gray-500';
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
            {/* Top Navbar */}
            <nav className="bg-[#1f295b] text-white py-3 px-8 flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-2">
                    <span className="text-lg font-medium tracking-wide">Campus Notification Platform</span>
                </div>
                <div className="flex gap-6 text-xs font-semibold tracking-wider">
                    <button 
                        className={`transition-colors ${viewMode === 'all' ? 'text-white' : 'text-blue-200 hover:text-white'}`}
                        onClick={() => handleViewChange('all')}
                    >
                        ALL NOTIFICATIONS
                    </button>
                    <button 
                        className={`transition-colors ${viewMode === 'priority' ? 'text-white' : 'text-blue-200 hover:text-white'}`}
                        onClick={() => handleViewChange('priority')}
                    >
                        PRIORITY INBOX
                    </button>
                </div>
            </nav>

            <div className="max-w-5xl mx-auto w-full px-8 py-8 flex-1 flex flex-col">
                <div className="flex justify-between items-end mb-6">
                    <h1 className="text-3xl font-medium text-gray-800 tracking-tight">
                        {viewMode === 'priority' ? 'Priority Inbox' : 'All Notifications'}
                    </h1>
                    <button className="bg-[#2d3a77] text-white px-4 py-2 text-xs font-semibold rounded shadow-sm hover:bg-[#1f295b] transition-colors tracking-wider">
                        MARK ALL READ
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-6 border-b border-gray-300 mb-6 text-xs font-semibold tracking-wider text-gray-500">
                    {['all', 'placement', 'result', 'event'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => handleFilterChange(tab)}
                            className={`pb-3 uppercase ${filterType === tab ? 'text-gray-800 border-b-2 border-[#2d3a77]' : 'hover:text-gray-800'}`}
                        >
                            {tab}
                        </button>
                    ))}
                    
                    {viewMode === 'priority' && (
                        <div className="ml-auto pb-3 flex items-center gap-2">
                            <span className="text-gray-500">LIMIT:</span>
                            <select 
                                value={topN} 
                                onChange={(e) => setTopN(Number(e.target.value))}
                                className="bg-transparent text-gray-800 font-semibold outline-none cursor-pointer"
                            >
                                <option value={5}>TOP 5</option>
                                <option value={10}>TOP 10</option>
                                <option value={15}>TOP 15</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Notifications List */}
                <div className="flex-1 flex flex-col border border-gray-200 rounded-md bg-white shadow-sm overflow-hidden">
                    {processedNotifications.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 font-medium flex-1 flex items-center justify-center">
                            No notifications to display.
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-gray-100">
                            {processedNotifications.map((notif, index) => (
                                <div key={notif.ID} className={`relative p-5 pl-6 bg-white hover:bg-gray-50 transition-colors flex items-center justify-between border-l-4 ${getBorderColor(notif.Type)}`}>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[17px] font-semibold text-gray-800 leading-tight">
                                                {notif.Message}
                                                <span className="text-red-500 text-xs align-top ml-0.5">•</span>
                                            </h3>
                                            {/* Show 'NEW' badge randomly or based on index just to match screenshot vibe */}
                                            {index === 0 && (
                                                <span className="bg-[#6b46c1] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">
                                                    NEW
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[13px] text-gray-500 font-medium">
                                            {formatTimeAgo(notif.Timestamp)}
                                        </p>
                                    </div>
                                    <div className="flex items-center">
                                        <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1 rounded">
                                            {notif.Type}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
