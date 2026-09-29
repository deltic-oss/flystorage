import { FileStorage } from "@flystorage/file-storage";
import { InMemoryStorageAdapter } from '@flystorage/in-memory';
import { MountManager } from "./mount-manager.js";

describe('mount manager', () => {
    const firstAdapter = new InMemoryStorageAdapter();
    const secondAdapter = new InMemoryStorageAdapter();

    const firstStorage = new FileStorage(firstAdapter);
    const secondStorage = new FileStorage(secondAdapter);

    const mountManager = new MountManager({
        'first': firstStorage,
        'second': secondStorage,
    });

    beforeEach(() => {
        firstAdapter.deleteEverything();
        secondAdapter.deleteEverything();
    });

    test('reading a file that was written', async () => {
        await mountManager.write('first://path.txt', 'content in azure');
        const content = await mountManager.readToString('first://path.txt');

        expect(content).toEqual('content in azure');
    });

    test('trying to read a file that does not exist', async () => {
        await expect(mountManager.readToString('first://404.txt')).rejects.toThrow();
    });

    test('trying to see if a non-existing file exists', async () => {
        expect(await mountManager.fileExists('first://404.txt')).toEqual(false);
    });

    test('trying to see if an existing file exists', async () => {
        await mountManager.write('first://existing.txt', 'contents');

        expect(await mountManager.fileExists('first://existing.txt')).toEqual(true);
    });

    test('deleting an existing file', async () => {
        await mountManager.write('first://existing.txt', 'contents');

        expect(await mountManager.fileExists('first://existing.txt')).toEqual(true);

        await mountManager.deleteFile('first://existing.txt');

        expect(await mountManager.fileExists('first://existing.txt')).toEqual(false);
    });

    test('deleting a non-existing file is OK', async () => {
        await expect(mountManager.deleteFile('first://404.txt')).resolves.not.toThrow();
    });

    test('copying a file in the same filesystem', async () => {
        await mountManager.write('first://file.txt', 'copied');

        await mountManager.copyFile('first://file.txt', 'first://new-file.txt');

        expect(await mountManager.fileExists('first://file.txt')).toEqual(true);
        expect(await mountManager.fileExists('first://new-file.txt')).toEqual(true);
        expect(await mountManager.readToString('first://new-file.txt')).toEqual('copied');
    });

    test('copying a file in the same filesystem', async () => {
        await mountManager.write('first://file.txt', 'copied');

        await mountManager.copyFile('first://file.txt', 'first://new-file.txt');

        expect(await mountManager.fileExists('first://file.txt')).toEqual(true);
        expect(await mountManager.fileExists('first://new-file.txt')).toEqual(true);
        expect(await mountManager.readToString('first://new-file.txt')).toEqual('copied');
    });

    test('copying a file across filesystems', async () => {
        await mountManager.write('first://file.txt', 'copied');

        await mountManager.copyFile('first://file.txt', 'second://new-file.txt');

        expect(await mountManager.fileExists('first://file.txt')).toEqual(true);
        expect(await mountManager.fileExists('second://new-file.txt')).toEqual(true);
        expect(await mountManager.readToString('second://new-file.txt')).toEqual('copied');
    });

    test('moving a file in the same filesystem', async () => {
        await mountManager.write('first://file.txt', 'moved');

        await mountManager.moveFile('first://file.txt', 'first://new-file.txt');

        expect(await mountManager.fileExists('first://file.txt')).toEqual(false);
        expect(await mountManager.fileExists('first://new-file.txt')).toEqual(true);
        expect(await mountManager.readToString('first://new-file.txt')).toEqual('moved');
    });

    test('moving a file across filesystems', async () => {
        await mountManager.write('first://file.txt', 'moved');

        await mountManager.moveFile('first://file.txt', 'second://new-file.txt');

        expect(await mountManager.fileExists('first://file.txt')).toEqual(false);
        expect(await mountManager.fileExists('second://new-file.txt')).toEqual(true);
        expect(await mountManager.readToString('second://new-file.txt')).toEqual('moved');
    });

    test('listing entries in a directory, shallow', async () => {
        await mountManager.write('first://outside/path.txt', 'test');
        await mountManager.write('first://inside/a.txt', 'test');
        await mountManager.write('first://inside/b.txt', 'test');
        await mountManager.write('first://inside/c/a.txt', 'test');

        const listing = await mountManager.list('first://inside').toArray();
        expect(listing).toHaveLength(3);
        expect(listing[0].type).toEqual('file');
        expect(listing[1].type).toEqual('file');
        expect(listing[2].type).toEqual('directory');
        expect(listing[0].path).toEqual('first://inside/a.txt');
        expect(listing[1].path).toEqual('first://inside/b.txt');
        expect(listing[2].path).toEqual('first://inside/c');
    });

    test('listing entries in a directory, deep', async () => {
        await mountManager.write('first://outside/path.txt', 'test');
        await mountManager.write('first://inside/a.txt', 'test');
        await mountManager.write('first://inside/b.txt', 'test');
        await mountManager.write('first://inside/c/a.txt', 'test');

        const listing = await mountManager.list('first://inside', {deep: true}).toArray();
        expect(listing).toHaveLength(4);
        expect(listing[0].type).toEqual('file');
        expect(listing[1].type).toEqual('file');
        expect(listing[2].type).toEqual('directory');
        expect(listing[3].type).toEqual('file');
        expect(listing[0].path).toEqual('first://inside/a.txt');
        expect(listing[1].path).toEqual('first://inside/b.txt');
        expect(listing[2].path).toEqual('first://inside/c');
        expect(listing[3].path).toEqual('first://inside/c/a.txt');
    });

    test('deleting a full directory', async () => {
        await mountManager.write('first://directory/a.txt', 'test');
        await mountManager.write('first://directory/b.txt', 'test');
        await mountManager.write('first://directory/c/a.txt', 'test');

        await mountManager.deleteDirectory('first://directory');

        const listing = await mountManager.list('first://directory', {deep: true}).toArray();

        expect(listing).toEqual([]);
    });

    test('checking if a directory exists', async () => {
        await mountManager.write('first://directory/a.txt', 'test');
        await mountManager.write('first://directory/b.txt', 'test');
        await mountManager.write('first://directory/c/a.txt', 'test');

        expect(await mountManager.directoryExists('first://directory')).toEqual(true);
        expect(await mountManager.directoryExists('first://directory/c')).toEqual(true);
        expect(await mountManager.directoryExists('first://directory/a')).toEqual(false);
    });

    test('getting a md5 checksum of a file', async () => {
        await mountManager.write('first://this.txt', 'test');
        const checksum = await mountManager.checksum('first://this.txt', {algo: 'md5'});

        expect(checksum).toEqual('098f6bcd4621d373cade4e832627b4f6');
    });
});