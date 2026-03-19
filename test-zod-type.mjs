import { z } from 'zod';
const base = z.object({ a: z.string() }).strict();
const refined = base.transform(x => x);
console.log('refined type:', refined.constructor.name);
console.log('refined has extend:', typeof refined.extend);
