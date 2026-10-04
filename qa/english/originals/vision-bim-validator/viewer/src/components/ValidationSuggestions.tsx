import type { ValidationResult } from '../types/validation';

/** Guidance is tied to actual failed checks, never a simulated diagnosis. */
export function ValidationSuggestions({ result }: { result: ValidationResult }) {
  if (!result.failed_specifications) return null;
  const failed = result.specifications.filter(spec => spec.status === 'fail');
  return <aside className="validation-suggestions" aria-label="Suggested next steps">
    <h3>Suggested next steps</h3>
    <p>{result.failed_specifications} failed {result.failed_specifications === 1 ? 'specification needs' : 'specifications need'} a closer look.</p>
    <ol>{failed.slice(0, 3).map((spec, index) => <li key={index}><strong>{spec.specification_name}</strong><span>{spec.requirements.filter(requirement => requirement.status === 'fail').map(requirement => requirement.requirement_description).join(' · ') || 'Review the affected elements and their information requirements.'}</span></li>)}</ol>
    <p>Inspect affected elements, update their information in your authoring tool, and re-export the model. Run the same IDS checks again to confirm the changes.</p>
  </aside>;
}
