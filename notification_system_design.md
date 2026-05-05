# Campus Notification Platform - System Design

## Stage 1
### REST API Design
The platform should support fetching notifications and updating their read status.

**1. Fetch Notifications**
- **Endpoint**: `GET /api/v1/notifications`
- **Headers**: `Authorization: Bearer <token>`
- **Request Parameters**: `?status=unread&limit=20&offset=0`
- **Response (200 OK)**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "timestamp": "2026-04-22 17:51:18",
      "isRead": false
    }
  ],
  "pagination": { "total": 1, "nextOffset": null }
}
```

**2. Mark Notification as Read**
- **Endpoint**: `PATCH /api/v1/notifications/:id/read`
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{ "success": true, "message": "Notification marked as read" }
```

### Real-Time Mechanism
For real-time updates, **Server-Sent Events (SSE)** or **WebSockets** are ideal. Since notifications are primarily a one-way stream from the server to the client, SSE is highly efficient and works natively over HTTP. However, if two-way communication (like immediate "read" receipts without a separate HTTP call) is desired, WebSockets will be used. 
When an event occurs, the server publishes a message to a Redis Pub/Sub channel, which the WebSocket server listens to and pushes to the specific connected client (`studentID`).

---

## Stage 2
### Database Selection & Schema
**Database**: PostgreSQL (Relational Database)
**Reason**: Notification data is highly structured, and strong ACID compliance ensures notifications aren't lost or duplicated. Relational DBs excel at filtering by foreign keys (`studentID`) and exact statuses (`isRead`).

**Schema (`notifications` table):**
- `id` (UUID, Primary Key)
- `studentID` (Integer, Indexed)
- `notificationType` (Enum: 'Event', 'Result', 'Placement')
- `message` (Text)
- `isRead` (Boolean, Default: false)
- `createdAt` (Timestamp)

**Volume Problems & Solutions:**
As data grows (e.g., 5,000,000 rows), simple queries will slow down. 
*Solutions:* 
1. **Table Partitioning**: Partition the `notifications` table by date (e.g., monthly).
2. **Archiving**: Move older, read notifications to cold storage (e.g., AWS S3) or a separate historical table.

---

## Stage 3
### Query Analysis
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;
```
**Is this query accurate?** Yes, it correctly fetches unread notifications.
**Why is this slow?** Without a composite index, the database performs a sequential scan over 5 million rows, checking every row for `studentID` and `isRead`, followed by an expensive in-memory sort for `ORDER BY`.
**What would you change?** 
1. Avoid `SELECT *`. Only select required columns (`id, type, message, createdAt`).
2. Add a composite index: `CREATE INDEX idx_student_unread_date ON notifications(studentID, isRead, createdAt);`
**Computation Cost:** With the index, it becomes an Index Only Scan, reducing time complexity from O(N) to O(log N).

**Indexing Every Column:**
*Is this advice effective?* **No.** While indexes speed up READ operations, they severely degrade WRITE performance (INSERT, UPDATE, DELETE) because every index must be synchronously updated. They also consume significant disk space. Only index columns used frequently in WHERE, JOIN, and ORDER BY clauses.

**Query: Students with a placement notification in the last 7 days:**
```sql
SELECT DISTINCT studentID 
FROM notifications 
WHERE notificationType = 'Placement' 
  AND createdAt >= NOW() - INTERVAL '7 days';
```

---

## Stage 4
### Performance & Caching
**Problem:** Fetching from the DB on every page load overwhelms the database.
**Solution:** Implement a **Caching Layer** (e.g., Redis).
When a student's notifications are fetched, cache the result in Redis with a key like `notifications:studentID:1042`. Set a Time-To-Live (TTL) or invalidate the cache when a new notification is inserted or marked read.

**Tradeoffs:**
- *Pros:* Massive reduction in DB load, sub-millisecond read times for users.
- *Cons:* Cache Invalidation is notoriously difficult. If the cache isn't updated correctly when a new notification arrives, the user sees stale data. It also adds infrastructure complexity and memory costs.

---

## Stage 5
### Batch Processing & Reliability
**Shortcomings of Pseudocode:**
The loop is synchronous and blocking. If `send_email` fails on the 200th student (e.g., due to an SMTP timeout), the function crashes, and the remaining 49,800 students do not receive their notification. Furthermore, network-bound calls inside a tight loop are extremely slow.

**Should DB save and Email happen together?**
**No.** Saving to the DB is a fast, internal operation, while sending an email relies on an external 3rd-party API that can easily fail, timeout, or rate-limit you. Tying them together in a synchronous transaction means DB transactions will hang, causing connection pool exhaustion.

**Redesign (Event-Driven / Queue-Based):**
Use a Message Queue (RabbitMQ, Kafka, AWS SQS) and background worker processes.

**Revised Pseudocode:**
```python
function notify_all(student_ids: array, message: string):
    # 1. Bulk insert to DB (extremely fast, 1 query instead of 50,000)
    bulk_insert_to_db(student_ids, message)
    
    # 2. Push to Message Queue asynchronously
    for student_id in student_ids:
        enqueue_task("send_email_queue", student_id, message)
        enqueue_task("push_app_queue", student_id, message)

# --- Background Worker Process (Can run on separate servers) ---
function process_send_email_queue(task):
    try:
        send_email(task.student_id, task.message)
    except ExternalServiceError:
        # If it fails, retry later with exponential backoff
        retry_task(task, delay=exponential_backoff)
        # Prevents one failure from stopping the whole batch!
```

---

## Stage 6
### Priority Inbox Algorithm
The Priority Inbox displays the top `n` most important unread notifications. Priority is calculated using a **weight** (Placement: 3, Result: 2, Event: 1) and **recency** (timestamp descending).

*The working implementation is available in `notification_app_be/priority_inbox.ts`.*

**How to maintain the top 10 efficiently with new notifications:**
If we recalculate the entire array of millions of notifications on every insert, performance will degrade. Instead, we can maintain the Top 10 efficiently using a **Min-Heap** or **Redis Sorted Sets (ZSET)**.

**1. Min-Heap Approach (In-Memory)**
- Maintain a Min-Heap of size `n` (e.g., 10). 
- The heap is ordered by Priority Score.
- When a new notification arrives, compare its score with the root of the Min-Heap (the lowest priority item in the top 10).
- If the new notification's score is higher, remove the root and insert the new notification. 
- *Time Complexity:* O(log n) for insert. Extremely fast.

**2. Redis Sorted Set Approach (Distributed Cache)**
- Maintain a Redis ZSET per student: `zadd priority_inbox:studentID <score> <notificationID>`
- The `<score>` is a composite integer representing weight and timestamp (e.g., `weight * 10^12 + epoch_timestamp`).
- When fetching the inbox, simply run `ZREVRANGE priority_inbox:studentID 0 9` to get the top 10 instantly in O(log(N) + M) time.
- When a new notification arrives, add it to the ZSET and optionally trim the set (`ZREMRANGEBYRANK`) to keep memory footprint small.
