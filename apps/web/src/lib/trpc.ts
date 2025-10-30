import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../../api/dist/router';
export const trpc = createTRPCReact<AppRouter>();
