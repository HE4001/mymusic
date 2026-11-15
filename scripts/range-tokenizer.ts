import {
  AbstractTokenizer,
  EndOfStreamError,
  type IGetToken,
  type IReadChunkOptions,
} from 'strtok3/core';

export const METADATA_BLOCK_BYTES = 64 * 1024;
export const MAX_METADATA_BYTES = 2 * 1024 * 1024;

/** Seek over audio payloads while fetching only the metadata blocks a parser needs. */
export class RangeTokenizer extends AbstractTokenizer {
  readonly fileInfo: { path: string; size: number };
  private readonly blocks = new Map<number, Uint8Array>();
  bytesRead: number;

  constructor(
    path: string,
    size: number,
    firstBlock: Uint8Array,
    private readonly readRange: (start: number, end: number) => Promise<Uint8Array>,
  ) {
    super();
    if (!Number.isSafeInteger(size) || size <= 0 || firstBlock.length !== Math.min(size, METADATA_BLOCK_BYTES)) {
      throw new Error('音频文件大小或首个分块无效');
    }
    this.fileInfo = { path, size };
    this.blocks.set(0, firstBlock);
    this.bytesRead = firstBlock.length;
  }

  supportsRandomAccess() { return true; }

  setPosition(position: number) {
    if (!Number.isSafeInteger(position) || position < 0 || position > this.fileInfo.size) {
      throw new RangeError('音频读取位置无效');
    }
    this.position = position;
  }

  private checkLength(length: number) {
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_METADATA_BYTES) {
      throw new Error('音频元数据读取超过限制');
    }
  }

  readToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    this.checkLength(token.len);
    return super.readToken(token, position);
  }

  peekToken<T>(token: IGetToken<T>, position?: number): Promise<T> {
    this.checkLength(token.len);
    return super.peekToken(token, position);
  }

  async readBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const position = options?.position ?? this.position;
    const length = await this.peekBuffer(buffer, options);
    this.position = position + length;
    return length;
  }

  async peekBuffer(buffer: Uint8Array, options?: IReadChunkOptions): Promise<number> {
    const { position, length, mayBeLess } = this.normalizeOptions(buffer, options);
    this.checkLength(length);
    if (!Number.isSafeInteger(position) || position < 0 || length > buffer.length) {
      throw new RangeError('音频读取范围无效');
    }
    const available = Math.min(length, Math.max(0, this.fileInfo.size - position));
    if (!mayBeLess && available < length) throw new EndOfStreamError();

    let copied = 0;
    while (copied < available) {
      const offset = position + copied;
      const index = Math.floor(offset / METADATA_BLOCK_BYTES);
      let block = this.blocks.get(index);
      if (!block) {
        const start = index * METADATA_BLOCK_BYTES;
        const end = Math.min(start + METADATA_BLOCK_BYTES, this.fileInfo.size) - 1;
        if (this.bytesRead + end - start + 1 > MAX_METADATA_BYTES) {
          // This must not look like EOF: a partial MP3 scan could produce a false duration.
          throw new Error('音频元数据读取超过限制');
        }
        block = await this.readRange(start, end);
        if (block.length !== end - start + 1) throw new Error('音频分块长度不匹配');
        this.blocks.set(index, block);
        this.bytesRead += block.length;
      }
      const blockOffset = offset % METADATA_BLOCK_BYTES;
      const count = Math.min(block.length - blockOffset, available - copied);
      buffer.set(block.subarray(blockOffset, blockOffset + count), copied);
      copied += count;
    }
    return available;
  }

  async close() {
    this.blocks.clear();
    await super.close();
  }
}
