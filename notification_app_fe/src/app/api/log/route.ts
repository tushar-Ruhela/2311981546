import { NextResponse } from 'next/server';
import { Log } from 'logging-middleware';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { level, package: pkg, message } = body;
        
        // Log to the test server using the middleware
        await Log("frontend", level, pkg, message);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
