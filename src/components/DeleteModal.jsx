import React from 'react'
import { Icons } from './Icons'

export function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className="modalOverlay" onClick={onCancel}>
      <div className="modalContent" onClick={(e) => e.stopPropagation()}>
        <div className="modalIcon"><Icons.Trash /></div>
        <h3>Delete this photo?</h3>
        <p>This action cannot be undone. It will be removed from your vault permanently.</p>
        <div className="modalActions">
          <button className="confirmBtn" onClick={onConfirm}>Delete Permanently</button>
          <button className="cancelBtn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
