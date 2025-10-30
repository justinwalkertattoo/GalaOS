import { createTRPCReact } from '@trpc/react-query';
// Temporarily untyped at runtime until API types are emitted; api-types package is scaffolded.
export const trpc = createTRPCReact<any>() as any;
