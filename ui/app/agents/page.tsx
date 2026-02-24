'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * No intermediate index page; the detail page shows agent list + Overview.
 */
export default function AgentsIndexPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/agents/main');
    }, [router]);

    return (
        <div className="p-8 flex items-center justify-center" style={{ minHeight: '40vh' }}>
            <p className="text-sm opacity-70">Redirecting to Agents…</p>
        </div>
    );
}
