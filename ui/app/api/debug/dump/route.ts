import { NextResponse } from 'next/server';
import { getDebugSnapshot } from '../../../../lib/debug-rpc';

export async function GET() {
    try {
        const snapshot = await getDebugSnapshot();
        return NextResponse.json(snapshot);
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || 'Failed to load debug snapshot.' },
            { status: 500 }
        );
    }
}
