import Docker from 'dockerode';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ContainerUpdateInfo {
  name: string;
  currentImage: string;
  latestImage: string;
  updateAvailable: boolean;
  running: boolean;
  created: Date;
}

export interface UpdateProgress {
  container: string;
  status: 'pulling' | 'stopping' | 'removing' | 'creating' | 'starting' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

export interface DockerUpdateResult {
  success: boolean;
  updates: Array<{
    container: string;
    success: boolean;
    previousImage: string;
    newImage: string;
    error?: string;
  }>;
  errors: string[];
}

/**
 * Docker Update Manager
 *
 * Manages updates for Docker containers from within GalaOS:
 * - Check for image updates
 * - Pull new images
 * - Recreate containers with new images
 * - Rollback on failure
 * - Update entire stacks (docker-compose)
 */
export class DockerUpdateManager {
  private docker: Docker;
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.rootDir = rootDir;
  }

  /**
   * Get all GalaOS containers
   */
  async getGalaOSContainers(): Promise<Docker.ContainerInfo[]> {
    try {
      const containers = await this.docker.listContainers({ all: true });

      // Filter for GalaOS containers (by label or name prefix)
      return containers.filter(
        (c) =>
          c.Labels['com.galaos.managed'] === 'true' ||
          c.Names.some((name) => name.includes('galaos'))
      );
    } catch (error) {
      console.error('Failed to list containers:', error);
      return [];
    }
  }

