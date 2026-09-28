const AREAS = ["ML", "NLP", "CV", "Comunicação"];

export default function AreaMultiSelect({ value = [], onChange, label = "Área de atuação", required = false }) {
  const selected = Array.isArray(value) ? value : String(value || "").split(",").map(area => area.trim()).filter(Boolean);

  function toggle(area) {
    const next = selected.includes(area) ? selected.filter(item => item !== area) : [...selected, area];
    onChange(next);
  }

  return <fieldset className="lg-field area-multi-select" aria-required={required}>
    <legend className="lg-field__label">{label}{required ? " *" : ""}</legend>
    <div className="area-multi-select__options" role="group" aria-label={label}>
      {AREAS.map(area => {
        const isSelected = selected.includes(area);
        return <button key={area} type="button" className={`lg-chip${isSelected ? " lg-chip--selected" : ""}`}
          aria-pressed={isSelected} onClick={() => toggle(area)}>{area}</button>;
      })}
    </div>
    {required && selected.length === 0 && <span className="lg-field__hint">Selecione ao menos uma área.</span>}
  </fieldset>;
}

export { AREAS as PROFILE_AREAS };
