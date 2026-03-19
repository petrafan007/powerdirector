import { z } from 'zod';
const base = z.object({ a: z.string() });
console.log('base.safeExtend:', typeof base.safeExtend);
try {
  const extended = base.safeExtend({ b: z.number() });
  console.log('base safeExtend success');
} catch (e) {
  console.log('base safeExtend failed:', e.message);
}