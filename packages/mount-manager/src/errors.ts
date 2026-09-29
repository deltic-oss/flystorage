import { ErrorContext, FlystorageError } from "@flystorage/file-storage";

export class UnableToResolveFilesystemMount extends FlystorageError {
  public readonly code = 'flystorage.unable_to_resolve_filesystem_mount';

  static becauseTheSeparatorIsMissing(path: string, { context = {}, cause = undefined }: {
    context?: ErrorContext,
    cause?: unknown;
  }): UnableToResolveFilesystemMount {
    return new UnableToResolveFilesystemMount(
      `Unable to resolve the filesystem mount because the path (${path}) is missing a separator (://).`,
      context,
      cause
    );
  }

  static becauseTheMountWasNotRegistered(mountPoint: string, { context = {}, cause = undefined }: {
    context?: ErrorContext,
    cause?: unknown;
  }): UnableToResolveFilesystemMount {
    return new UnableToResolveFilesystemMount(
      `Unable to resolve the filesystem mount because the mount (${mountPoint}) was not registered.`,
      { mountPoint, ...context },
      cause
    );
  }
}
