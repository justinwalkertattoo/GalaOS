import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@galaos/api';

export const trpc = createTRPCReact<AppRouter>();
