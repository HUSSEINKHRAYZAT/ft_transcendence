import type { ObstacleShape } from "../types";

export const SHAPES: ObstacleShape[] = ["sphere", "cylinder", "cone", "capsule", "disc", "box"];
export const SHAPE_WEIGHTS: number[] = [3, 2, 2, 1, 2, 2]; // sphere more common, capsule rarer
