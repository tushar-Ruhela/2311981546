/**
 * Reusable Logging Middleware for Affordmed Test Server
 */

type StackType = "backend" | "frontend";
type LevelType = "debug" | "info" | "warn" | "error" | "fatal";
type BackendPackageType = "cache" | "controller" | "cron_job" | "handler" | "repository" | "route" | "service";
type FrontendPackageType = "api" | "component" | "hook" | "page" | "state" | "style";
type CommonPackageType = "auth" | "config" | "middleware" | "utils";

type PackageType = BackendPackageType | FrontendPackageType | CommonPackageType;

const getAuthToken = () => {
    return process.env.ACCESS_TOKEN || "";
};

const getLogApiUrl = () => {
    return process.env.LOG_API_URL || "http://20.207.122.201/evaluation-service/logs";
};

/**
 * Log function to capture lifecycle events, warnings, info, and debug details.
 * Makes an API call to the Test Server each time it is called.
 *
 * @param stack "backend" or "frontend"
 * @param level "debug", "info", "warn", "error", "fatal"
 * @param pkg The restricted package name
 * @param message The descriptive message for the log
 */
export const Log = async (stack: StackType, level: LevelType, pkg: PackageType, message: string): Promise<void> => {
    const logData = {
        stack,
        level,
        package: pkg,
        message
    };

    console.log(`[${level.toUpperCase()}] [${stack}] [${pkg}]: ${message}`);

    try {
        const token = getAuthToken();
        if (!token) {
            console.warn("LoggingMiddleware: No ACCESS_TOKEN found in environment. Log not sent to server.");
            return;
        }

        const response = await fetch(getLogApiUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(logData)
        });

        if (!response.ok) {
            console.warn(`LoggingMiddleware: Failed to send log to Test Server. Status: ${response.status}`);
        } else {
            const data = await response.json();
            // console.log("LoggingMiddleware: Successfully sent log.", data.logID);
        }
    } catch (error) {
        console.error("LoggingMiddleware: Error sending log to Test Server", error);
    }
};
