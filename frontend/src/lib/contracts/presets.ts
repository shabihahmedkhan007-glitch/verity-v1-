import type { Preset } from "./view-types";

/**
 * Live-run presets (UI_UX_SPEC 6.3). mac4 is the recorded chip (ARCHITECTURE 11.1).
 * The matmul4 and alu8 specs are plausible sample data, not final copy from the agent team.
 */
export const PRESETS: Preset[] = [
  {
    id: "mac4",
    title: "4-lane MAC array, 8-bit",
    oneLine: "Same chip as the recorded run.",
    approxMinutes: 6,
    recommended: true,
    spec: {
      presetId: "mac4",
      title: "4-lane MAC array, 8-bit",
      text:
        "A 4-lane multiply-accumulate unit. Each cycle it multiplies four pairs of unsigned 8-bit inputs and adds the four products to a running sum. After 16 cycles it raises done and holds the 22-bit result until reset. Smallest area matters most.",
      ports: [
        { name: "clk", dir: "in", width: 1 },
        { name: "rst_n", dir: "in", width: 1 },
        { name: "start", dir: "in", width: 1 },
        { name: "a", dir: "in", width: 8, count: 4 },
        { name: "b", dir: "in", width: 8, count: 4 },
        { name: "acc", dir: "out", width: 22 },
        { name: "done", dir: "out", width: 1 },
      ],
      priority: "area",
      testCount: 16,
      maxLines: 300,
    },
  },
  {
    id: "matmul4",
    title: "4x4 matrix multiply, 8-bit",
    oneLine: "Sixteen results from two small matrices.",
    approxMinutes: 8,
    spec: {
      presetId: "matmul4",
      title: "4x4 matrix multiply, 8-bit",
      text:
        "A 4x4 matrix multiplier. It reads two matrices of unsigned 8-bit values, one row of each per cycle, and computes the 16 dot products of the result matrix. After 24 cycles it raises done and holds the 20-bit results until reset. Smallest area matters most.",
      ports: [
        { name: "clk", dir: "in", width: 1 },
        { name: "rst_n", dir: "in", width: 1 },
        { name: "start", dir: "in", width: 1 },
        { name: "a_row", dir: "in", width: 8, count: 4 },
        { name: "b_row", dir: "in", width: 8, count: 4 },
        { name: "c", dir: "out", width: 20, count: 16 },
        { name: "done", dir: "out", width: 1 },
      ],
      priority: "area",
      testCount: 20,
      maxLines: 300,
    },
  },
  {
    id: "alu8",
    title: "8-bit ALU",
    oneLine: "Smallest design, quickest run.",
    approxMinutes: 4,
    spec: {
      presetId: "alu8",
      title: "8-bit ALU",
      text:
        "An 8-bit arithmetic logic unit. A 3-bit opcode selects add, subtract, and, or, xor, shift left, shift right or compare. It sets a zero flag and a carry flag. The result is combinational and registered on the clock edge. Smallest area matters most.",
      ports: [
        { name: "clk", dir: "in", width: 1 },
        { name: "rst_n", dir: "in", width: 1 },
        { name: "a", dir: "in", width: 8 },
        { name: "b", dir: "in", width: 8 },
        { name: "op", dir: "in", width: 3 },
        { name: "y", dir: "out", width: 8 },
        { name: "zero", dir: "out", width: 1 },
        { name: "carry", dir: "out", width: 1 },
      ],
      priority: "area",
      testCount: 24,
      maxLines: 200,
    },
  },
];
