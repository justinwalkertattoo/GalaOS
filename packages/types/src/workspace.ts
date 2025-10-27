import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const createPageSchema = z.object({
  title: z.string().min(1),
  workspaceId: z.string().optional(),
  parentId: z.string().optional(),
  content: z.any().optional(),
});

export const updatePageSchema = z.object({
  title: z.string().optional(),
  content: z.any().optional(),
  icon: z.string().optional(),
  coverImage: z.string().optional(),
  isPublished: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;

export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'image'
  | 'video'
  | 'file';

export interface Block {
  id: string;
  type: BlockType;
  content: any;
  properties?: Record<string, any>;
  children?: Block[];
}
