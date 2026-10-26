import { projectCategories, type ProjectCategory } from '../../data/projects';

export type ProjectFilterValue = 'All Projects' | ProjectCategory;
export const filterOptions: ProjectFilterValue[] = ['All Projects', ...projectCategories];

export default function ProjectFilter({ value, onChange }: { value: ProjectFilterValue; onChange: (value: ProjectFilterValue) => void }) {
  return (
    <div className="pj-filters" role="group" aria-label="Filter projects by category">
      {filterOptions.map((option) => (
        <button key={option} type="button" className={option === value ? 'pj-chip pj-chip-active' : 'pj-chip'} aria-pressed={option === value} onClick={() => onChange(option)}>{option}</button>
      ))}
    </div>
  );
}
