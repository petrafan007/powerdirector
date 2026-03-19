import { z } from 'zod';
const base = z.object({ a: z.string() }).strict().transform(x => x);
console.log('transformed base:', base.constructor.name);
const base2 = z.object({ a: z.string() }).strict();
const refined = base2.superRefine(() => {});
console.log('superRefined base:', refined.constructor.name);
