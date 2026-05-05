import * as dotenv from 'dotenv';
import { Log } from '../logging_middleware/src/index';

// Load environment variables from the parent directory
dotenv.config({ path: '../.env' });

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

const fetchNotifications = async (): Promise<Notification[]> => {
    try {
        await Log("backend", "info", "service", "Fetching notifications from Test Server");
        const token = process.env.ACCESS_TOKEN;
        if (!token) throw new Error("No ACCESS_TOKEN found in environment.");

        const response = await fetch("http://20.207.122.201/evaluation-service/notifications", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch notifications: ${response.status}`);
        }

        const data = await response.json();
        await Log("backend", "info", "service", `Successfully fetched ${data.notifications.length} notifications`);
        return data.notifications;
    } catch (error: any) {
        await Log("backend", "error", "service", `Error fetching notifications: ${error.message}`);
        console.error(error);
        return [];
    }
};

const getPriorityInbox = (notifications: Notification[], n: number = 10): Notification[] => {
    return notifications.sort((a, b) => {
        const weightA = getWeight(a.Type);
        const weightB = getWeight(b.Type);

        // Sort by Weight descending (Placement > Result > Event)
        if (weightA !== weightB) {
            return weightB - weightA; 
        }

        // If weights are equal, sort by Recency (Timestamp descending)
        const timeA = new Date(a.Timestamp).getTime();
        const timeB = new Date(b.Timestamp).getTime();
        return timeB - timeA;
    }).slice(0, n);
};

const main = async () => {
    const notifications = await fetchNotifications();
    if (notifications.length === 0) {
        console.log("No notifications to process.");
        return;
    }

    await Log("backend", "info", "service", "Calculating priority inbox top 10");
    const priorityInbox = getPriorityInbox(notifications, 10);

    console.log("\n=============================================");
    console.log("             PRIORITY INBOX (Top 10)           ");
    console.log("=============================================\n");
    priorityInbox.forEach((n, idx) => {
        console.log(`${idx + 1}. [${n.Type}] ${n.Message} (${n.Timestamp})`);
    });
    console.log("\n=============================================\n");
};

main();
