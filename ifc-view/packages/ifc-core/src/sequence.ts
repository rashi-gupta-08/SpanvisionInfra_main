import type { ParameterInfo } from './ifc';
import { naturalSort } from './value-sorter';

export interface SequenceState {
  orderedValues: string[];
  valueGroups: Map<string, number[]>;
  currentIndex: number;
  completedElementIds: Set<number>;
  currentElementIds: Set<number>;
  futureElementIds: Set<number>;
}

export function createSequenceState(
  parameter: ParameterInfo,
  requestedIndex = -1,
): SequenceState {
  const orderedValues = [...parameter.values].sort(naturalSort);
  const currentIndex = Math.max(-1, Math.min(requestedIndex, orderedValues.length - 1));
  const completedElementIds = new Set<number>();
  const currentElementIds = new Set<number>();
  const futureElementIds = new Set<number>();

  orderedValues.forEach((value, index) => {
    const destination = index < currentIndex
      ? completedElementIds
      : index === currentIndex
        ? currentElementIds
        : futureElementIds;
    for (const expressId of parameter.objectIds.get(value) ?? []) destination.add(expressId);
  });

  return {
    orderedValues,
    valueGroups: parameter.objectIds,
    currentIndex,
    completedElementIds,
    currentElementIds,
    futureElementIds,
  };
}
