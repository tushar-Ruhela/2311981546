# Notification System Evaluation

This repository contains the full stack implementation for the campus notification evaluation.

## Structure
- `logging_middleware`: Custom TypeScript logging package.
- `notification_app_be`: Backend scripts including priority inbox algorithm.
- `notification_app_fe`: Next.js frontend application.
- `notification_system_design.md`: System design and documentation.

## Running the Application
1. Install dependencies for the middleware: `cd logging_middleware && npm install && npm run build`
2. Run backend priority script: `cd notification_app_be && npx ts-node priority_inbox.ts`
3. Run frontend: `cd notification_app_fe && npm install && npm run dev`
