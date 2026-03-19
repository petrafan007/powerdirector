import { z } from 'zod';

// @ts-ignore
console.log('ZodObject.prototype.safeExtend:', typeof z.ZodObject.prototype.safeExtend);

const SlackAccountSchema = z.object({ a: z.string() }).superRefine(() => {});
// @ts-ignore
console.log('SlackAccountSchema.safeExtend:', typeof SlackAccountSchema.safeExtend);

try {
  // @ts-ignore
  const extended = SlackAccountSchema.safeExtend({ b: z.number() });
  console.log('safeExtend success');
} catch (e) {
  console.log('safeExtend failed:', e.message);
}
