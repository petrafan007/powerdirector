import { z } from 'zod';
const base = z.object({ a: z.string() });
const refined = base.refine(x => x);
console.log('refined.safeExtend:', typeof refined.safeExtend);
try {
  const extended = refined.safeExtend({ b: z.number() });
  console.log('refined safeExtend success');
} catch (e) {
  console.log('refined safeExtend failed:', e.message);
}