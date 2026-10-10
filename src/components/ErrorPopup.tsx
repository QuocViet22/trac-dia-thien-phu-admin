interface Props {
  title: string
  message: string
  onClose: () => void
}

export default function ErrorPopup({ title, message, onClose }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="actions">
          <button type="button" className="btn btn-default" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  )
}
