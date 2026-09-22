import {
  ChecksumOptions,
  ConfigurationOptions,
  CopyFileOptions,
  CreateDirectoryOptions,
  DirectoryListing,
  errorToMessage,
  FileContents,
  FileInfo,
  FileStorage,
  ListOptions,
  MimeTypeOptions,
  MiscellaneousOptions,
  MoveFileOptions,
  PublicUrlOptions,
  StatEntry,
  TemporaryUrlOptions,
  UnableToCheckDirectoryExistence,
  UnableToCheckFileExistence,
  UnableToCopyFile,
  UnableToCreateDirectory,
  UnableToDeleteDirectory,
  UnableToDeleteFile,
  UnableToGetChecksum,
  UnableToGetFileSize,
  UnableToGetLastModified,
  UnableToGetMimeType,
  UnableToGetPublicUrl,
  UnableToGetStat,
  UnableToGetTemporaryUrl,
  UnableToGetVisibility,
  UnableToListDirectory,
  UnableToMoveFile,
  UnableToPrepareUploadRequest,
  UnableToReadFile,
  UnableToSetVisibility,
  UnableToWriteFile,
  UploadRequest,
  UploadRequestOptions,
  VisibilityOptions,
  WriteOptions
} from '@flystorage/file-storage';
import { Buffer } from "buffer";
import { Readable } from "stream";
import { UnableToResolveFilesystemMount } from "./errors.js";

const FILESYSTEM_SCHEME_SEPARATOR = "://";

type FileStoragePublicMethods = {
  [K in keyof FileStorage as FileStorage[K] extends (...args: any[]) => any ? K : never]: FileStorage[K];
};

export class MountManager implements FileStoragePublicMethods {
  private filesystems: Record<string, FileStorage>;

  constructor(
    filesystems: Record<string, FileStorage>,
    private readonly options: ConfigurationOptions = {},
  ) {
    this.filesystems = filesystems;
  }

