// src/constants/v1l.ts
export const V1_SIZE: number = 21; // 21x21
export const V1L_DATA_CODEWORDS: number = 19; // data bytes
export const V1L_EC_CODEWORDS: number = 7; // parity bytes (coming soon)
export const MODE_INDICATOR_BYTE: number = 0b0100; // 4-bit mode indicator
export const PAD_BYTES: readonly number[] = [0xec, 0x11];
export const V1L_BYTE_MODE_CAPACITY: number = 17; // max payload bytes for byte mode
export const TOTAL_BITS_V1L: number = V1L_DATA_CODEWORDS * 8; // 152
