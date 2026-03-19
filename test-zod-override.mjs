import { z } from 'zod';
const base = z.object({ a: z.string() }).strict();
const refined = base.superRefine(x => x);
try {
  const extended = refined.extend({ a: z.number() });
  console.log('refined extend success');
} catch (e) {
  console.log('refined extend failed:', e.message);
}