const AREAS = ["ML", "NLP", "CV", "Comunicação"];

export default function AreaSelect({ value = "", onChange, label = "Área de atuação", required = false }) {
  return <fieldset className="lg-field area-select" aria-required={required}>
    <legend className="lg-field__label">{label}{required ? " *" : ""}</legend>
    <div className="area-select__options" role="group" aria-label={label}>
      {AREAS.map(area => {
        const isSelected = value === area;
        return <button key={area} type="button" className={`lg-chip${isSelected ? " lg-chip--selected" : ""}`}
          aria-pressed={isSelected} onClick={() => onChange(area)}>{area}</button>;
      })}
    </div>
    {required && !value && <span className="lg-field__hint">Selecione uma área.</span>}
  </fieldset>;
}

export { AREAS as PROFILE_AREAS };