  public async write(path: string, contents: FileContents, options?: WriteOptions): Promise<void> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.write(relativePath, contents, options);
    } catch (error) {
      throw UnableToWriteFile.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async read(path: string, options?: MiscellaneousOptions): Promise<Readable> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.read(relativePath, options);
    } catch (error) {
      throw UnableToReadFile.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async readToString(path: string, options?: MiscellaneousOptions): Promise<string> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.readToString(relativePath, options);
    } catch (error) {
      throw UnableToReadFile.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async readToUint8Array(path: string, options?: MiscellaneousOptions): Promise<Uint8Array> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.readToUint8Array(relativePath, options);
    } catch (error) {
      throw UnableToReadFile.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async readToBuffer(path: string, options?: MiscellaneousOptions): Promise<Buffer> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.readToBuffer(relativePath, options);
    } catch (error) {
      throw UnableToReadFile.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async deleteFile(path: string, options?: MiscellaneousOptions): Promise<void> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.deleteFile(relativePath, options);
    } catch (error) {
      throw UnableToDeleteFile.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async createDirectory(path: string, options?: CreateDirectoryOptions): Promise<void> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.createDirectory(relativePath, options);
    } catch (error) {
      throw UnableToCreateDirectory.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async deleteDirectory(path: string, options?: MiscellaneousOptions): Promise<void> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.deleteDirectory(relativePath, options);
    } catch (error) {
      throw UnableToDeleteDirectory.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async stat(path: string, options?: MiscellaneousOptions): Promise<StatEntry> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.stat(relativePath, options);
    } catch (error) {
      throw UnableToGetStat.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async moveFile(from: string, to: string, options?: MoveFileOptions): Promise<void> {
    const { filesystem: sourceFilesystem, path: relativePath } = this.determineFilesystemAndPath(from);
    const { filesystem: destinationFilesystem, path: relativeToPath } = this.determineFilesystemAndPath(to);

    try {
      if (sourceFilesystem !== destinationFilesystem) {
        return await this.moveFileAcrossFilesystems(from, to, options);
      }

      return await sourceFilesystem.moveFile(relativePath, relativeToPath, options);
    } catch (error) {
      throw UnableToMoveFile.because(
        errorToMessage(error),
        { cause: error, context: { from, to } },
      );
    }
  }

  public async copyFile(source: string, destination: string, options?: CopyFileOptions): Promise<void> {
    const { filesystem: sourceFilesystem, path: relativePath } = this.determineFilesystemAndPath(source);
    const { filesystem: destinationFilesystem, path: relativeToPath } = this.determineFilesystemAndPath(destination);

    try {
      if (sourceFilesystem !== destinationFilesystem) {
        return await this.copyFileAcrossFilesystems(source, destination, options);
      }

      return await sourceFilesystem.copyFile(relativePath, relativeToPath, options);
    } catch (error) {
      throw UnableToCopyFile.because(
        errorToMessage(error),
        { cause: error, context: { from: source, to: destination } },
      );
    }
  }

  public async changeVisibility(path: string, visibility: string, options?: VisibilityOptions): Promise<void> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.changeVisibility(relativePath, visibility, options);
    } catch (error) {
      throw UnableToSetVisibility.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, visibility } },
      );
    }
  }

  public async visibility(path: string, options?: VisibilityOptions): Promise<string> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.visibility(relativePath, options);
    } catch (error) {
      throw UnableToGetVisibility.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async fileExists(path: string, options?: MiscellaneousOptions): Promise<boolean> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.fileExists(relativePath, options);
    } catch (error) {
      throw UnableToCheckFileExistence.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public list(path: string, options?: ListOptions): DirectoryListing {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      const innerListing = filesystem.list(relativePath, options);
      const prefix = `${mountPoint}${FILESYSTEM_SCHEME_SEPARATOR}`;
      const mapped = (async function* () {
        for await (const entry of innerListing) {
          yield { ...entry, path: `${prefix}${entry.path}` };
        }
      })();

      return new DirectoryListing(mapped, path, options?.deep ?? false);
    } catch (error) {
      throw UnableToListDirectory.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async statFile(path: string, options?: MiscellaneousOptions): Promise<FileInfo> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.statFile(relativePath, options);
    } catch (error) {
      throw UnableToGetStat.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async directoryExists(path: string, options?: MiscellaneousOptions): Promise<boolean> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.directoryExists(relativePath, options);
    } catch (error) {
      throw UnableToCheckDirectoryExistence.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async publicUrl(path: string, options?: PublicUrlOptions): Promise<string> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.publicUrl(relativePath, options);
    } catch (error) {
      throw UnableToGetPublicUrl.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async temporaryUrl(path: string, options: TemporaryUrlOptions): Promise<string> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.temporaryUrl(relativePath, options);
    } catch (error) {
      throw UnableToGetTemporaryUrl.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async prepareUpload(path: string, options: UploadRequestOptions): Promise<UploadRequest> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.prepareUpload(relativePath, options);
    } catch (error) {
      throw UnableToPrepareUploadRequest.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async checksum(path: string, options?: ChecksumOptions): Promise<string> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.checksum(relativePath, options);
    } catch (error) {
      throw UnableToGetChecksum.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async mimeType(path: string, options?: MimeTypeOptions): Promise<string> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.mimeType(relativePath, options);
    } catch (error) {
      throw UnableToGetMimeType.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath, options } },
      );
    }
  }

  public async lastModified(path: string, options?: MiscellaneousOptions): Promise<number> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.lastModified(relativePath, options);
    } catch (error) {
      throw UnableToGetLastModified.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  public async fileSize(path: string, options?: MiscellaneousOptions): Promise<number> {
    const { mountPoint, filesystem, path: relativePath } = this.determineFilesystemAndPath(path);

    try {
      return await filesystem.fileSize(relativePath, options);
    } catch (error) {
      throw UnableToGetFileSize.because(
        errorToMessage(error),
        { cause: error, context: { path, mountPoint, relativePath } },
      );
    }
  }

  private async copyFileAcrossFilesystems(source: string, destination: string, options: CopyFileOptions = {}): Promise<void> {
    const { filesystem: sourceFilesystem, path: relativePath } = this.determineFilesystemAndPath(source);
    const { filesystem: destinationFilesystem, path: relativeToPath } = this.determineFilesystemAndPath(destination);

    const retainVisibility = options?.retainVisibility ?? this.options.visibility?.retainVisibility ?? true;
    let visibility = options?.visibility ?? this.options.visibility?.visibility;

    if (visibility === undefined && retainVisibility) {
      visibility = await sourceFilesystem.visibility(relativePath);
      options.visibility = visibility;
    }

    const contents = await sourceFilesystem.read(relativePath, options);
    await destinationFilesystem.write(relativeToPath, contents, options);
  }

  private async moveFileAcrossFilesystems(source: string, destination: string, options?: MoveFileOptions): Promise<void> {
    await this.copyFile(source, destination, options);
    await this.deleteFile(source, options);
  }

  private determineFilesystemAndPath(path: string): { mountPoint: string, filesystem: FileStorage, path: string } {
    const schemeSeparatorIndex = path.indexOf(FILESYSTEM_SCHEME_SEPARATOR);
    if (schemeSeparatorIndex === -1) {
      throw UnableToResolveFilesystemMount.becauseTheSeparatorIsMissing(path, { context: { path } });
    }

    const mountPoint = path.substring(0, schemeSeparatorIndex);
    const pathPart = path.substring(schemeSeparatorIndex + FILESYSTEM_SCHEME_SEPARATOR.length);

    const filesystem = this.filesystems[mountPoint];
    if (!filesystem) {
      throw UnableToResolveFilesystemMount.becauseTheMountWasNotRegistered(mountPoint, { context: { path, mountPoint } });
    }

    return { mountPoint, filesystem, path: pathPart };
  }
}
