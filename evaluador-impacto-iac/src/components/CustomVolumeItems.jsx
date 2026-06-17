import { C } from '../constants/colors'

export default function CustomVolumeItems({ items, onChange, baseHrs, baseErrPct }) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), name: '', volume: 0, hoursPerUnit: 0, errorPct: 0 },
    ])
  }

  const updateItem = (id, patch) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const volumeTotal = items.reduce((s, i) => s + (Number(i.volume) || 0), 0)

  return (
    <div style={{ minWidth: 0 }}>
      {items.length === 0 ? (
        <p className="field-hint" style={{ marginBottom: 8 }}>
          Flujos complementarios con volumen y horas propias.
        </p>
      ) : (
        <div className="custom-item-list">
          {items.map((item) => (
            <div key={item.id} className="custom-item-card">
              <div className="custom-item-stack">
                <input
                  type="text"
                  className="field-input"
                  value={item.name}
                  placeholder="Nombre del flujo"
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                />
                <div className="custom-item-grid-2">
                  <div>
                    <label className="field-micro-label">Uds / mes</label>
                    <input
                      type="number"
                      className="field-input field-input--num"
                      value={item.volume || ''}
                      min={0}
                      step={1}
                      placeholder="Uds / mes"
                      onChange={(e) => updateItem(item.id, { volume: e.target.value === '' ? 0 : Math.max(0, +e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="field-micro-label">H / unidad</label>
                    <input
                      type="number"
                      className="field-input field-input--num"
                      value={item.hoursPerUnit || ''}
                      min={0}
                      max={24}
                      step={0.5}
                      placeholder={String(baseHrs)}
                      onChange={(e) => updateItem(item.id, { hoursPerUnit: e.target.value === '' ? 0 : Math.max(0, +e.target.value) })}
                    />
                  </div>
                </div>
                <div>
                  <label className="field-micro-label">Error % (opc.)</label>
                  <input
                    type="number"
                    className="field-input field-input--num"
                    value={item.errorPct || ''}
                    min={0}
                    max={99}
                    step={1}
                    placeholder={String(baseErrPct)}
                    onChange={(e) => updateItem(item.id, { errorPct: e.target.value === '' ? 0 : Math.max(0, +e.target.value) })}
                  />
                </div>
              </div>
              <div className="custom-item-foot">
                <button
                  type="button"
                  className="btn btn--text"
                  onClick={() => removeItem(item.id)}
                  style={{ fontSize: 10, color: C.negative, padding: '2px 0' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn--secondary"
        onClick={addItem}
        style={{ width: '100%', marginBottom: items.length ? 8 : 0 }}
      >
        Agregar concepto
      </button>

      {items.length > 0 && volumeTotal > 0 && (
        <div className="custom-item-summary">
          Volumen adicional: <strong>+{volumeTotal} uds/mes</strong>
        </div>
      )}
    </div>
  )
}
