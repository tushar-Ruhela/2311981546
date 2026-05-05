'use client';

import { useState, useMemo, useEffect } from 'react';

// Using a mock Log function for the client side to avoid importing server-only code
// In a real app, this would ping a Next.js API route that consumes the logging_middleware
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

export default function NotificationDashboard({ initialNotifications }: { initialNotifications: Notification[] }) {
    const [viewMode, setViewMode] = useState<'all' | 'priority'>('priority');
    const [filterType, setFilterType] = useState<string>('all');
    const [topN, setTopN] = useState<number>(10);

    // Initial mount log
    useEffect(() => {
        clientLog("info", "component", "NotificationDashboard mounted");
    }, []);

    const processedNotifications = useMemo(() => {
        let filtered = initialNotifications;
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
        clientLog("info", "state", `View mode changed to ${mode}`);
    };

    const handleFilterChange = (type: string) => {
        setFilterType(type);
        clientLog("info", "state", `Filter changed to ${type}`);
    };

    const getBadgeColor = (type: string) => {
        switch (type.toLowerCase()) {
            case 'placement': return 'bg-green-100 text-green-800 border-green-200';
            case 'result': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'event': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header Controls */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleViewChange('priority')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'priority' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                    >
                        Priority Inbox
                    </button>
                    <button 
                        onClick={() => handleViewChange('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                    >
                        All Notifications
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {viewMode === 'priority' && (
                        <select 
                            value={topN} 
                            onChange={(e) => setTopN(Number(e.target.value))}
                            className="bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value={5}>Top 5</option>
                            <option value={10}>Top 10</option>
                            <option value={15}>Top 15</option>
                        </select>
                    )}
                    
                    <select 
                        value={filterType} 
                        onChange={(e) => handleFilterChange(e.target.value)}
                        className="bg-white border rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Types</option>
                        <option value="placement">Placement</option>
                        <option value="result">Result</option>
                        <option value="event">Event</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-50">
                {processedNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No notifications found.
                    </div>
                ) : (
                    processedNotifications.map((notif) => (
                        <div key={notif.ID} className="p-4 hover:bg-gray-50 transition-colors flex items-start justify-between group">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeColor(notif.Type)}`}>
                                        {notif.Type}
                                    </span>
                                    <span className="text-xs text-gray-400 font-medium">
                                        {new Date(notif.Timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-gray-800 font-medium mt-1 group-hover:text-indigo-700 transition-colors">
                                    {notif.Message}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
