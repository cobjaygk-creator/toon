export interface GenerateOptions {
  prompt: string;
  /** 캐릭터 일관성용 레퍼런스 이미지(PNG 버퍼) */
  refs?: Buffer[];
}

export interface EditOptions {
  /** 수정할 원본 이미지 */
  image: Buffer;
  prompt: string;
  /**
   * 수정할 영역 마스크 (원본과 같은 크기 PNG, 투명한 부분 = 다시 그릴 영역).
   * 마스크를 지원하지 않는 API는 무시하고 프롬프트로만 수정합니다.
   * 어느 쪽이든 결과에서 박스 영역만 잘라 쓰므로 정합은 코드가 보장합니다.
   */
  mask?: Buffer;
}

export interface ImageProvider {
  name: string;
  model: string;
  generate(opts: GenerateOptions): Promise<Buffer>;
  edit(opts: EditOptions): Promise<Buffer>;
}
