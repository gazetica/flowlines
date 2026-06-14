// level.ts
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-003
//
// Canonical runtime level schema after the difficulty/timeLimit/classicMoveLimit
// migration. The bundled pack1–4.json all conform to this shape.

export type Difficulty = 'easy' | 'medium' | 'hard' | 'hardest';

export interface DotPair {
  colour: string;
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export interface Level {
  id: string;
  pack: number;
  grid: number;
  colours: number;
  optimalMoves: number;
  difficulty: Difficulty;
  timeLimit: number;        // seconds — Campaign countdown ceiling
  classicMoveLimit: number; // moves — Classic countdown budget
  dots: DotPair[];
}
