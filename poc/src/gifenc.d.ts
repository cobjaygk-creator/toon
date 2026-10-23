declare module "gifenc" {
  type Palette = number[][];
  const gifenc: {
    GIFEncoder(): {
      writeFrame(index: Uint8Array, width: number, height: number, opts?: { palette?: Palette; delay?: number }): void;
      finish(): void;
      bytes(): Uint8Array;
    };
    quantize(rgba: Uint8Array, maxColors: number): Palette;
    applyPalette(rgba: Uint8Array, palette: Palette): Uint8Array;
  };
  export default gifenc;
}
