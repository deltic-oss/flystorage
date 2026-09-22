<img src="https://raw.githubusercontent.com/duna-oss/flystorage/main/flystorage.svg" width="50px" height="50px" />

# Mount Manager for Flystorage

This package contains a wrapper to easily work with multiple `FileStorage` instances from a single object. `MountManager` is an easy-to-use container allowing you to simplify more complex cross-file-system interactions.

## Installation

Install all the required packages

```bash
npm install --save @flystorage/file-storage @flystorage/mount-manager
```

## Setup

```typescript
import {FileStorage} from '@flystorage/file-storage';
import {MountManager} from '@flystorage/mount-manager';

const s3FS = new FileStorage(inMemoryAdapter);
const localFS = new FileStorage(localAdapter);

const manager = new MountManager({
    s3: s3FS,
    local: localFS,
});
```

## Usage

```typescript
// Read from S3
const contents = manager.readToString("s3://some/file.txt");

// And write to local
manager.write("local://put/it/here.txt", contents);
```
