import { C } from '../constants/colors'

export default function Slider({ label, val, display, min, max, step, onChange }) {
  return (
    <div className="slider-field">
      <div className="slider-field__head">
        <span className="slider-field__label">{label}</span>
        <span className="slider-field__value">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => onChange(+e.target.value)}
      />
    </div>
  )
}
