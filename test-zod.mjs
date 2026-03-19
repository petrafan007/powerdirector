import { z } from 'zod';
console.log('ZodObject.prototype.safeExtend:', typeof z.ZodObject.prototype.safeExtend);
const SlackAccountSchema = z.object({ a: z.string() }).superRefine(() => {});
console.log('SlackAccountSchema.safeExtend:', typeof SlackAccountSchema.safeExtend);
try {
  const extended = SlackAccountSchema.safeExtend({ b: z.number() });
  console.log('safeExtend success');
} catch (e) {
  console.log('safeExtend failed:', e.message);
}