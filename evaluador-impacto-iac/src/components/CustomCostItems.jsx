import { C } from '../constants/colors'

export default function CustomCostItems({ items, onChange }) {
  const addItem = () => {
    onChange([
      ...items,
      { id: crypto.randomUUID(), name: '', amount: 0, frequency: 'once' },
    ])
  }

  const updateItem = (id, patch) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id) => {
    onChange(items.filter((item) => item.id !== id))
  }

  const onceTotal = items.filter((i) => i.frequency === 'once').reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const monthlyTotal = items.filter((i) => i.frequency === 'monthly').reduce((s, i) => s + (Number(i.amount) || 0), 0)

  return (
    <div style={{ minWidth: 0 }}>
      {items.length === 0 ? (
        <p className="field-hint" style={{ marginBottom: 8 }}>
          Capacitación, licencias, infraestructura u otros costos del proyecto.
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
                  placeholder="Nombre del concepto"
                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                />
                <div className="field-input-wrap">
                  <span className="field-input-wrap__prefix">$</span>
                  <input
                    type="number"
                    className="field-input field-input--num"
                    value={item.amount || ''}
                    min={0}
                    step={50000}
                    placeholder="Monto"
                    onChange={(e) => updateItem(item.id, { amount: e.target.value === '' ? 0 : Math.max(0, +e.target.value) })}
                  />
                </div>
                <select
                  className="field-select"
                  value={item.frequency}
                  onChange={(e) => updateItem(item.id, { frequency: e.target.value })}
                >
                  <option value="once">Pago único</option>
                  <option value="monthly">Mensual</option>
                </select>
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

      {items.length > 0 && (onceTotal > 0 || monthlyTotal > 0) && (
        <div className="custom-item-summary">
          {onceTotal > 0 && <div>Pago único: <strong>${Math.round(onceTotal / 1000)}K</strong></div>}
          {monthlyTotal > 0 && <div>Recurrente: <strong>${Math.round(monthlyTotal / 1000)}K/mes</strong></div>}
        </div>
      )}
    </div>
  )
}