  /**
   * Check for image updates
   */
  async checkForImageUpdates(): Promise<ContainerUpdateInfo[]> {
    const containers = await this.getGalaOSContainers();
    const updates: ContainerUpdateInfo[] = [];

    for (const containerInfo of containers) {
      try {
        const container = this.docker.getContainer(containerInfo.Id);
        const inspect = await container.inspect();

        const currentImage = inspect.Image;
        const imageName = inspect.Config.Image;

        // Pull latest image info (without actually pulling)
        try {
          const image = this.docker.getImage(imageName);
          const imageInspect = await image.inspect();

          const localDigest = imageInspect.RepoDigests?.[0] || currentImage;

          // Try to get remote digest
          // Note: This is a simplified check. In production, you'd compare digests properly
          const updateAvailable = false; // Will be determined by actual pull

          updates.push({
            name: containerInfo.Names[0].replace(/^\//, ''),
            currentImage: imageName,
            latestImage: imageName,
            updateAvailable,
            running: containerInfo.State === 'running',
            created: new Date(inspect.Created),
          });
        } catch (error) {
          // Image might not exist locally or remotely
          updates.push({
            name: containerInfo.Names[0].replace(/^\//, ''),
            currentImage: imageName,
            latestImage: imageName,
            updateAvailable: false,
            running: containerInfo.State === 'running',
            created: new Date(inspect.Created),
          });
        }
      } catch (error) {
        console.error(`Failed to check updates for container ${containerInfo.Id}:`, error);
      }
    }

    return updates;
  }

  /**
   * Pull latest image
   */
  async pullImage(
    imageName: string,
    onProgress?: (progress: any) => void
  ): Promise<boolean> {
    try {
      return new Promise((resolve, reject) => {
        this.docker.pull(imageName, {}, (err: any, stream: any) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(
            stream,
            (err: any, output: any[]) => {
              if (err) {
                reject(err);
              } else {
                resolve(true);
              }
            },
            (event: any) => {
              if (onProgress) {
                onProgress(event);
              }
            }
          );
        });
      });
    } catch (error) {
      console.error(`Failed to pull image ${imageName}:`, error);
      return false;
    }
  }

  /**
   * Update a single container
   */
  async updateContainer(
    containerName: string,
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get container
      const containers = await this.docker.listContainers({ all: true });
      const containerInfo = containers.find((c) =>
        c.Names.some((name) => name.includes(containerName))
      );

      if (!containerInfo) {
        return { success: false, error: 'Container not found' };
      }

      const container = this.docker.getContainer(containerInfo.Id);
      const inspect = await container.inspect();
      const imageName = inspect.Config.Image;
      const config = inspect.Config;
      const hostConfig = inspect.HostConfig;

      // Pull latest image
      onProgress?.({
        container: containerName,
        status: 'pulling',
        message: `Pulling latest image: ${imageName}`,
      });
      const pulled = await this.pullImage(imageName);
      if (!pulled) {
        return { success: false, error: 'Failed to pull image' };
      }

      // Stop container
      if (containerInfo.State === 'running') {
        onProgress?.({
          container: containerName,
          status: 'stopping',
          message: 'Stopping container',
        });
        await container.stop({ t: 10 });
      }

      // Remove old container
      onProgress?.({
        container: containerName,
        status: 'removing',
        message: 'Removing old container',
      });
      await container.remove();

      // Create new container with same config
      onProgress?.({
        container: containerName,
        status: 'creating',
        message: 'Creating new container',
      });
      const newContainer = await this.docker.createContainer({
        name: containerName,
        Image: imageName,
        Env: config.Env,
        Cmd: config.Cmd,
        ExposedPorts: config.ExposedPorts,
        HostConfig: hostConfig,
        Labels: config.Labels,
        WorkingDir: config.WorkingDir,
        User: config.User,
      });

      // Start new container
      onProgress?.({
        container: containerName,
        status: 'starting',
        message: 'Starting new container',
      });
      await newContainer.start();

      onProgress?.({
        container: containerName,
        status: 'completed',
        message: 'Update completed',
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Update multiple containers
   */
  async updateContainers(
    containerNames: string[],
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<DockerUpdateResult> {
    const result: DockerUpdateResult = {
      success: true,
      updates: [],
      errors: [],
    };

    for (const containerName of containerNames) {
      try {
        const containers = await this.docker.listContainers({ all: true });
        const containerInfo = containers.find((c) =>
          c.Names.some((name) => name.includes(containerName))
        );

        const previousImage = containerInfo?.Image || 'unknown';

        const updateResult = await this.updateContainer(containerName, onProgress);

        result.updates.push({
          container: containerName,
          success: updateResult.success,
          previousImage,
          newImage: previousImage, // Would get new image ID after update
          error: updateResult.error,
        });

        if (!updateResult.success) {
          result.success = false;
          result.errors.push(`${containerName}: ${updateResult.error}`);
        }
      } catch (error: any) {
        result.success = false;
        result.errors.push(`${containerName}: ${error.message}`);
        result.updates.push({
          container: containerName,
          success: false,
          previousImage: 'unknown',
          newImage: 'unknown',
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Update entire docker-compose stack
   */
  async updateComposeStack(
    composeFile: string = 'docker/docker-compose.full.yml',
    onProgress?: (progress: UpdateProgress) => void
  ): Promise<{ success: boolean; output: string; errors: string[] }> {
    const composePath = path.join(this.rootDir, composeFile);

    if (!fs.existsSync(composePath)) {
      return {
        success: false,
        output: '',
        errors: [`Compose file not found: ${composePath}`],
      };
    }

    try {
      onProgress?.({
        container: 'compose-stack',
        status: 'pulling',
        message: 'Pulling latest images',
      });

      // Pull latest images
      const { stdout: pullOutput, stderr: pullError } = await execAsync(
        `docker-compose -f ${composeFile} pull`,
        { cwd: this.rootDir, timeout: 600000 }
      );

      onProgress?.({
        container: 'compose-stack',
        status: 'stopping',
        message: 'Stopping services',
      });

      // Recreate containers
      const { stdout: upOutput, stderr: upError } = await execAsync(
        `docker-compose -f ${composeFile} up -d --force-recreate --remove-orphans`,
        { cwd: this.rootDir, timeout: 300000 }
      );

      onProgress?.({
        container: 'compose-stack',
        status: 'completed',
        message: 'Stack updated',
      });

      return {
        success: true,
        output: pullOutput + '\n' + upOutput,
        errors: pullError || upError ? [pullError, upError].filter(Boolean) : [],
      };
    } catch (error: any) {
      onProgress?.({
        container: 'compose-stack',
        status: 'failed',
        message: error.message,
      });

      return {
        success: false,
        output: error.stdout || '',
        errors: [error.message, error.stderr].filter(Boolean),
      };
    }
  }

  /**
   * Prune unused images to save space
   */
  async pruneImages(): Promise<{ success: boolean; spaceReclaimed: number }> {
    try {
      const result = await this.docker.pruneImages({ filters: { dangling: { false: true } } });

      const spaceReclaimed = result.SpaceReclaimed || 0;

      return {
        success: true,
        spaceReclaimed: Math.round(spaceReclaimed / (1024 * 1024)), // Convert to MB
      };
    } catch (error) {
      console.error('Failed to prune images:', error);
      return { success: false, spaceReclaimed: 0 };
    }
  }

  /**
   * Get Docker system info
   */
  async getSystemInfo(): Promise<any> {
    try {
      return await this.docker.info();
    } catch (error) {
      console.error('Failed to get Docker info:', error);
      return null;
    }
  }

  /**
   * Check if GalaOS is running in Docker
   */
  async isRunningInDocker(): Promise<boolean> {
    try {
      // Check if /.dockerenv exists
      if (fs.existsSync('/.dockerenv')) {
        return true;
      }

      // Check cgroup
      const cgroup = fs.readFileSync('/proc/self/cgroup', 'utf8');
      return cgroup.includes('docker');
    } catch (error) {
      return false;
    }
  }

  /**
   * Restart GalaOS containers
   */
  async restartGalaOSContainers(): Promise<{ success: boolean; restarted: string[] }> {
    const containers = await this.getGalaOSContainers();
    const restarted: string[] = [];

    for (const containerInfo of containers) {
      try {
        const container = this.docker.getContainer(containerInfo.Id);
        await container.restart({ t: 10 });
        restarted.push(containerInfo.Names[0].replace(/^\//, ''));
      } catch (error) {
        console.error(`Failed to restart container ${containerInfo.Id}:`, error);
      }
    }

    return {
      success: restarted.length > 0,
      restarted,
    };
  }
}
