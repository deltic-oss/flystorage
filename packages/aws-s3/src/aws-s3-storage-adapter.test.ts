import {
    _Object,
    DeleteObjectsCommand,
    ListObjectsV2Command,
    ListObjectsV2Output,
    S3Client,
} from '@aws-sdk/client-s3';
import {AwsS3StorageAdapter} from './aws-s3-storage-adapter.js';

/**
 * S3 limits DeleteObjects to 1000 keys per request and ListObjectsV2 to
 * 1000 keys per page. This fake client emulates both limits and records
 * every DeleteObjects request that is sent.
 */
function createFakeClient(keys: string[]) {
    const deleteRequests: string[][] = [];
    const pageSize = 1000;

    const client = {
        send: async (command: unknown) => {
            if (command instanceof ListObjectsV2Command) {
                const prefix = command.input.Prefix ?? '';
                const matching = keys.filter(key => key.startsWith(prefix));
                const offset = Number(command.input.ContinuationToken ?? 0);
                const page = matching.slice(offset, offset + pageSize);
                const nextOffset = offset + page.length;
                const isTruncated = nextOffset < matching.length;

                return {
                    Contents: page.map((Key): _Object => ({Key})),
                    IsTruncated: isTruncated,
                    NextContinuationToken: isTruncated ? String(nextOffset) : undefined,
                } satisfies ListObjectsV2Output;
            }

            if (command instanceof DeleteObjectsCommand) {
                const objects = command.input.Delete?.Objects ?? [];

                if (objects.length > 1000) {
                    throw new Error(`DeleteObjects called with ${objects.length} keys, maximum is 1000`);
                }

                deleteRequests.push(objects.map(object => object.Key!));

                return {};
            }

            throw new Error(`Unexpected command: ${(command as object).constructor.name}`);
        },
    } as unknown as S3Client;

    return {client, deleteRequests};
}

describe('AwsS3StorageAdapter.deleteDirectory', () => {
    test.each([
        [999],
        [1000],
        [1001],
        [2000],
        [2001],
        [2500],
    ])('deleting a directory with %i keys never sends more than 1000 keys per request', async (count) => {
        const keys = Array.from({length: count}, (_, i) => `directory/file_${i}.txt`);
        const {client, deleteRequests} = createFakeClient(keys);
        const adapter = new AwsS3StorageAdapter(client, {bucket: 'test-bucket'});

        await adapter.deleteDirectory('directory');

        for (const request of deleteRequests) {
            expect(request.length).toBeLessThanOrEqual(1000);
        }

        expect(deleteRequests).toHaveLength(Math.ceil(count / 1000));
        expect(deleteRequests.flat().sort()).toEqual([...keys].sort());
    });
});
