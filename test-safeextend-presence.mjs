import { z } from 'zod';
const base = z.object({ a: z.string() }).superRefine(() => {});
console.log('base has safeExtend:', typeof base.safeExtend === 'function');
