import NotificationDashboard from './NotificationDashboard';
import { Log } from 'logging-middleware';

export const revalidate = 0; // Disable caching to fetch fresh notifications

async function fetchNotifications() {
  try {
    const token = process.env.ACCESS_TOKEN;
    if (!token) {
      await Log("frontend", "fatal", "api", "ACCESS_TOKEN is missing in environment");
      return [];
    }

    await Log("frontend", "info", "api", "Fetching notifications from server");
    
    const res = await fetch('http://20.207.122.201/evaluation-service/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      await Log("frontend", "error", "api", `Failed to fetch: ${res.status}`);
      return [];
    }

    const data = await res.json();
    await Log("frontend", "info", "api", `Fetched ${data.notifications?.length || 0} notifications`);
    return data.notifications || [];
  } catch (error: any) {
    await Log("frontend", "error", "api", `Fetch exception: ${error.message}`);
    return [];
  }
}

export default async function Home() {
  const notifications = await fetchNotifications();

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Campus Hub</h1>
        <NotificationDashboard initialNotifications={notifications} />
      </div>
    </main>
  );
}
