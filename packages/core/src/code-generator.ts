import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Anthropic from '@anthropic-ai/sdk';

const execAsync = promisify(exec);

export interface CodeGenerationRequest {
  description: string; // Natural language description of what to create/modify
  targetFile?: string; // Specific file to modify
  targetComponent?: string; // Specific component name
  context?: {
    existingCode?: string;
    relatedFiles?: string[];
    projectStructure?: string[];
  };
}

export interface CodeGenerationResult {
  success: boolean;
  files: Array<{
    path: string;
    action: 'create' | 'modify' | 'delete';
    content?: string;
    previousContent?: string;
  }>;
  summary: string;
  aiReasoning?: string;
  errors?: string[];
}

export interface CodeChangePreview {
  file: string;
  diff: string;
  action: 'create' | 'modify' | 'delete';
}

/**
 * Code Generator
 *
 * Uses Claude AI to generate and apply code changes in real-time.
 * Enables GalaOS to modify its own codebase based on natural language requests.
 */
export class CodeGenerator {
  private anthropic: Anthropic;
  private rootDir: string;
  private backupDir: string;

  constructor(rootDir: string = process.cwd()) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.anthropic = new Anthropic({ apiKey });
    this.rootDir = rootDir;
    this.backupDir = path.join(rootDir, '.galaos-code-backups');

    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Generate code based on natural language description
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const result: CodeGenerationResult = {
      success: false,
      files: [],
      summary: '',
      errors: [],
    };

