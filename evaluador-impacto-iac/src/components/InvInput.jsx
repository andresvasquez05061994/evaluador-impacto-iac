export default function InvInput({ label, val, step, sub, onChange }) {
  return (
    <div className="inv-field">
      <div className="inv-field__label">{label}</div>
      <div className="field-input-wrap">
        <span className="field-input-wrap__prefix">$</span>
        <input
          type="number"
          className="field-input field-input--num"
          value={val || ''}
          min={0}
          step={step}
          placeholder="Ingrese monto"
          onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(0, +e.target.value))}
        />
      </div>
      {sub && <div className="field-hint">{sub}</div>}
    </div>
  )
}