    try {
      // Build context for Claude
      const context = await this.buildContext(request);

      // Generate code using Claude
      const aiResponse = await this.callClaude(request, context);

      // Parse AI response and extract code changes
      const changes = this.parseAIResponse(aiResponse);

      result.files = changes.files;
      result.summary = changes.summary;
      result.aiReasoning = changes.reasoning;
      result.success = true;

      return result;
    } catch (error: any) {
      result.errors!.push(error.message);
      return result;
    }
  }

  /**
   * Apply code changes to the codebase
   */
  async applyChanges(
    changes: CodeGenerationResult,
    options: {
      skipBackup?: boolean;
      dryRun?: boolean;
    } = {}
  ): Promise<{ success: boolean; applied: string[]; errors: string[] }> {
    const applied: string[] = [];
    const errors: string[] = [];

    // Create backup unless skipped
    if (!options.skipBackup && !options.dryRun) {
      await this.createBackup(changes.files.map((f) => f.path));
    }

    for (const fileChange of changes.files) {
      try {
        const filePath = path.join(this.rootDir, fileChange.path);

        if (options.dryRun) {
          console.log(`[DRY RUN] Would ${fileChange.action}: ${fileChange.path}`);
          applied.push(fileChange.path);
          continue;
        }

        switch (fileChange.action) {
          case 'create':
            // Create directory if needed
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            // Write new file
            fs.writeFileSync(filePath, fileChange.content || '', 'utf-8');
            applied.push(fileChange.path);
            break;

          case 'modify':
            // Modify existing file
            if (!fs.existsSync(filePath)) {
              errors.push(`File not found: ${fileChange.path}`);
              continue;
            }
            fs.writeFileSync(filePath, fileChange.content || '', 'utf-8');
            applied.push(fileChange.path);
            break;

          case 'delete':
            // Delete file
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              applied.push(fileChange.path);
            }
            break;
        }
      } catch (error: any) {
        errors.push(`Failed to ${fileChange.action} ${fileChange.path}: ${error.message}`);
      }
    }

    return {
      success: errors.length === 0,
      applied,
      errors,
    };
  }

  /**
   * Preview code changes (show diff)
   */
  async previewChanges(changes: CodeGenerationResult): Promise<CodeChangePreview[]> {
    const previews: CodeChangePreview[] = [];

    for (const fileChange of changes.files) {
      const filePath = path.join(this.rootDir, fileChange.path);

      let diff = '';

      if (fileChange.action === 'create') {
        diff = `+++ New file: ${fileChange.path}\n${fileChange.content}`;
      } else if (fileChange.action === 'modify') {
        const currentContent = fs.existsSync(filePath)
          ? fs.readFileSync(filePath, 'utf-8')
          : '';
        diff = await this.generateDiff(currentContent, fileChange.content || '');
      } else if (fileChange.action === 'delete') {
        diff = `--- Deleted: ${fileChange.path}`;
      }

      previews.push({
        file: fileChange.path,
        diff,
        action: fileChange.action,
      });
    }

    return previews;
  }

  /**
   * Build context for AI code generation
   */
  private async buildContext(request: CodeGenerationRequest): Promise<string> {
    let context = 'You are an expert full-stack developer working on GalaOS, an AI orchestration system.\n\n';

    // Add project structure
    context += '## Project Structure\n';
    context += 'GalaOS is a monorepo with the following structure:\n';
    context += '- apps/api: Backend API (Node.js, tRPC, Prisma)\n';
    context += '- apps/web: Frontend web app (Next.js, React, TailwindCSS)\n';
    context += '- packages/ai: AI integration layer\n';
    context += '- packages/db: Database schema and Prisma client\n';
    context += '- packages/core: Core utilities\n\n';

    // Add existing code context if available
    if (request.targetFile && fs.existsSync(path.join(this.rootDir, request.targetFile))) {
      const fileContent = fs.readFileSync(
        path.join(this.rootDir, request.targetFile),
        'utf-8'
      );
      context += `## Existing Code: ${request.targetFile}\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
    }

    // Add related files
    if (request.context?.relatedFiles) {
      context += '## Related Files\n';
      for (const relatedFile of request.context.relatedFiles) {
        const filePath = path.join(this.rootDir, relatedFile);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          context += `### ${relatedFile}\n\`\`\`\n${content}\n\`\`\`\n\n`;
        }
      }
    }

    return context;
  }

  /**
   * Call Claude AI to generate code
   */
  private async callClaude(
    request: CodeGenerationRequest,
    context: string
  ): Promise<string> {
    const prompt = `${context}

## Task
${request.description}

${request.targetFile ? `Target file: ${request.targetFile}` : ''}
${request.targetComponent ? `Target component: ${request.targetComponent}` : ''}

Please generate the necessary code changes. Format your response as follows:

<reasoning>
Explain your approach and what changes you're making
</reasoning>

<files>
<file action="create|modify|delete" path="relative/path/to/file">
\`\`\`
file content here
\`\`\`
</file>
<!-- Add more files as needed -->
</files>

<summary>
Brief summary of changes made
</summary>

Important:
- Follow existing code style and patterns
- Use TypeScript for type safety
- Ensure compatibility with existing code
- Include necessary imports
- Handle errors appropriately
`;

    const message = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text;
  }

  /**
   * Parse AI response and extract code changes
   */
  private parseAIResponse(response: string): {
    files: Array<{ path: string; action: 'create' | 'modify' | 'delete'; content?: string }>;
    summary: string;
    reasoning: string;
  } {
    const files: Array<{
      path: string;
      action: 'create' | 'modify' | 'delete';
      content?: string;
    }> = [];

    // Extract reasoning
    const reasoningMatch = response.match(/<reasoning>(.*?)<\/reasoning>/s);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';

    // Extract summary
    const summaryMatch = response.match(/<summary>(.*?)<\/summary>/s);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';

    // Extract files
    const fileMatches = response.matchAll(
      /<file\s+action="(create|modify|delete)"\s+path="([^"]+)">(.*?)<\/file>/gs
    );

    for (const match of fileMatches) {
      const action = match[1] as 'create' | 'modify' | 'delete';
      const path = match[2];
      const content = match[3].trim();

      // Remove code block markers if present
      const cleanContent = content
        .replace(/^```[\w]*\n/, '')
        .replace(/\n```$/, '')
        .trim();

      files.push({
        path,
        action,
        content: action !== 'delete' ? cleanContent : undefined,
      });
    }

    return { files, summary, reasoning };
  }

  /**
   * Generate diff between two strings
   */
  private async generateDiff(original: string, modified: string): Promise<string> {
    // Simple line-by-line diff
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');

    let diff = '';
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i];
      const modLine = modifiedLines[i];

      if (origLine === modLine) {
        diff += `  ${origLine}\n`;
      } else {
        if (origLine !== undefined) {
          diff += `- ${origLine}\n`;
        }
        if (modLine !== undefined) {
          diff += `+ ${modLine}\n`;
        }
      }
    }

    return diff;
  }

  /**
   * Create backup before applying changes
   */
  private async createBackup(files: string[]): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `code-backup-${timestamp}`);

    fs.mkdirSync(backupPath, { recursive: true });

    for (const file of files) {
      const srcPath = path.join(this.rootDir, file);
      if (fs.existsSync(srcPath)) {
        const destPath = path.join(backupPath, file);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(srcPath, destPath);
      }
    }

    // Create metadata
    const metadata = {
      timestamp: new Date().toISOString(),
      files,
    };
    fs.writeFileSync(
      path.join(backupPath, 'backup-metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    console.log(`Code backup created at: ${backupPath}`);
    return backupPath;
  }

  /**
   * Rollback to backup
   */
  async rollbackToBackup(backupPath: string): Promise<boolean> {
    try {
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Backup metadata not found');
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

      for (const file of metadata.files) {
        const srcPath = path.join(backupPath, file);
        const destPath = path.join(this.rootDir, file);

        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      }

      console.log('Rollback completed successfully');
      return true;
    } catch (error) {
      console.error('Rollback failed:', error);
      return false;
    }
  }

  /**
   * List code backups
   */
  listBackups(): Array<{ path: string; timestamp: string; files: string[] }> {
    try {
      const backups = fs.readdirSync(this.backupDir);
      return backups
        .filter((dir) => dir.startsWith('code-backup-'))
        .map((dir) => {
          const backupPath = path.join(this.backupDir, dir);
          const metadataPath = path.join(backupPath, 'backup-metadata.json');

          let metadata = { timestamp: '', files: [] };
          if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          }

          return {
            path: backupPath,
            timestamp: metadata.timestamp,
            files: metadata.files,
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }
}
